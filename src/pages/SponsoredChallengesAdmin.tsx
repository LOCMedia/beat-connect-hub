import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendTransactionalEmail } from "@/lib/sendEmail";

type Row = {
  id: string; title: string; status: string; challenge_type: string;
  prize_amount: number; commission_fee: number; commission_percent: number; duration_days: number;
  target_link: string; created_at: string;
  sponsors: { business_name: string; email: string } | null;
};

const formatGBP = (p: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default function SponsoredChallengesAdmin() {
  const { isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("sponsored_challenges")
      .select("id, title, status, challenge_type, prize_amount, commission_fee, commission_percent, duration_days, target_link, created_at, sponsors(business_name, email)")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Row[];
    setRows(list);
    setTotalCommission(
      list.filter(r => ["active","ended"].includes(r.status))
          .reduce((sum, r) => sum + r.commission_fee, 0)
    );
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="container py-10">Loading…</main></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const approve = async (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    const start = new Date();
    const end = new Date(start.getTime() + r.duration_days * 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("sponsored_challenges").update({
      status: "active",
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Challenge is live");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Reason for rejection?") || "Not specified";
    const { error } = await supabase.from("sponsored_challenges").update({
      status: "rejected", rejection_reason: reason,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Rejected");
    load();
  };

  const end = async (id: string) => {
    const { error } = await supabase.from("sponsored_challenges").update({ status: "ended" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ended");
    const r = rows.find((x) => x.id === id);
    if (r?.sponsors?.email) {
      // Aggregate stats for the recap
      const { data: subs } = await supabase
        .from("challenge_submissions")
        .select("id, votes, display_name, status")
        .eq("challenge_id", id);
      const totalSubmissions = subs?.length ?? 0;
      const totalVotes = (subs ?? []).reduce((s, x: any) => s + (x.votes || 0), 0);
      const winner = (subs ?? []).slice().sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0))[0];
      sendTransactionalEmail({
        templateName: "sponsor-challenge-ended",
        recipientEmail: r.sponsors.email,
        idempotencyKey: `sponsor-ended-${id}`,
        templateData: {
          sponsorName: r.sponsors.business_name,
          challengeTitle: r.title,
          totalSubmissions,
          totalVotes,
          winnerName: winner?.display_name || "TBA",
          challengeId: id,
        },
      });
    }
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sponsored Challenges (Admin)</h1>
            <p className="text-muted-foreground">Approve, reject, and track commission</p>
          </div>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total commission earned (active+ended)</p>
            <p className="text-2xl font-bold">{formatGBP(totalCommission)}</p>
          </Card>
        </div>

        <div className="grid gap-3">
          {rows.length === 0 && <p className="text-muted-foreground">No sponsored challenges yet.</p>}
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{r.title}</h3>
                  <Badge variant="outline">{r.challenge_type}</Badge>
                  <Badge>{r.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {r.sponsors?.business_name} ({r.sponsors?.email}) • Prize {formatGBP(r.prize_amount)} •
                  Commission {formatGBP(r.commission_fee)} ({r.commission_percent}%) • {r.duration_days}d
                </p>
                {r.target_link && (
                  <a href={r.target_link} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-primary break-all hover:underline">
                    Sponsor website: {r.target_link}
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                {r.status === "pending_approval" && (
                  <>
                    <Button size="sm" onClick={() => approve(r.id)}>Approve & launch</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r.id)}>Reject</Button>
                  </>
                )}
                {r.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => end(r.id)}>End now</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}