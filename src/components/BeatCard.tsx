import { useCallback, useEffect, useState } from "react";
import { Play, Pause, Flame, MessageSquare, MessageCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { trackBeatAction } from "@/lib/analytics";
import { fallbackGradient } from "@/lib/coverImage";
import { useGlobalPlayer } from "@/components/player/GlobalPlayer";
import { BeatCommentsDialog } from "@/components/BeatCommentsDialog";
import { DownloadRequestDialog } from "@/components/DownloadRequestDialog";
import { FollowGateDialog } from "@/components/FollowGateDialog";
import { LyricGeneratorDialog } from "@/components/LyricGeneratorDialog";
import { LicenseDialog } from "@/components/LicenseDialog";
import { SaleBadge, isSaleLive, type FlashSale } from "@/components/SaleBadge";
import { Price } from "@/lib/currency";
import { useStudioChat } from "@/components/StudioChat/StudioChatProvider";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getVoterId } from "@/lib/voterId";

const REACTION_EMOJIS = ["🔥", "❤️", "🎤", "💯", "👑"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export interface Beat {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
  audio_url: string;
  play_count: number;
  user_id?: string | null;
  cover_image_url?: string | null;
  starter_plays?: number | null;
  download_enabled?: boolean | null;
  download_type?: "free" | "follow_gated" | string | null;
  price_pence?: number | null;
  compare_at_price_pence?: number | null;
  currency?: string | null;
  require_youtube_follow?: boolean | null;
  require_instagram_follow?: boolean | null;
  download_count?: number | null;
  is_free?: boolean | null;
}

export const BeatCard = ({ beat }: { beat: Beat }) => {
  const player = useGlobalPlayer();
  const isCurrent = player.current?.id === beat.id;
  const playing = isCurrent && player.playing;
  const progress = isCurrent ? player.progress : 0;
  const duration = isCurrent ? player.duration : 0;
  const [localCount, setLocalCount] = useState(beat.play_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [followGateOpen, setFollowGateOpen] = useState(false);
  const [downloadCount, setDownloadCount] = useState<number>(beat.download_count ?? 0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionEmoji, number>>({
    "🔥": 0,
    "❤️": 0,
    "🎤": 0,
    "💯": 0,
    "👑": 0,
  });
  const [myReactions, setMyReactions] = useState<Set<ReactionEmoji>>(new Set());
  const [commentCount, setCommentCount] = useState(0);
  const [sale, setSale] = useState<FlashSale | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openWithUser } = useStudioChat();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const voterId = getVoterId();
      const [r, c] = await Promise.all([
        (supabase as any).from("beat_reactions").select("emoji,user_id,voter_id").eq("beat_id", beat.id),
        (supabase as any).from("beat_comments").select("id", { count: "exact", head: true }).eq("beat_id", beat.id),
      ]);
      if (cancelled) return;
      const counts: Record<ReactionEmoji, number> = { "🔥": 0, "❤️": 0, "🎤": 0, "💯": 0, "👑": 0 };
      const mine = new Set<ReactionEmoji>();
      ((r.data as { emoji: ReactionEmoji; user_id: string | null; voter_id: string | null }[]) || []).forEach((row) => {
        if (counts[row.emoji] != null) counts[row.emoji] += 1;
        if (user ? row.user_id === user.id : row.voter_id === voterId) {
          if (counts[row.emoji] != null) mine.add(row.emoji);
        }
      });
      setReactionCounts(counts);
      setMyReactions(mine);
      setCommentCount(c.count || 0);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [beat.id, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadSale = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("flash_sales")
        .select("id,beat_id,discount_percent,original_price,sale_price,start_time,end_time,active")
        .eq("beat_id", beat.id)
        .eq("active", true)
        .lte("start_time", nowIso)
        .gt("end_time", nowIso)
        .order("end_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setSale((data as FlashSale | null) || null);
    };
    loadSale();
    return () => {
      cancelled = true;
    };
  }, [beat.id]);

  const handleReaction = async (emoji: ReactionEmoji) => {
    const had = myReactions.has(emoji);
    // Optimistic
    setMyReactions((prev) => {
      const next = new Set(prev);
      if (had) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    setReactionCounts((prev) => ({ ...prev, [emoji]: Math.max(0, prev[emoji] + (had ? -1 : 1)) }));

    try {
      if (had) {
        const q = (supabase as any).from("beat_reactions").delete().eq("beat_id", beat.id).eq("emoji", emoji);
        const { error } = user ? await q.eq("user_id", user.id) : await q.eq("voter_id", getVoterId());
        if (error) throw error;
      } else {
        const payload = user
          ? { beat_id: beat.id, user_id: user.id, emoji }
          : { beat_id: beat.id, voter_id: getVoterId(), emoji };
        const { error } = await (supabase as any).from("beat_reactions").insert(payload);
        if (error) throw error;
      }
    } catch (err: any) {
      // Rollback
      setMyReactions((prev) => {
        const next = new Set(prev);
        if (had) next.add(emoji);
        else next.delete(emoji);
        return next;
      });
      setReactionCounts((prev) => ({ ...prev, [emoji]: Math.max(0, prev[emoji] + (had ? 1 : -1)) }));
      console.warn("[reaction] failed", err);
    }
  };

  const startPlay = useCallback(() => {
    player.playTrack({
      id: beat.id,
      title: beat.title,
      artist: beat.genre,
      audioUrl: beat.audio_url,
      coverUrl: beat.cover_image_url ?? null,
    });
    setLocalCount((c) => c + 1);
    supabase.rpc("increment_play_count", { _beat_id: beat.id }).then(({ error }) => {
      if (error) console.warn("[play] increment failed", error);
    });
    trackBeatAction(beat.id, "play");
  }, [beat.id, beat.title, beat.genre, beat.audio_url, beat.cover_image_url, player]);

  const togglePlay = () => {
    if (isCurrent) player.togglePlay();
    else startPlay();
  };

  const buildPrefillMessage = () => {
    const priceStr =
      (beat.price_pence ?? 0) > 0
        ? ` - $${((beat.price_pence ?? 0) / 100).toFixed(2)}`
        : "";
    const url = `${window.location.origin}/?beat=${beat.id}`;
    return `Hi, I'm interested in getting this beat:\n\n🎵 ${beat.title} - ${beat.genre} - ${beat.bpm} BPM - ${beat.key}${priceStr}\n🔗 ${url}`;
  };

  const getBeat = () => {
    trackBeatAction(beat.id, "whatsapp_click");
    setLicenseOpen(true);
  };


  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const onSeek = (vals: number[]) => {
    if (isCurrent) player.seek(vals[0]);
  };

  const totalPlays = (beat.starter_plays ?? 0) + localCount;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:shadow-glow">
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={beat.cover_image_url ? undefined : { background: fallbackGradient(beat.genre, beat.bpm) }}
      >
        {beat.cover_image_url && (
          <img
            src={beat.cover_image_url}
            alt={`${beat.title} cover art`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <button
          onClick={togglePlay}
          aria-label={playing ? `Pause ${beat.title}` : `Play ${beat.title}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-all group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
            {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </div>
        </button>
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/70 px-2 py-1 text-xs font-semibold backdrop-blur">
          <Flame className="h-3 w-3 text-heat" />
          <span className="tabular-nums">{totalPlays.toLocaleString()}</span>
        </div>
        {sale && isSaleLive(sale) && (
          <div className="absolute top-2 left-2">
            <SaleBadge sale={sale} onEnd={() => setSale(null)} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <h3 className="line-clamp-1 text-sm sm:text-base font-bold">{beat.title}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {beat.genre}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {beat.bpm} BPM
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {beat.key}
            </Badge>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            {beat.is_free ? (
              <Badge className="bg-green-500/15 text-green-500 border-green-500/40 text-[10px] font-bold">
                FREE 🔥
              </Badge>
            ) : sale && isSaleLive(sale) ? (
              <>
                <Price gbpPence={sale.sale_price} className="text-sm font-bold text-heat" />
                <Price
                  gbpPence={sale.original_price || beat.price_pence || 0}
                  className="text-xs text-muted-foreground line-through"
                />
              </>
            ) : (beat.price_pence ?? 0) > 0 ? (
              <>
                {(beat.compare_at_price_pence ?? 0) > (beat.price_pence ?? 0) ? (
                  <>
                    <Price gbpPence={beat.price_pence || 0} className="text-sm font-bold text-heat" />
                    <Price
                      gbpPence={beat.compare_at_price_pence || 0}
                      className="text-xs text-muted-foreground line-through"
                    />
                  </>
                ) : (
                  <Price gbpPence={beat.price_pence || 0} className="text-sm font-semibold" />
                )}
              </>
            ) : (
              <span className="text-xs italic text-muted-foreground">Contact for price</span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={onSeek}
            aria-label="Playback progress"
            className={playing ? "progress-liquid" : undefined}
          />
          <div className="flex items-center justify-between gap-2 text-[10px] tabular-nums text-muted-foreground">
            <span>{fmt((progress / 100) * duration)}</span>
            <div className="flex-1" />
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Reactions row — anyone can react */}
        <div className="flex flex-wrap gap-1.5">
          {REACTION_EMOJIS.map((e) => {
            const active = myReactions.has(e);
            return (
              <button
                key={e}
                type="button"
                onClick={() => handleReaction(e)}
                aria-pressed={active}
                aria-label={`React ${e}`}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${active ? "border-primary bg-primary/15 text-foreground" : "border-border/60 hover:bg-muted text-muted-foreground"}`}
              >
                <span>{e}</span>
                <span className="tabular-nums">{reactionCounts[e]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex gap-2">
          <Button
            size="sm"
            onClick={getBeat}
            className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold"
          >
            <MessageSquare className="h-4 w-4 mr-1" /> Get Beat
          </Button>
          {beat.download_enabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const needsGate = beat.require_youtube_follow || beat.require_instagram_follow;
                if (needsGate) {
                  setFollowGateOpen(true);
                } else if (beat.download_type === "follow_gated") {
                  if (!user) {
                    navigate("/auth");
                    return;
                  }
                  setDownloadOpen(true);
                } else {
                  const a = document.createElement("a");
                  a.href = beat.audio_url;
                  a.download = `${beat.title}.mp3`;
                  a.target = "_blank";
                  a.rel = "noreferrer";
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  trackBeatAction(beat.id, "share");
                  (async () => {
                    try {
                      await supabase.rpc("increment_beat_download" as never, { _beat_id: beat.id } as never);
                      setDownloadCount((c) => c + 1);
                    } catch { /* noop */ }
                  })();
                }
              }}
              aria-label="Download"
              title="Download"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1 text-xs tabular-nums">{downloadCount}</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!user) {
                toast.error("Sign in to comment on beats");
                navigate("/auth");
                return;
              }
              setCommentsOpen(true);
            }}
            aria-label="Open comments"
            title="Comments"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            <span className="text-xs tabular-nums">{commentCount}</span>
          </Button>
        </div>
        {beat.is_free && (
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <Download className="h-3 w-3" />
            <span className="tabular-nums">{downloadCount.toLocaleString()}</span>
            <span>downloads</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            if (!user) {
              toast.error("Sign in to generate lyrics");
              navigate("/auth");
              return;
            }
            setLyricsOpen(true);
          }}
          className="w-full bg-primary/15 hover:bg-primary/25 border border-primary/30 text-foreground py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          ✍️ Generate Lyrics
        </button>
      </div>
      <BeatCommentsDialog open={commentsOpen} onOpenChange={setCommentsOpen} beatId={beat.id} beatTitle={beat.title} />
      <DownloadRequestDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        beatId={beat.id}
        beatTitle={beat.title}
      />
      <FollowGateDialog
        open={followGateOpen}
        onOpenChange={setFollowGateOpen}
        beatId={beat.id}
        beatTitle={beat.title}
        audioUrl={beat.audio_url}
        requireYoutube={!!beat.require_youtube_follow}
        requireInstagram={!!beat.require_instagram_follow}
        onDownloaded={() => setDownloadCount((c) => c + 1)}
      />
      <LyricGeneratorDialog
        open={lyricsOpen}
        onOpenChange={setLyricsOpen}
        beatId={beat.id}
        beatGenre={beat.genre}
        beatBpm={beat.bpm}
      />
      <LicenseDialog open={licenseOpen} onOpenChange={setLicenseOpen} beat={beat as Beat & Record<string, unknown>} />
    </article>
  );
};
