import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPIRES_HOURS = 48;
const EXPIRES_SECONDS = EXPIRES_HOURS * 60 * 60;
const RAW_BUCKET = "beat-audio-raw";

const Body = z.object({
  beat_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  instagram_handle: z.string().trim().max(50).optional().or(z.literal("")),
  follows_locbeatx: z.literal(true),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { beat_id, full_name, email, instagram_handle } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load beat
    const { data: beat, error: bErr } = await admin
      .from("beats")
      .select("id,title,genre,bpm,key,audio_url,cover_image_url,is_free,user_id")
      .eq("id", beat_id)
      .maybeSingle();
    if (bErr || !beat) {
      return new Response(JSON.stringify({ error: "Beat not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!beat.is_free) {
      return new Response(JSON.stringify({ error: "Beat is not free" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to mint a 48h signed URL from the raw bucket; fall back to public audio_url
    let downloadUrl: string | null = null;
    try {
      const { data: files } = await admin.storage.from(RAW_BUCKET).list(beat.id, { limit: 1 });
      if (files && files.length > 0) {
        const { data: signed } = await admin.storage
          .from(RAW_BUCKET)
          .createSignedUrl(`${beat.id}/${files[0].name}`, EXPIRES_SECONDS);
        downloadUrl = signed?.signedUrl ?? null;
      }
    } catch (_e) { /* fall through */ }
    if (!downloadUrl) downloadUrl = beat.audio_url;

    const expiresAt = new Date(Date.now() + EXPIRES_SECONDS * 1000).toISOString();

    // Insert lead row
    const { data: lead, error: insErr } = await admin
      .from("beat_download_requests")
      .insert({
        beat_id,
        full_name,
        email,
        instagram_handle: instagram_handle || null,
        status: "approved",
        download_url: downloadUrl,
        download_expires_at: expiresAt,
      })
      .select("id")
      .single();
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Increment beat download count
    await admin.rpc("increment_beat_download", { _beat_id: beat_id });

    // Fire-and-forget email send so the client gets the download link instantly.
    const producerChatUrl = `https://vibekonect.com/?beat=${beat.id}`;
    admin.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "free-beat-download",
          recipientEmail: email,
          idempotencyKey: `free-beat-${lead.id}`,
          templateData: {
            fullName: full_name,
            beatTitle: beat.title,
            beatGenre: beat.genre,
            beatBpm: beat.bpm,
            beatKey: beat.key,
            coverImageUrl: beat.cover_image_url,
            downloadUrl,
            expiresInHours: EXPIRES_HOURS,
            producerChatUrl,
          },
        },
      })
      .then(({ error }) => {
        if (error) console.warn("[send-free-beat-download] email enqueue failed:", error);
      })
      .catch((e) => console.warn("[send-free-beat-download] email threw:", e));

    return new Response(
      JSON.stringify({
        ok: true,
        lead_id: lead.id,
        download_url: downloadUrl,
        expires_at: expiresAt,
        beat_title: beat.title,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-free-beat-download error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});