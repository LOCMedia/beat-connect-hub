import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { FollowConfirmCheckbox } from "@/components/FollowConfirmCheckbox";
import { useMemo } from "react";

type Tournament = { id: string; name: string; category: string; status: string };

const TournamentArtistSubmit = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialId = params.get("t");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentId, setTournamentId] = useState<string>(initialId || "");
  const [artistName, setArtistName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [followConfirmed, setFollowConfirmed] = useState(false);
  const audioPreviewUrl = useMemo(
    () => (audioFile ? URL.createObjectURL(audioFile) : null),
    [audioFile]
  );

  useEffect(() => {
    document.title = "Submit Entry — VibeKonect Crown";
    if (!authLoading && !user) navigate("/auth?redirect=/tournament/artist-submit");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("id, name, category, status")
        .eq("status", "submissions_open")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      if (!initialId && data && data.length === 1) setTournamentId(data[0].id);
    })();
    if (user?.email) setArtistName(user.email.split("@")[0]);
  }, [user, initialId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !tournamentId || !audioFile) {
      toast({ title: "Missing info", description: "Tournament + audio required.", variant: "destructive" });
      return;
    }
    if (!followConfirmed) {
      toast({ title: "Follow required", description: "Please confirm you follow @locbeatx on Instagram.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Pre-flight: one entry per artist per tournament
      const { data: existing } = await (supabase as any)
        .from("tournament_artist_submissions")
        .select("id, status")
        .eq("tournament_id", tournamentId)
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
      const path = `${user.id}/${tournamentId}/acapella-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tournament-submissions")
        .upload(path, audioFile, { upsert: true, contentType: audioFile.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("tournament-submissions").getPublicUrl(path);

      const { error: insErr } = await (supabase as any)
        .from("tournament_artist_submissions")
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          artist_name: artistName,
          instagram: instagram || null,
          audio_url: pub.publicUrl,
          video_url: videoUrl || null,
          confirmed_follow: true,
        });
      if (insErr) {
        const dup = insErr.code === "23505" || /unique|duplicate/i.test(insErr.message);
        throw new Error(dup
          ? "You already submitted an entry to this tournament. One entry per artist per category."
          : insErr.message);
      }
      setDone(true);
      toast({ title: "Submitted!", description: "Pending admin qualification." });
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
              <h1 className="text-2xl font-bold">You're in the running!</h1>
              <p className="text-muted-foreground">
                Admins will review submissions and qualify the top 16. You'll be notified if you advance.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button asChild>
                  <Link to="/tournament/acapella">Back to bracket</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" /> Submit your acapella
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <p className="text-muted-foreground">
                  No tournaments are open for submissions right now.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Alert>
                    <AlertDescription className="text-xs">
                      ⚠️ One entry per artist per tournament. Make it count.
                    </AlertDescription>
                  </Alert>
                  <div>
                    <Label>Tournament</Label>
                    <Select value={tournamentId} onValueChange={setTournamentId}>
                      <SelectTrigger><SelectValue placeholder="Pick a tournament" /></SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="artist">Artist name</Label>
                    <Input id="artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="ig">Instagram (optional)</Label>
                    <Input id="ig" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="audio">60-second acapella (MP3 / WAV)</Label>
                    <Input id="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                    <p className="text-xs text-muted-foreground mt-1">Vocals only. No beat.</p>
                    {audioPreviewUrl && (
                      <div className="mt-3">
                        <WaveformPlayer url={audioPreviewUrl} height={56} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="video">Video URL (optional)</Label>
                    <Input id="video" placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                  </div>
                  <FollowConfirmCheckbox checked={followConfirmed} onCheckedChange={setFollowConfirmed} />
                  <Button type="submit" disabled={submitting || !followConfirmed} className="w-full">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Submit entry"}
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

export default TournamentArtistSubmit;
