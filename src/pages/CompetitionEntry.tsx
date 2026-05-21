import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ThumbsUp, Video, MessageCircle, Twitter, Instagram, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getVoterId } from "@/lib/voterId";

type Entry = {
  id: string;
  artist_name: string;
  instagram: string | null;
  freestyle_audio_url: string;
  video_url: string | null;
  votes: number;
  bonus_votes: number;
  status: string;
  cover_image_url: string | null;
};

const CompetitionEntry = () => {
  const { entry_id } = useParams();
  const { user } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!entry_id) return;
    supabase
      .from("contest_entries")
      .select("id, artist_name, instagram, freestyle_audio_url, video_url, votes, bonus_votes, status, cover_image_url")
      .eq("id", entry_id)
      .maybeSingle()
      .then(({ data }) => {
        setEntry(data as Entry);
        setLoading(false);
        if (data) document.title = `${data.artist_name} — VibeKonect Competition`;
      });
  }, [entry_id]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Vote for my freestyle on VibeKonect! 🎤`;

  const handleVote = async () => {
    if (!entry) return;
    setVoting(true);
    const payload: any = { entry_id: entry.id };
    if (user) payload.user_id = user.id;
    else payload.ip_address = getVoterId();
    const { error } = await supabase.from("votes").insert(payload);
    if (error) {
      if (error.code === "23505") toast({ title: "Already voted", description: "You can only vote once." });
      else toast({ title: "Vote failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vote counted! 🎉" });
      setEntry({ ...entry, votes: entry.votes + 1 });
    }
    setVoting(false);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied!" });
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </div>
  );

  if (!entry) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">Entry not found</h1>
        <Button asChild className="mt-4"><Link to="/competition/vote">Browse entries</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-2xl">
        <Card>
          <CardContent className="p-6 space-y-5">
            {entry.cover_image_url && (
              <img
                src={entry.cover_image_url}
                alt={`${entry.artist_name} cover art`}
                className="w-full aspect-square object-cover rounded-xl border border-border/60"
              />
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs uppercase text-muted-foreground">Freestyle Entry</div>
                <h1 className="text-3xl font-extrabold">{entry.artist_name}</h1>
                {entry.instagram && <div className="text-sm text-muted-foreground">{entry.instagram}</div>}
              </div>
              {entry.video_url && <Badge className="bg-purple-600"><Video className="h-3 w-3 mr-1" /> Video</Badge>}
            </div>

            <audio
              controls
              autoPlay
              controlsList="nodownload noplaybackrate noremoteplayback"
              className="w-full"
              src={entry.freestyle_audio_url}
            />

            {entry.video_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={entry.video_url} target="_blank" rel="noreferrer">
                  <Video className="h-4 w-4 mr-2" /> Watch video
                </a>
              </Button>
            )}

            <div className="rounded-lg bg-muted p-4 flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{entry.votes + entry.bonus_votes}</div>
                <div className="text-xs text-muted-foreground">total votes {entry.bonus_votes > 0 && `(includes +${entry.bonus_votes} bonus)`}</div>
              </div>
              <Button size="lg" onClick={handleVote} disabled={voting}>
                <ThumbsUp className="h-5 w-5 mr-2" /> Vote
              </Button>
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Share this entry</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">
                    <Twitter className="h-4 w-4 mr-1" /> Twitter
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://www.instagram.com/`} target="_blank" rel="noreferrer">
                    <Instagram className="h-4 w-4 mr-1" /> Instagram
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4 mr-1" /> Copy link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompetitionEntry;