import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const labels: Record<string, string> = {
  competitions: "Upcoming competitions",
  new_beats: "New beat drops",
  winners: "Winner announcements",
  platform_news: "Platform news & features",
};

export default function UnsubscribeNotifications() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);
  const [prefs, setPrefs] = useState<any>({ competitions: true, new_beats: true, winners: true, platform_news: true });
  const [done, setDone] = useState<"unsub" | "saved" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("notification_subscribers")
        .select("id, email, preferences, is_active")
        .eq("unsubscribe_token", token)
        .maybeSingle();
      if (data) { setRow(data); setPrefs(data.preferences ?? prefs); }
      setLoading(false);
    })();
  }, [token]);

  const unsub = async () => {
    setBusy(true);
    await (supabase as any)
      .from("notification_subscribers")
      .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token);
    setBusy(false);
    setDone("unsub");
    toast.success("You've been unsubscribed.");
  };

  const savePrefs = async () => {
    setBusy(true);
    await (supabase as any)
      .from("notification_subscribers")
      .update({ preferences: prefs, is_active: true })
      .eq("unsubscribe_token", token);
    setBusy(false);
    setDone("saved");
    toast.success("Preferences updated.");
  };

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }

  if (!row) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
        <div className="max-w-md rounded-2xl border bg-card/70 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold mt-3">Invalid link</h1>
          <Button asChild className="mt-6"><Link to="/">Back to homepage</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-xl">
        {done === "unsub" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(142_70%_45%)]" />
            <h1 className="text-2xl font-bold mt-3">Unsubscribed</h1>
            <p className="text-muted-foreground mt-2">{row.email} won't receive any more emails from VibeKonect.</p>
            <Button asChild className="mt-6"><Link to="/">Back to homepage</Link></Button>
          </div>
        ) : done === "saved" ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[hsl(142_70%_45%)]" />
            <h1 className="text-2xl font-bold mt-3">Preferences saved</h1>
            <Button asChild className="mt-6"><Link to="/">Back to homepage</Link></Button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Manage your subscription</h1>
            <p className="text-sm text-muted-foreground mt-1">{row.email}</p>
            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold">Choose what you want to receive:</p>
              {Object.keys(labels).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!!prefs[k]} onCheckedChange={(v) => setPrefs((p: any) => ({ ...p, [k]: !!v }))} />
                  <span>{labels[k]}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={savePrefs} disabled={busy}>Update preferences</Button>
              <Button onClick={unsub} disabled={busy} variant="outline">Unsubscribe from all</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}