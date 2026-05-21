import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, RefreshCw, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const MOODS = ["Dark", "Energetic", "Chill", "Emotional", "Aggressive"] as const;
const TOPICS = ["Love", "Hustle", "Success", "Pain", "Party", "Freestyle"] as const;
const LENGTHS = [4, 8, 12] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  beatId: string;
  beatGenre?: string;
  beatBpm?: number;
}

export const LyricGeneratorDialog = ({ open, onOpenChange, beatId, beatGenre, beatBpm }: Props) => {
  const { user } = useAuth();
  const [mood, setMood] = useState<string>("Energetic");
  const [topic, setTopic] = useState<string>("Hustle");
  const [bars, setBars] = useState<number>(8);
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [lyrics, setLyrics] = useState("");

  const generate = async () => {
    setLoading(true);
    setLyrics("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-lyrics", {
        body: { mood, topic, keywords, length_bars: bars, genre: beatGenre, bpm: beatBpm },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setLyrics((data as any)?.lyrics || "");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate lyrics");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  const save = async () => {
    if (!user) {
      toast.error("Sign in to save lyrics");
      return;
    }
    if (!lyrics.trim()) return;
    const { error } = await (supabase as any).from("user_lyrics").insert({
      user_id: user.id,
      beat_id: beatId,
      lyrics,
      mood,
      topic,
      keywords,
      length_bars: bars,
    });
    if (error) toast.error(error.message);
    else toast.success("Saved to your notes");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Lyric Generator
          </DialogTitle>
          <DialogDescription>Generate rap bars tailored to this beat's vibe.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TOPICS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Length</Label>
            <Select value={String(bars)} onValueChange={(v) => setBars(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LENGTHS.map((b) => <SelectItem key={b} value={String(b)}>{b} bars</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Keywords (optional)</Label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="midnight, dreams" maxLength={200} />
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate</>}
        </Button>

        {lyrics && (
          <div className="space-y-2">
            <Textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={10} className="font-mono text-sm" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy} className="flex-1"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
              <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="flex-1"><RefreshCw className="h-4 w-4 mr-1" /> Regenerate</Button>
              <Button size="sm" onClick={save} className="flex-1"><Save className="h-4 w-4 mr-1" /> Save</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};