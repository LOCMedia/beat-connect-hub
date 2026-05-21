import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Headphones, Mic2, Music2, Sparkles } from "lucide-react";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/Reveal";

export type StudioTrack = {
  id: string;
  title: string;
  description: string | null;
  audio_preview_url: string | null;
  cover_image_url: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  chorus_lyrics: string | null;
  suggested_split_producer: number;
  price: number;
  is_published: boolean;
};

export const StudioTracksSection = () => {
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("studio_tracks_public" as any)
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      setTracks((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="container py-10 sm:py-14 border-t border-border/60">
      <Reveal>
        <div className="mb-6 sm:mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            <Headphones className="h-3.5 w-3.5" />
            Studio Tracks
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            🎧 Ready for{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Your Verse
            </span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            The hook is done. You finish the story.
          </p>
        </div>
      </Reveal>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Loading tracks…</p>
      ) : tracks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border/60 rounded-xl bg-card/40">
          <Mic2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">No studio tracks yet</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon for new collaborations.</p>
        </div>
      ) : (
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((t) => (
          <StaggerItem key={t.id}>
            <Link to={`/studio-tracks/${t.id}`} className="block group">
              <Card className="overflow-hidden h-full transition hover:border-primary/50 hover:shadow-lg">
                <div className="aspect-video w-full bg-gradient-to-br from-primary/30 to-accent/30 relative overflow-hidden">
                  {t.cover_image_url ? (
                    <img src={t.cover_image_url} alt={t.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Mic2 className="h-12 w-12 text-primary-foreground/70" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {100 - t.suggested_split_producer}% you / {t.suggested_split_producer}% producer
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg group-hover:text-primary transition">{t.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.genre && <Badge variant="outline" className="text-xs">{t.genre}</Badge>}
                    {t.bpm && <Badge variant="outline" className="text-xs">{t.bpm} BPM</Badge>}
                    {t.key && <Badge variant="outline" className="text-xs">{t.key}</Badge>}
                  </div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-bold">£{(t.price / 100).toFixed(0)}</span>
                    <Button size="sm" variant="default">
                      <Music2 className="h-3.5 w-3.5" />
                      View track
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGrid>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto flex items-start gap-1.5 justify-center">
        <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          Studio Tracks are produced by LocBeatx using original composition, performance, and professional studio processing. AI-assisted tools are used for harmony layering and vocal enhancement as part of the production process.
        </span>
      </p>
    </section>
  );
};