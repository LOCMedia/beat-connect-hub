import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music2, Crown, Mic, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tournament = {
  id: string;
  name: string;
  status: string;
  bracket_size: number;
  prize_description: string | null;
  submission_deadline: string | null;
};

const TournamentBeatFreestyle = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    document.title = "Beat Freestyle Tournament — VibeKonect Crown";
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("*")
        .eq("category", "beat_freestyle")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 max-w-5xl space-y-8">
        <div className="space-y-3">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Music2 className="h-3 w-3 mr-1" /> Beat Freestyle Bracket
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Producers Drop. Artists Pick. Crowd Decides.
          </h1>
          <p className="text-muted-foreground">
            Producers submit watermarked beats to the pool. Artists browse, pick one, and freestyle
            for 60 seconds. Winning beats earn a <span className="text-primary">🏆 Tournament Winner</span> badge,
            winning artists earn the <Crown className="inline h-4 w-4 text-primary" /> Champion crown.
          </p>
        </div>

        {/* Two-role CTA */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-primary/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Headphones className="h-5 w-5" />
                <h3 className="font-semibold">I'm a producer</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Drop a watermarked 60-second beat. Auto-approved into the pool.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link to="/tournament/producer-submit">Submit a beat</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-primary/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Mic className="h-5 w-5" />
                <h3 className="font-semibold">I'm an artist</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Browse the beat pool, pick one, upload your 60-second freestyle.
              </p>
              <Button asChild size="sm" className="w-full">
                <Link to="/tournament/beat-pool">Browse beats</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No beat freestyle tournament is open right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {tournaments.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-lg">{t.name}</h3>
                    <Badge variant={t.status === "in_progress" ? "default" : "secondary"}>
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {t.prize_description && (
                    <p className="text-sm">🏆 {t.prize_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t.bracket_size}-entry single elimination
                  </p>
                  {t.submission_deadline && t.status === "submissions_open" && (
                    <p className="text-xs text-muted-foreground">
                      Submissions close {new Date(t.submission_deadline).toLocaleString()}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1 min-w-[120px]">
                      <Link to={`/tournament/bracket/${t.id}`}>Bracket</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1 min-w-[120px]">
                      <Link to={`/tournament/beat-pool?t=${t.id}`}>Beat pool</Link>
                    </Button>
                    {t.status === "submissions_open" && (
                      <Button asChild size="sm" className="flex-1 min-w-[120px]">
                        <Link to={`/tournament/producer-submit?t=${t.id}`}>Drop beat</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentBeatFreestyle;