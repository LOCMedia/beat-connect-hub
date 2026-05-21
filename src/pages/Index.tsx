import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BeatCard, type Beat } from "@/components/BeatCard";
import { BeatCardSkeleton } from "@/components/BeatCardSkeleton";
import { CompetitionBanner } from "@/components/CompetitionBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { ProducerPortfolio } from "@/components/ProducerPortfolio";
import { StudioTracksSection } from "@/components/StudioTracksSection";
import { Music2, Headphones, Instagram, Flame, Trophy, Users } from "lucide-react";
import { Reveal, StaggerGrid, StaggerItem } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { setBeatOrder } from "@/lib/audioManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HERO_PROMPTS = [
  "dark moody hip hop studio with glowing neon purple and orange lights, abstract cinematic atmosphere",
  "futuristic music production scene with vibrant gradients, sound waves, deep blacks and electric blues",
  "abstract trap beat visualization, golden and crimson light streaks, cinematic depth, ultra wide",
];

const Index = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ beats: 0, plays: 0, entries: 0 });
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [priceFilter, setPriceFilter] = useState<"all" | "under20" | "20to50" | "over50">("all");
  const [scrollY, setScrollY] = useState(0);
  const scrollYRef = useRef(0);
  const rafIdRef = useRef<number>();

  useEffect(() => {
    document.title = "VibeKonect — Fresh beats from LocBeatx";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "Stream original trap, RnB & hip-hop beat snippets. DM to license — fast, direct, no middlemen.",
      );
    (async () => {
      const { data } = await supabase.from("beats").select("*").order("created_at", { ascending: false });
      const list = (data as Beat[]) || [];
      setBeats(list);
      setBeatOrder(list.map((b) => b.id));
      setLoading(false);

      const totalPlays = list.reduce((sum, b) => sum + (b.starter_plays ?? 0) + (b.play_count || 0), 0);
      const { count: entryCount } = await supabase
        .from("contest_entries")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "winner"]);
      setStats({
        beats: list.length,
        plays: totalPlays,
        entries: entryCount ?? 0,
      });
    })();
  }, []);

  const visibleBeats = useMemo(() => {
    const arr = beats.filter((b) => {
      const cents = b.price_pence ?? 0;
      if (priceFilter === "under20") return cents > 0 && cents < 2000;
      if (priceFilter === "20to50") return cents >= 2000 && cents <= 5000;
      if (priceFilter === "over50") return cents > 5000;
      return true;
    });
    if (sortBy === "price_asc") arr.sort((a, b) => (a.price_pence ?? 0) - (b.price_pence ?? 0));
    else if (sortBy === "price_desc") arr.sort((a, b) => (b.price_pence ?? 0) - (a.price_pence ?? 0));
    return arr;
  }, [beats, sortBy, priceFilter]);

  useEffect(() => {
    setBeatOrder(visibleBeats.map((b) => b.id));
  }, [visibleBeats]);

  const heroBg = useMemo(() => {
    const prompt = HERO_PROMPTS[Math.floor(Math.random() * HERO_PROMPTS.length)];
    const seed = Math.floor(Math.random() * 100000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=1080&nologo=true&seed=${seed}`;
  }, []);

  // Preload image and set fallback
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setBgImageLoaded(true);
      setUseFallback(false);
    };
    img.onerror = () => {
      setUseFallback(true);
      setBgImageLoaded(false);
    };
    img.src = heroBg;
  }, [heroBg]);

  // Scroll parallax for animated background
  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      if (rafIdRef.current) return;
      rafIdRef.current = requestAnimationFrame(() => {
        setScrollY(scrollYRef.current);
        rafIdRef.current = undefined;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Scroll-responsive animated background */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
          style={{
            background: "linear-gradient(to bottom right, hsl(280 90% 25% / 0.25), hsl(240 10% 4%), hsl(260 90% 25% / 0.25))",
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        <div
          className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
          style={{
            background: "linear-gradient(to top, hsl(280 90% 35% / 0.08), transparent, hsl(320 100% 35% / 0.08))",
            transform: `translateY(${scrollY * -0.2}px)`,
          }}
        />
      </div>

      <div className="relative z-[2]">
        <Header />

      {/* Hero Section with AI Background + Fallback */}
      <section className="relative overflow-hidden border-b border-border/60 min-h-[60vh] flex items-center">
        {/* Background container */}
        <div className="absolute inset-0 z-0">
          {/* Gradient fallback (always visible) */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2a 50%, #0a0a0a 100%)",
            }}
          />

          {/* AI Image (fades in when loaded) */}
          {!useFallback && (
            <div
              className={`absolute inset-0 transition-opacity duration-1000 ${bgImageLoaded ? "opacity-100" : "opacity-0"}`}
            >
              <img src={heroBg} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            </div>
          )}

          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/40" />
        </div>

        {/* Content (z-index higher than background) */}
        <div className="relative z-10 container py-12 sm:py-20 md:py-24 text-center">
          <Reveal>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              Beats that <span className="bg-gradient-primary bg-clip-text text-transparent">hit different.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-3 sm:mt-4 max-w-xl text-sm sm:text-base md:text-lg text-gray-200 px-2">
              Stream snippets. Hear what slaps. Slide into the DMs to lock it in.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <a
              href="https://instagram.com/locbeatx"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-black/50 backdrop-blur-sm px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary transition hover:bg-primary/20 hover:scale-105"
            >
              <Headphones className="h-3.5 w-3.5" />
              Beats by{" "}
              <span className="inline-flex items-center gap-1">
                <Instagram className="h-3.5 w-3.5" />
                @locbeatx
              </span>
            </a>
          </Reveal>

          {/* Stats counters */}
          {(stats.beats > 0 || stats.plays > 0 || stats.entries > 0) && (
            <Reveal delay={0.3}>
              <div className="mt-8 sm:mt-10 grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="rounded-xl border border-border/60 bg-black/50 backdrop-blur p-3">
                  <Flame className="h-4 w-4 text-heat mx-auto" />
                  <CountUp to={stats.beats} className="block text-lg sm:text-2xl font-bold text-white mt-1" />
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Beats</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-black/50 backdrop-blur p-3">
                  <Users className="h-4 w-4 text-primary mx-auto" />
                  <CountUp to={stats.plays} className="block text-lg sm:text-2xl font-bold text-white mt-1" />
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Plays</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-black/50 backdrop-blur p-3">
                  <Trophy className="h-4 w-4 text-accent mx-auto" />
                  <CountUp to={stats.entries} className="block text-lg sm:text-2xl font-bold text-white mt-1" />
                  <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Entries</div>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <main className="container py-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <CompetitionBanner />
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <BeatCardSkeleton key={i} />
            ))}
          </div>
        ) : beats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">No beats yet</h2>
            <p className="text-sm text-muted-foreground">Sign in as admin to upload your first beat.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as typeof priceFilter)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Price" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All prices</SelectItem>
                  <SelectItem value="under20">Under $20</SelectItem>
                  <SelectItem value="20to50">$20 – $50</SelectItem>
                  <SelectItem value="over50">$50+</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-auto">{visibleBeats.length} beats</span>
            </div>
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visibleBeats.map((b) => (
                <StaggerItem key={b.id}>
                  <BeatCard beat={b} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          </>
        )}
      </main>

      <ProducerPortfolio />

      <StudioTracksSection />

      <SiteFooter />
      </div>
    </div>
  );
};

export default Index;
