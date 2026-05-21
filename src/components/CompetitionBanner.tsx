import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ActiveContest = { id: string; title: string; end_date: string | null; status: string };

function formatRemaining(ms: number) {
  if (ms <= 0) return "Ended";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

export const CompetitionBanner = () => {
  const [contest, setContest] = useState<ActiveContest | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    supabase
      .from("contests")
      .select("id, title, end_date, status")
      .in("status", ["active", "voting"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContest(data as ActiveContest);
      });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!contest) return null;

  const remaining = contest.end_date ? new Date(contest.end_date).getTime() - now : null;
  const voteHref = "/competition/vote";

  return (
    <Link
      to={voteHref}
      className="block animate-pulse-glow rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 p-[2px] shadow-glow"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-[10px] bg-background/30 backdrop-blur px-4 sm:px-6 py-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-yellow-300 shrink-0" />
          <div>
            <div className="text-sm sm:text-base font-bold text-white">
              🏆 FREESTYLE CHALLENGE ACTIVE — Click to vote!
            </div>
            <div className="text-xs text-white/80">
              {contest.title} — Voting ends in {remaining !== null ? formatRemaining(remaining) : "soon"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null && (
            <div className="rounded-md bg-black/40 px-3 py-1.5 font-mono text-sm text-white">
              ⏱ {formatRemaining(remaining)}
            </div>
          )}
          <span className="rounded-md bg-white text-purple-700 font-semibold px-3 py-1.5 text-sm shadow">
            View Competition →
          </span>
        </div>
      </div>
    </Link>
  );
};