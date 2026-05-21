import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Plus, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { formatWhatsAppNumber } from "@/lib/notifySubscribe";

type Announcement = {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  target_audience: string;
  cta_label: string | null;
  cta_url: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  status: string;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  created_at: string;
};

type Subscriber = {
  id: string;
  email: string;
  email_verified: boolean;
  is_active: boolean;
  source: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at?: string;
  updated_at?: string;
  form_location?: string | null;
  preferences: Record<string, boolean>;
  phone_number?: string | null;
  whatsapp_opted_in?: boolean | null;
};

const types = ["competition", "winner", "new_beat", "platform"];
const audiences = ["all", "competitions", "winners", "new_beats", "platform_news"];

export default function AnnouncementsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("platform");
  const [audience, setAudience] = useState("all");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      console.log("[AnnouncementsAdmin] checking admin role", { userId: user.id, email: user.email });
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (error) console.error("[AnnouncementsAdmin] admin role check error", error);
      console.log("[AnnouncementsAdmin] admin role result", { isAdmin: !!data, role: data?.role });
      setIsAdmin(!!data);
    })();
  }, [user, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    console.log("[AnnouncementsAdmin] loading announcements and subscribers");
    const [a, s] = await Promise.all([
      (supabase as any).from("announcements").select("*").order("created_at", { ascending: false }),
      (supabase as any).rpc("get_admin_notification_subscribers"),
    ]);
    if (a.error) console.error("[AnnouncementsAdmin] announcements load error", a.error);
    if (s.error) console.error("[AnnouncementsAdmin] subscribers RPC load error", s.error);
    console.log("[AnnouncementsAdmin] subscribers RPC result", {
      count: s.data?.length ?? 0,
      error: s.error?.message ?? null,
      sample: s.data?.slice?.(0, 3)?.map((x: Subscriber) => ({
        id: x.id,
        email: x.email,
        is_active: x.is_active,
        whatsapp_opted_in: x.whatsapp_opted_in,
          has_phone: !!formatWhatsAppNumber(x.phone_number),
      })) ?? [],
    });
    setAnnouncements(a.data ?? []);
    setSubscribers(s.data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const stats = useMemo(() => {
    const total = subscribers.length;
    const verified = subscribers.filter((x) => x.is_active !== false && (x.email_verified ?? true)).length;
    const unsub = subscribers.filter((x) => x.is_active === false).length;
    return { total, verified, unsub };
  }, [subscribers]);

  const create = async (asScheduled: boolean) => {
    if (!title.trim() || !content.trim()) { toast.error("Title & content required"); return; }
    setBusy(true);
    const status = asScheduled && scheduledFor ? "scheduled" : "draft";
    const { error } = await (supabase as any).from("announcements").insert({
      title, content, announcement_type: type, target_audience: audience,
      cta_label: ctaLabel || null, cta_url: ctaUrl || null,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      status, created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setTitle(""); setContent(""); setCtaLabel(""); setCtaUrl(""); setScheduledFor("");
    toast.success("Announcement saved");
    load();
  };

  const send = async (id: string) => {
    setBusy(true);
    try {
      let emailResult: any = null;
      if (channel === "email" || channel === "both") {
        const { data, error } = await supabase.functions.invoke("send-announcement", { body: { announcementId: id } });
        if (error) throw error;
        emailResult = data;
      }
      if (channel === "whatsapp" || channel === "both") {
        const waRecipients = subscribers.filter((s) => s.is_active && s.whatsapp_opted_in && formatWhatsAppNumber(s.phone_number));
        // Stub: real WhatsApp delivery to be wired up.
        console.log("[WhatsApp broadcast stub] announcement", id, "recipients:", waRecipients.map((r) => formatWhatsAppNumber(r.phone_number)));
        toast.success(`WhatsApp stub: would send to ${waRecipients.length} number(s). See console.`);
      }
      if (emailResult) {
        toast.success(`Email queued ${(emailResult as any)?.queued ?? (emailResult as any)?.sent ?? 0} subscriber(s).`);
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const sendTest = async (id: string) => {
    const testEmail = window.prompt("Send test to which email?", user?.email ?? "");
    if (!testEmail) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-announcement", { body: { announcementId: id, mode: "test", testEmail } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Test sent to ${testEmail}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await (supabase as any).from("announcements").delete().eq("id", id);
    load();
  };

  const exportCsv = () => {
    const headers = ["email","email_verified","is_active","source","subscribed_at","unsubscribed_at","phone_number","whatsapp_opted_in","preferences"];
    const rows = subscribers.map((s) => [
      s.email, s.email_verified, s.is_active, s.source, s.subscribed_at, s.unsubscribed_at ?? "", formatWhatsAppNumber(s.phone_number) ?? "", !!s.whatsapp_opted_in, JSON.stringify(s.preferences),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  if (authLoading || isAdmin === null) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></main>;
  }
  if (!isAdmin) {
    return <main className="min-h-screen flex items-center justify-center"><p>Admins only.</p></main>;
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">📣 Announcements</h1>
            <p className="text-muted-foreground text-sm">Manage your subscriber list and broadcast updates.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total subscribers" value={stats.total} />
          <StatCard label="Verified & active" value={stats.verified} />
          <StatCard label="Unsubscribed" value={stats.unsub} />
        </div>

        <div className="rounded-xl border bg-card/60 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <Label className="shrink-0">Broadcast channel</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email only</SelectItem>
              <SelectItem value="whatsapp">WhatsApp only (stub)</SelectItem>
              <SelectItem value="both">Email + WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            WhatsApp goes to {subscribers.filter((s) => s.is_active && s.whatsapp_opted_in && formatWhatsAppNumber(s.phone_number)).length} opted-in number(s).
          </p>
        </div>

        <Tabs defaultValue="create">
          <TabsList>
            <TabsTrigger value="create"><Plus className="h-4 w-4 mr-1" /> Create</TabsTrigger>
            <TabsTrigger value="list">Announcements</TabsTrigger>
            <TabsTrigger value="subs">Subscribers</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="rounded-xl border p-6 space-y-4 bg-card/60">
              <div>
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Summer Competition starts June 1st" />
              </div>
              <div>
                <Label>Content</Label>
                <RichTextEditor value={content} onChange={setContent} />
                <p className="text-xs text-muted-foreground mt-1">Use the toolbar to add links, buttons, headings, and lists. Content is sent as HTML.</p>
              </div>
              {content && (
                <div>
                  <Label>Preview</Label>
                  <div className="rounded-md border bg-background p-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select value={audience} onValueChange={setAudience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{audiences.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CTA label (optional)</Label>
                  <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="View on site" />
                </div>
                <div>
                  <Label>CTA URL (optional)</Label>
                  <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://vibekonect.com/competition" />
                </div>
              </div>
              <div>
                <Label>Schedule for (optional)</Label>
                <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => create(false)} disabled={busy}>Save draft</Button>
                <Button onClick={() => create(true)} disabled={busy || !scheduledFor} variant="outline">Schedule</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="mt-4 space-y-3">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : announcements.length === 0 ? (
              <p className="text-muted-foreground text-sm">No announcements yet.</p>
            ) : announcements.map((a) => (
              <div key={a.id} className="rounded-xl border p-4 bg-card/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{a.announcement_type}</Badge>
                      <Badge variant={a.status === "sent" ? "default" : "secondary"}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">→ {a.target_audience}</span>
                    </div>
                    <h3 className="font-semibold mt-2">{a.title}</h3>
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2 prose prose-invert max-w-none prose-sm" dangerouslySetInnerHTML={{ __html: a.content }} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Recipients: {a.recipients_count} · Opens: {a.opens_count} · Clicks: {a.clicks_count}
                      {a.scheduled_for && <> · Scheduled: {new Date(a.scheduled_for).toLocaleString()}</>}
                      {a.sent_at && <> · Sent: {new Date(a.sent_at).toLocaleString()}</>}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => send(a.id)} disabled={busy || a.status === "sent"}>
                      <Send className="h-3 w-3 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendTest(a.id)} disabled={busy}>Test</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="subs" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{subscribers.length} subscriber(s)</p>
              <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr><th className="text-left p-2">Email</th><th className="text-left p-2">Status</th><th className="text-left p-2">WhatsApp</th><th className="text-left p-2">Source</th><th className="text-left p-2">Subscribed</th></tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 break-all">{s.email}</td>
                      <td className="p-2">
                        {!s.is_active ? <Badge variant="destructive">unsub</Badge> :
                          s.email_verified ? <Badge>verified</Badge> : <Badge variant="secondary">pending</Badge>}
                      </td>
                      <td className="p-2">
                        {s.whatsapp_opted_in && formatWhatsAppNumber(s.phone_number) ? <Badge variant="outline">{formatWhatsAppNumber(s.phone_number)}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-2 text-muted-foreground">{s.source}</td>
                      <td className="p-2 text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}