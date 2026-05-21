import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget transactional email send. Errors are logged but never
 * thrown — email failures must not break user-facing actions.
 */
export async function sendTransactionalEmail(params: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: params,
    });
    if (error) console.warn("[sendTransactionalEmail] failed:", error);
  } catch (err) {
    console.warn("[sendTransactionalEmail] threw:", err);
  }
}