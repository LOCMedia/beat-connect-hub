import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const lastReplyAt = new Map<string, number>();
const COOLDOWN_MS = 30_000;

// Simple, deterministic keyword-based autoresponder. No external API calls.
const INTENTS: Array<{ keywords: RegExp; reply: string }> = [
  { keywords: /\b(price|cost|how much|pricing|fee|charge)\b/i,
    reply: "Thanks for reaching out! Pricing is listed on the beat — tap 'Get Beat' for the license options. Happy to discuss custom deals too." },
  { keywords: /\b(exclusive|exclusivity|buyout|full rights)\b/i,
    reply: "Exclusive rights are available — let me know the project and I'll send a custom quote." },
  { keywords: /\b(lease|license|licensing|mp3|wav|stems)\b/i,
    reply: "I offer MP3, WAV and Stems licenses. Check the license dialog on the beat for full terms and pricing." },
  { keywords: /\b(custom|made to order|bespoke|on demand)\b/i,
    reply: "Yes, I take custom beat orders. Send me the vibe, BPM and reference tracks and I'll get back with a quote." },
  { keywords: /\b(free|freebie|gift)\b/i,
    reply: "Free beats are tagged 'FREE' on the store — fill in the form on the beat to get the download link." },
  { keywords: /\b(collab|collaborate|feature|work together)\b/i,
    reply: "Always open to collabs — tell me a bit about your project and what you're looking for." },
  { keywords: /\b(hello|hi|hey|yo|sup|hola)\b/i,
    reply: "Hey! Thanks for the message — how can I help with the beat?" },
  { keywords: /\b(thank|thanks|appreciate)\b/i,
    reply: "Anytime! Let me know if there's anything else you need." },
  { keywords: /\b(when|how long|eta|delivery)\b/i,
    reply: "Delivery is usually within 24 hours of payment. I'll send the files to your email." },
];

const DEFAULT_REPLY = "Thanks for reaching out! I'll get back to you shortly with details on this beat.";

function generate(userMessage: string): string {
  const text = String(userMessage || "");
  for (const intent of INTENTS) {
    if (intent.keywords.test(text)) return intent.reply;
  }
  return DEFAULT_REPLY;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { channel_id, sender_user_id, message } = await req.json();
    if (!channel_id || !sender_user_id || !message) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cooldown per channel to avoid loops
    const now = Date.now();
    const last = lastReplyAt.get(channel_id) || 0;
    if (now - last < COOLDOWN_MS) {
      return new Response(JSON.stringify({ skipped: "cooldown" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the other participant (the producer)
    const { data: parts } = await admin
      .from("chat_participants")
      .select("user_id")
      .eq("channel_id", channel_id);
    const others = (parts || []).map((p: any) => p.user_id).filter((id: string) => id !== sender_user_id);
    if (others.length === 0) {
      return new Response(JSON.stringify({ skipped: "no peer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const botUserId = others[0];

    // Don't auto-reply to messages the bot/producer themselves sent
    if (sender_user_id === botUserId) {
      return new Response(JSON.stringify({ skipped: "self" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    lastReplyAt.set(channel_id, now);

    const reply = generate(message);
    const { error } = await admin.from("chat_messages").insert({
      channel_id,
      user_id: botUserId,
      message: `🤖 ${reply}`,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});