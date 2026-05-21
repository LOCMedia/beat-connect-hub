import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Mic, Music2, Trophy, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Tournament = {
  id: string;
  name: string;
  slug: string;
  category: "acapella" | "beat_freestyle";
  status: string;
  bracket_size: number;
  prize_description: string | null;
  cover_image_url: string | null;
  submission_deadline: string | null;
};

const Tournament = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "VibeKonect Crown — Artist Tournaments";
    (async () => {
      const { data } = await (supabase as any)
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false });
      setTournaments(data || []);
      setLoading(false);
    })();
  }, []);

  const acapella = tournaments.filter((t) => t.category === "acapella");
  const beatFreestyle = tournaments.filter((t) => t.category === "beat_freestyle");
  const active = [...acapella, ...beatFreestyle];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Crown className="h-3 w-3 mr-1" /> VibeKonect Crown
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Artist Battle Tournaments
          </h1>
          <p className="text-muted-foreground text-lg">
            Single-elimination brackets. 24-hour battles. One champion crowned.
          </p>
        </section>

        {/* Category selector */}
        <section className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Link to="/tournament/acapella" className="group">
            <Card className="h-full transition-all hover:shadow-glow hover:border-primary/60">
              <CardContent className="p-8 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <Mic className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Acapella</h2>
                <p className="text-sm text-muted-foreground">
                  60 seconds. Vocals only. No beat. Pure flow vs pure flow.
                </p>
                <div className="flex items-center text-primary text-sm font-medium pt-2">
                  Enter the bracket <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/tournament/beat-freestyle" className="group">
            <Card className="h-full transition-all hover:shadow-glow hover:border-primary/60">
              <CardContent className="p-8 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <Music2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Beat Freestyle</h2>
                <p className="text-sm text-muted-foreground">
                  Producers drop beats. Artists pick one and freestyle on it.
                </p>
                <div className="flex items-center text-primary text-sm font-medium pt-2">
                  Enter the bracket <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Active tournaments */}
        <section className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Active Tournaments
          </h2>
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No tournaments yet. Check back soon.
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {active.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{t.name}</h3>
                      <Badge variant={t.status === "in_progress" ? "default" : "secondary"}>
                        {t.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.category === "beat_freestyle" ? "Beat Freestyle" : "Acapella"}
                    </p>
                    {t.prize_description && (
                      <p className="text-sm text-muted-foreground">🏆 {t.prize_description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t.bracket_size}-entry single elimination
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link to={`/tournament/bracket/${t.id}`}>View bracket</Link>
                      </Button>
                      {t.status === "submissions_open" && (
                        <Button asChild size="sm" className="flex-1">
                          <Link to={t.category === "beat_freestyle" ? `/tournament/beat-pool?t=${t.id}` : `/tournament/artist-submit?t=${t.id}`}>
                            Enter
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Tournament;