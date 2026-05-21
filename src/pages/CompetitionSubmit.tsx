import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Share2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { sendTransactionalEmail } from "@/lib/sendEmail";
import { generateAndUploadEntryCover } from "@/lib/entryCover";
import { FollowConfirmCheckbox } from "@/components/FollowConfirmCheckbox";

const CompetitionSubmit = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contestId, setContestId] = useState<string | null>(null);
  const [contestTitle, setContestTitle] = useState<string>("");
  const [sponsorIg, setSponsorIg] = useState<string | null>(null);
  const [sponsorName, setSponsorName] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdEntryId, setCreatedEntryId] = useState<string | null>(null);
  const [coverGenerating, setCoverGenerating] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [followConfirmed, setFollowConfirmed] = useState(false);
  const [sponsorFollowConfirmed, setSponsorFollowConfirmed] = useState(false);

  useEffect(() => {
    document.title = "Submit Entry — VibeKonect Competition";
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    supabase
      .from("contests")
      .select("id, title, is_sponsored, sponsor_instagram, sponsor_name")
      .in("status", ["active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setContestId(data.id);
          setContestTitle(data.title);
          const c = data as { is_sponsored?: boolean | null; sponsor_instagram?: string | null; sponsor_name?: string | null };
          if (c.is_sponsored && c.sponsor_instagram) {
            setSponsorIg(c.sponsor_instagram.replace(/^@/, ""));
            setSponsorName(c.sponsor_name ?? null);
          }
        }
      });
    if (user?.email) setArtistName(user.email.split("@")[0]);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !contestId || !audioFile) {
      toast({ title: "Missing info", description: "Audio file is required.", variant: "destructive" });
      return;
    }
    if (!followConfirmed) {
      toast({ title: "Follow required", description: "Please confirm you follow @locbeatx on Instagram.", variant: "destructive" });
      return;
    }
    if (sponsorIg && !sponsorFollowConfirmed) {
      toast({ title: "Sponsor follow required", description: `You must follow @${sponsorIg} to enter this sponsored competition.`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ext = audioFile.name.split(".").pop() || "mp3";
      const path = `${contestId}/${user.id}/freestyle-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("competition-entries")
        .upload(path, audioFile, { upsert: true, contentType: audioFile.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("competition-entries").getPublicUrl(path);
      const { data: entry, error: insErr } = await supabase
        .from("contest_entries")
        .insert({
          contest_id: contestId,
          user_id: user.id,
          artist_name: artistName,
          instagram: instagram || null,
          freestyle_audio_url: pub.publicUrl,
          video_url: videoUrl || null,
          confirmed_follow: true,
          sponsor_follow_confirmed: sponsorIg ? sponsorFollowConfirmed : false,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      setCreatedEntryId(entry.id);
      toast({ title: "Entry submitted!", description: "Pending admin approval." });
      if (user.email) {
        sendTransactionalEmail({
          templateName: "competition-submission-received",
          recipientEmail: user.email,
          idempotencyKey: `comp-submit-${entry.id}`,
          templateData: { artistName, contestTitle },
        });
      }

      // Kick off AI cover generation in the background; don't block UX.
      setCoverGenerating(true);
      void (async () => {
        const url = await generateAndUploadEntryCover({
          entryId: entry.id,
          userId: user.id,
          artistName,
          beatTitle: contestTitle,
        });
        if (url) {
          await supabase
            .from("contest_entries")
            .update({ cover_image_url: url })
            .eq("id", entry.id);
          setCoverUrl(url);
        }
        setCoverGenerating(false);
      })();
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
        {createdEntryId ? (
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h1 className="text-2xl font-bold">Entry submitted!</h1>
              <p className="text-muted-foreground">
                Your freestyle is pending admin approval. Once approved you can share your entry page.
              </p>

              <div className="mx-auto w-40 aspect-square rounded-xl overflow-hidden border border-border/60 bg-muted flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt="Generated cover art" className="h-full w-full object-cover" />
                ) : coverGenerating ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-6 w-6 animate-pulse text-primary" />
                    Generating cover…
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="h-6 w-6 text-muted-foreground/60" />
                    No cover
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button asChild>
                  <Link to={`/competition/entry/${createdEntryId}`}>
                    <Share2 className="h-4 w-4 mr-2" /> View my entry
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/competition/vote">Browse all entries</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Submit your freestyle</CardTitle></CardHeader>
            <CardContent>
              {!contestId ? (
                <p className="text-muted-foreground">No active competition is open for entries.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="artist">Artist name</Label>
                    <Input id="artist" value={artistName} onChange={(e) => setArtistName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="ig">Instagram handle (optional)</Label>
                    <Input id="ig" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="audio">Freestyle audio (MP3)</Label>
                    <Input id="audio" type="file" accept="audio/mpeg,audio/mp3,audio/wav" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                  </div>
                  <div>
                    <Label htmlFor="video">Video URL (YouTube / IG Reel) — gets +50 bonus votes</Label>
                    <Textarea id="video" rows={2} placeholder="https://..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                  </div>
                  <FollowConfirmCheckbox checked={followConfirmed} onCheckedChange={setFollowConfirmed} />
                  {sponsorIg && (
                    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 space-y-2">
                      <p className="text-sm font-semibold">
                        This competition is sponsored by{" "}
                        <a href={`https://instagram.com/${sponsorIg}`} target="_blank" rel="noreferrer" className="text-primary underline">
                          @{sponsorIg}
                        </a>
                        {sponsorName && <span className="text-muted-foreground font-normal"> ({sponsorName})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">You must follow them on Instagram to enter.</p>
                      <a
                        href={`https://instagram.com/${sponsorIg}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-xs font-semibold text-primary underline"
                      >
                        Open Instagram → @{sponsorIg}
                      </a>
                      <label className="flex items-start gap-2 text-sm cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={sponsorFollowConfirmed}
                          onChange={(e) => setSponsorFollowConfirmed(e.target.checked)}
                        />
                        <span>I follow <strong>@{sponsorIg}</strong> on Instagram</span>
                      </label>
                    </div>
                  )}
                  <Button type="submit" disabled={submitting || !followConfirmed} className="w-full">
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Submit entry"}
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

export default CompetitionSubmit;
