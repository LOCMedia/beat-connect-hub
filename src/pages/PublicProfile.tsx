import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Calendar, MapPin } from "lucide-react";
import { fetchProfileByUsername, initialsFromProfile, type Profile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

type Entry = {
  id: string;
  artist_name: string;
  status: string;
  votes: number;
  bonus_votes: number;
  created_at: string;
};

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!username) return;
      setLoading(true);
      const p = await fetchProfileByUsername(username);
      if (cancelled) return;
      if (!p) {
        setNotFound(true);
        setLoading(false);
        document.title = "Profile not found · VibeKonect";
        return;
      }
      setProfile(p);
      document.title = `@${p.username} · VibeKonect`;

      const { data: ent } = await supabase
        .from("contest_entries")
        .select("id, artist_name, status, votes, bonus_votes, created_at")
        .eq("user_id", p.user_id)
        .in("status", ["approved", "winner"])
        .order("created_at", { ascending: false });
      if (!cancelled) setEntries((ent as Entry[]) || []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <p className="text-sm text-muted-foreground mt-2">
            No user with that username.
          </p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">
            Back home
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-3xl">
        {loading || !profile ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary/30">
                <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-semibold">
                  {initialsFromProfile(profile)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {profile.bio && (
                  <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
                  {profile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {profile.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Competition entries
              </h2>
              {entries.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No public entries yet.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {entries.map((e) => (
                    <Card key={e.id}>
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <Link
                          to={`/competition/entry/${e.id}`}
                          className="font-semibold hover:underline truncate"
                        >
                          {e.artist_name}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          {e.status === "winner" && (
                            <Badge className="bg-yellow-500 text-black">
                              <Trophy className="h-3 w-3 mr-1" /> Winner
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {e.votes + e.bonus_votes} votes
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default PublicProfile;