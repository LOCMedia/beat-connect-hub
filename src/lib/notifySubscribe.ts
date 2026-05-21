import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const WHATSAPP_PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function formatWhatsAppNumber(value?: string | null) {
  const stripped = String(value ?? "")
    .trim()
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+");
  const cleaned = stripped.startsWith("+") ? stripped : stripped.replace(/\D/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("+")) return cleaned;
  return /^[1-9]\d{7,14}$/.test(cleaned) ? `+${cleaned}` : cleaned;
}

export function isValidWhatsAppNumber(value?: string | null) {
  const formatted = formatWhatsAppNumber(value);
  return !formatted || WHATSAPP_PHONE_RE.test(formatted);
}

export const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  preferences: z.object({
    competitions: z.boolean().default(true),
    new_beats: z.boolean().default(true),
    winners: z.boolean().default(true),
    platform_news: z.boolean().default(false),
  }),
  source: z.string().max(64).default("unknown"),
  form_location: z.string().max(64).optional(),
  phone_number: z.string().trim().max(32).optional(),
  whatsapp_opted_in: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const formattedPhone = formatWhatsAppNumber(data.phone_number);
  if (formattedPhone && !WHATSAPP_PHONE_RE.test(formattedPhone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone_number"],
      message: "Enter WhatsApp number in international format, e.g. +447123456789.",
    });
  }
  if (data.whatsapp_opted_in && !formattedPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phone_number"],
      message: "Add a WhatsApp number to receive WhatsApp updates.",
    });
  }
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

export async function subscribeToNotifications(input: SubscribeInput) {
  const parsed = subscribeSchema.parse(input);
  const formattedPhone = formatWhatsAppNumber(parsed.phone_number);
  const { data, error } = await supabase.functions.invoke("subscribe-newsletter", {
    body: {
      email: parsed.email.toLowerCase(),
      preferences: parsed.preferences,
      source: parsed.source,
      form_location: parsed.form_location ?? parsed.source,
      phone_number: formattedPhone,
      whatsapp_opted_in: !!parsed.whatsapp_opted_in && !!formattedPhone,
    },
  });
  if (error) throw new Error(error.message ?? "Failed to subscribe");
  if ((data as any)?.error) throw new Error((data as any).error);
  return { id: (data as any)?.id, isNew: !!(data as any)?.isNew };
}
