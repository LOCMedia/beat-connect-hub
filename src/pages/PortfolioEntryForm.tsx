import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { placeholderCoverDataUrl } from "@/lib/portfolioCover";

type EntryType = "produced" | "featured" | "project";

type TrackRow = { title: string; url: string };

type FormState = {
  entry_type: EntryType;
  title: string;
  artist_name: string;
  credit_text: string;
  external_link: string;
  cover_image_url: string;
  release_date: string;
  description: string;
  featured: boolean;
  tracklist: TrackRow[];
};

const empty: FormState = {
  entry_type: "produced",
  title: "",
  artist_name: "",
  credit_text: "",
  external_link: "",
  cover_image_url: "",
  release_date: "",
  description: "",
  featured: false,
  tracklist: [],
};

const isHttpUrl = (s: string) => /^https?:\/\/\S+/i.test(s.trim());

export default function PortfolioEntryForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [loadingEntry, setLoadingEntry] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isEdit || !isAdmin) return;
    (async () => {
      const { data, error } = await supabase
        .from("portfolio_entries" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data) {
        toast.error("Entry not found");
        navigate("/admin/portfolio");
        return;
      }
      const e = data as any;
      setForm({
        entry_type: (e.entry_type || "produced") as EntryType,
        title: e.title || "",
        artist_name: e.artist_name || "",
        credit_text: e.credit_text || "",
        external_link: e.external_link || "",
        cover_image_url: e.cover_image_url || "",
        release_date: e.release_date || "",
        description: e.description || "",
        featured: !!e.featured,
        tracklist: Array.isArray(e.tracklist)
          ? e.tracklist.map((t: any) => ({ title: t?.title || "", url: t?.url || "" }))
          : [],
      });
      setLoadingEntry(false);
    })();
  }, [id, isEdit, isAdmin, navigate]);

  if (loading || loadingEntry) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10">Loading…</main>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const tmpId = id || `new-${Date.now()}`;
      const path = `${tmpId}/upload-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("portfolio-covers")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("portfolio-covers").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
      toast.success("Cover uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const title = form.title.trim();
    if (!title) return toast.error("Title is required");
    if (form.entry_type === "featured" && !form.artist_name.trim()) {
      return toast.error("Artist name is required for Featured entries");
    }
    if (form.external_link && !isHttpUrl(form.external_link)) {
      return toast.error("External link must start with http(s)://");
    }
    if (form.cover_image_url && !isHttpUrl(form.cover_image_url) && !form.cover_image_url.startsWith("data:")) {
      return toast.error("Cover URL must be a valid http(s) URL");
    }

    const cleanTracks = form.tracklist
      .map((t) => ({ title: t.title.trim(), url: t.url.trim() }))
      .filter((t) => t.title.length > 0);

    setSaving(true);
    try {
      const payload: any = {
        entry_type: form.entry_type,
        title,
        artist_name: form.artist_name.trim() || null,
        credit_text: form.credit_text.trim() || null,
        external_link: form.external_link.trim() || null,
        cover_image_url: form.cover_image_url.trim() || null,
        release_date: form.release_date || null,
        description: form.description.trim() || null,
        featured: form.featured,
        tracklist: form.entry_type === "project" && cleanTracks.length > 0 ? cleanTracks : null,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("portfolio_entries" as any)
          .update(payload)
          .eq("id", id!);
        if (error) throw error;
        toast.success("Entry updated");
      } else {
        const { data: maxRow } = await supabase
          .from("portfolio_entries" as any)
          .select("display_order")
          .order("display_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextOrder = ((maxRow as any)?.display_order ?? -1) + 1;
        const { error } = await supabase
          .from("portfolio_entries" as any)
          .insert([{ ...payload, display_order: nextOrder }]);
        if (error) throw error;
        toast.success("Entry added");
      }
      navigate("/admin/portfolio");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewSrc =
    form.cover_image_url ||
    placeholderCoverDataUrl(form.title || "Untitled", form.artist_name || "LocBeatx");

  const updateTrack = (idx: number, field: keyof TrackRow, value: string) => {
    setForm((f) => ({
      ...f,
      tracklist: f.tracklist.map((t, i) => (i === idx ? { ...t, [field]: value } : t)),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-10 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/portfolio")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit entry" : "Add entry"}</h1>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex gap-4 items-start">
              <img
                src={previewSrc}
                alt="Cover preview"
                className="h-24 w-24 rounded-md object-cover bg-muted flex-shrink-0"
              />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      asChild
                      disabled={uploading}
                    >
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload cover
                      </span>
                    </Button>
                  </label>
                  {form.cover_image_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="…or paste a cover image URL"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  No cover? A gradient placeholder will display.
                </p>
              </div>
            </div>

            <div>
              <Label>Entry type *</Label>
              <Select
                value={form.entry_type}
                onValueChange={(v) => setForm({ ...form, entry_type: v as EntryType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produced">🔥 Produced by me</SelectItem>
                  <SelectItem value="featured">🎤 Featured on</SelectItem>
                  <SelectItem value="project">📀 Project / EP / Album</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={150}
              />
            </div>

            <div>
              <Label htmlFor="artist">
                Artist name {form.entry_type === "featured" ? "*" : ""}
              </Label>
              <Input
                id="artist"
                placeholder={
                  form.entry_type === "featured" ? "Main artist (required)" : "Artist (optional)"
                }
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                maxLength={150}
              />
            </div>

            <div>
              <Label htmlFor="credit">Credit text (optional)</Label>
              <Input
                id="credit"
                placeholder='e.g. "Co-producer", "Vocals", "Mix Engineer"'
                value={form.credit_text}
                onChange={(e) => setForm({ ...form, credit_text: e.target.value })}
                maxLength={120}
              />
            </div>

            <div>
              <Label htmlFor="link">External link</Label>
              <Input
                id="link"
                placeholder="Spotify, Apple Music, YouTube, or SoundCloud URL"
                value={form.external_link}
                onChange={(e) => setForm({ ...form, external_link: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="release">Release date</Label>
                <Input
                  id="release"
                  type="date"
                  value={form.release_date}
                  onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(v) => setForm({ ...form, featured: v })}
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={3}
                placeholder="Short description of the project."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
              />
            </div>

            {form.entry_type === "project" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tracklist (optional)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        tracklist: [...f.tracklist, { title: "", url: "" }],
                      }))
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add track
                  </Button>
                </div>
                {form.tracklist.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add tracks to display under the album cover.
                  </p>
                )}
                {form.tracklist.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="pt-2 text-xs text-muted-foreground w-6 text-right">
                      {idx + 1}.
                    </span>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder="Track title"
                        value={t.title}
                        onChange={(e) => updateTrack(idx, "title", e.target.value)}
                      />
                      <Input
                        placeholder="Track URL (optional)"
                        value={t.url}
                        onChange={(e) => updateTrack(idx, "url", e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          tracklist: f.tracklist.filter((_, i) => i !== idx),
                        }))
                      }
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => navigate("/admin/portfolio")}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Save changes" : "Create entry"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}