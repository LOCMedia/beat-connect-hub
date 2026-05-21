import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Instagram } from "lucide-react";

const IG_URL = "https://instagram.com/locbeatx";

export function DownloadRequestDialog({
  open,
  onOpenChange,
  beatId,
  beatTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beatId: string;
  beatTitle: string;
}) {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Sign in to request a download"); return; }
    if (!confirmed) { toast.error("Please confirm you follow @locbeatx"); return; }
    const ig = handle.trim().replace(/^@/, "");
    if (!ig) { toast.error("Enter your Instagram handle"); return; }
    setSubmitting(true);
    const { error } = await (supabase as any).from("beat_download_requests").insert({
      beat_id: beatId,
      user_id: user.id,
      email: user.email,
      instagram_handle: ig,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted — admin will review");
    onOpenChange(false);
    setHandle("");
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request download</DialogTitle>
          <DialogDescription className="line-clamp-1">{beatTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <a
            href={IG_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
          >
            <Instagram className="h-4 w-4" /> Follow @locbeatx on Instagram
          </a>
          <div>
            <Label htmlFor="ig-handle">Your Instagram handle</Label>
            <Input id="ig-handle" placeholder="yourhandle" value={handle} onChange={(e) => setHandle(e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            <span>I confirm I follow <strong>@locbeatx</strong> on Instagram.</span>
          </label>
          <Button onClick={submit} disabled={submitting || !confirmed || !handle.trim()} className="w-full">
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Your request will be reviewed. You'll be contacted at {user?.email || "your account email"} once approved.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
