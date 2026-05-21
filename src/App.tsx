import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import Download from "./pages/Download.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import UnsubscribeNotifications from "./pages/UnsubscribeNotifications.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { CurrencyProvider } from "@/lib/currency";
import { StudioChatProvider } from "@/components/StudioChat/StudioChatProvider";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { GlobalPlayerProvider, MiniPlayer } from "@/components/player/GlobalPlayer";

// Lazy-load heavy / admin / authenticated routes for smaller initial bundle
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Analytics = lazy(() => import("./pages/Analytics.tsx"));
const WhatsAppDashboard = lazy(() => import("./pages/WhatsAppDashboard.tsx"));
const Competition = lazy(() => import("./pages/Competition.tsx"));
const CompetitionSubmit = lazy(() => import("./pages/CompetitionSubmit.tsx"));
const CompetitionVote = lazy(() => import("./pages/CompetitionVote.tsx"));
const CompetitionEntry = lazy(() => import("./pages/CompetitionEntry.tsx"));
const CompetitionAdmin = lazy(() => import("./pages/CompetitionAdmin.tsx"));
const SponsorSignup = lazy(() => import("./pages/SponsorSignup.tsx"));
const SponsorDashboard = lazy(() => import("./pages/SponsorDashboard.tsx"));
const SponsoredChallenges = lazy(() => import("./pages/SponsoredChallenges.tsx"));
const SponsoredChallengeDetail = lazy(() => import("./pages/SponsoredChallengeDetail.tsx"));
const SponsoredChallengesAdmin = lazy(() => import("./pages/SponsoredChallengesAdmin.tsx"));
const AdminSettings = lazy(() => import("./pages/AdminSettings.tsx"));
const AdminDownloads = lazy(() => import("./pages/AdminDownloads.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const PublicProfile = lazy(() => import("./pages/PublicProfile.tsx"));
const Tournament = lazy(() => import("./pages/Tournament.tsx"));
const TournamentAcapella = lazy(() => import("./pages/TournamentAcapella.tsx"));
const TournamentArtistSubmit = lazy(() => import("./pages/TournamentArtistSubmit.tsx"));
const TournamentBracket = lazy(() => import("./pages/TournamentBracket.tsx"));
const TournamentAdmin = lazy(() => import("./pages/TournamentAdmin.tsx"));
const TournamentBeatFreestyle = lazy(() => import("./pages/TournamentBeatFreestyle.tsx"));
const TournamentProducerSubmit = lazy(() => import("./pages/TournamentProducerSubmit.tsx"));
const TournamentBeatPool = lazy(() => import("./pages/TournamentBeatPool.tsx"));
const TournamentBattle = lazy(() => import("./pages/TournamentBattle.tsx"));
const PortfolioAdmin = lazy(() => import("./pages/PortfolioAdmin.tsx"));
const PortfolioEntryForm = lazy(() => import("./pages/PortfolioEntryForm.tsx"));
const AnnouncementsAdmin = lazy(() => import("./pages/AnnouncementsAdmin.tsx"));
const StudioTracksAdmin = lazy(() => import("./pages/StudioTracksAdmin.tsx"));
const StudioTrackDetail = lazy(() => import("./pages/StudioTrackDetail.tsx"));
const StudioTracks = lazy(() => import("./pages/StudioTracks.tsx"));
const FlashSalesAdmin = lazy(() => import("./pages/FlashSalesAdmin.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CurrencyProvider>
          <StudioChatProvider>
          <GlobalPlayerProvider>
          <MaintenanceGate>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/whatsapp" element={<WhatsAppDashboard />} />
            <Route path="/download" element={<Download />} />
            <Route path="/competition" element={<Competition />} />
            <Route path="/competition/submit" element={<CompetitionSubmit />} />
            <Route path="/competition/vote" element={<CompetitionVote />} />
            <Route path="/competition/entry/:entry_id" element={<CompetitionEntry />} />
            <Route path="/dashboard/competition" element={<CompetitionAdmin />} />
            <Route path="/sponsor/signup" element={<SponsorSignup />} />
            <Route path="/sponsor/dashboard" element={<SponsorDashboard />} />
            <Route path="/sponsored-challenges" element={<SponsoredChallenges />} />
            <Route path="/sponsored-challenges/:id" element={<SponsoredChallengeDetail />} />
            <Route path="/dashboard/sponsored-challenges" element={<SponsoredChallengesAdmin />} />
            <Route path="/dashboard/settings" element={<AdminSettings />} />
            <Route path="/dashboard/downloads" element={<AdminDownloads />} />
            <Route path="/admin/downloads" element={<AdminDownloads />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/tournament" element={<Tournament />} />
            <Route path="/tournament/acapella" element={<TournamentAcapella />} />
            <Route path="/tournament/artist-submit" element={<TournamentArtistSubmit />} />
            <Route path="/tournament/bracket/:id" element={<TournamentBracket />} />
            <Route path="/tournament/battle/:id" element={<TournamentBattle />} />
            <Route path="/tournament/beat-freestyle" element={<TournamentBeatFreestyle />} />
            <Route path="/tournament/producer-submit" element={<TournamentProducerSubmit />} />
            <Route path="/tournament/beat-pool" element={<TournamentBeatPool />} />
            <Route path="/dashboard/tournament" element={<TournamentAdmin />} />
            <Route path="/dashboard/portfolio" element={<PortfolioAdmin />} />
            <Route path="/admin/portfolio" element={<PortfolioAdmin />} />
            <Route path="/admin/portfolio/new" element={<PortfolioEntryForm />} />
            <Route path="/admin/portfolio/:id/edit" element={<PortfolioEntryForm />} />
            <Route path="/unsubscribe-notifications" element={<UnsubscribeNotifications />} />
            <Route path="/dashboard/announcements" element={<AnnouncementsAdmin />} />
            <Route path="/admin/announcements" element={<AnnouncementsAdmin />} />
            <Route path="/admin/studio-tracks" element={<StudioTracksAdmin />} />
            <Route path="/dashboard/studio-tracks" element={<StudioTracksAdmin />} />
            <Route path="/studio-tracks/:id" element={<StudioTrackDetail />} />
            <Route path="/studio-tracks" element={<StudioTracks />} />
            <Route path="/admin/flash-sales" element={<FlashSalesAdmin />} />
            <Route path="/dashboard/flash-sales" element={<FlashSalesAdmin />} />
            <Route path="/flash-sales" element={<FlashSalesAdmin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <MiniPlayer />
          </MaintenanceGate>
          </GlobalPlayerProvider>
          </StudioChatProvider>
          </CurrencyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
