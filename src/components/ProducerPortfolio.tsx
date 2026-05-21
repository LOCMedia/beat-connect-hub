import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disc3, ExternalLink, Flame, Mic, Disc, MessageCircle, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/Reveal";
import { placeholderCoverDataUrl } from "@/lib/portfolioCover";

export type PortfolioEntry = {
  id: string;
  entry_type: "produced" | "featured" | "project";
  title: string;
  artist_name: string | null;
  credit_text: string | null;
  external_link: string | null;
  cover_image_url: string | null;
  release_date: string | null;
  description: string | null;
  tracklist: { title: string; url?: string }[] | null;
  featured: boolean;
  display_order: number;
};

const detectPlatform = (url: string | null): string | null => {
  if (!url) return null;
  if (/spotify\.com/i.test(url)) return "Spotify";
  if (/music\.apple\.com/i.test(url)) return "Apple Music";
  if (/youtube\.com|youtu\.be/i.test(url)) return "YouTube";
  if (/soundcloud\.com/i.test(url)) return "SoundCloud";
  return "Listen";
};

const typeMeta = (e: PortfolioEntry) => {
  if (e.entry_type === "produced") {
    return {
      icon: <Flame className="h-3.5 w-3.5" />,
      tag: "🔥 Produced by LocBeatx",
      sub: e.artist_name ? e.artist_name : "",
    };
  }
  if (e.entry_type === "featured") {
    return {
      icon: <Mic className="h-3.5 w-3.5" />,
      tag: `🎤 Featured on — ${e.artist_name || "Artist"}`,
      sub: e.credit_text ? `${e.credit_text} by LocBeatx` : "Featured by LocBeatx",
    };
  }
  return {
    icon: <Disc className="h-3.5 w-3.5" />,
    tag: `📀 Project: ${e.title}`,
    sub: e.artist_name || "LocBeatx",
  };
};

export const ProducerPortfolio = () => {
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("portfolio_entries" as any)
        .select("*")
        .order("featured", { ascending: false })
        .order("display_order", { ascending: true })
        .order("release_date", { ascending: false });
      setEntries(((data as unknown) as PortfolioEntry[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading || entries.length === 0) return null;

  return (
    <section className="border-t border-border/60 bg-gradient-to-b from-background via-background to-muted/10">
      <div className="container py-12 sm:py-16">
        <Reveal>
          <div className="mb-8 sm:mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <Disc3 className="h-3.5 w-3.5" />
              Work & Collaborations
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              🎧 Work &{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Collaborations
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted-foreground">
              Released records, features, and full projects by LocBeatx.
            </p>
          </div>
        </Reveal>

        <StaggerGrid className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {entries.map((e) => {
            const meta = typeMeta(e);
            const platform = detectPlatform(e.external_link);
            const cover =
              e.cover_image_url ||
              placeholderCoverDataUrl(e.title, e.artist_name || "LocBeatx");
            const cardInner = (
              <Card className="group h-full overflow-hidden border-border/60 bg-card/60 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <img
                    src={cover}
                    alt={`${e.title} cover art`}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(ev) => {
                      (ev.currentTarget as HTMLImageElement).src = placeholderCoverDataUrl(
                        e.title,
                        e.artist_name || "LocBeatx",
                      );
                    }}
                  />
                  {e.featured && (
                    <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px]">
                      Featured
                    </Badge>
                  )}
                  {e.entry_type === "project" && (
                    <Badge className="absolute top-2 right-2 bg-background/80 text-foreground text-[10px] border border-border">
                      Project
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 sm:p-4 space-y-2">
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                    {meta.icon}
                    <span className="truncate">{meta.tag}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-1">
                      {e.title}
                    </h3>
                    {meta.sub && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                        {meta.sub}
                      </p>
                    )}
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{e.description}</p>
                  )}

                  {e.entry_type === "project" &&
                    e.tracklist &&
                    Array.isArray(e.tracklist) &&
                    e.tracklist.length > 0 && (
                      <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                        {e.tracklist.slice(0, 4).map((t, i) => (
                          <li key={i} className="truncate">
                            {t.title}
                          </li>
                        ))}
                        {e.tracklist.length > 4 && (
                          <li className="list-none italic">+ {e.tracklist.length - 4} more</li>
                        )}
                      </ol>
                    )}

                  {platform && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition group-hover:border-primary/40 group-hover:text-primary">
                        {e.entry_type === "project"
                          ? `Stream on ${platform}`
                          : `Listen on ${platform}`}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            return (
              <StaggerItem key={e.id}>
                {e.external_link ? (
                  <a
                    href={e.external_link}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                    aria-label={`Open ${e.title}`}
                  >
                    {cardInner}
                  </a>
                ) : (
                  cardInner
                )}
              </StaggerItem>
            );
          })}
        </StaggerGrid>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold w-full sm:w-auto"
          >
            <a
              href="https://wa.me/447482446078"
              target="_blank"
              rel="noreferrer"
              aria-label="Message LocBeatx on WhatsApp"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Message me on WhatsApp
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <a
              href="https://instagram.com/locbeatx"
              target="_blank"
              rel="noreferrer"
              aria-label="Follow LocBeatx on Instagram"
            >
              <Instagram className="h-4 w-4 mr-2" /> Follow @locbeatx
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};