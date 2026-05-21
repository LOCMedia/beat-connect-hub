import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SubscribeForm from "@/components/SubscribeForm";

type Props = {
  source: string;
  /** unique key in localStorage to ensure prompt shows only once per visitor */
  storageKey: string;
  /** when this becomes true, the prompt may open (subject to storageKey check) */
  trigger: boolean;
  title?: string;
  description?: string;
};

export default function SmartSubscribePrompt({
  source, storageKey, trigger,
  title = "Don't miss what's next 🎵",
  description = "Get notified about new competitions, beat drops, and winner announcements.",
}: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!trigger) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(storageKey, "1");
    }, 800);
    return () => clearTimeout(t);
  }, [trigger, storageKey]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <SubscribeForm source={source} variant="inline" onSuccess={() => setTimeout(() => setOpen(false), 1500)} />
      </DialogContent>
    </Dialog>
  );
}