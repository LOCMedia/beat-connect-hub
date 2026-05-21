import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Price } from "@/lib/currency";

type Sponsor = { id: string; business_name: string; email: string };
type Challenge = {
  id: string; title: string; challenge_type: string; status: string;
  prize_amount: number; commission_fee: number; commission_percent: number; duration_days: number;
  start_date: string | null; end_date: string | null; target_link: string;
};

const challengeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  challenge_type: z.enum(["dance", "open_verse"]),
  website_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  instagram_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  twitter_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  sponsor_call_to_action: z.string().trim().max(60).optional().or(z.literal("")),
  accent_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  prize_amount: z.number().int().min(0).max(10_000_00),
  duration_days: z.union([z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
});

const formatGBP = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export default function SponsorDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [defaultPercent, setDefaultPercent] = useState<number>(20);

  // form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState<"dance" | "open_verse">("dance");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [callToAction, setCallToAction] = useState("Visit Website");
  const [accentColor, setAccentColor] = useState("#a855f7");
  const [prizeGBP, setPrizeGBP] = useState("50");
  const [duration, setDuration] = useState<3 | 7 | 14 | 30>(7);
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const prizePence = useMemo(() => Math.round(parseFloat(prizeGBP || "0") * 100), [prizeGBP]);
  const commission = useMemo(
    () => Math.round((prizePence * Number(defaultPercent)) / 100),
    [prizePence, defaultPercent]
  );
  const winnerGets = useMemo(() => Math.max(0, prizePence - commission), [prizePence, commission]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth?redirect=/sponsor/dashboard"); return; }
    (async () => {
      const { data: settings } = await supabase
        .from("app_settings").select("default_commission_percent").maybeSingle();
      if (settings?.default_commission_percent != null) {
        setDefaultPercent(Number(settings.default_commission_percent));
      }
      const { data: s } = await supabase
        .from("sponsors").select("id, business_name, email")
        .eq("user_id", user.id).maybeSingle();
      if (!s) { navigate("/sponsor/signup"); return; }
      setSponsor(s as Sponsor);
      const { data: cs } = await supabase
        .from("sponsored_challenges")
        .select("id, title, challenge_type, status, prize_amount, commission_fee, commission_percent, duration_days, start_date, end_date, target_link")
        .eq("sponsor_id", s.id)
        .order("created_at", { ascending: false });
      setChallenges((cs ?? []) as Challenge[]);
    })();
  }, [user, loading, navigate]);

  const refresh = async () => {
    if (!sponsor) return;
    const { data: cs } = await supabase
      .from("sponsored_challenges")
      .select("id, title, challenge_type, status, prize_amount, commission_fee, commission_percent, duration_days, start_date, end_date, target_link")
      .eq("sponsor_id", sponsor.id)
      .order("created_at", { ascending: false });
    setChallenges((cs ?? []) as Challenge[]);
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsor) return;
    if (!beatFile && !websiteUrl.trim()) {
      toast.error("Upload an audio file or paste a sponsor website URL");
      return;
    }
    const prize_amount = Math.round(parseFloat(prizeGBP || "0") * 100);
    const parsed = challengeSchema.safeParse({
      title, description, challenge_type: challengeType,
      website_url: websiteUrl, instagram_url: instagramUrl, twitter_url: twitterUrl,
      sponsor_call_to_action: callToAction, accent_color: accentColor,
      prize_amount, duration_days: duration,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    let beatUploadPath: string | null = null;
    try {
      if (beatFile) {
        if (beatFile.size > 50 * 1024 * 1024) {
          throw new Error("Audio file must be under 50MB");
        }
        setUploading(true);
        const ext = beatFile.name.split(".").pop()?.toLowerCase() || "mp3";
        const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("sponsored-beats")
          .upload(path, beatFile, { upsert: false, contentType: beatFile.type });
        if (upErr) throw upErr;
        beatUploadPath = path;
        setUploading(false);
      }
    } catch (err) {
      setSubmitting(false);
      setUploading(false);
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return;
    }
    const { error } = await supabase.from("sponsored_challenges").insert({
      sponsor_id: sponsor.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      challenge_type: parsed.data.challenge_type,
      target_link: parsed.data.website_url || "",
      website_url: parsed.data.website_url || null,
      instagram_url: parsed.data.instagram_url || null,
      twitter_url: parsed.data.twitter_url || null,
      sponsor_call_to_action: parsed.data.sponsor_call_to_action || "Visit Website",
      accent_color: parsed.data.accent_color || "#a855f7",
      beat_upload_url: beatUploadPath,
      prize_amount: parsed.data.prize_amount,
      duration_days: parsed.data.duration_days,
      commission_fee: commission,
      commission_percent: defaultPercent,
      status: "pending_payment",
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Challenge drafted — pay commission to submit for review");
    setShowForm(false);
    setTitle(""); setDescription(""); setWebsiteUrl(""); setInstagramUrl("");
    setTwitterUrl(""); setPrizeGBP("50"); setBeatFile(null);
    refresh();
  };

  const payAndSubmit = async (c: Challenge) => {
    // Server-side function enforces ownership + status transition (no client-side bypass).
    const { error } = await supabase.rpc("submit_challenge_for_review", {
      _challenge_id: c.id,
      _payment_ref: `stub_${crypto.randomUUID()}`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Payment recorded (stub). Awaiting admin approval.");
    refresh();
  };

  if (loading || !sponsor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10">Loading…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{sponsor.business_name}</h1>
            <p className="text-muted-foreground">Sponsor dashboard</p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Run a Challenge"}
          </Button>
        </div>

        {showForm && (
          <Card className="p-6">
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <Label>Challenge type</Label>
                <Select value={challengeType} onValueChange={(v) => setChallengeType(v as typeof challengeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dance">Dance Challenge</SelectItem>
                    <SelectItem value="open_verse">Open Verse Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="title">Challenge title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
              </div>
              <div>
                <Label htmlFor="beatfile">
                  {challengeType === "open_verse"
                    ? "Upload beat (MP3/WAV — contestants download to rap/sing over)"
                    : "Upload song (MP3/WAV — contestants download to dance to)"}
                </Label>
                <Input id="beatfile" type="file" accept="audio/mpeg,audio/mp3,audio/wav"
                  onChange={(e) => setBeatFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground mt-1">Stored privately. Contestants get a 24h signed download link. Max 50MB.</p>
              </div>
              <div>
                <Label htmlFor="link">Reference link (optional — IG / YouTube / song page)</Label>
                <Input id="link" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} maxLength={500} placeholder="https://your-website.com" />
                <p className="text-xs text-muted-foreground mt-1">Main call-to-action button on your challenge page.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cta">CTA button label</Label>
                  <Input id="cta" value={callToAction} maxLength={60}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="Listen on Spotify" />
                </div>
                <div>
                  <Label htmlFor="accent">Accent color</Label>
                  <Input id="accent" type="color" value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ig">Instagram URL (optional)</Label>
                  <Input id="ig" type="url" value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourbrand" maxLength={500} />
                </div>
                <div>
                  <Label htmlFor="tw">Twitter / X URL (optional)</Label>
                  <Input id="tw" type="url" value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    placeholder="https://twitter.com/yourbrand" maxLength={500} />
                </div>
              </div>
              <div>
                <Label htmlFor="desc">Rules / description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prize">Prize amount (GBP, paid by you to winner)</Label>
                  <Input id="prize" type="number" min="0" step="1" value={prizeGBP}
                    onChange={(e) => setPrizeGBP(e.target.value)} required />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v) as 3|7|14|30)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Card className="p-4 bg-muted/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prize</span>
                  <span className="font-semibold">{formatGBP(prizePence)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VibeKonect commission ({defaultPercent}%)</span>
                  <span className="font-semibold">{formatGBP(commission)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Winner gets</span>
                  <span className="font-semibold">{formatGBP(winnerGets)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You pay the prize directly to the winner. VibeKonect collects the commission shown above.
                </p>
              </Card>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving…" : "Save draft"}
              </Button>
            </form>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your challenges</h2>
          {challenges.length === 0 && (
            <p className="text-muted-foreground">No challenges yet.</p>
          )}
          <div className="grid gap-3">
            {challenges.map((c) => (
              <Card key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{c.title}</h3>
                    <Badge variant="outline">{c.challenge_type}</Badge>
                    <Badge>{c.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Prize <Price gbpPence={c.prize_amount} secondary /> • Commission <Price gbpPence={c.commission_fee} /> ({c.commission_percent}%) • {c.duration_days}d
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.status === "active" && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/sponsored-challenges/${c.id}`}>View public page</Link>
                    </Button>
                  )}
                  {c.status === "pending_payment" && (
                    <Button size="sm" onClick={() => payAndSubmit(c)}>
                      Pay {formatGBP(c.commission_fee)} (test)
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}