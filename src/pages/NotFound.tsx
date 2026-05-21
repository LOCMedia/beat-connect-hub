import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Home, Trophy, Music2 } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
    document.title = "404 — Lost in the mix · VibeKonect";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gradient-hero px-4 py-16">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <Music2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            404
          </h1>
          <p className="mt-3 text-lg sm:text-xl font-semibold">
            Lost in the mix.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {location.pathname}
            </code>
            . Let's get you back on beat.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button asChild className="w-full sm:w-auto bg-gradient-primary text-primary-foreground">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" /> Back to Beats
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/competition">
                <Trophy className="h-4 w-4 mr-2" /> Freestyle Competition
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
