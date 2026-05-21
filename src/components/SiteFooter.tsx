import { Link } from "react-router-dom";
import { Instagram, MessageCircle, Music2 } from "lucide-react";
import SubscribeForm from "@/components/SubscribeForm";

export const SiteFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-border/60 bg-background/40">
      <div className="container py-8">
        <div className="max-w-2xl mx-auto">
          <SubscribeForm source="footer" title="Stay in the loop" description="Competitions, drops, winners — straight to your inbox." />
        </div>
      </div>
      <div className="container py-8 sm:py-10 grid gap-8 sm:grid-cols-2 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Music2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">
              Vibe<span className="text-primary">Konect</span>
            </span>
          </div>
          <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
            Premium beats, freestyle competitions, and sponsored challenges —
            all in one place.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explore
          </h3>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/" className="hover:text-primary">
                Beats
              </Link>
            </li>
            <li>
              <Link to="/competition" className="hover:text-primary">
                Freestyle Competition
              </Link>
            </li>
            <li>
              <Link to="/sponsored-challenges" className="hover:text-primary">
                Sponsored Challenges
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Producer
          </h3>
          <p className="mt-3 text-muted-foreground text-xs">
            🎵 All beats produced by{" "}
            <span className="font-semibold text-foreground">LocBeatx</span>
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href="https://instagram.com/locbeatx"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram @locbeatx"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 transition hover:border-primary hover:text-primary"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://wa.me/447482446078"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp business"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 transition hover:border-primary hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground text-center">
          <div>
            🎵 All beats produced by{" "}
            <a
              href="https://instagram.com/locbeatx"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-foreground hover:text-primary"
            >
              LocBeatx
            </a>{" "}
            · In collaboration with VibeKonect
          </div>
          <div className="flex items-center gap-3">
            <div>© {year} VibeKonect</div>
          </div>
        </div>
      </div>
    </footer>
  );
};