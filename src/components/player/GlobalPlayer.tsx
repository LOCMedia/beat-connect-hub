import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Play, Pause, SkipForward, Volume2, VolumeX, ListMusic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface PlayerTrack {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverUrl?: string | null;
}

interface PlayerState {
  current: PlayerTrack | null;
  queue: PlayerTrack[];
  playing: boolean;
  progress: number; // 0..100
  duration: number;
  volume: number;
  muted: boolean;
}

interface PlayerActions {
  playTrack: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  enqueue: (track: PlayerTrack) => void;
  togglePlay: () => void;
  next: () => void;
  seek: (pct: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  clear: () => void;
}

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

const VOLUME_KEY = "vk_global_volume_v1";

export const GlobalPlayerProvider = ({ children }: { children: ReactNode }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem(VOLUME_KEY) || "0.8");
      return isNaN(v) ? 0.8 : Math.min(1, Math.max(0, v));
    } catch { return 0.8; }
  });
  const [muted, setMuted] = useState(false);

  // Lazily create the persistent audio element on first interaction.
  useEffect(() => {
    if (audioRef.current) return;
    const el = new Audio();
    el.preload = "metadata";
    audioRef.current = el;
    el.addEventListener("timeupdate", () => {
      const d = el.duration;
      if (d && isFinite(d)) setProgress((el.currentTime / d) * 100);
    });
    el.addEventListener("loadedmetadata", () => setDuration(el.duration || 0));
    el.addEventListener("play", () => setPlaying(true));
    el.addEventListener("pause", () => setPlaying(false));
    el.addEventListener("ended", () => {
      setPlaying(false);
      setProgress(0);
      // play next
      setQueue((q) => {
        const [next, ...rest] = q;
        if (next) {
          setCurrent(next);
          // load + play in microtask
          queueMicrotask(() => {
            if (!audioRef.current) return;
            audioRef.current.src = next.audioUrl;
            audioRef.current.play().catch(() => {});
          });
          return rest;
        }
        return q;
      });
    });
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
    try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* noop */ }
  }, [volume, muted]);

  const playTrack = useCallback((track: PlayerTrack, q?: PlayerTrack[]) => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "metadata";
      audioRef.current = el;
    }
    setCurrent(track);
    if (q) {
      // queue = items after the current track in the list
      const idx = q.findIndex((t) => t.id === track.id);
      setQueue(idx >= 0 ? q.slice(idx + 1) : q);
    }
    const a = audioRef.current!;
    if (a.src !== track.audioUrl) a.src = track.audioUrl;
    a.play().catch((e) => console.warn("[player] play blocked", e));
  }, []);

  const enqueue = useCallback((track: PlayerTrack) => {
    setQueue((q) => (q.find((t) => t.id === track.id) ? q : [...q, track]));
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [current]);

  const next = useCallback(() => {
    setQueue((q) => {
      const [n, ...rest] = q;
      if (n) {
        setCurrent(n);
        const a = audioRef.current!;
        a.src = n.audioUrl;
        a.play().catch(() => {});
        return rest;
      }
      // No more — stop
      if (audioRef.current) { audioRef.current.pause(); }
      setCurrent(null);
      return q;
    });
  }, []);

  const seek = useCallback((pct: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = (pct / 100) * duration;
    setProgress(pct);
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setMuted(false);
    setVolumeState(Math.min(1, Math.max(0, v)));
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const clear = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setCurrent(null);
    setQueue([]);
    setPlaying(false);
    setProgress(0);
  }, []);

  const value = useMemo(
    () => ({ current, queue, playing, progress, duration, volume, muted,
      playTrack, enqueue, togglePlay, next, seek, setVolume, toggleMute, clear }),
    [current, queue, playing, progress, duration, volume, muted,
     playTrack, enqueue, togglePlay, next, seek, setVolume, toggleMute, clear],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export function useGlobalPlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("useGlobalPlayer must be used within GlobalPlayerProvider");
  return ctx;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

export const MiniPlayer = () => {
  const p = useGlobalPlayer();
  const [showQueue, setShowQueue] = useState(false);
  if (!p.current) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-2xl">
      {showQueue && p.queue.length > 0 && (
        <div className="max-h-60 overflow-y-auto border-b border-border px-4 py-2 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Up next ({p.queue.length})</span>
            <button onClick={() => setShowQueue(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {p.queue.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1 text-muted-foreground">
              <span className="line-clamp-1 flex-1">{t.title}</span>
              <span className="text-xs">{t.artist}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 sm:px-4">
        {p.current.coverUrl ? (
          <img src={p.current.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded bg-gradient-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-semibold">{p.current.title}</div>
          {p.current.artist && (
            <div className="line-clamp-1 text-xs text-muted-foreground">{p.current.artist}</div>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={p.togglePlay} aria-label={p.playing ? "Pause" : "Play"}>
          {p.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={p.next} aria-label="Next" disabled={p.queue.length === 0}>
          <SkipForward className="h-5 w-5" />
        </Button>
        <div className="hidden flex-1 items-center gap-2 sm:flex max-w-md">
          <span className="text-[10px] tabular-nums text-muted-foreground w-9 text-right">
            {fmt((p.progress / 100) * p.duration)}
          </span>
          <Slider
            value={[p.progress]}
            max={100}
            step={0.1}
            onValueChange={(v) => p.seek(v[0])}
            aria-label="Seek"
            className="flex-1"
          />
          <span className="text-[10px] tabular-nums text-muted-foreground w-9">
            {fmt(p.duration)}
          </span>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <Button size="icon" variant="ghost" onClick={p.toggleMute} aria-label={p.muted ? "Unmute" : "Mute"}>
            {p.muted || p.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[(p.muted ? 0 : p.volume) * 100]}
            max={100}
            step={1}
            onValueChange={(v) => p.setVolume(v[0] / 100)}
            aria-label="Volume"
            className={cn("w-20")}
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowQueue((s) => !s)}
          aria-label="Queue"
          className="relative"
        >
          <ListMusic className="h-5 w-5" />
          {p.queue.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {p.queue.length}
            </span>
          )}
        </Button>
        <Button size="icon" variant="ghost" onClick={p.clear} aria-label="Close player">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {/* Mobile progress bar */}
      <div className="px-3 pb-2 sm:hidden">
        <Slider value={[p.progress]} max={100} step={0.1} onValueChange={(v) => p.seek(v[0])} aria-label="Seek" />
      </div>
    </div>
  );
};