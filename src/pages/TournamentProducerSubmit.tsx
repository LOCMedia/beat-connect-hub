import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { notifyTournamentEvent } from "@/lib/tournamentNotify";

type Tournament = { id: string; name: string; status: string };
type FeeSettings = { producer_fee_enabled: boolean; producer_fee_pence: number };

const TournamentProducerSubmit = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialId = params.get("t");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>(initialId || "");
  const [producerName, setProducerName] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [keySig, setKeySig] = useState("");
  const [instagram, setInstagram] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [watermarkAttested, setWatermarkAttested] = useState(false);
  const [fee, setFee] = useState<FeeSettings>({ producer_fee_enabled: false, producer_fee_pence: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Submit Beat — VibeKonect Crown";
    if (!authLoading && !user) navigate("/auth?redirect=/tournament/producer-submit");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("id, name, status")
        .eq("category", "beat_freestyle")
        .in("status", ["submissions_open", "in_progress"])
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      if (!initialId && data && data.length === 1) setTournamentId(data[0].id);
    })();
    (async () => {
      const { data: s } = await (supabase as any)
        .from("app_settings")
        .select("producer_fee_enabled, producer_fee_pence")
        .maybeSingle();
      if (s) setFee(s);
    })();
    if (user?.email) setProducerName(user.email.split("@")[0]);
  }, [user, initialId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tournamentId || !audioFile || !title) {
      toast({ title: "Missing info", description: "Tournament, title and audio required.", variant: "destructive" });
      return;
    }
    if (!watermarkAttested) {
      toast({
        title: "Watermark required",
        description: "Beat must include your producer tag/watermark (e.g. LocBeatX). Tick the confirmation to continue.",
        variant: "destructive",
      });
      return;
    }
    if (fee.producer_fee_enabled && fee.producer_fee_pence > 0) {
      toast({
        title: "Payment required",
        description: "Producer fee is enabled but Stripe checkout isn't connected yet. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const ext = audioFile.name.split(".").pop() || "mp3";
      const path = `${user.id}/${tournamentId}/beat-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tournament-submissions")
        .upload(path, audioFile, { upsert: true, contentType: audioFile.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("tournament-submissions").getPublicUrl(path);

      let coverUrl: string | null = null;
      if (coverFile) {
        const cExt = coverFile.name.split(".").pop() || "jpg";
        const cPath = `${user.id}/${tournamentId}/cover-${Date.now()}.${cExt}`;
        const { error: cErr } = await supabase.storage
          .from("tournament-submissions")
          .upload(cPath, coverFile, { upsert: true, contentType: coverFile.type });
        if (!cErr) {
          const { data: cPub } = supabase.storage.from("tournament-submissions").getPublicUrl(cPath);
          coverUrl = cPub.publicUrl;
        }
      }

      const { error: insErr } = await (supabase as any)
        .from("tournament_producer_beats")
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          producer_name: producerName,
          title,
          genre: genre || null,
          bpm: bpm ? Number(bpm) : null,
          key: keySig || null,
          instagram: instagram || null,
          audio_url: pub.publicUrl,
          cover_image_url: coverUrl,
          watermark_attested: true,
          payment_status: fee.producer_fee_enabled && fee.producer_fee_pence > 0 ? "pending" : "waived",
        });
      if (insErr) throw insErr;
      // Fire beat_approved notification (auto-approved on insert)
      const tournamentName = tournaments.find((t) => t.id === tournamentId)?.name;
      await notifyTournamentEvent({
        event: "beat_approved",
        userIds: [user.id],
        tournamentId,
        templateData: { producerName, beatTitle: title, tournamentName },
        link: `${window.location.origin}/tournament/beat-pool?t=${tournamentId}`,
      });
      setDone(true);
      toast({ title: "Beat submitted!", description: "Auto-approved into the pool." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-2xl">
        {done ? (
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h1 className="text-2xl font-bold">Beat is in the pool!</h1>
              <p className="text-muted-foreground">
                Artists can now pick your beat for their freestyle. If a freestyler advances, your
                beat earns a 🏆 Tournament Winner badge.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button asChild>
                  <Link to="/tournament/beat-freestyle">Back to tournament</Link>
                </Button>
                <Button asChild variant="outline" onClick={() => setDone(false)}>
                  <Link to="/tournament/producer-submit">Submit another</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" /> Drop a beat in the pool
                {(!fee.producer_fee_enabled || fee.producer_fee_pence === 0) ? (
                  <Badge className="ml-auto">FREE</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-auto">£{(fee.producer_fee_pence / 100).toFixed(2)} to enter</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <p className="text-muted-foreground">
                  No beat freestyle tournaments are accepting beats right now.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {(!fee.producer_fee_enabled || fee.producer_fee_pence === 0) && (
                    <Alert>
                      <AlertDescription className="text-xs">
                        Submit your beat — currently <span className="font-semibold text-primary">FREE</span>. Paid entries unlock prize-pool funding later.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div>
                    <Label>Tournament</Label>
                    <Select value={tournamentId} onValueChange={setTournamentId}>
                      <SelectTrigger><SelectValue placeholder="Pick a tournament" /></SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="producer">Producer name</Label>
                    <Input id="producer" value={producerName} onChange={(e) => setProducerName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="title">Beat title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="genre">Genre</Label>
                      <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="bpm">BPM</Label>
                      <Input id="bpm" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="key">Key</Label>
                      <Input id="key" value={keySig} onChange={(e) => setKeySig(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ig">Instagram (optional)</Label>
                    <Input id="ig" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="audio">60-second beat (watermarked MP3 / WAV)</Label>
                    <Input id="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                    <p className="text-xs text-muted-foreground mt-1">Add an audio watermark/tag to protect your beat.</p>
                  </div>
                  <div>
                    <Label htmlFor="cover">Cover image (optional)</Label>
                    <Input id="cover" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-3 bg-muted/30">
                    <Checkbox
                      checked={watermarkAttested}
                      onCheckedChange={(v) => setWatermarkAttested(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs leading-snug">
                      I confirm this beat contains my <span className="font-semibold">producer tag / watermark</span>{" "}
                      (e.g. "LocBeatX") so it can't be stolen by artists who download it.
                    </span>
                  </label>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Submit beat"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TournamentProducerSubmit;