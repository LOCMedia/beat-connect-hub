import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const VerifyEmail = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const verified = !!user?.email_confirmed_at;

  const resend = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/verify-email` },
      });
      if (error) throw error;
      toast.success("Verification email sent. Check your inbox.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resend");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    await supabase.auth.refreshSession();
    setBusy(false);
    if (user?.email_confirmed_at) toast.success("Email verified!");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-xl shadow-glow">
        <div className="mb-6 flex flex-col items-center text-center">
          <div
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
              verified ? "bg-[hsl(142_70%_45%)]" : "bg-gradient-primary"
            } shadow-glow`}
          >
            {verified ? (
              <CheckCircle2 className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Mail className="h-6 w-6 text-primary-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {verified ? "Email verified" : "Verify your email"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {verified
              ? "You're all set. You can now sign in and use VibeKonect."
              : "We sent a confirmation link to your inbox. Click it to activate your account."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/50 p-4 mb-4 flex items-start gap-3">
          {verified ? (
            <CheckCircle2 className="h-5 w-5 text-[hsl(142_70%_45%)] shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-heat shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            <p className="font-semibold">
              Status: {verified ? "Verified" : "Pending verification"}
            </p>
            {user?.email && (
              <p className="text-muted-foreground break-all">{user.email}</p>
            )}
          </div>
        </div>

        {!verified && (
          <div className="space-y-3">
            {!user && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            )}
            <Button
              onClick={resend}
              disabled={busy}
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend verification email"}
            </Button>
            <Button onClick={refresh} variant="outline" className="w-full" disabled={busy}>
              I've verified — check status
            </Button>
          </div>
        )}

        {verified && (
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold"
          >
            Continue to VibeKonect
          </Button>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
};

export default VerifyEmail;