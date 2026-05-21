import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require an authenticated user to prevent anonymous abuse of AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mood, topic, keywords, length_bars, genre, bpm } = await req.json();
    const bars = Number(length_bars) || 8;
    const safeMood = String(mood || "energetic").slice(0, 40);
    const safeTopic = String(topic || "freestyle").slice(0, 40);
    const safeKeywords = String(keywords || "").slice(0, 200);
    const safeGenre = String(genre || "hip-hop").slice(0, 40);

    const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a skilled rap/hip-hop lyricist. Write original rap verses that flow well, with strong wordplay, internal rhymes, and a clear AABB rhyme scheme. Output ONLY the lyrics, one bar per line. No intro, no commentary, no markdown.`;
    const user = `Write a ${bars}-bar rap verse.
Mood: ${safeMood}
Topic: ${safeTopic}
Genre: ${safeGenre}${bpm ? ` (~${bpm} BPM)` : ""}
${safeKeywords ? `Incorporate these keywords/themes: ${safeKeywords}` : ""}
Rhyme scheme: AABB. Modern hip-hop style. Exactly ${bars} lines.`;

    const model = "gemini-2.0-flash-lite";
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
        }),
      },
    );

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("Gemini error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const lyrics = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    return new Response(JSON.stringify({ lyrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lyrics error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});