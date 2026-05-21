import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Search, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getVoterId } from "@/lib/voterId";
import { fireFromButton } from "@/lib/confetti";
import { EntryCard, EntryCardData } from "@/components/EntryCard";
import { BeatCardSkeleton } from "@/components/BeatCardSkeleton";
import { Reveal } from "@/components/motion/Reveal";
import { SiteFooter } from "@/components/SiteFooter";
import SmartSubscribePrompt from "@/components/SmartSubscribePrompt";

type Entry = EntryCardData & { created_at: string };

type ActiveContest = {
  id: string;
  title: string;
  prize_description: string | null;
  end_date: string | null;
  status: string;
};

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

const CompetitionVote = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [voting, setVoting] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [contest, setContest] = useState<ActiveContest | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.title = "Vote — VibeKonect Competition";
    load();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: contestData }, { data: entryData }] = await Promise.all([
      supabase
        .from("contests")
        .select("id, title, prize_description, end_date, status")
        .in("status", ["active", "voting"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("contest_entries")
        .select("id, user_id, artist_name, instagram, freestyle_audio_url, video_url, votes, bonus_votes, cover_image_url, created_at")
        .in("status", ["approved", "winner"])
        .order("created_at", { ascending: false }),
    ]);

    setContest((contestData as ActiveContest) ?? null);

    const rows = (entryData as Array<Entry & { user_id: string }>) || [];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    let profileMap: Record<string, EntryCardData["profile"]> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      for (const p of (profiles as Array<{ user_id: string; username: string; display_name: string | null; avatar_url: string | null }>) || []) {
        profileMap[p.user_id] = {
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      }
    }
    setEntries(
      rows.map((r) => ({
        ...r,
        profile: profileMap[r.user_id] ?? null,
      })),
    );
    setLoading(false);
  };

  // Stable ranking for medals: based on total votes regardless of current sort
  const rankMap = useMemo(() => {
    const ranked = [...entries].sort(
      (a, b) => b.votes + b.bonus_votes - (a.votes + a.bonus_votes),
    );
    const map = new Map<string, number>();
    ranked.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = entries.filter(
      (e) =>
        e.artist_name.toLowerCase().includes(q) ||
        (e.instagram || "").toLowerCase().includes(q) ||
        (e.profile?.username || "").toLowerCase().includes(q),
    );
    if (sort === "votes")
      list = [...list].sort((a, b) => b.votes + b.bonus_votes - (a.votes + a.bonus_votes));
    else list = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return list;
  }, [entries, search, sort]);

  const handleVote = async (entryId: string, ev?: React.MouseEvent<HTMLButtonElement>) => {
    const button = ev?.currentTarget ?? null;
    setVoting(entryId);
    // optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, votes: e.votes + 1 } : e)),
    );
    const payload: any = { entry_id: entryId };
    if (user) payload.user_id = user.id;
    else payload.ip_address = getVoterId();
    const { error } = await supabase.from("votes").insert(payload);
    if (error) {
      // rollback optimistic
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, votes: Math.max(0, e.votes - 1) } : e)),
      );
      if (error.code === "23505")
        toast({ title: "Already voted", description: "You've already voted for this entry." });
      else toast({ title: "Vote failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vote counted! 🎉" });
      fireFromButton(button);
      setJustVoted(true);
    }
    setVoting(null);
  };

  const remaining = contest?.end_date ? new Date(contest.end_date).getTime() - now : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 sm:py-10">
        {/* Hero */}
        <Reveal>
          <section className="rounded-2xl bg-gradient-to-br from-purple-700 via-fuchsia-700 to-purple-900 p-5 sm:p-8 text-white shadow-glow mb-6">
            <div className="flex items-center gap-2 text-yellow-300 font-semibold text-xs uppercase tracking-wider">
              <Trophy className="h-4 w-4" /> Vote Now
            </div>
            <h1 className="mt-1 text-2xl sm:text-4xl font-extrabold">
              {contest?.title || "Vote for your favorite freestyle"}
            </h1>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-black/30 p-3">
                <div className="text-[10px] uppercase text-white/70">Prize</div>
                <div className="font-semibold text-sm sm:text-base">
                  {contest?.prize_description || "£50 + Free Beat Lease"}
                </div>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <div className="text-[10px] uppercase text-white/70">Voting ends</div>
                <div className="font-mono text-sm sm:text-base">
                  {remaining !== null ? formatRemaining(remaining) : "TBA"}
                </div>
              </div>
              <div className="rounded-lg bg-black/30 p-3">
                <div className="text-[10px] uppercase text-white/70">Entries</div>
                <div className="font-semibold text-sm sm:text-base tabular-nums">{entries.length}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="secondary" className="bg-white text-purple-800 hover:bg-white/90">
                <Link to="/competition/submit"><Mic className="h-4 w-4 mr-1" /> Submit your entry</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white">
                <Link to="/competition?view=overview">Competition details</Link>
              </Button>
            </div>
          </section>
        </Reveal>

        {/* Filter bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search artists or @username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sort === "votes" ? "default" : "outline"}
              size="sm"
              onClick={() => setSort("votes")}
            >
              Top voted
            </Button>
            <Button
              variant={sort === "newest" ? "default" : "outline"}
              size="sm"
              onClick={() => setSort("newest")}
            >
              Newest
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <BeatCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mic className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {entries.length === 0 ? "No entries yet" : "No matches"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {entries.length === 0
                    ? "Be the first to submit your freestyle and get on the leaderboard."
                    : "Try a different artist name or username."}
                </p>
              </div>
              {entries.length === 0 && (
                <Button asChild>
                  <Link to="/competition/submit"><Mic className="h-4 w-4 mr-1" /> Submit your entry</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                rank={rankMap.get(e.id)}
                voting={voting === e.id}
                onVote={(ev) => handleVote(e.id, ev)}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
      <SmartSubscribePrompt
        source="after_vote"
        storageKey="vk_subscribe_prompt_after_vote"
        trigger={justVoted}
      />
    </div>
  );
};

export default CompetitionVote;