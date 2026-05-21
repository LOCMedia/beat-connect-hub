import { supabase } from "@/integrations/supabase/client";

export type TournamentEvent =
  | "beat_approved"
  | "artist_qualified"
  | "battle_live"
  | "advanced"
  | "champion"
  | "beat_won";

export async function notifyTournamentEvent(args: {
  event: TournamentEvent;
  userIds: string[];
  tournamentId?: string;
  templateData?: Record<string, any>;
  link?: string;
}) {
  if (!args.userIds?.length) return;
  try {
    await supabase.functions.invoke("notify-tournament-event", { body: args });
  } catch (err) {
    console.warn("[notify-tournament-event]", err);
  }
}
