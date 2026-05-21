import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "validating" | "ready" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("validating");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.title = "Unsubscribe — VibeKonect";
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid === true) setState("ready");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setState("done");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else { setErrorMsg(data?.error || "Unknown error"); setState("error"); }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to unsubscribe");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Email preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === "validating" && (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</div>
            )}
            {state === "ready" && (
              <>
                <p>Are you sure you want to unsubscribe from VibeKonect emails?</p>
                <Button onClick={confirm} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
                  Confirm unsubscribe
                </Button>
              </>
            )}
            {state === "submitting" && (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Unsubscribing…</div>
            )}
            {state === "done" && (
              <div className="flex items-start gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5 mt-0.5" />
                <p>You've been unsubscribed. We won't email this address anymore.</p>
              </div>
            )}
            {state === "already" && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 mt-0.5" />
                <p>This email is already unsubscribed.</p>
              </div>
            )}
            {(state === "invalid" || state === "error") && (
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="h-5 w-5 mt-0.5" />
                <p>{errorMsg || "This unsubscribe link is invalid or expired."}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}