import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Beat } from "./BeatCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beat: Beat;
}

export const StemPlayerModal = ({ open, onOpenChange, beat }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{beat.title} — Stem Player</DialogTitle>
          <DialogDescription>
            Adjust tempo, mute parts, and try the beat in your DAW preview.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-secondary">
          <iframe
            src="https://soundation.com/embed/player/example"
            title={`Stem player for ${beat.title}`}
            className="h-full w-full"
            allow="autoplay"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Replace the embed URL with your Soundation project ID.
        </p>
      </DialogContent>
    </Dialog>
  );
};