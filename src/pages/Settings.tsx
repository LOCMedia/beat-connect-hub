import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, KeyRound } from "lucide-react";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Min 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

const Settings = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Settings · VibeKonect";
  }, []);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const changePassword = async () => {
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Password updated");
      setPassword("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setBusy(true);
    try {
      // Cascades will clean profile + roles via FK ON DELETE CASCADE on profiles.
      // Auth user deletion requires admin; we sign out and inform user.
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      await signOut();
      toast.success(
        "Profile deleted. Contact support to fully delete your account.",
      );
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and security.
          </p>
        </div>

        <section className="rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Change password</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button
            onClick={changePassword}
            disabled={busy}
            className="bg-gradient-primary text-primary-foreground font-semibold w-full sm:w-auto"
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
        </section>

        <section className="rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold">Account</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Signed in as{" "}
            <span className="font-mono text-foreground">{user?.email}</span>
          </p>

          <div className="pt-2 border-t border-border/60">
            <h3 className="font-semibold text-destructive mb-1">Danger zone</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Deleting your profile removes your username, avatar, bio, and
              activity. This cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy}>
                  Delete my profile
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove your VibeKonect profile data.
                    Your auth account will remain — contact support to fully
                    close it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Settings;