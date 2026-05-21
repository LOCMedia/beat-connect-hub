import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BeatRow { id: string; title: string; download_enabled: boolean; }
interface RequestRow {
  id: string; beat_id: string; user_id: string | null; full_name: string | null; email: string; instagram_handle: string | null;
  status: string; admin_note: string | null; created_at: string;
  download_url?: string | null; download_expires_at?: string | null;
  beats?: { title: string } | null;
}

export default function AdminDownloads() {
  const { isAdmin, loading } = useAuth();
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");

  const loadAll = async () => {
    const { data: bs } = await supabase.from("beats").select("id,title,download_enabled").order("created_at", { ascending: false });
    setBeats((bs as BeatRow[]) || []);
    let q = (supabase as any).from("beat_download_requests")
      .select("*, beats(title)")
      .order("created_at", { ascending: false });
    if (statusFilter === "pending") q = q.eq("status", "pending");
    const { data: rs } = await q;
    setRequests((rs as RequestRow[]) || []);
  };

  useEffect(() => { if (isAdmin) loadAll(); /* eslint-disable-next-line */ }, [isAdmin, statusFilter]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="container py-10">Loading…</main></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const toggleBeat = async (id: string, next: boolean) => {
    setBeats((prev) => prev.map((b) => b.id === id ? { ...b, download_enabled: next } : b));
    const { error } = await supabase.from("beats").update({ download_enabled: next }).eq("id", id);
    if (error) { toast.error(error.message); loadAll(); return; }
    toast.success(next ? "Downloads enabled" : "Downloads disabled");
  };

  const decide = async (id: string, status: "approved" | "denied") => {
    const { error } = await (supabase as any).from("beat_download_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    loadAll();
  };

  const exportCSV = () => {
    const headers = ["created_at", "beat", "full_name", "email", "instagram_handle", "status"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = requests.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.beats?.title ?? r.beat_id,
        r.full_name ?? "",
        r.email ?? "",
        r.instagram_handle ?? "",
        r.status ?? "",
      ].map(escape).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beat-download-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const filteredBeats = beats.filter((b) => b.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Downloads</h1>
          <p className="text-muted-foreground">Toggle which beats accept download requests, and approve queued requests.</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Beats — download toggle</h2>
            <Input placeholder="Search beat…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
          </div>
          <div className="divide-y divide-border/60">
            {filteredBeats.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-3 gap-3">
                <span className="text-sm line-clamp-1">{b.title}</span>
                <Switch checked={b.download_enabled} onCheckedChange={(v) => toggleBeat(b.id, v)} />
              </div>
            ))}
            {filteredBeats.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No beats.</p>}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Download request queue</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={requests.length === 0}>
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}>
                {statusFilter === "pending" ? "Show all" : "Show pending only"}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {requests.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No requests.</p>}
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/60 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm space-y-1">
                  <div className="font-medium line-clamp-1">{r.beats?.title || r.beat_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.full_name ? <><strong>{r.full_name}</strong> · </> : null}
                    {r.email}
                    {r.instagram_handle ? <> · IG: <a className="underline" href={`https://instagram.com/${r.instagram_handle.replace(/^@/, "")}`} target="_blank" rel="noreferrer">@{r.instagram_handle.replace(/^@/, "")}</a></> : null}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "approved" ? "default" : r.status === "denied" ? "destructive" : "secondary"}>{r.status}</Badge>
                  {r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "denied")}>Deny</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
