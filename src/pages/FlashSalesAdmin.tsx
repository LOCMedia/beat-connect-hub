import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Flame } from "lucide-react";
import { Price } from "@/lib/currency";
import { CountdownTimer } from "@/components/CountdownTimer";

interface BeatRow {
  id: string;
  title: string;
  price_pence: number | null;
}

interface SaleRow {
  id: string;
  beat_id: string;
  discount_percent: number;
  original_price: number;
  sale_price: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function FlashSalesAdmin() {
  const { isAdmin, loading } = useAuth();
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [beatId, setBeatId] = useState("");
  const [discount, setDiscount] = useState("25");
  const [start, setStart] = useState(toLocalInput(new Date()));
  const [end, setEnd] = useState(toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)));
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [b, s] = await Promise.all([
      (supabase as any).from("beats").select("id,title,price_pence").order("created_at", { ascending: false }),
      (supabase as any).from("flash_sales").select("*").order("start_time", { ascending: false }),
    ]);
    setBeats((b.data as BeatRow[]) || []);
    setSales((s.data as SaleRow[]) || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
  }, [isAdmin]);

  const selectedBeat = useMemo(() => beats.find((b) => b.id === beatId), [beats, beatId]);
  const previewSale = useMemo(() => {
    const orig = selectedBeat?.price_pence || 0;
    const pct = Math.max(0, Math.min(90, parseInt(discount || "0", 10) || 0));
    return { orig, sale: Math.round(orig * (1 - pct / 100)) };
  }, [selectedBeat, discount]);

  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10">Loading…</main>
      </div>
    );
  if (!isAdmin) return <Navigate to="/" replace />;

  const updateBeatPrice = async (id: string, value: string) => {
    const cents = Math.max(0, Math.round(parseFloat(value || "0") * 100));
    const { error } = await (supabase as any).from("beats").update({ price_pence: cents }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Price updated");
      setBeats((prev) => prev.map((b) => (b.id === id ? { ...b, price_pence: cents } : b)));
    }
  };

  const createSale = async () => {
    if (!beatId) return toast.error("Pick a beat");
    const pct = parseInt(discount, 10);
    if (!Number.isFinite(pct) || pct < 1 || pct > 90) return toast.error("Discount must be 1–90");
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (new Date(endIso) <= new Date(startIso)) return toast.error("End must be after start");
    if (!selectedBeat || !selectedBeat.price_pence) return toast.error("Set a price on this beat first");

    setSaving(true);
    const { error } = await (supabase as any).from("flash_sales").insert({
      beat_id: beatId,
      discount_percent: pct,
      original_price: previewSale.orig,
      sale_price: previewSale.sale,
      start_time: startIso,
      end_time: endIso,
      active: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Flash sale scheduled");
    setBeatId("");
    refresh();
  };

  const toggleActive = async (s: SaleRow) => {
    const { error } = await (supabase as any).from("flash_sales").update({ active: !s.active }).eq("id", s.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sale?")) return;
    const { error } = await (supabase as any).from("flash_sales").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const now = Date.now();
  const live = sales.filter((s) => s.active && new Date(s.start_time).getTime() <= now && new Date(s.end_time).getTime() > now);
  const upcoming = sales.filter((s) => s.active && new Date(s.start_time).getTime() > now);
  const ended = sales.filter((s) => !s.active || new Date(s.end_time).getTime() <= now);

  const beatTitle = (id: string) => beats.find((b) => b.id === id)?.title || "Unknown";

  const renderSale = (s: SaleRow) => (
    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="min-w-0">
        <div className="font-semibold truncate">{beatTitle(s.beat_id)}</div>
        <div className="text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1">
            {s.discount_percent}% off
          </Badge>
          <Price gbpPence={s.sale_price} className="font-semibold text-heat" />{" "}
          <span className="line-through opacity-70">
            <Price gbpPence={s.original_price} />
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {new Date(s.start_time).toLocaleString()} → {new Date(s.end_time).toLocaleString()}
          {new Date(s.end_time).getTime() > now && (
            <>
              {" · ends in "}
              <CountdownTimer to={s.end_time} className="tabular-nums" />
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
        <Button size="icon" variant="ghost" onClick={() => remove(s.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
            <Flame className="h-6 w-6 text-heat" /> Flash Sales
          </h1>
          <p className="text-sm text-muted-foreground">Schedule limited-time discounts on individual beats.</p>
        </div>

        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">Schedule a flash sale</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Beat</Label>
              <select
                value={beatId}
                onChange={(e) => setBeatId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a beat…</option>
                {beats.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} {b.price_pence ? `— $${(b.price_pence / 100).toFixed(2)}` : "(no price set)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {selectedBeat && previewSale.orig > 0 && (
            <div className="text-sm text-muted-foreground">
              Preview:{" "}
              <span className="line-through">
                <Price gbpPence={previewSale.orig} />
              </span>{" "}
              →{" "}
              <span className="font-semibold text-heat">
                <Price gbpPence={previewSale.sale} />
              </span>
            </div>
          )}
          <Button onClick={createSale} disabled={saving} className="bg-gradient-primary text-primary-foreground">
            {saving ? "Scheduling…" : "Schedule sale"}
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Beat prices</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {beats.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded border border-border/60 p-2">
                <div className="flex-1 truncate text-sm">{b.title}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">$</div>
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={((b.price_pence || 0) / 100).toFixed(2)}
                  onBlur={(e) => updateBeatPrice(b.id, e.target.value)}
                  className="w-28"
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Flame className="h-4 w-4 text-heat" /> Live ({live.length})
            </h2>
            {live.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live sales.</p>
            ) : (
              live.map(renderSale)
            )}
          </Card>
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scheduled sales.</p>
            ) : (
              upcoming.map(renderSale)
            )}
          </Card>
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Ended / Inactive ({ended.length})</h2>
            {ended.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past sales.</p>
            ) : (
              ended.map(renderSale)
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}