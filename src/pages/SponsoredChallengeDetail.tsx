import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Download, Instagram, Twitter, Globe, Flame, Play, Pause, Trophy, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getVoterId } from "@/lib/voterId";
import { toast } from "sonner";
import { z } from "zod";
import { Price } from "@/lib/currency";

type Challenge = {
  id: string; title: string; description: string | null;
  challenge_type: string; prize_amount: number;
  end_date: string | null; status: string; beat_upload_url: string | null;
  preview_audio_url: string | null;
  website_url: string | null; instagram_url: string | null; twitter_url: string | null;
  sponsor_call_to_action: string | null; accent_color: string | null;
  sponsor_logo_url: string | null;
  sponsors: { business_name: string } | null;
};
type Submission = {
  id: string; display_name: string | null; title: string | null; submission_url: string | null;
  video_upload_url: string | null; audio_upload_url: string | null;
  video_thumbnail_url: string | null;
  notes: string | null; votes: number; user_id: string;
};

const submitSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  title: z.string().trim().max(80).optional().or(z.literal("")),
  submission_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const prettyType = (t: string) =>
  t === "open_verse" ? "Open Verse" : t === "dance" ? "Dance" : t;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB (Fix 7)
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const daysLeft = (end: string | null) => {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

function SubmissionCard({
  s, isDance, accent, onVote,
}: { s: Submission; isDance: boolean; accent: string; onVote: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { await audioRef.current.play(); setPlaying(true); }
  };
  const title = s.title || s.display_name || "Untitled";
  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:shadow-glow"
      style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-black">
        {isDance && s.video_upload_url ? (
          <video
            src={s.video_upload_url}
            poster={s.video_thumbnail_url ?? undefined}
            controls
            playsInline
            controlsList="nodownload"
            className="h-full w-full object-cover"
          />
        ) : isDance ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
            No video
          </div>
        ) : (
          <>
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}55)` }}
            />
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-all group-hover:scale-110">
                {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </div>
            </button>
            {s.audio_upload_url && (
              <audio
                ref={audioRef}
                src={s.audio_upload_url}
                onEnded={() => setPlaying(false)}
                preload="metadata"
              />
            )}
          </>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-xs font-semibold backdrop-blur">
          <Flame className="h-3 w-3 text-heat" />
          <span>{s.votes}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <h3 className="line-clamp-1 text-sm sm:text-base font-bold">{title}</h3>
          {s.title && (
            <p className="text-xs text-muted-foreground line-clamp-1">by {s.display_name}</p>
          )}
          {s.notes && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.notes}</p>}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Button
            size="sm"
            onClick={onVote}
            className="w-full font-semibold"
            style={{ backgroundColor: accent }}
          >
            <Flame className="h-4 w-4 mr-1" /> Vote
          </Button>
          {s.submission_url && (
            <Button asChild size="sm" variant="outline">
              <a href={s.submission_url} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-4 w-4 mr-1" /> Watch on Instagram
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function SponsoredChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [entryTitle, setEntryTitle] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [mySubmission, setMySubmission] = useState<Submission | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement>(null);

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase
      .from("sponsored_challenges_public")
      .select("id, title, description, challenge_type, prize_amount, end_date, status, beat_upload_url, preview_audio_url, website_url, instagram_url, twitter_url, sponsor_call_to_action, accent_color, sponsor_logo_url, sponsors(business_name)")
      .eq("id", id).maybeSingle();
    setChallenge(c as unknown as Challenge);
    const { data: s } = await supabase
      .from("challenge_submissions")
      .select("id, display_name, title, submission_url, video_upload_url, audio_upload_url, video_thumbnail_url, notes, votes, user_id")
      .eq("challenge_id", id)
      .in("status", ["approved", "winner"])
      .order("votes", { ascending: false });
    setSubs((s ?? []) as Submission[]);
    if (user) {
      const { data: mine } = await supabase
        .from("challenge_submissions")
        .select("id, display_name, title, submission_url, video_upload_url, audio_upload_url, video_thumbnail_url, notes, votes, user_id")
        .eq("challenge_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMySubmission((mine as Submission) || null);
    } else {
      setMySubmission(null);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const togglePreview = async () => {
    if (!previewRef.current) return;
    if (previewPlaying) { previewRef.current.pause(); setPreviewPlaying(false); }
    else { await previewRef.current.play(); setPreviewPlaying(true); }
  };

  const downloadBeat = async () => {
    if (!challenge?.beat_upload_url) return;
    if (!user) {
      toast.error("Please sign in to download");
      navigate(`/auth?redirect=/sponsored-challenges/${challenge.id}`);
      return;
    }
    const { data, error } = await supabase.storage
      .from("sponsored-beats")
      .createSignedUrl(challenge.beat_upload_url, 60 * 60 * 24); // 24h
    if (error || !data?.signedUrl) {
      toast.error(error?.message || "Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate(`/auth?redirect=/sponsored-challenges/${id}`); return; }
    if (!challenge) return;
    if (mySubmission) {
      toast.error("You already submitted an entry to this challenge");
      return;
    }

    const isDance = challenge.challenge_type === "dance";
    const isOpenVerse = challenge.challenge_type === "open_verse";

    if (isDance && !videoFile) {
      toast.error("Please upload your dance video");
      return;
    }
    if (isOpenVerse && !audioFile) {
      toast.error("Please upload your verse audio");
      return;
    }
    if (isDance && videoFile && videoFile.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be under 50MB. Please compress before uploading.");
      return;
    }
    if (isOpenVerse && audioFile && audioFile.size > MAX_AUDIO_BYTES) {
      toast.error("Audio must be under 50MB.");
      return;
    }

    const parsed = submitSchema.safeParse({
      display_name: displayName, title: entryTitle, submission_url: submissionUrl, notes,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      let videoUploadUrl: string | null = null;
      let audioUploadUrl: string | null = null;

      if (isDance && videoFile) {
        const ext = videoFile.name.split(".").pop() || "mp4";
        const path = `${user.id}/${challenge.id}/video-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("challenge-submissions")
          .upload(path, videoFile, { upsert: true, contentType: videoFile.type });
        if (upErr) throw upErr;
        videoUploadUrl = supabase.storage.from("challenge-submissions").getPublicUrl(path).data.publicUrl;
      }
      if (isOpenVerse && audioFile) {
        const ext = audioFile.name.split(".").pop() || "mp3";
        const path = `${user.id}/${challenge.id}/audio-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("challenge-submissions")
          .upload(path, audioFile, { upsert: true, contentType: audioFile.type });
        if (upErr) throw upErr;
        audioUploadUrl = supabase.storage.from("challenge-submissions").getPublicUrl(path).data.publicUrl;
      }

      const { data: row, error } = await supabase.from("challenge_submissions").insert({
        challenge_id: challenge.id,
        user_id: user.id,
        display_name: parsed.data.display_name,
        title: parsed.data.title || null,
        submission_url: parsed.data.submission_url || null,
        video_upload_url: videoUploadUrl,
        audio_upload_url: audioUploadUrl,
        notes: parsed.data.notes || null,
        status: "pending",
      }).select("id").single();
      if (error) {
        if ((error as any).code === "23505") {
          throw new Error("You already submitted an entry to this challenge");
        }
        throw error;
      }
      setCreatedId(row.id);
      toast.success("Entry submitted! Awaiting approval.");
      setDisplayName(""); setEntryTitle(""); setSubmissionUrl(""); setNotes("");
      setVideoFile(null); setAudioFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const vote = async (submissionId: string) => {
    const ip = getVoterId();
    const { error } = await supabase.from("challenge_votes").insert({
      submission_id: submissionId, ip_address: ip, user_id: user?.id ?? null,
    });
    if (error) {
      if (error.code === "23505") toast.error("You've already voted for this entry");
      else toast.error(error.message);
      return;
    }
    toast.success("Vote counted!");
    load();
  };

  if (!challenge) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="container py-10">Loading…</main>
      </div>
    );
  }

  const isDance = challenge.challenge_type === "dance";
  const isOpenVerse = challenge.challenge_type === "open_verse";
  const accent = challenge.accent_color || (isDance ? "#fb923c" : "#3b82f6");
  const left = daysLeft(challenge.end_date);
  const ctaLabel = challenge.sponsor_call_to_action?.trim() || "Visit Sponsor's Website";
  const ctaUrl = challenge.website_url || null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-8">
        {/* Hero banner with sponsor branding */}
        <Card
          className="relative overflow-hidden p-6 md:p-8 border-2"
          style={{
            borderColor: accent,
            background: `linear-gradient(135deg, ${accent}22, transparent)`,
          }}
        >
          <div className="flex items-start gap-4 mb-4">
            {challenge.sponsor_logo_url ? (
              <img
                src={challenge.sponsor_logo_url}
                alt={challenge.sponsors?.business_name ?? "Sponsor"}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: accent }}>
                {(challenge.sponsors?.business_name ?? "S")[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                by {challenge.sponsors?.business_name ?? "Sponsor"}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">{challenge.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline">{prettyType(challenge.challenge_type)}</Badge>
                <Badge style={{ backgroundColor: accent }}>
                  <Trophy className="h-3 w-3 mr-1" />
                  <Price gbpPence={challenge.prize_amount} /> prize
                </Badge>
                {left !== null && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {left}d left
                  </Badge>
                )}
                <Badge variant="secondary">{challenge.status}</Badge>
              </div>
            </div>
          </div>

          {challenge.description && (
            <p className="mb-4 whitespace-pre-line text-sm md:text-base">{challenge.description}</p>
          )}

          {/* Beat preview player (Fix 3) */}
          {challenge.preview_audio_url && (
            <Card className="p-4 mb-4 bg-card/80">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  onClick={togglePreview}
                  style={{ backgroundColor: accent }}
                  aria-label={previewPlaying ? "Pause preview" : "Play preview"}
                >
                  {previewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Beat preview</p>
                  <p className="text-xs text-muted-foreground">VibeKonect Challenge Preview · 60s</p>
                  <audio
                    ref={previewRef}
                    src={challenge.preview_audio_url}
                    preload="metadata"
                    onEnded={() => setPreviewPlaying(false)}
                    className="hidden"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Primary actions */}
          <div className="flex flex-wrap gap-2">
            {challenge.beat_upload_url && (
              <Button onClick={downloadBeat} style={{ backgroundColor: accent }}>
                <Download className="h-4 w-4 mr-2" />
                {isOpenVerse ? "Download beat" : "Download song"}
              </Button>
            )}
            {ctaUrl && (
              <Button asChild variant="outline">
                <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4 mr-2" /> {ctaLabel}
                </a>
              </Button>
            )}
            {challenge.instagram_url && (
              <Button asChild variant="outline" size="icon" aria-label="Instagram">
                <a href={challenge.instagram_url} target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
            )}
            {challenge.twitter_url && (
              <Button asChild variant="outline" size="icon" aria-label="Twitter / X">
                <a href={challenge.twitter_url} target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </Card>

        {challenge.status === "active" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>
                {mySubmission ? "Your submission" : `Submit your ${isDance ? "dance video" : "verse"}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mySubmission && !createdId ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="h-14 w-14 mx-auto text-green-500" />
                  <h3 className="text-xl font-bold">You've already entered</h3>
                  <p className="text-muted-foreground">
                    You can only submit one entry per challenge. Status:{" "}
                    <span className="font-semibold">{(mySubmission as any).status ?? "submitted"}</span>
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const el = document.getElementById(`sub-${mySubmission.id}`);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    View my submission
                  </Button>
                </div>
              ) : createdId ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle2 className="h-14 w-14 mx-auto text-green-500" />
                  <h3 className="text-xl font-bold">Entry submitted!</h3>
                  <p className="text-muted-foreground">
                    Pending admin approval. Once approved it will appear in the gallery below.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="dn">Display name</Label>
                    <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required />
                  </div>
                  <div>
                    <Label htmlFor="etitle">Entry title (optional)</Label>
                    <Input id="etitle" value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} maxLength={80} placeholder="My fire verse" />
                  </div>

                  {isDance && (
                    <div>
                      <Label htmlFor="vid">Dance video (MP4 / MOV / WebM, max 50MB)</Label>
                      <Input id="vid" type="file" accept="video/mp4,video/quicktime,video/webm" required
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                      {videoFile && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {(videoFile.size / 1024 / 1024).toFixed(1)}MB / 50MB
                        </p>
                      )}
                    </div>
                  )}

                  {isOpenVerse && (
                    <>
                      <div>
                        <Label htmlFor="aud">Your verse audio (MP3 / WAV)</Label>
                        <Input id="aud" type="file" accept="audio/mpeg,audio/mp3,audio/wav" required
                          onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                      </div>
                      <div>
                        <Label htmlFor="vurl">Video URL (YouTube / IG, optional)</Label>
                        <Input id="vurl" type="url" value={submissionUrl}
                          onChange={(e) => setSubmissionUrl(e.target.value)} placeholder="https://..." maxLength={500} />
                      </div>
                    </>
                  )}

                  {isDance && (
                    <div>
                      <Label htmlFor="igurl">Instagram post link (optional)</Label>
                      <Input id="igurl" type="url" value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)} placeholder="https://instagram.com/..." maxLength={500} />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full" style={{ backgroundColor: accent }}>
                    {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : "Submit entry"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Entries ({subs.length})</h2>
          {subs.length === 0 && <p className="text-muted-foreground">No approved entries yet — be the first!</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subs.map((s) => (
              <div id={`sub-${s.id}`} key={s.id}>
                <SubmissionCard s={s} isDance={isDance} accent={accent} onVote={() => vote(s.id)} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}