import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const EMOJIS = ["🔥", "❤️", "🎧", "💯", "🙌"] as const;
type Emoji = typeof EMOJIS[number];

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function BeatCommentsDialog({
  open,
  onOpenChange,
  beatId,
  beatTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beatId: string;
  beatTitle: string;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [counts, setCounts] = useState<Record<Emoji, number>>({ "🔥": 0, "❤️": 0, "🎧": 0, "💯": 0, "🙌": 0 });
  const [mine, setMine] = useState<Set<Emoji>>(new Set());

  const load = async () => {
    const [c, r] = await Promise.all([
      (supabase as any).from("beat_comments").select("*").eq("beat_id", beatId).order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("beat_reactions").select("emoji,user_id").eq("beat_id", beatId),
    ]);
    setComments((c.data as CommentRow[]) || []);
    const next: Record<Emoji, number> = { "🔥": 0, "❤️": 0, "🎧": 0, "💯": 0, "🙌": 0 };
    const mineSet = new Set<Emoji>();
    ((r.data as { emoji: Emoji; user_id: string }[]) || []).forEach((row) => {
      if (next[row.emoji] != null) next[row.emoji] += 1;
      if (user && row.user_id === user.id) mineSet.add(row.emoji);
    });
    setCounts(next);
    setMine(mineSet);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, beatId, user?.id]);

  const post = async () => {
    if (!user) { toast.error("Sign in to comment"); return; }
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    const { error } = await (supabase as any).from("beat_comments").insert({ beat_id: beatId, user_id: user.id, content: trimmed.slice(0, 500) });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    load();
  };

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("beat_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggleReact = async (emoji: Emoji) => {
    if (!user) { toast.error("Sign in to react"); return; }
    if (mine.has(emoji)) {
      await (supabase as any).from("beat_reactions").delete().eq("beat_id", beatId).eq("user_id", user.id).eq("emoji", emoji);
    } else {
      await (supabase as any).from("beat_reactions").insert({ beat_id: beatId, user_id: user.id, emoji });
    }
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="line-clamp-1">Comments · {beatTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => toggleReact(e)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition ${mine.has(e) ? "border-primary bg-primary/15" : "border-border hover:bg-muted"}`}
              aria-pressed={mine.has(e)}
            >
              <span>{e}</span>
              <span className="tabular-nums text-xs text-muted-foreground">{counts[e]}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={user ? "Add a comment…" : "Sign in to comment"} maxLength={500} disabled={!user || posting} />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{text.length}/500</span>
            <Button size="sm" onClick={post} disabled={!user || posting || !text.trim()}>{posting ? "Posting…" : "Post"}</Button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No comments yet. Be the first.</p>
          ) : comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 bg-card/60 p-3">
              <div className="flex justify-between items-start gap-2">
                <p className="text-sm whitespace-pre-wrap break-words flex-1">{c.content}</p>
                {user?.id === c.user_id && (
                  <button onClick={() => del(c.id)} aria-label="Delete" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
