import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getVoterId } from "@/lib/voterId";
import { cn } from "@/lib/utils";
import { BattleComments } from "@/components/BattleComments";
import { WaveformPlayer } from "@/components/WaveformPlayer";

type Submission = {
  id: string;
  artist_name: string;
  audio_url: string;
  instagram: string | null;
  user_id: string;
};

type Battle = {
  id: string;
  tournament_id: string;
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

const VOTED_KEY = (id: string) => `vk_t_voted_${id}`;

const TournamentBattle = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [a, setA] = useState<Submission | null>(null);
  const [b, setB] = useState<Submission | null>(null);
  const [voting, setVoting] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const { data: bt } = await (supabase as any)
      .from("tournament_battles").select("*").eq("id", id).maybeSingle();
    setBattle(bt || null);
    if (bt) {
      const ids = [bt.submission_a_id, bt.submission_b_id].filter(Boolean);
      if (ids.length) {
        const { data: subs } = await (supabase as any)
          .from("tournament_artist_submissions").select("*").in("id", ids);
        setA(subs?.find((s: Submission) => s.id === bt.submission_a_id) || null);
        setB(subs?.find((s: Submission) => s.id === bt.submission_b_id) || null);
      }
      // Resolve "my vote" from server if logged in, fallback to localStorage
      if (user) {
        const { data: v } = await (supabase as any)
          .from("tournament_battle_votes")
          .select("voted_for")
          .eq("battle_id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (v?.voted_for) setMyVote(v.voted_for);
      }
      const stored = localStorage.getItem(VOTED_KEY(id));
      if (stored && !myVote) setMyVote(stored);
    }
  };

  useEffect(() => {
    load();
    document.title = "Battle — VibeKonect Crown";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const vote = async (subId: string) => {
    if (!battle) return;
    if (myVote) {
      toast({ title: "Already voted", description: "One vote per battle." });
      return;
    }
    setVoting(true);
    const voterId = getVoterId();
    const { error } = await (supabase as any).from("tournament_battle_votes").insert({
      battle_id: battle.id,
      voted_for: subId,
      voter_id: voterId,
      user_id: user?.id ?? null,
    });
    setVoting(false);
    if (error) {
      const dup = error.code === "23505" || /duplicate|unique/i.test(error.message);
      toast({
        title: dup ? "Already voted" : "Vote failed",
        description: dup ? "You've already voted in this battle." : error.message,
        variant: dup ? "default" : "destructive",
      });
      if (dup) setMyVote(subId);
      return;
    }
    localStorage.setItem(VOTED_KEY(battle.id), subId);
    setMyVote(subId);
    toast({ title: "Vote cast 🔥" });
    load();
  };

  if (!battle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center text-muted-foreground">Loading battle…</main>
      </div>
    );
  }

  const total = battle.votes_a + battle.votes_b;
  const pctA = total ? Math.round((battle.votes_a / total) * 100) : 50;
  const pctB = 100 - pctA;
  const isOpen = battle.status === "open";

  const Side = ({ sub, votes, pct, side }: { sub: Submission | null; votes: number; pct: number; side: "a" | "b" }) => {
    const isWinner = battle.winner_submission_id === sub?.id;
    const isMyVote = myVote === sub?.id;
    return (
      <Card className={cn("relative overflow-hidden", isWinner && "border-primary", isMyVote && !isWinner && "border-primary/60")}>
        <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
        <CardContent className="relative p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px]">Side {side.toUpperCase()}</Badge>
            <span className="text-xs font-mono text-muted-foreground">{votes} votes · {pct}%</span>
          </div>
          {sub ? (
            <>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {sub.artist_name}
                {isWinner && <Trophy className="h-4 w-4 text-primary" />}
              </h2>
              <WaveformPlayer url={sub.audio_url} />
              {isOpen && (
                <Button
                  className="w-full"
                  disabled={voting || !!myVote}
                  variant={isMyVote ? "default" : "outline"}
                  onClick={() => vote(sub.id)}
                >
                  {isMyVote ? "✓ You voted" : myVote ? "Voted on the other side" : `Vote ${sub.artist_name}`}
                </Button>
              )}
            </>
          ) : (
            <p className="italic text-muted-foreground">TBD</p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/tournament/bracket/${battle.tournament_id}`}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to bracket
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={isOpen ? "default" : "secondary"}>{battle.status}</Badge>
            <Badge variant="outline">Round {battle.round} · Battle #{battle.slot + 1}</Badge>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center justify-center gap-2">
            <Crown className="h-7 w-7 text-primary" /> Head-to-Head
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Listen to both. Vote for your favorite. Comment live.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Side sub={a} votes={battle.votes_a} pct={pctA} side="a" />
          <Side sub={b} votes={battle.votes_b} pct={pctB} side="b" />
        </div>

        <BattleComments battleId={battle.id} />
      </main>
    </div>
  );
};

export default TournamentBattle;