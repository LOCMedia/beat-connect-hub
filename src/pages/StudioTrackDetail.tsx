import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, Mic2, Music2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const StudioTrackDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [track, setTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("studio_tracks_public" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      setTrack(data);
      setLoading(false);
      if (data) {
        document.title = `${(data as any).title} — Studio Track | VibeKonect`;
      }
    })();
  }, [id]);

  const handlePurchase = () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      return;
    }
    toast.info("Purchase flow coming soon. Contact LocBeatx on Instagram to claim this track.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12">Loading…</main>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-12 text-center">
          <h1 className="text-2xl font-bold">Track not found</h1>
          <Link to="/" className="text-primary hover:underline mt-4 inline-block">Back home</Link>
        </main>
      </div>
    );
  }

  const artistShare = 100 - track.suggested_split_producer;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square w-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30">
            {track.cover_image_url ? (
              <img src={track.cover_image_url} alt={track.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Mic2 className="h-20 w-20 text-primary-foreground/70" />
              </div>
            )}
          </div>

          <div>
            <Badge className="mb-2">Studio Track</Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{track.title}</h1>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {track.genre && <Badge variant="outline">{track.genre}</Badge>}
              {track.bpm && <Badge variant="outline">{track.bpm} BPM</Badge>}
              {track.key && <Badge variant="outline">{track.key}</Badge>}
            </div>

            {track.description && (
              <p className="text-muted-foreground mt-4">{track.description}</p>
            )}

            {track.audio_preview_url && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">60s preview (watermarked)</p>
                <audio controls src={track.audio_preview_url} className="w-full" />
              </div>
            )}

            <Card className="mt-5 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Suggested split</p>
                <p className="text-lg font-bold mt-1">{artistShare}% you / {track.suggested_split_producer}% producer</p>
              </CardContent>
            </Card>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-3xl font-extrabold">£{(track.price / 100).toFixed(0)}</span>
              <Button onClick={handlePurchase} size="lg">
                <Download className="h-4 w-4" />
                Purchase &amp; Download
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Includes full track + stems + license</p>
          </div>
        </div>

        {track.chorus_lyrics && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
                <Music2 className="h-5 w-5 text-primary" />
                Chorus lyrics
              </h2>
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
                {track.chorus_lyrics}
              </pre>
            </CardContent>
          </Card>
        )}

        {track.artist_credit_suggestion && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested credit</p>
              <p className="text-sm font-medium">{track.artist_credit_suggestion}</p>
            </CardContent>
          </Card>
        )}

        <p className="mt-8 text-xs text-muted-foreground border-t border-border pt-4">
          ℹ️ This track was produced by LocBeatx using original composition, performance, and professional studio processing. AI-assisted tools were used for harmony layering and vocal enhancement as part of the production process.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
};

export default StudioTrackDetail;