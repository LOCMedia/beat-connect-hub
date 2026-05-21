import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Crown, Check, X, Shuffle, Play, ChevronRight, Trash2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { notifyTournamentEvent } from "@/lib/tournamentNotify";
import { WaveformPlayer } from "@/components/WaveformPlayer";

type Tournament = any;
type Submission = any;
type Battle = any;
type Beat = any;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

const TournamentAdmin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);

  // create form
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"acapella" | "beat_freestyle">("acapella");
  const [bracketSize, setBracketSize] = useState("16");
  const [prize, setPrize] = useState("👑 Champion badge + free beat lease + £100");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    document.title = "Tournament Admin — VibeKonect";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    setTournaments(data || []);
    if (data && data.length && !selected) setSelected(data[0].id);
    setLoading(false);
  };

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const [{ data: subs }, { data: bs }, { data: beatRows }] = await Promise.all([
        (supabase as any).from("tournament_artist_submissions").select("*").eq("tournament_id", selected).order("created_at"),
        (supabase as any).from("tournament_battles").select("*").eq("tournament_id", selected).order("round").order("slot"),
        (supabase as any).from("tournament_producer_beats").select("*").eq("tournament_id", selected).order("created_at"),
      ]);
      setSubmissions(subs || []);
      setBattles(bs || []);
      setBeats(beatRows || []);
    })();
  }, [selected]);

  if (!authLoading && !isAdmin) return <Navigate to="/" />;

  const reload = async () => {
    if (!selected) return;
    const [{ data: subs }, { data: bs }, { data: beatRows }] = await Promise.all([
      (supabase as any).from("tournament_artist_submissions").select("*").eq("tournament_id", selected).order("created_at"),
      (supabase as any).from("tournament_battles").select("*").eq("tournament_id", selected).order("round").order("slot"),
      (supabase as any).from("tournament_producer_beats").select("*").eq("tournament_id", selected).order("created_at"),
    ]);
    setSubmissions(subs || []);
    setBattles(bs || []);
    setBeats(beatRows || []);
  };

  const createTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const slug = `${slugify(name)}-${Date.now().toString(36)}`;
    const { data, error } = await (supabase as any)
      .from("tournaments")
      .insert({
        name,
        slug,
        category,
        bracket_size: Number(bracketSize),
        prize_description: prize || null,
        description: description || null,
        status: "submissions_open",
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setName("");
    toast({ title: "Tournament created" });
    await load();
    if (data) setSelected(data.id);
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("tournaments").update({ status }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Status: ${status}` }); load(); }
  };

  const deleteTournament = async (id: string) => {
    const tn = tournaments.find((x) => x.id === id);
    if (!tn) return;
    if (!confirm(`Permanently delete "${tn.name}" and ALL its battles, submissions, beats, votes, and badges? This cannot be undone.`)) return;
    try {
      await (supabase as any).from("tournament_battle_votes").delete().in("battle_id",
        ((await (supabase as any).from("tournament_battles").select("id").eq("tournament_id", id)).data || []).map((b: any) => b.id)
      );
      await (supabase as any).from("tournament_battles").delete().eq("tournament_id", id);
      await (supabase as any).from("tournament_artist_submissions").delete().eq("tournament_id", id);
      await (supabase as any).from("tournament_producer_beats").delete().eq("tournament_id", id);
      await (supabase as any).from("tournament_champion_badges").delete().eq("tournament_id", id);
      const { error } = await (supabase as any).from("tournaments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Tournament deleted" });
      if (selected === id) setSelected(null);
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const removeBeat = async (id: string) => {
    if (!confirm("Remove this beat from the pool?")) return;
    const { error } = await (supabase as any).from("tournament_producer_beats").delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Beat removed" }); reload(); }
  };

  const markBeatWinner = async (id: string, val: boolean) => {
    await (supabase as any).from("tournament_producer_beats").update({ is_winner: val }).eq("id", id);
    reload();
  };

  const setSubStatus = async (subId: string, status: string, seed?: number | null) => {
    const patch: any = { status };
    if (seed !== undefined) patch.seed = seed;
    const { error } = await (supabase as any).from("tournament_artist_submissions").update(patch).eq("id", subId);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      // Fire artist_qualified when admin qualifies a submission
      if (status === "qualified") {
        const sub = submissions.find((s) => s.id === subId);
        const tn = tournaments.find((x) => x.id === selected);
        if (sub && tn) {
          notifyTournamentEvent({
            event: "artist_qualified",
            userIds: [sub.user_id],
            tournamentId: tn.id,
            templateData: { artistName: sub.artist_name, tournamentName: tn.name, seed: seed ?? sub.seed ?? undefined },
            link: `${window.location.origin}/tournament/bracket/${tn.id}`,
          });
        }
      }
      reload();
    }
  };

  const generateBracket = async () => {
    if (!selected) return;
    const t = tournaments.find((x) => x.id === selected);
    if (!t) return;
    const qualified = submissions
      .filter((s) => s.status === "qualified" && s.seed)
      .sort((a, b) => a.seed - b.seed);
    if (qualified.length !== t.bracket_size) {
      toast({
        title: "Wrong number qualified",
        description: `Need exactly ${t.bracket_size} qualified entries with seeds. Have ${qualified.length}.`,
        variant: "destructive",
      });
      return;
    }
    if (battles.length > 0) {
      if (!confirm("Bracket exists. Delete and regenerate?")) return;
      await (supabase as any).from("tournament_battles").delete().eq("tournament_id", selected);
    }
    // Standard seeded pairings: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
    const n = t.bracket_size;
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) pairs.push([i + 1, n - i]);
    // Reorder for proper bracket so winners can meet in correct rounds
    const ordered: [number, number][] = bracketOrder(pairs);
    const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const inserts = ordered.map(([sa, sb], idx) => {
      const subA = qualified.find((q) => q.seed === sa);
      const subB = qualified.find((q) => q.seed === sb);
      return {
        tournament_id: selected,
        round: 1,
        slot: idx,
        submission_a_id: subA?.id,
        submission_b_id: subB?.id,
        voting_opens_at: new Date().toISOString(),
        voting_closes_at: closesAt,
        status: "open",
      };
    });
    const { error } = await (supabase as any).from("tournament_battles").insert(inserts);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await (supabase as any).from("tournaments").update({ status: "in_progress", current_round: 1 }).eq("id", selected);
    // Fire battle_live for both artists in each new battle
    const { data: created } = await (supabase as any)
      .from("tournament_battles").select("*").eq("tournament_id", selected).eq("round", 1);
    for (const bt of created || []) {
      const subA = qualified.find((q) => q.id === bt.submission_a_id);
      const subB = qualified.find((q) => q.id === bt.submission_b_id);
      if (subA && subB) {
        await notifyTournamentEvent({
          event: "battle_live",
          userIds: [subA.user_id, subB.user_id],
          tournamentId: selected,
          templateData: { artistName: subA.artist_name, opponentName: subB.artist_name, round: 1, closesAt: "in 24 hours" },
          link: `${window.location.origin}/tournament/battle/${bt.id}`,
        });
      }
    }
    toast({ title: "Bracket generated · Round 1 open" });
    load(); reload();
  };

  const closeBattle = async (battle: Battle) => {
    const winner =
      battle.votes_a === battle.votes_b
        ? null
        : battle.votes_a > battle.votes_b
        ? battle.submission_a_id
        : battle.submission_b_id;
    if (!winner) {
      const pick = prompt("Tied — type 'a' or 'b' to pick winner");
      const w = pick === "a" ? battle.submission_a_id : pick === "b" ? battle.submission_b_id : null;
      if (!w) return;
      await (supabase as any).from("tournament_battles").update({ status: "closed", winner_submission_id: w }).eq("id", battle.id);
      await (supabase as any).from("tournament_artist_submissions").update({ status: "winner" }).eq("id", w);
      const loser = w === battle.submission_a_id ? battle.submission_b_id : battle.submission_a_id;
      if (loser) await (supabase as any).from("tournament_artist_submissions").update({ status: "eliminated" }).eq("id", loser);
    } else {
      await (supabase as any).from("tournament_battles").update({ status: "closed", winner_submission_id: winner }).eq("id", battle.id);
      await (supabase as any).from("tournament_artist_submissions").update({ status: "winner" }).eq("id", winner);
      const loser = winner === battle.submission_a_id ? battle.submission_b_id : battle.submission_a_id;
      if (loser) await (supabase as any).from("tournament_artist_submissions").update({ status: "eliminated" }).eq("id", loser);
    }
    toast({ title: "Battle closed" });
    reload();
  };

  const advanceRound = async () => {
    if (!selected) return;
    const t = tournaments.find((x) => x.id === selected);
    if (!t) return;
    const round = t.current_round;
    const roundBattles = battles.filter((b) => b.round === round).sort((a, b) => a.slot - b.slot);
    if (roundBattles.some((b) => b.status !== "closed" || !b.winner_submission_id)) {
      toast({ title: "Close all battles first", variant: "destructive" });
      return;
    }
    if (roundBattles.length === 1) {
      // tournament champion
      const champ = roundBattles[0].winner_submission_id;
      const winnerSub = submissions.find((s) => s.id === champ);
      await (supabase as any).from("tournaments").update({
        status: "completed",
        winner_submission_id: champ,
      }).eq("id", selected);
      if (winnerSub) {
        await (supabase as any).from("tournament_champion_badges").insert({
          user_id: winnerSub.user_id,
          tournament_id: selected,
          category: t.category,
        });
        // For beat_freestyle, mark the winning beat as Tournament Winner.
        if (t.category === "beat_freestyle" && winnerSub.beat_id) {
          await (supabase as any).from("tournament_producer_beats")
            .update({ is_winner: true }).eq("id", winnerSub.beat_id);
        }
        // Fire champion notification
        await notifyTournamentEvent({
          event: "champion",
          userIds: [winnerSub.user_id],
          tournamentId: selected,
          templateData: { artistName: winnerSub.artist_name, tournamentName: t.name, prize: t.prize_description },
          link: `${window.location.origin}/tournament/bracket/${t.id}`,
        });
        // Fire beat_won notification to the producer of the winning beat
        if (t.category === "beat_freestyle" && winnerSub.beat_id) {
          const beat = beats.find((b) => b.id === winnerSub.beat_id);
          if (beat) {
            await notifyTournamentEvent({
              event: "beat_won",
              userIds: [beat.user_id],
              tournamentId: selected,
              templateData: { producerName: beat.producer_name, beatTitle: beat.title, tournamentName: t.name, artistName: winnerSub.artist_name },
              link: `${window.location.origin}/tournament/bracket/${t.id}`,
            });
          }
        }
      }
      toast({ title: "🏆 Champion crowned!" });
      load(); reload();
      return;
    }
    const nextRound = round + 1;
    const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newBattles = [];
    for (let i = 0; i < roundBattles.length; i += 2) {
      newBattles.push({
        tournament_id: selected,
        round: nextRound,
        slot: i / 2,
        submission_a_id: roundBattles[i].winner_submission_id,
        submission_b_id: roundBattles[i + 1]?.winner_submission_id ?? null,
        voting_opens_at: new Date().toISOString(),
        voting_closes_at: closesAt,
        status: "open",
      });
    }
    // re-mark advancing winners back to qualified for the new round
    const advancingIds = newBattles.flatMap((b) => [b.submission_a_id, b.submission_b_id]).filter(Boolean);
    await (supabase as any).from("tournament_artist_submissions").update({ status: "qualified" }).in("id", advancingIds as string[]);
    const { error } = await (supabase as any).from("tournament_battles").insert(newBattles);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await (supabase as any).from("tournaments").update({ current_round: nextRound }).eq("id", selected);
    // Fire `advanced` to each winner that moves on, and `battle_live` for the new pairings
    const { data: createdNext } = await (supabase as any)
      .from("tournament_battles").select("*").eq("tournament_id", selected).eq("round", nextRound);
    for (const bt of createdNext || []) {
      const subA = submissions.find((s) => s.id === bt.submission_a_id);
      const subB = submissions.find((s) => s.id === bt.submission_b_id);
      const advancedIds = [subA?.user_id, subB?.user_id].filter(Boolean) as string[];
      if (advancedIds.length) {
        await notifyTournamentEvent({
          event: "advanced",
          userIds: advancedIds,
          tournamentId: selected,
          templateData: { nextRound, artistName: subA?.artist_name },
          link: `${window.location.origin}/tournament/bracket/${selected}`,
        });
      }
      if (subA && subB) {
        await notifyTournamentEvent({
          event: "battle_live",
          userIds: [subA.user_id, subB.user_id],
          tournamentId: selected,
          templateData: { artistName: subA.artist_name, opponentName: subB.artist_name, round: nextRound, closesAt: "in 24 hours" },
          link: `${window.location.origin}/tournament/battle/${bt.id}`,
        });
      }
    }
    toast({ title: `Round ${nextRound} open` });
    load(); reload();
  };

  const t = tournaments.find((x) => x.id === selected);
  const qualifiedCount = submissions.filter((s) => s.status === "qualified").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 space-y-8">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Crown className="h-7 w-7 text-primary" /> Tournament Admin
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create */}
          <Card>
            <CardHeader><CardTitle className="text-base">Create Tournament</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createTournament} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acapella">Acapella</SelectItem>
                      <SelectItem value="beat_freestyle">Beat Freestyle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bracket size</Label>
                  <Select value={bracketSize} onValueChange={setBracketSize}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16">16 entries</SelectItem>
                      <SelectItem value="32">32 entries</SelectItem>
                      <SelectItem value="64">64 entries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prize</Label>
                  <Input value={prize} onChange={(e) => setPrize(e.target.value)} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Tournament list */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Tournaments</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : tournaments.length === 0 ? (
                <p className="text-sm text-muted-foreground">None yet.</p>
              ) : (
                <div className="space-y-2">
                  {tournaments.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => setSelected(row.id)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        selected === row.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{row.name}</span>
                        <Badge variant="secondary">{row.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.bracket_size} entries · {row.category} · round {row.current_round}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected tournament workspace */}
        {t && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t.name}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/tournament/bracket/${t.id}`}>View public bracket <ChevronRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["draft", "submissions_open", "in_progress", "completed", "archived"].map((s) => (
                    <Button key={s} size="sm" variant={t.status === s ? "default" : "outline"} onClick={() => setStatus(t.id, s)}>
                      {s.replace("_", " ")}
                    </Button>
                  ))}
                  {(t.status === "completed" || t.status === "archived" || t.status === "ended") && (
                    <Button size="sm" variant="destructive" onClick={() => deleteTournament(t.id)} className="ml-auto">
                      <Trash2 className="h-3 w-3 mr-1" /> Delete tournament
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Badge variant="outline">{qualifiedCount} / {t.bracket_size} qualified</Badge>
                  <Button size="sm" onClick={generateBracket} disabled={qualifiedCount !== t.bracket_size}>
                    <Shuffle className="h-3 w-3 mr-1" /> Generate bracket (Round 1)
                  </Button>
                  <Button size="sm" variant="outline" onClick={advanceRound} disabled={t.status !== "in_progress"}>
                    <Play className="h-3 w-3 mr-1" /> Advance to next round
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Submissions */}
            <Card>
              <CardHeader><CardTitle className="text-base">Submissions ({submissions.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {submissions.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 border border-border rounded-md p-3">
                      <span className="font-medium">{s.artist_name}</span>
                      <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
                      {s.instagram && <span className="text-xs text-muted-foreground">{s.instagram}</span>}
                      <div className="w-full max-w-md"><WaveformPlayer url={s.audio_url} height={48} /></div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Input
                          type="number"
                          min={1}
                          max={t.bracket_size}
                          placeholder="seed"
                          defaultValue={s.seed ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            if (v !== s.seed) setSubStatus(s.id, "qualified", v);
                          }}
                          className="h-7 w-20 text-xs"
                        />
                        <Button size="sm" variant="outline" onClick={() => setSubStatus(s.id, "qualified")}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSubStatus(s.id, "rejected", null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {submissions.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Producer Beat Pool (Beat Freestyle only) */}
            {t.category === "beat_freestyle" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Music2 className="h-4 w-4 text-primary" /> Beat Pool ({beats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {beats.filter((b) => b.status === "approved").length < 5 && (
                    <div className="mb-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
                      ⚠️ Beat pool is low ({beats.filter((b) => b.status === "approved").length} approved beats).
                      Artists need variety — consider inviting more producers via{" "}
                      <Link to={`/tournament/producer-submit?t=${t.id}`} className="underline font-semibold">
                        the producer submit page
                      </Link>.
                    </div>
                  )}
                  {beats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No beats submitted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {beats.map((b) => {
                        const usedBy = submissions.filter((s) => s.beat_id === b.id);
                        return (
                          <div key={b.id} className="flex flex-wrap items-center gap-3 border border-border rounded-md p-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{b.title}</div>
                              <div className="text-xs text-muted-foreground">
                                by {b.producer_name}
                                {b.bpm ? ` · ${b.bpm} BPM` : ""}
                                {b.key ? ` · ${b.key}` : ""}
                                {b.genre ? ` · ${b.genre}` : ""}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{b.status}</Badge>
                            {b.is_winner && <Badge className="text-[10px]">🏆 Winner</Badge>}
                            <Badge variant="outline" className="text-[10px]">{usedBy.length} pick{usedBy.length === 1 ? "" : "s"}</Badge>
                            <div className="w-full max-w-md"><WaveformPlayer url={b.audio_url} height={48} /></div>
                            <div className="flex items-center gap-1 ml-auto">
                              <Button size="sm" variant="outline" onClick={() => markBeatWinner(b.id, !b.is_winner)}>
                                {b.is_winner ? "Unmark" : "Mark winner"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => removeBeat(b.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Battles */}
            {battles.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Battles</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {battles.map((b) => {
                      const a = submissions.find((s) => s.id === b.submission_a_id);
                      const w = submissions.find((s) => s.id === b.submission_b_id);
                      return (
                        <div key={b.id} className="flex items-center gap-3 text-sm border border-border rounded-md p-2">
                          <Badge variant="outline" className="text-[10px]">R{b.round}·#{b.slot + 1}</Badge>
                          <span className="flex-1 truncate">
                            {a?.artist_name ?? "TBD"} <span className="text-muted-foreground">({b.votes_a})</span> vs{" "}
                            {w?.artist_name ?? "TBD"} <span className="text-muted-foreground">({b.votes_b})</span>
                          </span>
                          <Badge variant={b.status === "open" ? "default" : "secondary"} className="text-[10px]">{b.status}</Badge>
                          {b.status === "open" && a && w && (
                            <Button size="sm" variant="outline" onClick={() => closeBattle(b)}>Close</Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Standard single-elimination bracket ordering so seeds 1 and 2 meet in the final.
function bracketOrder(pairs: [number, number][]): [number, number][] {
  // pairs is already 1vN, 2v(N-1), ... in seed order. Reorder so winners meet in correct rounds.
  const n = pairs.length;
  if (n <= 1) return pairs;
  // Build seed sequence for n half-bracket positions using standard algorithm.
  let seq = [1, 2];
  let size = 2;
  while (size < n * 2) {
    size *= 2;
    const next: number[] = [];
    seq.forEach((s) => {
      next.push(s);
      next.push(size + 1 - s);
    });
    seq = next;
  }
  // seq is the order of seeds across slots. Pair adjacent slots into matchups.
  const out: [number, number][] = [];
  for (let i = 0; i < seq.length; i += 2) out.push([seq[i], seq[i + 1]]);
  return out;
}

export default TournamentAdmin;