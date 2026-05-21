import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Phone, Check, Music, FileAudio, Layers, Infinity as InfinityIcon, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudioChat } from "@/components/StudioChat/StudioChatProvider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Beat } from "@/components/BeatCard";

type Tier = {
  id: "mp3" | "wav" | "stems" | "unlimited" | "exclusive";
  name: string;
  priceCents: number;
  icon: React.ComponentType<{ className?: string }>;
  terms: string[];
  highlight?: boolean;
};

const defaults = {
  mp3: 2999,
  wav: 4999,
  stems: 9995,
  unlimited: 14995,
  exclusive: 59995,
};

const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

const buildTiers = (beat: Beat & Record<string, unknown>): Tier[] => [
  {
    id: "mp3", name: "MP3 Lease", icon: Music,
    priceCents: (beat.license_mp3_price as number) ?? defaults.mp3,
    terms: ["Untagged MP3 file", "Up to 50,000 streams", "1 music video", "Non-profit live performances", "50/50 royalty split", "1-year term"],
  },
  {
    id: "wav", name: "WAV Lease", icon: FileAudio,
    priceCents: (beat.license_wav_price as number) ?? defaults.wav,
    terms: ["High-quality WAV + MP3", "Up to 150,000 streams", "1 music video", "Non-profit radio plays", "50/50 royalty split", "1-year term"],
  },
  {
    id: "stems", name: "STEMS Lease", icon: Layers,
    priceCents: (beat.license_stems_price as number) ?? defaults.stems,
    terms: ["WAV + MP3 + Track-out stems", "Up to 500,000 streams", "2 music videos", "Radio rights included", "50/50 royalty split", "2-year term"],
    highlight: true,
  },
  {
    id: "unlimited", name: "Unlimited Lease", icon: InfinityIcon,
    priceCents: (beat.license_unlimited_price as number) ?? defaults.unlimited,
    terms: ["WAV + MP3 + Stems", "Unlimited streams", "Unlimited videos", "Radio + sync rights", "50/50 royalty split", "Perpetual term"],
  },
  {
    id: "exclusive", name: "Exclusive Rights", icon: Crown,
    priceCents: (beat.license_exclusive_price as number) ?? defaults.exclusive,
    terms: ["Full ownership transfer", "Beat removed from store", "Unlimited everything", "Keep 100% of master royalties", "Producer keeps publishing only", "Perpetual & exclusive"],
  },
];

const leadSchema = z.object({
  full_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  instagram_handle: z.string().trim().max(50).optional().or(z.literal("")),
});

export function LicenseDialog({
  beat, open, onOpenChange,
}: { beat: (Beat & Record<string, unknown>) | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openWithUser } = useStudioChat();
  const [selected, setSelected] = useState<Tier["id"] | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadIg, setLeadIg] = useState("");
  const [followsLoc, setFollowsLoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  if (!beat) return null;
  const isFree = Boolean((beat as Record<string, unknown>).is_free);
  const tiers = buildTiers(beat);
  const selectedTier = tiers.find((t) => t.id === selected);

  const prefill = () => {
    const lic = selectedTier ? ` — ${selectedTier.name} (${fmt(selectedTier.priceCents)})` : "";
    const url = `${window.location.origin}/?beat=${beat.id}`;
    return `Hi! I'd like to license this beat:\n\n🎵 ${beat.title} • ${beat.genre} • ${beat.bpm} BPM • ${beat.key}${lic}\n🔗 ${url}`;
  };

  const openChat = async () => {
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }
    let producerId = beat.user_id || null;
    if (!producerId) {
      const { data } = await supabase.from("beats").select("user_id").eq("id", beat.id).maybeSingle();
      producerId = data?.user_id || null;
    }
    if (!producerId) { toast.error("Producer unavailable"); return; }
    await openWithUser(producerId);
    try {
      const { data: ch } = await (supabase as any).rpc("get_or_create_dm_channel", { _other_user: producerId });
      if (ch) await (supabase as any).from("chat_messages").insert({ channel_id: ch, user_id: user.id, message: prefill() });
    } catch (e) { console.warn(e); }
    onOpenChange(false);
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/447482446078?text=${encodeURIComponent(prefill())}`, "_blank", "noopener,noreferrer");
  };

  const submitLead = async () => {
    const parsed = leadSchema.safeParse({ full_name: leadName, email: leadEmail, instagram_handle: leadIg });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!followsLoc) return toast.error("Please follow @locbeatx on Instagram to download");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-free-beat-download", {
        body: {
          beat_id: beat.id,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          instagram_handle: parsed.data.instagram_handle || "",
          follows_locbeatx: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(typeof (data as any).error === "string" ? (data as any).error : "Submit failed");
      const url = (data as any)?.download_url as string | undefined;
      if (url) {
        setDownloadUrl(url);
        // Auto-trigger download immediately
        const a = document.createElement("a");
        a.href = url;
        a.download = `${beat.title}.mp3`;
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setSubmitted(true);
      toast.success("Download started! Email backup link sent.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isFree ? "Free download" : "Choose your license"}</DialogTitle>
          <DialogDescription className="line-clamp-1">{beat.title} • {beat.genre} • {beat.bpm} BPM • {beat.key}</DialogDescription>
        </DialogHeader>

        {isFree ? (
          submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-lg font-semibold">Your download is ready!</p>
              <p className="text-sm text-muted-foreground">
                We also sent a backup link to <strong>{leadEmail}</strong> (valid for 48 hours).
              </p>
              {downloadUrl && (
                <Button
                  asChild
                  className="bg-gradient-primary text-primary-foreground"
                >
                  <a href={downloadUrl} download={`${beat.title}.mp3`} rel="noreferrer">
                    Download again
                  </a>
                </Button>
              )}
              <div>
                <Button variant="outline" onClick={() => { setSubmitted(false); setDownloadUrl(null); onOpenChange(false); }}>Close</Button>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Fill out the form to get your free download link by email.</p>
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email address *</Label>
              <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Instagram handle (optional)</Label>
              <Input value={leadIg} onChange={(e) => setLeadIg(e.target.value)} placeholder="@yourhandle" />
            </div>
            <a
              href="https://instagram.com/locbeatx"
              target="_blank"
              rel="noreferrer"
              className="block text-center text-xs font-semibold text-primary underline"
            >
              Open Instagram → @locbeatx
            </a>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={followsLoc} onCheckedChange={(v) => setFollowsLoc(v === true)} />
              <span>I follow <strong>@locbeatx</strong> on Instagram *</span>
            </label>
            <Button onClick={submitLead} disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground">
              {submitting ? "Sending…" : "Get free download"}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              By submitting, you'll receive a download link by email. You can unsubscribe anytime.
            </p>
          </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tiers.map((t) => {
                const Icon = t.icon;
                const active = selected === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={`text-left rounded-xl border p-4 transition ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/40"} ${t.highlight ? "ring-1 ring-primary/30" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-lg font-bold mt-0.5">{fmt(t.priceCents)}</p>
                    <ul className="mt-2 space-y-1">
                      {t.terms.map((term) => (
                        <li key={term} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <Check className="h-3 w-3 mt-0.5 shrink-0 text-primary/70" />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
              <Button onClick={openChat} disabled={!selected} className="flex-1 bg-gradient-primary text-primary-foreground">
                <MessageSquare className="h-4 w-4 mr-2" /> Chat with Producer
              </Button>
              <Button onClick={openWhatsApp} disabled={!selected} variant="outline" className="flex-1 text-green-500 border-green-500/40 hover:bg-green-500/10">
                <Phone className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
            {!selected && <p className="text-xs text-center text-muted-foreground">Select a license to continue</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}