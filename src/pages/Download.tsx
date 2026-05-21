import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download as DownloadIcon, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PurchaseInfo {
  id: string;
  download_count: number;
  download_expires_at: string;
  beat: { title: string; genre: string } | null;
  license: { name: string; price: number } | null;
}

const MAX_DOWNLOADS = 5;

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const Download = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    if (!token) {
      setError("Missing download token");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("purchases")
      .select("id, download_count, download_expires_at, beat:beats(title,genre), license:licenses(name,price)")
      .eq("download_token", token)
      .maybeSingle();
    if (error || !data) {
      setError("Download link not found");
    } else {
      setPurchase(data as unknown as PurchaseInfo);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expiresMs = purchase ? new Date(purchase.download_expires_at).getTime() - now : 0;
  const expired = expiresMs <= 0;
  const remaining = purchase ? Math.max(0, MAX_DOWNLOADS - purchase.download_count) : 0;
  const exhausted = remaining <= 0;

  const handleDownload = async () => {
    if (!purchase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-download-url", {
        body: { purchase_id: purchase.id, token },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No URL returned");
      window.location.href = data.url;
      toast.success("Download starting…");
      setTimeout(load, 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Link Invalid
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error || "We couldn't find this download link."} Please contact support if you believe this is a mistake.
          </CardContent>
        </Card>
      </div>
    );
  }

  const blocked = expired || exhausted;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{purchase.beat?.title ?? "Beat"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {purchase.license?.name ?? "License"} · {purchase.beat?.genre}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" /> Expires in
              </div>
              <div className={`text-lg font-bold tabular-nums ${expired ? "text-destructive" : ""}`}>
                {formatRemaining(expiresMs)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DownloadIcon className="h-3 w-3" /> Downloads left
              </div>
              <div className={`text-lg font-bold tabular-nums ${exhausted ? "text-destructive" : ""}`}>
                {remaining} / {MAX_DOWNLOADS}
              </div>
            </div>
          </div>

          {blocked ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <div className="font-semibold flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="h-4 w-4" /> Download link expired
              </div>
              <p className="text-muted-foreground">
                {expired ? "This link has passed its 7-day expiry." : "You've reached the maximum number of downloads."}{" "}
                Please contact me on WhatsApp or Instagram to resolve.
              </p>
            </div>
          ) : (
            <Button
              onClick={handleDownload}
              disabled={busy}
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <DownloadIcon className="h-5 w-5 mr-2" /> Download Beat
                </>
              )}
            </Button>
          )}

          {purchase.download_count > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Downloaded {purchase.download_count} time
              {purchase.download_count === 1 ? "" : "s"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Download;