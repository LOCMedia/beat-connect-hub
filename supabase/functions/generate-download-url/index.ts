import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_TTL = 86400; // 24h
const MAX_DOWNLOADS = 5;
const RAW_BUCKET = "beat-audio-raw";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { purchase_id, download_token } = await req.json();
    if (!purchase_id || !download_token) {
      return new Response(JSON.stringify({ error: "purchase_id and download_token required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: purchase, error: pErr } = await admin
      .from("purchases")
      .select("id, beat_id, download_token, download_count, download_expires_at")
      .eq("id", purchase_id)
      .maybeSingle();

    if (pErr || !purchase) {
      return new Response(JSON.stringify({ error: "purchase not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purchase.download_token !== download_token) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(purchase.download_expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "download link expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purchase.download_count >= MAX_DOWNLOADS) {
      return new Response(JSON.stringify({ error: "download limit reached" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the raw file path. Convention: beat-audio-raw/{beat_id}/master.* — list and pick first.
    const { data: files, error: listErr } = await admin.storage
      .from(RAW_BUCKET)
      .list(purchase.beat_id, { limit: 1 });
    if (listErr || !files || files.length === 0) {
      return new Response(JSON.stringify({ error: "raw file not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const objectPath = `${purchase.beat_id}/${files[0].name}`;

    const { data: signed, error: signErr } = await admin.storage
      .from(RAW_BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_TTL);
    if (signErr || !signed) throw signErr ?? new Error("sign failed");

    // Increment download_count
    await admin
      .from("purchases")
      .update({ download_count: purchase.download_count + 1 })
      .eq("id", purchase_id);

    // Log download
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    await admin.from("download_logs").insert({ purchase_id, ip_address: ip });

    return new Response(
      JSON.stringify({
        ok: true,
        signed_url: signed.signedUrl,
        expires_in: SIGNED_URL_TTL,
        downloads_remaining: MAX_DOWNLOADS - (purchase.download_count + 1),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-download-url error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});