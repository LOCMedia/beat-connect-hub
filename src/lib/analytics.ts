import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "vk_session_id";

const getSessionId = (): string => {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
};

export type BeatAction = "play" | "whatsapp_click" | "instagram_click" | "share";

export const trackBeatAction = async (beatId: string, action: BeatAction) => {
  try {
    await supabase
      .from("beat_analytics")
      .insert({ beat_id: beatId, action_type: action, session_id: getSessionId() });
  } catch (e) {
    console.warn("analytics insert failed", e);
  }
};