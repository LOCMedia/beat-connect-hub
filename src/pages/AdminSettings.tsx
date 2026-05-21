import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function AdminSettings() {
  const { isAdmin, loading } = useAuth();
  const [percent, setPercent] = useState<string>("20");
  const [saving, setSaving] = useState(false);
  const [feeEnabled, setFeeEnabled] = useState(false);
  const [feePence, setFeePence] = useState<string>("0");
  const [savingFee, setSavingFee] = useState(false);
  const [ytConnected, setYtConnected] = useState<boolean | null>(null);
  const [ytAutoDefault, setYtAutoDefault] = useState(false);
  const [savingYt, setSavingYt] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [savingMaint, setSavingMaint] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    if (!isAdmin) return;
    (supabase as any).from("app_settings")
      .select("default_commission_percent, producer_fee_enabled, producer_fee_pence")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.default_commission_percent != null) setPercent(String(data.default_commission_percent));
        if (data?.producer_fee_enabled != null) setFeeEnabled(!!data.producer_fee_enabled);
        if (data?.producer_fee_pence != null) setFeePence(String(data.producer_fee_pence));
      });
    (supabase as any).from("admin_settings").select("key,value").in("key", ["youtube_refresh_token", "youtube_auto_upload_default", "maintenance_mode"]).then(({ data }: any) => {
      const rows = (data || []) as Array<{ key: string; value: string | null }>;
      setYtConnected(!!rows.find(r => r.key === "youtube_refresh_token" && r.value));
      setYtAutoDefault(rows.find(r => r.key === "youtube_auto_upload_default")?.value === "true");
      setMaintenance(rows.find(r => r.key === "maintenance_mode")?.value === "true");
    });
  }, [isAdmin]);

  useEffect(() => {
    const r = params.get("youtube");
    if (r === "success") { toast.success("YouTube connected"); setParams({}, { replace: true }); }
    else if (r === "error") { toast.error(`YouTube connect failed: ${params.get("msg") || ""}`); setParams({}, { replace: true }); }
  }, [params, setParams]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><main className="container py-10">Loading…</main></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const connectYouTube = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-auth?return_to=${encodeURIComponent(window.location.origin + "/admin/settings")}`;
    window.location.href = url;
  };

  const saveYtDefault = async (next: boolean) => {
    setYtAutoDefault(next);
    setSavingYt(true);
    const { error } = await (supabase as any).from("admin_settings").upsert(
      { key: "youtube_auto_upload_default", value: next ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSavingYt(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  };

  const saveMaintenance = async (next: boolean) => {
    setMaintenance(next);
    setSavingMaint(true);
    const { error } = await (supabase as any).from("admin_settings").upsert(
      { key: "maintenance_mode", value: next ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    setSavingMaint(false);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Maintenance mode ON — visitors see the maintenance page" : "Maintenance mode OFF");
  };

  const save = async () => {
    const v = parseFloat(percent);
    if (isNaN(v) || v < 0 || v > 100) { toast.error("Enter 0–100"); return; }
    setSaving(true);
    const { error } = await supabase.from("app_settings")
      .update({ default_commission_percent: v, updated_at: new Date().toISOString() })
      .eq("id", true);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Default commission updated");
  };

  const saveFee = async () => {
    const pence = parseInt(feePence, 10);
    if (isNaN(pence) || pence < 0 || pence > 1000) { toast.error("Fee must be £0–£10 (in pence: 0–1000)"); return; }
    setSavingFee(true);
    const { error } = await (supabase as any).from("app_settings")
      .update({
        producer_fee_enabled: feeEnabled,
        producer_fee_pence: pence,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSavingFee(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Producer fee settings saved");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-xl py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Global defaults for sponsored challenges</p>
          <a href="/admin/downloads" className="inline-block mt-2 text-sm text-primary underline">→ Manage beat downloads & request queue</a>
        </div>
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="pct">Default commission percentage</Label>
            <div className="flex gap-2 mt-1">
              <Input id="pct" type="number" min="0" max="100" step="0.1"
                value={percent} onChange={(e) => setPercent(e.target.value)} />
              <span className="self-center text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Applied to new sponsored challenges. Existing challenges keep the percentage they were created with.
            </p>
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save"}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold">Tournament: producer beat submission fee</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Default is FREE to grow audience. Enable a fee later (Stripe checkout wiring required).
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="fee-enabled">Require payment from producers</Label>
            <Switch id="fee-enabled" checked={feeEnabled} onCheckedChange={setFeeEnabled} />
          </div>
          <div>
            <Label htmlFor="fee-pence">Fee amount (pence, 0–1000 = £0–£10)</Label>
            <Input id="fee-pence" type="number" min="0" max="1000" step="50"
              value={feePence} onChange={(e) => setFeePence(e.target.value)} disabled={!feeEnabled} />
          </div>
          <Button onClick={saveFee} disabled={savingFee} className="w-full">
            {savingFee ? "Saving…" : "Save fee settings"}
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold">YouTube auto-upload</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your YouTube channel so new beats can be auto-uploaded as unlisted videos.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {ytConnected === null ? "Checking…" : ytConnected ? "✅ Connected to YouTube" : "❌ Not connected"}
            </span>
            <Button variant={ytConnected ? "outline" : "default"} onClick={connectYouTube}>
              {ytConnected ? "Reconnect" : "Connect YouTube Account"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="yt-default">Auto-upload new beats by default</Label>
            <Switch id="yt-default" checked={ytAutoDefault} onCheckedChange={saveYtDefault} disabled={savingYt || !ytConnected} />
          </div>
        </Card>

        <Card className="p-6 space-y-4 border-amber-500/40">
          <div>
            <h2 className="font-semibold">🛠 Maintenance mode</h2>
            <p className="text-xs text-muted-foreground mt-1">
              When ON, every non-admin visitor sees a maintenance page. Admins (you) still have full access while signed in.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="maint">Enable maintenance mode</Label>
            <Switch id="maint" checked={maintenance} onCheckedChange={saveMaintenance} disabled={savingMaint} />
          </div>
        </Card>
      </main>
    </div>
  );
}
