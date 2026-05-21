import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, Check, X, Crown, Pencil, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Beat = { id: string; title: string };
type Contest = any;
type Entry = any;

const CompetitionAdmin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [beatId, setBeatId] = useState<string>("");
  const [endDate, setEndDate] = useState("");
  const [prize, setPrize] = useState("£50 + Free Beat Lease");
  const [sponsor, setSponsor] = useState("VibeKonect");
  const [isSponsored, setIsSponsored] = useState(false);
  const [sponsorIg, setSponsorIg] = useState("");
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");
  const [sponsorMessage, setSponsorMessage] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [beatReleaseDate, setBeatReleaseDate] = useState("");
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  // edit modal
  const [editing, setEditing] = useState<Contest | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    prize_description: "",
    sponsor_name: "",
    start_date: "",
    end_date: "",
    beat_release_date: "",
  });
  const [editBeatFile, setEditBeatFile] = useState<File | null>(null);
  const [editPreviewFile, setEditPreviewFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // delete entry confirmation
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { document.title = "Competition Admin — VibeKonect"; load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: c }, { data: e }] = await Promise.all([
      supabase.from("beats").select("id, title").order("created_at", { ascending: false }),
      (supabase.from("contests") as any).select("*").order("created_at", { ascending: false }),
      supabase.from("contest_entries").select("*").order("created_at", { ascending: false }),
    ]);
    setBeats((b as Beat[]) || []);
    setContests(c || []);
    setEntries(e || []);
    setLoading(false);
  };

  if (!authLoading && !isAdmin) return <Navigate to="/" />;

  const createContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    let competitionBeatUrl: string | null = null;
    if (beatFile) {
      const uploaded = await uploadCompetitionBeat(beatFile);
      if (!uploaded) { setCreating(false); return; }
      competitionBeatUrl = uploaded;
    }
    let previewUrl: string | null = null;
    if (previewFile) {
      const uploaded = await uploadCompetitionBeat(previewFile);
      if (!uploaded) { setCreating(false); return; }
      previewUrl = uploaded;
    }
    if (isSponsored && !sponsorIg.trim()) {
      toast({ title: "Sponsor Instagram required", description: "Add the sponsor's Instagram handle.", variant: "destructive" });
      setCreating(false);
      return;
    }
    const { error } = await supabase.from("contests").insert({
      title,
      description: description || null,
      beat_id: beatId || null,
      beat_download_url: competitionBeatUrl,
      beat_file_url: competitionBeatUrl,
      beat_release_date: beatReleaseDate ? new Date(beatReleaseDate).toISOString() : null,
      preview_audio_url: previewUrl,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      prize_description: prize,
      sponsor_name: sponsor,
      status: "active",
      start_date: new Date().toISOString(),
      is_sponsored: isSponsored,
      sponsor_instagram: isSponsored ? sponsorIg.trim().replace(/^@/, "") : null,
      sponsor_logo_url: isSponsored && sponsorLogoUrl ? sponsorLogoUrl : null,
      sponsor_message: isSponsored && sponsorMessage ? sponsorMessage : null,
      prize_amount: prizeAmount || null,
    } as any);
    setCreating(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Contest created" });
      setTitle(""); setDescription(""); setBeatId(""); setEndDate(""); setBeatFile(null); setBeatReleaseDate(""); setPreviewFile(null);
      setIsSponsored(false); setSponsorIg(""); setSponsorLogoUrl(""); setSponsorMessage(""); setPrizeAmount("");
      load();
    }
  };

  const uploadCompetitionBeat = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "mp3";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("competition-beats")
      .upload(path, file, { contentType: file.type || "audio/mpeg", upsert: false });
    if (upErr) {
      toast({ title: "Beat upload failed", description: upErr.message, variant: "destructive" });
      return null;
    }
    const { data: pub } = supabase.storage.from("competition-beats").getPublicUrl(path);
    return pub.publicUrl;
  };

  const setContestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contests").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Contest ${status}` }); load(); }
  };

  const openEdit = (c: Contest) => {
    if (c.status === "ended" || c.archived_at) {
      toast({ title: "Cannot edit", description: "Ended or archived contests are read-only." });
      return;
    }
    setEditing(c);
    setEditForm({
      title: c.title || "",
      description: c.description || "",
      prize_description: c.prize_description || "",
      sponsor_name: c.sponsor_name || "",
      start_date: c.start_date ? toLocalInput(c.start_date) : "",
      end_date: c.end_date ? toLocalInput(c.end_date) : "",
      beat_release_date: c.beat_release_date ? toLocalInput(c.beat_release_date) : "",
    });
    setEditBeatFile(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    let beatUrl: string | null | undefined = undefined;
    if (editBeatFile) {
      const uploaded = await uploadCompetitionBeat(editBeatFile);
      if (!uploaded) { setSavingEdit(false); return; }
      beatUrl = uploaded;
    }
    let previewUrl: string | null | undefined = undefined;
    if (editPreviewFile) {
      const uploaded = await uploadCompetitionBeat(editPreviewFile);
      if (!uploaded) { setSavingEdit(false); return; }
      previewUrl = uploaded;
    }
    const { error } = await supabase
      .from("contests")
      .update({
        title: editForm.title,
        description: editForm.description || null,
        prize_description: editForm.prize_description || null,
        sponsor_name: editForm.sponsor_name || null,
        start_date: editForm.start_date ? new Date(editForm.start_date).toISOString() : null,
        end_date: editForm.end_date ? new Date(editForm.end_date).toISOString() : null,
        beat_release_date: editForm.beat_release_date ? new Date(editForm.beat_release_date).toISOString() : null,
        ...(beatUrl !== undefined ? { beat_download_url: beatUrl, beat_file_url: beatUrl } : {}),
        ...(previewUrl !== undefined ? { preview_audio_url: previewUrl } : {}),
      } as any)
      .eq("id", editing.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contest updated" });
    setEditing(null);
    load();
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    // Best-effort storage cleanup for known buckets
    const removeFromBucket = async (url: string | null | undefined, bucket: string) => {
      if (!url) return;
      const marker = `/storage/v1/object/public/${bucket}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = url.slice(idx + marker.length);
      try {
        await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
      } catch {
        /* ignore */
      }
    };
    await removeFromBucket(deleteEntry.freestyle_audio_url, "competition-entries");
    await removeFromBucket(deleteEntry.video_url, "competition-entries");
    await removeFromBucket(deleteEntry.cover_image_url, "entry-covers");

    const { error } = await supabase.from("contest_entries").delete().eq("id", deleteEntry.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Entry deleted" });
    setDeleteEntry(null);
    load();
  };

  const archiveContest = async (id: string) => {
    if (!confirm("Archive this contest? Entries, votes, and stats are preserved.")) return;
    const { error } = await (supabase.from("contests") as any)
      .update({ archived_at: new Date().toISOString(), status: "archived" })
      .eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Contest archived" }); load(); }
  };
  const unarchiveContest = async (id: string) => {
    const { error } = await (supabase.from("contests") as any)
      .update({ archived_at: null, status: "ended" })
      .eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const setEntryStatus = async (id: string, status: string) => {
    let reason: string | undefined;
    if (status === "rejected") {
      reason = prompt("Reason for rejection (optional, will be emailed):") || undefined;
    }
    const { error } = await supabase.from("contest_entries").update({ status }).eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    if (status === "approved" || status === "rejected") {
      supabase.functions.invoke("notify-entry-decision", {
        body: { entryId: id, decision: status, reason },
      }).then(({ error: e }) => {
        if (e) console.warn("decision email failed", e);
      });
    }
    load();
  };

  const adjustVotes = async (id: string, current: number) => {
    const v = prompt("Set total bonus votes (additive to real votes):", String(current));
    if (v === null) return;
    const num = parseInt(v, 10);
    if (isNaN(num)) return;
    const { error } = await supabase.from("contest_entries").update({ bonus_votes: num }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const endAndPickWinner = async (contestId: string) => {
    const contestEntries = entries.filter((e) => e.contest_id === contestId && e.status === "approved");
    if (contestEntries.length === 0) {
      toast({ title: "No approved entries", variant: "destructive" });
      return;
    }
    const winner = [...contestEntries].sort((a, b) => (b.votes + b.bonus_votes) - (a.votes + a.bonus_votes))[0];
    await supabase.from("contest_entries").update({ status: "winner" }).eq("id", winner.id);
    await supabase.from("contests").update({ status: "ended" }).eq("id", contestId);
    toast({ title: "Winner selected", description: winner.artist_name });
    const { data, error } = await supabase.functions.invoke("notify-competition-winner", {
      body: { contestId, winnerEntryId: winner.id },
    });
    if (error) toast({ title: "Winner emails failed", description: error.message, variant: "destructive" });
    else toast({ title: `Sent ${data?.sent ?? 0} winner emails` });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="h-7 w-7" /> Competition Admin</h1>

        <Card>
          <CardHeader><CardTitle>Create new contest</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createContest} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div>
                <Label>Beat</Label>
                <Select value={beatId} onValueChange={setBeatId}>
                  <SelectTrigger><SelectValue placeholder="Select beat" /></SelectTrigger>
                  <SelectContent>
                    {beats.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
              <div className="sm:col-span-2">
                <Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Competition Beat (MP3) — optional</Label>
                <Input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
                  onChange={(e) => setBeatFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Used only for this competition — won't be added to the main beat store.
                </p>
              </div>
              <div><Label>End date</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
              <div>
                <Label>Beat release date (optional)</Label>
                <Input type="datetime-local" value={beatReleaseDate} onChange={(e) => setBeatReleaseDate(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">Leave empty for immediate release.</p>
              </div>
              <div className="sm:col-span-2">
                <Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> 30-second preview clip (MP3) — optional</Label>
                <Input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
                  onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Plays during the countdown so artists can hear the vibe before unlock.</p>
              </div>
              <div><Label>Prize</Label><Input value={prize} onChange={(e) => setPrize(e.target.value)} /></div>
              <div><Label>Sponsor</Label><Input value={sponsor} onChange={(e) => setSponsor(e.target.value)} /></div>
              <div className="sm:col-span-2 rounded-lg border border-border/60 p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={isSponsored}
                    onChange={(e) => setIsSponsored(e.target.checked)}
                  />
                  This is a sponsored competition
                </label>
                {isSponsored && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Sponsor Instagram handle *</Label>
                      <Input value={sponsorIg} onChange={(e) => setSponsorIg(e.target.value)} placeholder="@mra" />
                    </div>
                    <div>
                      <Label>Sponsor logo URL (optional)</Label>
                      <Input value={sponsorLogoUrl} onChange={(e) => setSponsorLogoUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Prize amount (optional, e.g. "£50 cash")</Label>
                      <Input value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} placeholder="£50 cash prize" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Sponsor message (optional)</Label>
                      <Textarea rows={2} value={sponsorMessage} onChange={(e) => setSponsorMessage(e.target.value)} placeholder="A note from the sponsor to contestants…" />
                    </div>
                    <p className="text-[11px] text-muted-foreground sm:col-span-2">
                      Contestants will be required to confirm they follow this Instagram handle before submitting.
                    </p>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2"><Button type="submit" disabled={creating}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create contest"}</Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : contests.length === 0 ? <p className="text-muted-foreground text-sm">No contests yet.</p> : contests.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 justify-between border rounded p-3">
                <div>
                  <div className="font-semibold">{c.title} <Badge variant="outline">{c.status}</Badge>{c.archived_at && <Badge variant="secondary" className="ml-1">archived</Badge>}</div>
                  <div className="text-xs text-muted-foreground">Ends: {c.end_date ? new Date(c.end_date).toLocaleString() : "—"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!c.archived_at && c.status !== "active" && <Button size="sm" variant="outline" onClick={() => setContestStatus(c.id, "active")}>Activate</Button>}
                  {!c.archived_at && c.status === "active" && <Button size="sm" variant="outline" onClick={() => setContestStatus(c.id, "voting")}>To voting</Button>}
                  {!c.archived_at && c.status !== "ended" && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                  {!c.archived_at && <Button size="sm" onClick={() => endAndPickWinner(c.id)}><Crown className="h-4 w-4 mr-1" /> End & pick winner</Button>}
                  {c.archived_at
                    ? <Button size="sm" variant="outline" onClick={() => unarchiveContest(c.id)}>Unarchive</Button>
                    : <Button size="sm" variant="destructive" onClick={() => archiveContest(c.id)}>Archive</Button>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Entries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {entries.length === 0 ? <p className="text-muted-foreground text-sm">No entries yet.</p> : entries.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 justify-between border rounded p-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold">{e.artist_name} <Badge variant="outline">{e.status}</Badge> {e.video_url && <Badge className="bg-purple-600">Video</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{e.instagram || "—"} · Votes: {e.votes} +{e.bonus_votes} bonus</div>
                  <audio controls src={e.freestyle_audio_url} className="mt-1 w-full max-w-md" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.status !== "approved" && <Button size="sm" onClick={() => setEntryStatus(e.id, "approved")}><Check className="h-4 w-4 mr-1" /> Approve</Button>}
                  {e.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setEntryStatus(e.id, "rejected")}><X className="h-4 w-4 mr-1" /> Reject</Button>}
                  <Button size="sm" variant="outline" onClick={() => adjustVotes(e.id, e.bonus_votes)}>Adjust votes</Button>
                  {e.status === "rejected" && (
                    <Button size="sm" variant="destructive" onClick={() => setDeleteEntry(e)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contest</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div><Label>Prize</Label><Input value={editForm.prize_description} onChange={(e) => setEditForm({ ...editForm, prize_description: e.target.value })} /></div>
            <div><Label>Sponsor</Label><Input value={editForm.sponsor_name} onChange={(e) => setEditForm({ ...editForm, sponsor_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start date</Label><Input type="datetime-local" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} /></div>
              <div><Label>End date</Label><Input type="datetime-local" value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>Beat release date (optional)</Label>
              <Input type="datetime-local" value={editForm.beat_release_date} onChange={(e) => setEditForm({ ...editForm, beat_release_date: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Replace competition beat (MP3) — optional</Label>
              <Input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
                onChange={(e) => setEditBeatFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Upload className="h-3.5 w-3.5" /> Replace 30s preview clip — optional</Label>
              <Input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/*"
                onChange={(e) => setEditPreviewFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntry} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rejected entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteEntry?.artist_name}</strong>'s entry and its files. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntry} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default CompetitionAdmin;