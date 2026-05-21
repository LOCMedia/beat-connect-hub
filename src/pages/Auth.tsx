import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Music2, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(isAdmin ? "/dashboard" : "/");
  }, [user, isAdmin, loading, navigate]);

  const handle = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/verify-email` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        navigate("/verify-email");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // useEffect above will route admins to /dashboard once isAdmin resolves
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      // Return to /auth so the post-login redirect logic forwards admins to /dashboard
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    // useEffect handles routing once session + isAdmin resolve
  };

  const sendReset = async () => {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent. Check your email.");
      setForgotMode(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-8 backdrop-blur-xl shadow-glow relative">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="absolute left-3 top-3 text-muted-foreground hover:text-primary"
        >
          <Link to="/" aria-label="Back to home">
            <Home className="h-4 w-4 mr-1" /> Home
          </Link>
        </Button>
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Music2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to VibeKonect</h1>
          <p className="text-sm text-muted-foreground">Sign in to manage your beats</p>
        </div>

        {forgotMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button onClick={sendReset} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
              {busy ? "Sending…" : "Send reset link"}
            </Button>
            <button type="button" onClick={() => setForgotMode(false)} className="block w-full text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              ← Back to sign in
            </button>
          </div>
        ) : (
        <>
        <Tabs defaultValue={params.get("mode") === "signup" ? "signup" : "signin"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          {(["signin", "signup"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor={`email-${mode}`}>Email</Label>
                <Input id={`email-${mode}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`password-${mode}`}>Password</Label>
                <Input id={`password-${mode}`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button onClick={() => handle(mode)} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
              {mode === "signin" && (
                <button type="button" onClick={() => setForgotMode(true)} className="block w-full text-center text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                  Forgot password?
                </button>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="my-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
        </>
        )}
      </div>
    </main>
  );
};

export default Auth;