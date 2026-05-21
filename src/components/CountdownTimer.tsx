import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    ms,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export const CountdownTimer = ({
  to,
  onEnd,
  className,
  compact = true,
}: {
  to: string | Date;
  onEnd?: () => void;
  className?: string;
  compact?: boolean;
}) => {
  const target = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => {
      const next = diff(target);
      setT(next);
      if (next.ms === 0) {
        clearInterval(id);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onEnd]);

  if (t.ms === 0) return <span className={className}>Ended</span>;

  if (compact) {
    const parts: string[] = [];
    if (t.d) parts.push(`${t.d}d`);
    if (t.h || t.d) parts.push(`${t.h}h`);
    parts.push(`${t.m}m`);
    if (!t.d) parts.push(`${t.s}s`);
    return <span className={className}>{parts.join(" ")}</span>;
  }

  return (
    <span className={className}>
      {t.d > 0 && `${t.d}d `}
      {String(t.h).padStart(2, "0")}:{String(t.m).padStart(2, "0")}:{String(t.s).padStart(2, "0")}
    </span>
  );
};

export default CountdownTimer;