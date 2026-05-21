import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Clock } from "lucide-react";
import { Price } from "@/lib/currency";

type Row = {
  id: string; title: string; description: string | null;
  challenge_type: string; prize_amount: number; end_date: string | null;
  accent_color: string | null; sponsor_logo_url: string | null;
  participant_count?: number;
  sponsors: { business_name: string } | null;
};

const prettyType = (t: string) =>
  t === "open_verse" ? "Open Verse" : t === "dance" ? "Dance" : t;

const daysLeft = (end: string | null) => {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export default function SponsoredChallenges() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sponsored_challenges_public")
        .select("id, title, description, challenge_type, prize_amount, end_date, accent_color, sponsor_logo_url, sponsors(business_name)")
        .eq("status", "active")
        .order("end_date", { ascending: true });
      const list = (data ?? []) as unknown as Row[];
      // Fetch participant counts in parallel
      const counts = await Promise.all(
        list.map(async (r) => {
          const { count } = await supabase
            .from("challenge_submissions")
            .select("*", { count: "exact", head: true })
            .eq("challenge_id", r.id);
          return count ?? 0;
        })
      );
      setRows(list.map((r, i) => ({ ...r, participant_count: counts[i] })));
      setLoading(false);
    })();
  }, []);

  const hero = rows[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Sponsored Challenges</h1>
          <p className="text-muted-foreground mt-2">
            Brand and artist challenges with cash prizes. Enter, get votes, win.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/sponsor/signup">Run your own challenge →</Link>
            </Button>
          </div>
        </header>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">No active sponsored challenges right now. Check back soon!</p>
          </Card>
        ) : (
          <>
            {hero && (
              <Card
                className="relative overflow-hidden p-8 mb-8 border-2"
                style={{
                  borderColor: hero.accent_color || "hsl(var(--primary))",
                  background: `linear-gradient(135deg, ${hero.accent_color || "#a855f7"}22, transparent)`,
                }}
              >
                <div className="flex flex-wrap items-start gap-6 justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {hero.sponsor_logo_url && (
                      <img src={hero.sponsor_logo_url} alt={hero.sponsors?.business_name ?? "Sponsor"}
                        className="h-16 w-16 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Featured · by {hero.sponsors?.business_name ?? "Sponsor"}
                      </p>
                      <h2 className="text-2xl md:text-3xl font-bold truncate">{hero.title}</h2>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{prettyType(hero.challenge_type)}</Badge>
                        <Badge style={{ backgroundColor: hero.accent_color || undefined }}>
                          <Trophy className="h-3 w-3 mr-1" />
                          <Price gbpPence={hero.prize_amount} /> prize
                        </Badge>
                        {daysLeft(hero.end_date) !== null && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            {daysLeft(hero.end_date)}d left
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button asChild size="lg"
                    style={{ backgroundColor: hero.accent_color || undefined }}
                  >
                    <Link to={`/sponsored-challenges/${hero.id}`}>Enter challenge →</Link>
                  </Button>
                </div>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => {
                const accent = r.accent_color || (r.challenge_type === "dance" ? "#fb923c" : "#3b82f6");
                const left = daysLeft(r.end_date);
                return (
                  <Card key={r.id} className="p-5 hover:shadow-glow transition-shadow border-l-4"
                    style={{ borderLeftColor: accent }}>
                    <div className="flex items-center gap-3 mb-3">
                      {r.sponsor_logo_url ? (
                        <img src={r.sponsor_logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-md flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: accent }}>
                          {(r.sponsors?.business_name ?? "S")[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          by {r.sponsors?.business_name ?? "Sponsor"}
                        </p>
                        <Badge variant="outline" className="text-[10px]">{prettyType(r.challenge_type)}</Badge>
                      </div>
                    </div>
                    <h2 className="font-semibold text-lg line-clamp-1">{r.title}</h2>
                    {r.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-3">{r.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        <Price gbpPence={r.prize_amount} />
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {r.participant_count ?? 0}
                      </span>
                      {left !== null && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {left}d left
                        </span>
                      )}
                    </div>
                    <Button asChild className="w-full" style={{ backgroundColor: accent }}>
                      <Link to={`/sponsored-challenges/${r.id}`}>Enter challenge →</Link>
                    </Button>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}