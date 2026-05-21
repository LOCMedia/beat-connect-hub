import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Download, Mic, Vote, Loader2, Music2, Headphones, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fallbackGradient } from "@/lib/coverImage";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Contest = {
  id: string;
  title: string;
  description: string | null;
  beat_id: string | null;
  beat_download_url: string | null;
  beat_file_url: string | null;
  beat_release_date: string | null;
  preview_audio_url: string | null;
  start_date: string | null;
  end_date: string | null;
  prize_description: string | null;
  sponsor_name: string | null;
  status: string;
  is_sponsored?: boolean | null;
  sponsor_instagram?: string | null;
  sponsor_logo_url?: string | null;
  sponsor_message?: string | null;
  prize_amount?: string | null;
};

type BeatRow = { id: string; title: string; audio_url: string; preview_audio_url: string | null; cover_image_url: string | null };

type BeatMeta = BeatRow & { genre?: string | null; bpm?: number | null; key?: string | null };

const Competition = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [contest, setContest] = useState<Contest | null>(null);
  const [beat, setBeat] = useState<BeatMeta | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.title = "Freestyle Competition — VibeKonect";
    (async () => {
      const { data } = await supabase
        .from("contests")
        .select("*")
        .in("status", ["active", "voting"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setContest(data as Contest);
        if (data.beat_id) {
          const { data: b } = await supabase
            .from("beats")
            .select("id, title, audio_url, preview_audio_url, cover_image_url, genre, bpm, key")
            .eq("id", data.beat_id)
            .maybeSingle();
          if (b) setBeat(b as BeatMeta);
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = contest?.end_date ? new Date(contest.end_date).getTime() - now : null;

  // Beat availability logic
  const beatUrl = contest?.beat_file_url || contest?.beat_download_url || beat?.audio_url || null;
  const releaseAt = contest?.beat_release_date ? new Date(contest.beat_release_date).getTime() : null;
  const beatAvailable = !!beatUrl && (!releaseAt || releaseAt <= now);
  const beatCountdown = !!beatUrl && releaseAt && releaseAt > now ? releaseAt - now : 0;
  const previewSrc = (contest as any)?.preview_audio_url || beat?.preview_audio_url || null;

  // If contest is in voting phase, default landing is the vote gallery (unless user explicitly opted to see overview)
  if (!loading && contest?.status === "voting" && params.get("view") !== "overview") {
    return <Navigate to="/competition/vote" replace />;
  }

  const handleDownload = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to download the beat." });
      navigate("/auth");
      return;
    }
    if (!beatAvailable || !beatUrl) return;
    // Force download instead of opening in tab
    const a = document.createElement("a");
    const sep = beatUrl.includes("?") ? "&" : "?";
    a.href = `${beatUrl}${sep}download=1`;
    a.download = "";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSubmit = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Log in to submit your entry." });
      navigate("/auth");
      return;
    }
    navigate("/competition/submit");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 sm:py-12 max-w-4xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !contest ? (
          <Card className="text-center py-16">
            <CardContent className="space-y-3">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
              <h1 className="text-2xl font-bold">Next competition coming soon</h1>
              <p className="text-muted-foreground">Check back soon for the next freestyle challenge.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-purple-700 via-fuchsia-700 to-purple-900 p-6 sm:p-10 text-white shadow-glow">
              <div className="flex items-center gap-2 text-yellow-300 font-semibold text-sm uppercase tracking-wider">
                <Trophy className="h-5 w-5" /> Active Challenge
              </div>
              <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold">{contest.title}</h1>
              {contest.description && <p className="mt-3 text-white/90">{contest.description}</p>}
              {contest.is_sponsored && contest.sponsor_instagram && (
                <div className="mt-4 rounded-xl bg-black/30 border border-yellow-300/40 p-3 flex items-center gap-3">
                  {contest.sponsor_logo_url && (
                    <img src={contest.sponsor_logo_url} alt={contest.sponsor_name ?? "Sponsor"} className="h-10 w-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-yellow-300">Sponsored by</div>
                    <div className="font-bold">
                      <a href={`https://instagram.com/${contest.sponsor_instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="underline">
                        @{contest.sponsor_instagram.replace(/^@/, "")}
                      </a>
                      {contest.sponsor_name && <span className="ml-2 text-white/80 font-normal">({contest.sponsor_name})</span>}
                    </div>
                    {contest.sponsor_message && <div className="text-xs text-white/80 mt-1">{contest.sponsor_message}</div>}
                    <div className="text-[11px] text-white/70 mt-1">Entry requires following @{contest.sponsor_instagram.replace(/^@/, "")} on Instagram.</div>
                  </div>
                </div>
              )}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-xs uppercase text-white/70">Prize</div>
                  <div className="font-semibold">{contest.prize_amount || contest.prize_description || "£50 + Free Beat Lease"}</div>
                </div>
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-xs uppercase text-white/70">Deadline</div>
                  <div className="font-mono">
                    {remaining !== null ? (remaining > 0 ? formatRemaining(remaining) : "Closed") : "TBA"}
                  </div>
                </div>
                <div className="rounded-lg bg-black/30 p-3">
                  <div className="text-xs uppercase text-white/70">Sponsor</div>
                  <div className="font-semibold">{contest.sponsor_name || "VibeKonect"}</div>
                </div>
              </div>
            </div>

            {beat && (
              <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur shadow-glow">
                <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-0">
                  <div
                    className="relative aspect-square sm:aspect-auto sm:h-full w-full"
                    style={
                      beat.cover_image_url
                        ? undefined
                        : { background: fallbackGradient(beat.genre || "trap", beat.bpm || 120) }
                    }
                  >
                    {beat.cover_image_url && (
                      <img
                        src={beat.cover_image_url}
                        alt={`${beat.title} cover art`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent sm:bg-gradient-to-r" />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                      <Headphones className="h-3.5 w-3.5 text-primary" /> Official Beat
                    </div>
                  </div>
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Competition Beat — produced by{" "}
                        <a
                          href="https://instagram.com/locbeatx"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          @locbeatx
                        </a>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">{beat.title}</h2>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        {beat.genre && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">
                            <Music2 className="inline h-3 w-3 mr-1" />
                            {beat.genre}
                          </span>
                        )}
                        {beat.bpm && (
                          <span className="rounded-full border border-border px-2 py-0.5 font-semibold">
                            {beat.bpm} BPM
                          </span>
                        )}
                        {beat.key && (
                          <span className="rounded-full border border-border px-2 py-0.5 font-semibold">
                            Key {beat.key}
                          </span>
                        )}
                      </div>
                    </div>
                    <audio
                      controls
                      controlsList="nodownload noplaybackrate noremoteplayback"
                      className="w-full"
                      src={beat.preview_audio_url || beat.audio_url}
                    />
                    <p className="text-xs text-muted-foreground">
                      Preview is watermarked. Logged-in artists can download the clean stems for their freestyle.
                    </p>
                  </CardContent>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="w-full">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block w-full">
                        <Button
                          size="lg"
                          onClick={handleDownload}
                          disabled={!beatAvailable}
                          className={`w-full ${beatAvailable ? "bg-gradient-primary text-primary-foreground hover:opacity-90" : "cursor-not-allowed"}`}
                        >
                          {!beatUrl ? (
                            <>🎵 Beat coming soon</>
                          ) : beatCountdown > 0 ? (
                            <><Lock className="h-4 w-4 mr-2" /> Beat available in {formatCountdown(beatCountdown)}</>
                          ) : (
                            <><Download className="h-4 w-4 mr-2" /> Download Competition Beat</>
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!beatUrl && (
                      <TooltipContent>The competition beat will be available soon</TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {beatCountdown > 0 && (
                  <p className="mt-1 text-center text-[11px] text-muted-foreground tabular-nums">
                    Unlocks {new Date(releaseAt!).toLocaleString()}
                  </p>
                )}
                {beatCountdown > 0 && previewSrc && (
                  <div className="mt-3 rounded-lg border border-border/60 bg-card/60 p-3">
                    <p className="text-[11px] font-semibold mb-1 flex items-center gap-1">
                      <Headphones className="h-3 w-3 text-primary" /> 30-second preview · Full beat unlocks {new Date(releaseAt!).toLocaleDateString()}
                    </p>
                    <PreviewClip src={previewSrc} />
                  </div>
                )}
              </div>
              <Button size="lg" onClick={handleSubmit} className="w-full">
                <Mic className="h-4 w-4 mr-2" /> Submit Entry
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full">
                <Link to="/competition/vote"><Vote className="h-4 w-4 mr-2" /> View & Vote</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

function formatRemaining(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s % 60}s`;
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function PreviewClip({ src }: { src: string }) {
  return (
    <audio
      ref={(el) => {
        if (!el) return;
        const handler = () => { if (el.currentTime >= 30) { el.pause(); el.currentTime = 0; } };
        el.ontimeupdate = handler;
      }}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      src={src}
      className="w-full"
    />
  );
}

export default Competition;