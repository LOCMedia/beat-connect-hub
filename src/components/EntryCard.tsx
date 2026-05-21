import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Play, Flame, Heart, Video, Share2, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { fallbackGradient } from "@/lib/coverImage";
import { inflateVotes } from "@/lib/inflate";
import { initialsFromProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type EntryCardData = {
  id: string;
  artist_name: string;
  instagram?: string | null;
  freestyle_audio_url: string;
  video_url?: string | null;
  votes: number;
  bonus_votes: number;
  cover_image_url?: string | null;
  profile?: {
    username?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type Props = {
  entry: EntryCardData;
  rank?: number; // 1-based, used to show medal for top 3
  voting?: boolean;
  onVote: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const medalStyles: Record<number, { ring: string; chip: string; label: string; icon: ReactNode }> = {
  1: {
    ring: "ring-2 ring-yellow-400 shadow-[0_0_28px_-4px_hsl(48_98%_60%/0.55)]",
    chip: "bg-gradient-to-r from-yellow-400 to-amber-500 text-black",
    label: "1st",
    icon: <Crown className="h-3.5 w-3.5" />,
  },
  2: {
    ring: "ring-2 ring-slate-300 shadow-[0_0_24px_-6px_hsl(210_20%_80%/0.45)]",
    chip: "bg-gradient-to-r from-slate-200 to-slate-400 text-black",
    label: "2nd",
    icon: <Star className="h-3.5 w-3.5" />,
  },
  3: {
    ring: "ring-2 ring-amber-700 shadow-[0_0_24px_-6px_hsl(28_60%_45%/0.45)]",
    chip: "bg-gradient-to-r from-amber-700 to-orange-700 text-white",
    label: "3rd",
    icon: <Star className="h-3.5 w-3.5" />,
  },
};

export const EntryCard = ({ entry, rank, voting, onVote }: Props) => {
  const username = entry.profile?.username;
  const displayHandle = username ? `@${username}` : entry.artist_name;
  const avatar = entry.profile?.avatar_url || undefined;
  const totalVotes = inflateVotes(entry.id, entry.votes + entry.bonus_votes);
  const medal = rank && rank <= 3 ? medalStyles[rank] : null;

  const share = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const url = `${window.location.origin}/competition/entry/${entry.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${entry.artist_name} on VibeKonect`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!" });
      }
    } catch {
      // user cancelled
    }
  };

  const profileHref = username ? `/u/${username}` : null;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/60 backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 hover:shadow-glow",
        medal?.ring,
      )}
    >
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={
          entry.cover_image_url
            ? undefined
            : { background: fallbackGradient(entry.artist_name, (entry.artist_name.length * 13) % 180 + 60) }
        }
      >
        {entry.cover_image_url && (
          <img
            src={entry.cover_image_url}
            alt={`${entry.artist_name} cover art`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/30 to-transparent" />

        {medal && (
          <div
            className={cn(
              "absolute top-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
              medal.chip,
            )}
          >
            {medal.icon}
            <span>{medal.label}</span>
          </div>
        )}

        {entry.video_url && (
          <Badge className="absolute top-2 right-2 bg-purple-600 text-white shadow">
            <Video className="h-3 w-3 mr-1" /> Video
          </Badge>
        )}

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-all group-hover:scale-110">
            <Play className="h-6 w-6 ml-0.5" />
          </div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            {profileHref ? (
              <Link to={profileHref} className="flex items-center gap-2 group/link">
                <Avatar className="h-8 w-8 ring-2 ring-background/80">
                  <AvatarImage src={avatar} alt={displayHandle} />
                  <AvatarFallback className="text-[10px]">{initialsFromProfile(entry.profile)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-white drop-shadow group-hover/link:underline">
                  {displayHandle}
                </span>
              </Link>
            ) : (
              <>
                <Avatar className="h-8 w-8 ring-2 ring-background/80">
                  <AvatarFallback className="text-[10px]">{initialsFromProfile({ display_name: entry.artist_name })}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-white drop-shadow">{displayHandle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs font-bold backdrop-blur">
            <Flame className="h-3.5 w-3.5 text-heat" />
            <span className="tabular-nums">{totalVotes}</span>
          </div>
        </div>

      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm sm:text-base font-bold">{entry.artist_name}</h3>
            {entry.instagram && (
              <div className="text-[11px] text-muted-foreground line-clamp-1">{entry.instagram}</div>
            )}
          </div>
          {entry.bonus_votes > 0 && (
            <Badge className="shrink-0 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <Star className="h-3 w-3 mr-1" /> +{entry.bonus_votes}
            </Badge>
          )}
        </div>

        <WaveformPlayer url={entry.freestyle_audio_url} height={48} />

        <div className="mt-auto flex flex-col gap-2">
          <Button
            size="sm"
            onClick={onVote}
            disabled={voting}
            className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold"
          >
            <Heart className="h-4 w-4 mr-1.5 fill-current" /> Vote
          </Button>
          <div className="grid grid-cols-2 gap-2">
            {entry.video_url ? (
              <Button size="sm" variant="outline" asChild>
                <a href={entry.video_url} target="_blank" rel="noreferrer">
                  <Video className="h-4 w-4 mr-1" /> Watch
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/competition/entry/${entry.id}`}>
                  <Play className="h-4 w-4 mr-1" /> Open
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={share} aria-label="Share entry">
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};