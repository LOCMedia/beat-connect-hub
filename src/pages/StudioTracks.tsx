import { useEffect } from "react";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { StudioTracksSection } from "@/components/StudioTracksSection";

export default function StudioTracks() {
  useEffect(() => {
    document.title = "Studio Tracks — Add Your Verse | VibeKonect";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Studio-quality tracks ready for your verse. Produced by LocBeatx — beat, hook, and pro processing done.");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="container py-10 sm:py-14 text-center border-b border-border/60">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            🎧 Studio Tracks — <span className="bg-gradient-primary bg-clip-text text-transparent">Add Your Verse</span>
          </h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            The beat, hook, and studio polish are done. You bring the verse and finish the story.
          </p>
        </section>
        <StudioTracksSection />
      </main>
      <SiteFooter />
    </div>
  );
}