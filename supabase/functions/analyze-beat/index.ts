import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function hfClassify(model: string, audioBytes: Uint8Array): Promise<any | null> {
  if (!HF_TOKEN) return null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "audio/mpeg",
        },
        body: audioBytes,
      });
      if (res.ok) return await res.json();
      console.warn(`HF ${model} attempt ${attempt} failed: ${res.status}`);
    } catch (e) {
      console.warn(`HF ${model} attempt ${attempt} error:`, e);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }
  return null;
}

function topLabel(result: any): { label: string; score: number } | null {
  if (!Array.isArray(result) || result.length === 0) return null;
  const sorted = [...result].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const t = sorted[0];
  return t?.label ? { label: String(t.label), score: Number(t.score ?? 0) } : null;
}

function topN(result: any, n: number): { label: string; score: number }[] {
  if (!Array.isArray(result)) return [];
  return [...result]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, n)
    .map((t) => ({ label: String(t.label ?? ""), score: Number(t.score ?? 0) }))
    .filter((t) => t.label);
}

function inferMood(genre: string | null): string | null {
  if (!genre) return null;
  const g = genre.toLowerCase();
  if (/(rock|metal|punk)/.test(g)) return "energetic";
  if (/(jazz|blues|classical)/.test(g)) return "chill";
  if (/(hip ?hop|rap|trap)/.test(g)) return "hard";
  if (/(pop|disco)/.test(g)) return "uplifting";
  if (/(reggae|country)/.test(g)) return "relaxed";
  return "neutral";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require authenticated admin caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { beat_id, force } = await req.json();
    if (!beat_id) {
      return new Response(JSON.stringify({ error: "beat_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin-only access
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: beat, error: beatErr } = await supabase
      .from("beats")
      .select("id, audio_url, bpm_detected")
      .eq("id", beat_id)
      .maybeSingle();

    if (beatErr || !beat) {
      return new Response(JSON.stringify({ error: "beat not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (beat.bpm_detected != null && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "already analyzed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioRes = await fetch(beat.audio_url);
    if (!audioRes.ok) throw new Error(`audio fetch failed: ${audioRes.status}`);
    const audioBytes = new Uint8Array(await audioRes.arrayBuffer());

    const [bpmRes, genreRes, keyRes] = await Promise.all([
      hfClassify("mteb/gtzan-bpm", audioBytes),
      hfClassify("marsyas/gtzan", audioBytes),
      hfClassify("sander-wood/music-key-detection", audioBytes),
    ]);

    const bpmTop = topLabel(bpmRes);
    const genreTop = topLabel(genreRes);
    const genreTop3 = topN(genreRes, 3);
    const keyTop = topLabel(keyRes);

    const anyOk = bpmTop || genreTop || keyTop;
    if (!anyOk) {
      await supabase.from("beats").update({ analyzed_at: null }).eq("id", beat_id);
      return new Response(JSON.stringify({ ok: false, reason: "all HF calls failed, manual entry mode" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bpmDetected = bpmTop ? parseInt(bpmTop.label.replace(/[^0-9]/g, ""), 10) || null : null;
    const genreDetected = genreTop?.label ?? null;
    const keyDetected = keyTop?.label ?? null;
    const mood = inferMood(genreDetected);

    const update: Record<string, unknown> = {
      analyzed_at: new Date().toISOString(),
      analysis_confidence: {
        bpm: bpmTop?.score ?? null,
        genre: genreTop?.score ?? null,
        key: keyTop?.score ?? null,
        genre_suggestions: genreTop3,
      },
    };
    if (bpmDetected) update.bpm_detected = bpmDetected;
    if (genreDetected) update.genre_detected = genreDetected;
    if (keyDetected) update.key_detected = keyDetected;
    if (mood) update.mood = mood;

    const { error: updErr } = await supabase.from("beats").update(update).eq("id", beat_id);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      ok: true,
      update,
      genre_suggestions: genreTop3.map((g) => g.label),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-beat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
