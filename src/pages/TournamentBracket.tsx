import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Play, Pause, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getVoterId } from "@/lib/voterId";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Submission = {
  id: string;
  artist_name: string;
  audio_url: string;
  instagram: string | null;
  user_id: string;
  status: string;
};

type Battle = {
  id: string;
  round: number;
  slot: number;
  submission_a_id: string | null;
  submission_b_id: string | null;
  winner_submission_id: string | null;
  votes_a: number;
  votes_b: number;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  status: "pending" | "open" | "closed";
};

type Tournament = {
  id: string;
  name: string;
  status: string;
  bracket_size: number;
  prize_description: string | null;
  current_round: number;
  winner_submission_id: string | null;
};

const VOTED_KEY = (battleId: string) => `vk_t_voted_${battleId}`;

const TournamentBracket = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [playing, setPlaying] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const [{ data: t }, { data: b }, { data: s }] = await Promise.all([
      (supabase as any).from("tournaments").select("*").eq("id", id).maybeSingle(),
      (supabase as any).from("tournament_battles").select("*").eq("tournament_id", id).order("round").order("slot"),
      (supabase as any).from("tournament_artist_submissions").select("*").eq("tournament_id", id),
    ]);
    setTournament(t || null);
    setBattles(b || []);
    const map: Record<string, Submission> = {};
    (s || []).forEach((sub: Submission) => { map[sub.id] = sub; });
    setSubmissions(map);
  };

  useEffect(() => {
    load();
    document.title = "Bracket — VibeKonect Crown";
  }, [id]);

  const rounds = useMemo(() => {
    const grouped: Record<number, Battle[]> = {};
    battles.forEach((b) => {
      grouped[b.round] = grouped[b.round] || [];
      grouped[b.round].push(b);
    });
    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map((r) => ({ round: r, battles: grouped[r].sort((a, b) => a.slot - b.slot) }));
  }, [battles]);

  const togglePlay = (id: string, url: string) => {
    const audioId = `audio-${id}`;
    const el = document.getElementById(audioId) as HTMLAudioElement | null;
    if (!el) return;
    if (playing === id) {
      el.pause();
      setPlaying(null);
    } else {
      document.querySelectorAll("audio").forEach((a) => (a as HTMLAudioElement).pause());
      el.play();
      setPlaying(id);
    }
  };

  const vote = async (battle: Battle, submissionId: string) => {
    if (localStorage.getItem(VOTED_KEY(battle.id))) {
      toast({ title: "Already voted", description: "One vote per battle." });
      return;
    }
    setVoting(battle.id);
    const voterId = getVoterId();
    const { error } = await (supabase as any)
      .from("tournament_battle_votes")
      .insert({ battle_id: battle.id, voted_for: submissionId, voter_id: voterId, user_id: user?.id ?? null });
    if (error) {
      const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
      if (dup) {
        localStorage.setItem(VOTED_KEY(battle.id), submissionId);
        toast({ title: "Already voted", description: "You've already voted in this battle." });
      } else {
        toast({ title: "Vote failed", description: error.message, variant: "destructive" });
      }
    } else {
      localStorage.setItem(VOTED_KEY(battle.id), submissionId);
      toast({ title: "Vote cast 🔥" });
      await load();
    }
    setVoting(null);
  };

  const roundLabel = (round: number, total: number) => {
    const remaining = total / Math.pow(2, round - 1);
    if (remaining === 2) return "Final";
    if (remaining === 4) return "Semifinals";
    if (remaining === 8) return "Quarterfinals";
    return `Round of ${remaining}`;
  };

  const totalRounds = tournament ? Math.log2(tournament.bracket_size) : 0;

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center text-muted-foreground">Loading bracket…</main>
      </div>
    );
  }

  const champ = tournament.winner_submission_id ? submissions[tournament.winner_submission_id] : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <Link to="/tournament" className="text-xs text-muted-foreground hover:text-foreground">
              ← Tournaments
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight">{tournament.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tournament.bracket_size}-entry single elimination · {tournament.status.replace("_", " ")}
              {tournament.prize_description && <> · 🏆 {tournament.prize_description}</>}
            </p>
          </div>
        </div>

        {champ && (
          <Card className="border-primary/60 bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="p-6 flex items-center gap-4">
              <Crown className="h-10 w-10 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wider text-primary">Champion</p>
                <p className="text-2xl font-bold">{champ.artist_name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {rounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Bracket not generated yet. Admins will seed entries once submissions close.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
              {rounds.map(({ round, battles: rBattles }) => (
                <div key={round} className="space-y-4 w-72">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {roundLabel(round, tournament.bracket_size)}
                  </h2>
                  <div
                    className="space-y-4"
                    style={{ paddingTop: `${(Math.pow(2, round - 1) - 1) * 28}px` }}
                  >
                    {rBattles.map((battle) => {
                      const a = battle.submission_a_id ? submissions[battle.submission_a_id] : null;
                      const b = battle.submission_b_id ? submissions[battle.submission_b_id] : null;
                      const myVote = localStorage.getItem(VOTED_KEY(battle.id));
                      const isOpen = battle.status === "open";
                      const total = battle.votes_a + battle.votes_b;
                      const pctA = total ? Math.round((battle.votes_a / total) * 100) : 50;
                      const pctB = 100 - pctA;

                      return (
                        <Card
                          key={battle.id}
                          className={cn(
                            "transition-colors",
                            isOpen && "border-primary/50",
                            battle.status === "closed" && "opacity-90",
                          )}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                              <span>Battle #{battle.slot + 1}</span>
                              <Badge
                                variant={isOpen ? "default" : "secondary"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {battle.status}
                              </Badge>
                            </div>

                            {[
                              { sub: a, votes: battle.votes_a, pct: pctA, side: "a" as const },
                              { sub: b, votes: battle.votes_b, pct: pctB, side: "b" as const },
                            ].map(({ sub, votes, pct, side }) => {
                              const isWinner = battle.winner_submission_id === sub?.id;
                              const isMyVote = myVote === sub?.id;
                              return (
                                <div
                                  key={side}
                                  className={cn(
                                    "rounded-md border p-2 space-y-1.5 relative overflow-hidden",
                                    isWinner && "border-primary bg-primary/5",
                                    isMyVote && !isWinner && "border-primary/50",
                                  )}
                                >
                                  {(battle.status === "closed" || isOpen) && sub && (
                                    <div
                                      className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  )}
                                  <div className="relative flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {sub ? (
                                        <>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => togglePlay(sub.id, sub.audio_url)}
                                          >
                                            {playing === sub.id ? (
                                              <Pause className="h-3 w-3" />
                                            ) : (
                                              <Play className="h-3 w-3" />
                                            )}
                                          </Button>
                                          <span className="font-medium text-sm truncate">
                                            {sub.artist_name}
                                            {isWinner && (
                                              <Trophy className="inline h-3 w-3 ml-1 text-primary" />
                                            )}
                                          </span>
                                          <audio
                                            id={`audio-${sub.id}`}
                                            src={sub.audio_url}
                                            onEnded={() => setPlaying(null)}
                                            preload="none"
                                          />
                                        </>
                                      ) : (
                                        <span className="text-xs text-muted-foreground italic">TBD</span>
                                      )}
                                    </div>
                                    <span className="relative text-xs font-mono text-muted-foreground">
                                      {votes}
                                    </span>
                                  </div>
                                  {sub && isOpen && !myVote && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="relative w-full h-7 text-xs"
                                      disabled={voting === battle.id}
                                      onClick={() => vote(battle, sub.id)}
                                    >
                                      Vote
                                    </Button>
                                  )}
                                  {sub && isOpen && myVote === sub.id && (
                                    <div className="relative text-[10px] font-semibold text-primary text-center">✓ Your vote</div>
                                  )}
                                </div>
                              );
                            })}
                            {(battle.submission_a_id || battle.submission_b_id) && (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="relative w-full h-7 text-[10px]"
                              >
                                <Link to={`/tournament/battle/${battle.id}`}>
                                  <MessageSquare className="h-3 w-3 mr-1" /> Open battle & comments
                                </Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentBracket;