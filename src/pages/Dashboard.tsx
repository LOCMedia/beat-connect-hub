import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Flame, Lock, Sparkles, Pencil } from "lucide-react";
import type { Beat } from "@/components/BeatCard";
import { generateAndUploadCover } from "@/lib/coverImage";
import { EditBeatDialog } from "@/components/EditBeatDialog";
import { Switch } from "@/components/ui/switch";

const MAX_BYTES = 25 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(100),
  genre: z.string().trim().min(1, "Genre required").max(40),
  bpm: z.number().int().min(20).max(400),
  key: z.string().trim().min(1, "Key required").max(10),
  price_pence: z.number().int().min(0).max(10_000_00),
  compare_at_price_pence: z.number().int().min(0).max(10_000_00),
});

const Dashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireInstagram, setRequireInstagram] = useState(false);
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [watermarking, setWatermarking] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [editing, setEditing] = useState<Beat | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth");
    else if (!isAdmin) {
      toast.error("Admin access only");
      navigate("/");
    } else {
      loadBeats();
    }
  }, [user, isAdmin, loading, navigate]);

  const loadBeats = async () => {
    const { data } = await supabase.from("beats").select("*").order("created_at", { ascending: false });
    if (data) setBeats(data as Beat[]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!file) return toast.error("Audio file required");
    if (file.size > MAX_BYTES) return toast.error("File exceeds 25MB");

    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const compareCents = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : 0;
    const parsed = schema.safeParse({
      title,
      genre,
      bpm: parseInt(bpm, 10),
      key,
      price_pence: isNaN(priceCents) ? 0 : priceCents,
      compare_at_price_pence: isNaN(compareCents) ? 0 : compareCents,
    });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (parsed.data.compare_at_price_pence > 0 && parsed.data.compare_at_price_pence <= parsed.data.price_pence) {
      return toast.error("Compare-at price must be greater than price");
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("beat-snippets").upload(path, file, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("beat-snippets").getPublicUrl(path);
      const { data: inserted, error: insErr } = await supabase.from("beats").insert([{
        title: parsed.data.title,
        genre: parsed.data.genre,
        bpm: parsed.data.bpm,
        key: parsed.data.key,
        audio_url: publicUrl,
        user_id: user.id,
        price_pence: parsed.data.price_pence,
        compare_at_price_pence: parsed.data.compare_at_price_pence,
        currency: "USD",
        download_enabled: downloadEnabled,
        require_youtube_follow: requireYoutube,
        require_instagram_follow: requireInstagram,
      }]).select("id").single();
      if (insErr) throw insErr;
      toast.success("Beat uploaded 🔥");
      if (inserted?.id && coverFile) {
        const cExt = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const cPath = `${user.id}/${inserted.id}.${cExt}`;
        const { error: cErr } = await supabase.storage.from("beat-images").upload(cPath, coverFile, {
          contentType: coverFile.type || "image/jpeg",
          upsert: true,
        });
        if (!cErr) {
          const { data: { publicUrl: coverUrl } } = supabase.storage.from("beat-images").getPublicUrl(cPath);
          await supabase.from("beats").update({ cover_image_url: coverUrl }).eq("id", inserted.id);
        }
      } else if (inserted?.id) {
        const coverUrl = await generateAndUploadCover({
          beatId: inserted.id,
          title: parsed.data.title,
          genre: parsed.data.genre,
          bpm: parsed.data.bpm,
          key: parsed.data.key,
        });
        if (coverUrl) {
          await supabase.from("beats").update({ cover_image_url: coverUrl }).eq("id", inserted.id);
          toast.success("Cover art ready ✨");
        } else {
          toast.message("Using fallback gradient (image API unavailable)");
        }
      }
      // Trigger AI analysis in background
      if (inserted?.id) {
        supabase.functions.invoke("analyze-beat", { body: { beat_id: inserted.id, force: true } }).catch(() => {});
      }
      setTitle(""); setGenre(""); setBpm(""); setKey(""); setPrice(""); setCompareAtPrice("");
      setRequireYoutube(false); setRequireInstagram(false); setDownloadEnabled(true);
      setFile(null); setCoverFile(null);
      (document.getElementById("audio-file") as HTMLInputElement).value = "";
      const ci = document.getElementById("cover-file") as HTMLInputElement | null;
      if (ci) ci.value = "";
      loadBeats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this beat permanently?")) return;
    const { error } = await supabase.from("beats").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadBeats(); }
  };

  const toggleDownload = async (beat: Beat) => {
    const next = !(beat.download_enabled ?? false);
    const { error } = await supabase.from("beats").update({ download_enabled: next }).eq("id", beat.id);
    if (error) return toast.error(error.message);
    setBeats((prev) => prev.map((b) => (b.id === beat.id ? { ...b, download_enabled: next } : b)));
    toast.success(next ? "Downloads enabled" : "Downloads disabled");
  };

  const addWatermark = async (beat: Beat) => {
    setWatermarking(beat.id);
    try {
      const { data, error } = await supabase.functions.invoke("add-watermark", {
        body: { beat_id: beat.id, audio_url: beat.audio_url, title: beat.title },
      });
      if (error) throw error;
      toast.success("Watermark added ✓");
      console.info("watermark payload", data);
      const summary = data?.payload
        ? JSON.stringify(data.payload).slice(0, 140)
        : "Embedded forensic ID";
      toast.message("Payload preview", { description: summary });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Watermark failed");
    } finally {
      setWatermarking(null);
    }
  };

  const reanalyze = async (beat: Beat) => {
    setAnalyzing(beat.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-beat", {
        body: { beat_id: beat.id, force: true },
      });
      if (error) throw error;
      const update = (data as any)?.update ?? {};
      const suggestions: string[] = (data as any)?.genre_suggestions ?? [];
      const parts = [
        update.bpm_detected ? `BPM ${update.bpm_detected}` : null,
        update.key_detected ? `Key ${update.key_detected}` : null,
        update.genre_detected ? `Genre ${update.genre_detected}` : null,
      ].filter(Boolean);
      toast.success("Analysis complete", {
        description: parts.join(" · ") || "Saved",
      });
      if (suggestions.length > 1) {
        toast.message("Other genre options", { description: suggestions.slice(1, 3).join(", ") });
      }
      loadBeats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Upload and manage your beats</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-4 mb-10">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> New Beat</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Midnight Drive" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Trap" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bpm">BPM</Label>
              <Input id="bpm" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="140" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Am" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD)</Label>
              <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.99" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="compare-price">Compare at price (optional)</Label>
              <Input id="compare-price" type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="49.99" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audio-file">Audio file (mp3 / m4a / wav, max 25MB)</Label>
            <Input id="audio-file" type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/wav" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover-file">Cover image (optional — JPG/PNG)</Label>
            <Input id="cover-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">If omitted, AI-generated cover art will be created.</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">Download settings</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={downloadEnabled} onCheckedChange={(v) => setDownloadEnabled(v === true)} />
              Enable download button on this beat
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireYoutube} onCheckedChange={(v) => setRequireYoutube(v === true)} />
              Require YouTube subscribe before download
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireInstagram} onCheckedChange={(v) => setRequireInstagram(v === true)} />
              Require Instagram follow (@locbeatx) before download
            </label>
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Beat"}
          </Button>
        </form>

        <h2 className="text-xl font-semibold mb-4">Your Beats ({beats.length})</h2>
        <div className="space-y-2">
          {beats.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.genre} · {b.bpm} BPM · {b.key}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm"><Flame className="h-4 w-4 text-heat" /> {b.play_count}</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Switch checked={b.download_enabled ?? false} onCheckedChange={() => toggleDownload(b)} />
                  DL
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reanalyze(b)}
                  disabled={analyzing === b.id}
                >
                  {analyzing === b.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1" /> Re-analyze</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addWatermark(b)}
                  disabled={watermarking === b.id}
                >
                  {watermarking === b.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Lock className="h-4 w-4 mr-1" /> Watermark</>
                  )}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setEditOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {beats.length === 0 && <p className="text-sm text-muted-foreground">No beats yet. Upload your first one above.</p>}
        </div>
        <EditBeatDialog beat={editing} open={editOpen} onOpenChange={setEditOpen} onSaved={loadBeats} />
      </main>
    </div>
  );
};

export default Dashboard;