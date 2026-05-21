import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Youtube, Instagram, CheckCircle2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackBeatAction } from "@/lib/analytics";

const YT_CHANNEL_ID = "UCAYzINZg12xopAroyyGftpw";
const YT_URL = `https://www.youtube.com/channel/${YT_CHANNEL_ID}?sub_confirmation=1`;
const IG_URL = "https://instagram.com/locbeatx";

export function FollowGateDialog({
  open,
  onOpenChange,
  beatId,
  beatTitle,
  audioUrl,
  requireYoutube,
  requireInstagram,
  onDownloaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beatId: string;
  beatTitle: string;
  audioUrl: string;
  requireYoutube: boolean;
  requireInstagram: boolean;
  onDownloaded?: () => void;
}) {
  const [ytConfirmed, setYtConfirmed] = useState(false);
  const [igConfirmed, setIgConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setYtConfirmed(false);
      setIgConfirmed(false);
    }
  }, [open]);

  const ytOk = !requireYoutube || ytConfirmed;
  const igOk = !requireInstagram || igConfirmed;
  const allOk = ytOk && igOk;

  const triggerDownload = async () => {
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `${beatTitle}.mp3`;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    trackBeatAction(beatId, "share");
    try {
      await supabase.rpc("increment_beat_download" as never, { _beat_id: beatId } as never);
    } catch (e) {
      console.warn("download count failed", e);
    }
    onDownloaded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock download</DialogTitle>
          <DialogDescription className="line-clamp-1">{beatTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {requireYoutube && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <a
                href={YT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-semibold text-white"
              >
                <Youtube className="h-4 w-4" /> Subscribe on YouTube
              </a>
              <Button
                variant={ytConfirmed ? "secondary" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => setYtConfirmed(true)}
                disabled={ytConfirmed}
              >
                {ytConfirmed ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Subscribed</> : "I Subscribed"}
              </Button>
            </div>
          )}
          {requireInstagram && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <a
                href={IG_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Instagram className="h-4 w-4" /> Follow @locbeatx
              </a>
              <Button
                variant={igConfirmed ? "secondary" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => setIgConfirmed(true)}
                disabled={igConfirmed}
              >
                {igConfirmed ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Followed</> : "I Followed"}
              </Button>
            </div>
          )}
          <Button
            className="w-full bg-gradient-primary text-primary-foreground font-semibold"
            disabled={!allOk}
            onClick={triggerDownload}
          >
            <Download className="h-4 w-4 mr-1" /> Download beat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}