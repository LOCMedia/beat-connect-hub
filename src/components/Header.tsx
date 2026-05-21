import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logoUrl from "@/assets/vibekonect-logo.png";
import {
  Music2,
  LogOut,
  Upload,
  LogIn,
  BarChart3,
  MessageCircle,
  Trophy,
  Megaphone,
  Menu,
  Home,
  Settings,
  User as UserIcon,
  Crown,
  Disc3,
  Headphones,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile, initialsFromProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "@/hooks/use-toast";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/", icon: Home },
  { label: "Studio Tracks", to: "/studio-tracks", icon: Headphones },
  { label: "Tournament Crown", to: "/tournament", icon: Crown },
  { label: "Sponsored Challenges", to: "/sponsored-challenges", icon: Megaphone },
  { label: "Freestyle Competition", to: "/competition", icon: Trophy },
  { label: "Beats Dashboard", to: "/dashboard", icon: Upload, adminOnly: true },
  { label: "Analytics", to: "/analytics", icon: BarChart3, adminOnly: true },
  { label: "WhatsApp", to: "/dashboard/whatsapp", icon: MessageCircle, adminOnly: true },
  { label: "Contest Admin", to: "/dashboard/competition", icon: Trophy, adminOnly: true },
  { label: "Tournament Admin", to: "/dashboard/tournament", icon: Crown, adminOnly: true },
  { label: "Sponsor Admin", to: "/dashboard/sponsored-challenges", icon: Megaphone, adminOnly: true },
  { label: "Portfolio", to: "/admin/portfolio", icon: Disc3, adminOnly: true },
  { label: "Studio Tracks Admin", to: "/admin/studio-tracks", icon: Headphones, adminOnly: true },
  { label: "Announcements", to: "/admin/announcements", icon: Megaphone, adminOnly: true },
  { label: "Settings", to: "/dashboard/settings", icon: Settings, adminOnly: true },
  { label: "Settings", to: "/admin/flash-sales", icon: Settings, adminOnly: true },
];

export const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { profile } = useMyProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const initials = initialsFromProfile(profile) || (user?.email?.slice(0, 2).toUpperCase() ?? "U");
  const handle = profile?.username ? `@${profile.username}` : (user?.email ?? "");

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      toast({ title: "You have been signed out" });
      window.location.href = "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-14 sm:h-16 items-center justify-between gap-2">
        {/* Hamburger (everywhere) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
            <SheetHeader className="border-b border-border/60 p-4">
              <SheetTitle className="flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="VibeKonect"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg shadow-glow"
                />
                <span className="text-base font-bold tracking-tight">
                  Vibe<span className="text-primary">Konect</span>
                </span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-border/60 p-4 text-[11px] text-muted-foreground">
              🎵 Beats by{" "}
              <a
                href="https://instagram.com/locbeatx"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                @locbeatx
              </a>
              <div className="mt-1">In collaboration with VibeKonect</div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group min-w-0">
          <img
            src={logoUrl}
            alt="VibeKonect logo"
            width={36}
            height={36}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg shadow-glow group-hover:animate-pulse-glow shrink-0"
          />
          <span className="text-base sm:text-lg font-bold tracking-tight truncate">
            Vibe<span className="text-primary">Konect</span>
          </span>
        </Link>
        {/* Right: avatar / sign-in */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="rounded-full ring-offset-background transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Avatar className="h-9 w-9 border border-border/60">
                      <AvatarImage
                        src={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? undefined}
                        alt={handle ?? "user"}
                      />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    <div className="font-semibold truncate">
                      {profile?.display_name || profile?.username || user.email}
                    </div>
                    {profile?.username && (
                      <div className="text-[11px] text-muted-foreground truncate">@{profile.username}</div>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="h-4 w-4 mr-2" /> My profile
                  </DropdownMenuItem>
                  {profile?.username && (
                    <DropdownMenuItem onClick={() => navigate(`/u/${profile.username}`)}>
                      <UserIcon className="h-4 w-4 mr-2" /> Public page
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/competition")}>
                    <Trophy className="h-4 w-4 mr-2" /> Competition
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        <Upload className="h-4 w-4 mr-2" /> Admin dashboard
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => navigate("/admin/flash-sales")}>
                        <Upload className="h-4 w-4 mr-2" /> flash-sales
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => navigate("/admin/studio-tracks")}>
                        <Headphones className="h-4 w-4 mr-2" /> Studio Tracks
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                <UserPlus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign up</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
