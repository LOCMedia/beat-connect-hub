import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tournament = {
  id: string;
  name: string;
  status: string;
  bracket_size: number;
  prize_description: string | null;
  submission_deadline: string | null;
};

const TournamentAcapella = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    document.title = "Acapella Tournament — VibeKonect Crown";
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("*")
        .eq("category", "acapella")
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
            <Mic className="h-3 w-3 mr-1" /> Acapella Bracket
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            60 Seconds. No Beat. Just Bars.
          </h1>
          <p className="text-muted-foreground">
            Submit your vocal-only freestyle. Top 16 advance to the bracket. Listeners decide.
            Winner gets the <Crown className="inline h-4 w-4 text-primary" /> badge, a free beat
            lease, and the prize.
          </p>
        </div>

        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No acapella tournament is open right now.
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
                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/tournament/bracket/${t.id}`}>View bracket</Link>
                    </Button>
                    {t.status === "submissions_open" && (
                      <Button asChild size="sm" className="flex-1">
                        <Link to={`/tournament/artist-submit?t=${t.id}`}>Enter</Link>
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

export default TournamentAcapella;