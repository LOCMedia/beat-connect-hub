import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Upload } from "lucide-react";

type Track = {
  id: string;
  title: string;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  price: number;
  suggested_split_producer: number;
  is_published: boolean;
  audio_preview_url: string | null;
  full_track_url: string | null;
  stems_zip_url: string | null;
};

const StudioTracksAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [chorus, setChorus] = useState("");
  const [credit, setCredit] = useState("Produced by LocBeatx | Additional vocals by [Artist]");
  const [split, setSplit] = useState(30);
  const [price, setPrice] = useState(2900);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [fullFile, setFullFile] = useState<File | null>(null);
  const [stemsFile, setStemsFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = "Studio Tracks Admin | VibeKonect";
    if (isAdmin) loadTracks();
  }, [isAdmin]);

  const loadTracks = async () => {
    const { data } = await supabase
      .from("studio_tracks" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setTracks((data as any) || []);
  };

  if (authLoading) return <div className="p-8">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const uploadFile = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSubmitting(true);
    try {
      let preview_url: string | null = null;
      let full_url: string | null = null;
      let stems_url: string | null = null;
      let cover_url: string | null = null;

      if (previewFile) preview_url = await uploadFile("studio-tracks-preview", previewFile);
      if (fullFile) full_url = await uploadFile("studio-tracks-full", fullFile);
      if (stemsFile) stems_url = await uploadFile("studio-tracks-full", stemsFile);
      if (coverFile) cover_url = await uploadFile("studio-tracks-covers", coverFile);

      const { error } = await supabase.from("studio_tracks" as any).insert({
        title,
        description: description || null,
        genre: genre || null,
        bpm: bpm ? parseInt(bpm) : null,
        key: key || null,
        chorus_lyrics: chorus || null,
        artist_credit_suggestion: credit,
        suggested_split_producer: split,
        price,
        audio_preview_url: preview_url,
        full_track_url: full_url,
        stems_zip_url: stems_url,
        cover_image_url: cover_url,
      });
      if (error) throw error;
      toast.success("Studio track published");
      setTitle(""); setDescription(""); setGenre(""); setBpm(""); setKey("");
      setChorus(""); setPreviewFile(null); setFullFile(null); setStemsFile(null); setCoverFile(null);
      loadTracks();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    const { error } = await supabase.from("studio_tracks" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadTracks(); }
  };

  const togglePublish = async (t: Track) => {
    await supabase.from("studio_tracks" as any).update({ is_published: !t.is_published }).eq("id", t.id);
    loadTracks();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Studio Tracks Admin</h1>

        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload new track</h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="R&B" />
                </div>
                <div>
                  <Label htmlFor="bpm">BPM</Label>
                  <Input id="bpm" type="number" value={bpm} onChange={(e) => setBpm(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="key">Key</Label>
                  <Input id="key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="A min" />
                </div>
              </div>
              <div>
                <Label htmlFor="chorus">Chorus lyrics</Label>
                <Textarea id="chorus" value={chorus} onChange={(e) => setChorus(e.target.value)} rows={4} />
              </div>
              <div>
                <Label htmlFor="credit">Artist credit suggestion</Label>
                <Input id="credit" value={credit} onChange={(e) => setCredit(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="split">Producer split %</Label>
                  <Input id="split" type="number" min={0} max={100} value={split} onChange={(e) => setSplit(parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <Label htmlFor="price">Price (pence)</Label>
                  <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Cover image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>60s preview (MP3)</Label>
                  <Input type="file" accept="audio/*" onChange={(e) => setPreviewFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>Full track (MP3/WAV)</Label>
                  <Input type="file" accept="audio/*" onChange={(e) => setFullFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>Stems (zip)</Label>
                  <Input type="file" accept=".zip" onChange={(e) => setStemsFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Publish track
              </Button>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold mb-3">Existing tracks ({tracks.length})</h2>
        <div className="space-y-3">
          {tracks.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">{t.title}</span>
                    {!t.is_published && <Badge variant="secondary">Hidden</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.genre} · {t.bpm} BPM · {t.key} · £{(t.price / 100).toFixed(0)}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(t)}>
                    {t.is_published ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default StudioTracksAdmin;