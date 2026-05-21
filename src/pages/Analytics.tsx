import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2, MessageCircle, Instagram, TrendingUp, Play, Target, Flame, Music, Smile, Filter, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface LeadRow {
  beat_id: string;
  source: string;
  created_at: string;
}
interface BeatRow {
  id: string;
  title: string;
  genre?: string | null;
  mood?: string | null;
}
interface AnalyticsRow {
  beat_id: string;
  action_type: "play" | "whatsapp_click" | "instagram_click" | "share";
  created_at: string;
}
interface PurchaseRow {
  id: string;
  created_at: string;
}

const Analytics = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [events, setEvents] = useState<AnalyticsRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/auth");
    if (!isAdmin) {
      toast.error("Admin access only");
      return navigate("/");
    }
    (async () => {
      const [{ data: leadData }, { data: beatData }, { data: eventData }, { data: purchaseData }] = await Promise.all([
        supabase.from("leads").select("beat_id,source,created_at").order("created_at"),
        supabase.from("beats").select("id,title,genre,mood"),
        supabase.from("beat_analytics").select("beat_id,action_type,created_at").order("created_at"),
        supabase.from("purchases").select("id,created_at"),
      ]);
      setLeads((leadData ?? []) as LeadRow[]);
      setBeats((beatData ?? []) as BeatRow[]);
      setEvents((eventData ?? []) as AnalyticsRow[]);
      setPurchases((purchaseData ?? []) as PurchaseRow[]);
      setBusy(false);
    })();
  }, [user, isAdmin, loading, navigate]);

  const titleById = useMemo(() => Object.fromEntries(beats.map((b) => [b.id, b.title])), [beats]);
  const genreById = useMemo(() => Object.fromEntries(beats.map((b) => [b.id, b.genre ?? "Unknown"])), [beats]);

  // Plays + inquiries per beat, top 5 played
  const topBeats = useMemo(() => {
    const plays: Record<string, number> = {};
    const inq: Record<string, number> = {};
    events.forEach((e) => {
      if (e.action_type === "play") plays[e.beat_id] = (plays[e.beat_id] || 0) + 1;
      else if (e.action_type === "whatsapp_click" || e.action_type === "instagram_click")
        inq[e.beat_id] = (inq[e.beat_id] || 0) + 1;
    });
    return Object.entries(plays)
      .map(([id, p]) => ({
        title: titleById[id] ?? "Unknown",
        plays: p,
        inquiries: inq[id] || 0,
        conversion: p > 0 ? Math.round(((inq[id] || 0) / p) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
  }, [events, titleById]);

  const totals = useMemo(() => {
    const plays = events.filter((e) => e.action_type === "play").length;
    const inquiries = events.filter(
      (e) => e.action_type === "whatsapp_click" || e.action_type === "instagram_click",
    ).length;
    const conv = plays > 0 ? Math.round((inquiries / plays) * 1000) / 10 : 0;
    return { plays, inquiries, conv };
  }, [events]);

  // Time series: leads per day per beat (last 30 days)
  const { timeSeries, beatKeys } = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts: Record<string, Record<string, number>> = {};
    days.forEach((d) => (counts[d] = {}));
    const beatTotals: Record<string, number> = {};
    leads.forEach((l) => {
      const day = l.created_at.slice(0, 10);
      if (!(day in counts)) return;
      const t = titleById[l.beat_id] ?? "Unknown";
      counts[day][t] = (counts[day][t] || 0) + 1;
      beatTotals[t] = (beatTotals[t] || 0) + 1;
    });
    const topBeats = Object.entries(beatTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);
    const series = days.map((d) => {
      const row: Record<string, string | number> = { date: d.slice(5) };
      topBeats.forEach((t) => (row[t] = counts[d][t] || 0));
      return row;
    });
    return { timeSeries: series, beatKeys: topBeats };
  }, [leads, titleById]);

  // WhatsApp vs Instagram totals
  const sourceData = useMemo(() => {
    const w = leads.filter((l) => l.source === "whatsapp").length;
    const i = leads.filter((l) => l.source === "instagram").length;
    return { whatsapp: w, instagram: i, total: leads.length, data: [{ name: "Inquiries", whatsapp: w, instagram: i }] };
  }, [leads]);

  const palette = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--heat))", "hsl(180 100% 50%)", "hsl(320 100% 60%)"];

  const lineConfig: ChartConfig = useMemo(
    () => Object.fromEntries(beatKeys.map((k, i) => [k, { label: k, color: palette[i % palette.length] }])),
    [beatKeys],
  );

  const sourceConfig: ChartConfig = {
    whatsapp: { label: "WhatsApp", color: "hsl(142 70% 45%)" },
    instagram: { label: "Instagram", color: "hsl(320 80% 60%)" },
  };

  const topConfig: ChartConfig = {
    plays: { label: "Plays", color: "hsl(var(--primary))" },
    inquiries: { label: "Inquiries", color: "hsl(var(--heat))" },
  };

  // Top genres by interest (whatsapp + instagram clicks)
  const topGenres = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.action_type !== "whatsapp_click" && e.action_type !== "instagram_click") return;
      const g = genreById[e.beat_id] ?? "Unknown";
      counts[g] = (counts[g] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([genre, inquiries]) => ({ genre, inquiries }))
      .sort((a, b) => b.inquiries - a.inquiries)
      .slice(0, 5);
  }, [events, genreById]);

  const moodData = useMemo(() => {
    const counts: Record<string, number> = {};
    beats.forEach((b) => {
      const m = b.mood?.trim() || "Unknown";
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [beats]);

  const funnel = useMemo(() => {
    const views = events.filter((e) => e.action_type === "play").length;
    const wa = events.filter((e) => e.action_type === "whatsapp_click").length;
    return { views, whatsapp: wa, purchases: purchases.length };
  }, [events, purchases]);

  // Heatmap: 7 days x 24 hours grid of engagement (plays + clicks)
  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    events.forEach((e) => {
      const d = new Date(e.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      grid[day][hour] += 1;
      if (grid[day][hour] > max) max = grid[day][hour];
    });
    return { grid, max };
  }, [events]);

  const pieColors = ["hsl(var(--primary))", "hsl(var(--heat))", "hsl(var(--accent))", "hsl(180 70% 50%)", "hsl(280 70% 60%)", "hsl(40 90% 55%)"];
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const funnelMax = Math.max(funnel.views, 1);

  if (loading || busy) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track interest in your beats</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" /> Total Plays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.plays}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Total Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sourceData.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totals.conv}%</div>
              <p className="text-xs text-muted-foreground mt-1">inquiries ÷ plays</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[hsl(142_70%_45%)]" /> WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sourceData.whatsapp}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-heat" /> Top Played Beats</CardTitle>
          </CardHeader>
          <CardContent>
            {topBeats.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No plays yet.</p>
            ) : (
              <ChartContainer config={topConfig} className="h-[280px] w-full">
                <BarChart data={topBeats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="plays" fill="var(--color-plays)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="inquiries" fill="var(--color-inquiries)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Leads per Beat (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {beatKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No leads yet.</p>
            ) : (
              <ChartContainer config={lineConfig} className="h-[320px] w-full">
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {beatKeys.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={`var(--color-${k})`}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp vs Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={sourceConfig} className="h-[260px] w-full">
              <BarChart data={sourceData.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="whatsapp" fill="var(--color-whatsapp)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="instagram" fill="var(--color-instagram)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" /> Top 5 Genres by Interest</CardTitle>
            </CardHeader>
            <CardContent>
              {topGenres.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No inquiries yet.</p>
              ) : (
                <div className="space-y-2">
                  {topGenres.map((g, i) => {
                    const max = topGenres[0].inquiries || 1;
                    return (
                      <div key={g.genre} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{g.genre}</span>
                          <span className="text-muted-foreground tabular-nums">{g.inquiries}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(g.inquiries / max) * 100}%`,
                              background: pieColors[i % pieColors.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5 text-accent" /> Mood Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {moodData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No mood data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={moodData} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 11 }}>
                      {moodData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-heat" /> Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Profile Views (plays)", value: funnel.views, color: "hsl(var(--primary))" },
              { label: "WhatsApp Clicks", value: funnel.whatsapp, color: "hsl(142 70% 45%)" },
              { label: "Purchases", value: funnel.purchases, color: "hsl(var(--heat))" },
            ].map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{step.label}</span>
                  <span className="tabular-nums text-muted-foreground">{step.value}</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(step.value / funnelMax) * 100}%`, background: step.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Beat Heat Map (engagement by day & hour)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: "auto repeat(24, minmax(14px, 1fr))" }}>
                <div />
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="text-[9px] text-muted-foreground text-center">{h}</div>
                ))}
                {heatmap.grid.map((row, d) => (
                  <Fragment key={`row-${d}`}>
                    <div className="text-[10px] text-muted-foreground pr-2 self-center">{dayLabels[d]}</div>
                    {row.map((v, h) => {
                      const intensity = heatmap.max > 0 ? v / heatmap.max : 0;
                      return (
                        <div
                          key={`${d}-${h}`}
                          title={`${dayLabels[d]} ${h}:00 — ${v} events`}
                          className="aspect-square rounded-sm border border-border/30"
                          style={{ background: `hsl(var(--primary) / ${0.08 + intensity * 0.85})` }}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;