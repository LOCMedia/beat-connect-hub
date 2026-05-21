import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaveformPlayerProps {
  url: string;
  className?: string;
  height?: number;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

/**
 * SoundCloud-style waveform player used in Competition + Tournament pages only.
 * Beat store / homepage continue to use the existing audio element.
 */
export const WaveformPlayer = ({ url, className, height = 64 }: WaveformPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;
    setReady(false);
    setErrored(false);
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#a855f7",
      progressColor: "#ec4899",
      cursorColor: "#ec4899",
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height,
      url,
      normalize: true,
    });
    wsRef.current = ws;
    ws.on("ready", () => { setReady(true); setDuration(ws.getDuration()); });
    ws.on("audioprocess", (t) => setCurrent(t));
    ws.on("seeking", (t) => setCurrent(t));
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));
    ws.on("error", () => setErrored(true));
    return () => { ws.destroy(); wsRef.current = null; };
  }, [url, height]);

  if (errored) {
    // Fallback to native player
    return <audio src={url} controls className={cn("w-full h-9", className)} preload="none" />;
  }

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * duration;
    setHover({ x, t });
  };

  return (
    <div className={cn("flex items-center gap-3 rounded-lg bg-card border p-2", className)}>
      <Button
        type="button"
        size="icon"
        variant="default"
        className="h-10 w-10 shrink-0 rounded-full"
        disabled={!ready}
        onClick={() => wsRef.current?.playPause()}
      >
        {!ready ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </Button>
      <div
        className="relative flex-1 min-w-0"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <div ref={containerRef} className="w-full" style={{ height }} />
        {hover && (
          <div
            className="pointer-events-none absolute -top-6 px-1.5 py-0.5 rounded bg-foreground text-background text-[10px] font-mono -translate-x-1/2"
            style={{ left: hover.x }}
          >
            {fmt(hover.t)}
          </div>
        )}
      </div>
      <div className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-[80px] text-right">
        {fmt(current)} / {fmt(duration)}
      </div>
    </div>
  );
};

export default WaveformPlayer;
