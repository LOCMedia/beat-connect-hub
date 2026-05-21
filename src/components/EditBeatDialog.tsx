import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Beat } from "@/components/BeatCard";

const MAX_BYTES = 25 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(1).max(100),
  genre: z.string().trim().min(1).max(40),
  bpm: z.number().int().min(20).max(400),
  key: z.string().trim().min(1).max(10),
  price_pence: z.number().int().min(0).max(10_000_00),
  compare_at_price_pence: z.number().int().min(0).max(10_000_00),
});

interface Props {
  beat: Beat | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}

export const EditBeatDialog = ({ beat, open, onOpenChange, onSaved }: Props) => {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireInstagram, setRequireInstagram] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [licMp3, setLicMp3] = useState("29.99");
  const [licWav, setLicWav] = useState("49.99");
  const [licStems, setLicStems] = useState("99.95");
  const [licUnlimited, setLicUnlimited] = useState("149.95");
  const [licExclusive, setLicExclusive] = useState("599.95");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!beat) return;
    setTitle(beat.title);
    setGenre(beat.genre);
    setBpm(String(beat.bpm));
    setKey(beat.key);
    setPrice(((beat.price_pence ?? 0) / 100).toFixed(2));
    setCompareAtPrice(beat.compare_at_price_pence ? (beat.compare_at_price_pence / 100).toFixed(2) : "");
    setDownloadEnabled(beat.download_enabled ?? true);
    setRequireYoutube(beat.require_youtube_follow ?? false);
    setRequireInstagram(beat.require_instagram_follow ?? false);
    const b = beat as unknown as Record<string, number | boolean | undefined>;
    setIsFree(Boolean(b.is_free));
    setLicMp3((((b.license_mp3_price as number) ?? 2999) / 100).toFixed(2));
    setLicWav((((b.license_wav_price as number) ?? 4999) / 100).toFixed(2));
    setLicStems((((b.license_stems_price as number) ?? 9995) / 100).toFixed(2));
    setLicUnlimited((((b.license_unlimited_price as number) ?? 14995) / 100).toFixed(2));
    setLicExclusive((((b.license_exclusive_price as number) ?? 59995) / 100).toFixed(2));
    setCoverFile(null);
    setAudioFile(null);
  }, [beat]);

  const save = async () => {
    if (!beat) return;
    const priceCents = Math.round(parseFloat(price || "0") * 100);
    const compareCents = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : 0;
    const parsed = schema.safeParse({
      title, genre, bpm: parseInt(bpm, 10), key,
      price_pence: isNaN(priceCents) ? 0 : priceCents,
      compare_at_price_pence: isNaN(compareCents) ? 0 : compareCents,
    });
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (parsed.data.compare_at_price_pence > 0 && parsed.data.compare_at_price_pence <= parsed.data.price_pence) {
      return toast.error("Compare-at price must be greater than price");
    }
    if (audioFile && audioFile.size > MAX_BYTES) return toast.error("Audio exceeds 25MB");

    setSaving(true);
    try {
      const update: {
        title: string;
        genre: string;
        bpm: number;
        key: string;
        price_pence: number;
        compare_at_price_pence: number;
        download_enabled: boolean;
        require_youtube_follow: boolean;
        require_instagram_follow: boolean;
        audio_url?: string;
        cover_image_url?: string;
        is_free?: boolean;
        license_mp3_price?: number;
        license_wav_price?: number;
        license_stems_price?: number;
        license_unlimited_price?: number;
        license_exclusive_price?: number;
      } = {
        title: parsed.data.title,
        genre: parsed.data.genre,
        bpm: parsed.data.bpm,
        key: parsed.data.key,
        price_pence: parsed.data.price_pence,
        compare_at_price_pence: parsed.data.compare_at_price_pence,
        download_enabled: downloadEnabled,
        require_youtube_follow: requireYoutube,
        require_instagram_follow: requireInstagram,
        is_free: isFree,
        license_mp3_price: Math.round(parseFloat(licMp3 || "0") * 100),
        license_wav_price: Math.round(parseFloat(licWav || "0") * 100),
        license_stems_price: Math.round(parseFloat(licStems || "0") * 100),
        license_unlimited_price: Math.round(parseFloat(licUnlimited || "0") * 100),
        license_exclusive_price: Math.round(parseFloat(licExclusive || "0") * 100),
      };

      if (audioFile && beat.user_id) {
        const ext = audioFile.name.split(".").pop()?.toLowerCase() || "mp3";
        const path = `${beat.user_id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("beat-snippets").upload(path, audioFile, {
          contentType: audioFile.type || "audio/mpeg", upsert: false,
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("beat-snippets").getPublicUrl(path);
        update.audio_url = publicUrl;
      }

      if (coverFile && beat.user_id) {
        const ext = coverFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${beat.user_id}/${beat.id}.${ext}`;
        const { error: cErr } = await supabase.storage.from("beat-images").upload(path, coverFile, {
          contentType: coverFile.type || "image/jpeg", upsert: true,
        });
        if (cErr) throw cErr;
        const { data: { publicUrl } } = supabase.storage.from("beat-images").getPublicUrl(path);
        update.cover_image_url = publicUrl;
      }

      const { error } = await supabase.from("beats").update(update).eq("id", beat.id);
      if (error) throw error;
      toast.success("Beat updated");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Beat</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>BPM</Label>
              <Input type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (USD)</Label>
              <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Compare at price</Label>
              <Input type="number" step="0.01" min="0" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Replace audio (optional)</Label>
            <Input type="file" accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/m4a,audio/wav" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2">
            <Label>Replace cover image (optional)</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-2 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">Download settings</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={downloadEnabled} onCheckedChange={(v) => setDownloadEnabled(v === true)} />
              Enable download button
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireYoutube} onCheckedChange={(v) => setRequireYoutube(v === true)} />
              Require YouTube subscribe
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireInstagram} onCheckedChange={(v) => setRequireInstagram(v === true)} />
              Require Instagram follow
            </label>
          </div>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">Licensing</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={isFree} onCheckedChange={(v) => setIsFree(v === true)} />
              This beat is FREE (show lead capture form instead of license prices)
            </label>
            {!isFree && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>MP3 Lease ($)</Label><Input type="number" step="0.01" value={licMp3} onChange={(e) => setLicMp3(e.target.value)} /></div>
                <div className="space-y-1"><Label>WAV Lease ($)</Label><Input type="number" step="0.01" value={licWav} onChange={(e) => setLicWav(e.target.value)} /></div>
                <div className="space-y-1"><Label>STEMS Lease ($)</Label><Input type="number" step="0.01" value={licStems} onChange={(e) => setLicStems(e.target.value)} /></div>
                <div className="space-y-1"><Label>Unlimited Lease ($)</Label><Input type="number" step="0.01" value={licUnlimited} onChange={(e) => setLicUnlimited(e.target.value)} /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Exclusive Rights ($)</Label><Input type="number" step="0.01" value={licExclusive} onChange={(e) => setLicExclusive(e.target.value)} /></div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};