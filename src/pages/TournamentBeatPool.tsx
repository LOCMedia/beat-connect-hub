import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Mic, Music2, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WaveformPlayer } from "@/components/WaveformPlayer";

type Tournament = { id: string; name: string; status: string };
type Beat = {
  id: string;
  tournament_id: string;
  producer_name: string;
  title: string;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  audio_url: string;
  cover_image_url: string | null;
  is_winner: boolean;
};

const TournamentBeatPool = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTId = params.get("t") || "";

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>(initialTId);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [pickedBeat, setPickedBeat] = useState<Beat | null>(null);

  const [artistName, setArtistName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Beat Pool — VibeKonect Crown";
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("id, name, status")
        .eq("category", "beat_freestyle")
        .in("status", ["submissions_open", "in_progress"])
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      if (!tournamentId && data && data.length === 1) setTournamentId(data[0].id);
    })();
    if (user?.email) setArtistName(user.email.split("@")[0]);
  }, [user]);

  useEffect(() => {
    if (!tournamentId) { setBeats([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("tournament_producer_beats")
        .select("*")
        .eq("tournament_id", tournamentId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setBeats(data || []);
    })();
  }, [tournamentId]);

  const handlePick = (b: Beat) => {
    if (!user) {
      navigate(`/auth?redirect=/tournament/beat-pool?t=${b.tournament_id}`);
      return;
    }
    setPickedBeat(b);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pickedBeat || !audioFile) {
      toast({ title: "Missing info", description: "Pick a beat and upload your freestyle.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing } = await (supabase as any)
        .from("tournament_artist_submissions")
        .select("id")
        .eq("tournament_id", pickedBeat.tournament_id)
        .eq("user_id", user.id)
        .neq("status", "rejected")
        .maybeSingle();
      if (existing) {
        toast({
          title: "Already entered",
          description: "You already submitted an entry to this tournament. One entry per artist per category.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      const ext = audioFile.name.split(".").pop() || "mp3";
      const path = `${user.id}/${pickedBeat.tournament_id}/freestyle-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tournament-submissions")
        .upload(path, audioFile, { upsert: true, contentType: audioFile.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("tournament-submissions").getPublicUrl(path);

      const { error: insErr } = await (supabase as any)
        .from("tournament_artist_submissions")
        .insert({
          tournament_id: pickedBeat.tournament_id,
          user_id: user.id,
          artist_name: artistName,
          instagram: instagram || null,
          audio_url: pub.publicUrl,
          video_url: videoUrl || null,
          beat_id: pickedBeat.id,
        });
      if (insErr) {
        const dup = insErr.code === "23505" || /unique|duplicate/i.test(insErr.message);
        throw new Error(dup
          ? "You already submitted an entry to this tournament. One entry per artist per category."
          : insErr.message);
      }
      setDone(true);
      toast({ title: "Freestyle submitted!", description: "Pending admin qualification." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 max-w-2xl">
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h1 className="text-2xl font-bold">You're in the running!</h1>
              <p className="text-muted-foreground">
                Admins will qualify the top 16. If you advance, the producer of your beat advances too.
              </p>
              <Button asChild>
                <Link to="/tournament/beat-freestyle">Back to tournament</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <Music2 className="h-6 w-6 text-primary" /> Beat Pool
            </h1>
            <p className="text-sm text-muted-foreground">Pick a beat, upload your 60-second freestyle.</p>
          </div>
          <div className="min-w-[220px]">
            <Label className="text-xs">Tournament</Label>
            <Select value={tournamentId} onValueChange={(v) => { setTournamentId(v); setPickedBeat(null); }}>
              <SelectTrigger><SelectValue placeholder="Pick a tournament" /></SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {pickedBeat && (
          <Card className="border-primary/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                Freestyle on: <span className="text-primary">{pickedBeat.title}</span>
                <span className="text-xs text-muted-foreground">by {pickedBeat.producer_name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Alert>
                  <AlertDescription className="text-xs">
                    ⚠️ One entry per artist per tournament. Pick the beat you'll go all in on.
                  </AlertDescription>
                </Alert>
                <WaveformPlayer url={pickedBeat.audio_url} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="artist">Artist name</Label>
                    <Input id="artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="ig">Instagram (optional)</Label>
                    <Input id="ig" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="audio">Your 60-second freestyle (MP3 / WAV)</Label>
                  <Input id="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label htmlFor="video">Video URL (optional)</Label>
                  <Input id="video" placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Submit freestyle"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPickedBeat(null)}>Pick a different beat</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!tournamentId ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">Pick a tournament to see beats.</CardContent></Card>
        ) : beats.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">No beats yet. Check back soon — or become a producer to submit beats.</p>
              <Button asChild size="sm" variant="outline">
                <Link to={`/tournament/producer-submit?t=${tournamentId}`}>
                  <Headphones className="h-3 w-3 mr-1" /> Be the first producer to drop one
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {beats.map((b) => (
              <Card key={b.id} className={pickedBeat?.id === b.id ? "border-primary" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold leading-tight">{b.title}</h3>
                      <p className="text-xs text-muted-foreground">by {b.producer_name}</p>
                    </div>
                    {b.is_winner && <Badge className="text-[10px]">🏆 Winner</Badge>}
                  </div>
                  <div className="flex gap-1 flex-wrap text-[10px]">
                    {b.genre && <Badge variant="secondary">{b.genre}</Badge>}
                    {b.bpm && <Badge variant="secondary">{b.bpm} BPM</Badge>}
                    {b.key && <Badge variant="secondary">{b.key}</Badge>}
                  </div>
                  <WaveformPlayer url={b.audio_url} height={56} />
                  <Button size="sm" className="w-full" onClick={() => handlePick(b)}>
                    Pick this beat
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentBeatPool;