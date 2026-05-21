import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { containsProfanity } from "@/lib/profanity";
import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: string;
  battle_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

type ProfileLite = { user_id: string; username: string; display_name: string | null; avatar_url: string | null };

export const BattleComments = ({ battleId }: { battleId: string }) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const listRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", missing);
    if (data) {
      setProfiles((p) => {
        const next = { ...p };
        data.forEach((d: any) => { next[d.user_id] = d; });
        return next;
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("battle_comments")
        .select("*")
        .eq("battle_id", battleId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!mounted) return;
      setComments(data || []);
      if (data?.length) loadProfiles(Array.from(new Set(data.map((c: Comment) => c.user_id))) as string[]);
    })();

    const ch = supabase
      .channel(`battle-comments-${battleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "battle_comments", filter: `battle_id=eq.${battleId}` },
        (payload) => {
          const c = payload.new as Comment;
          setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
          loadProfiles([c.user_id]);
          setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "battle_comments", filter: `battle_id=eq.${battleId}` },
        (payload) => {
          const id = (payload.old as Comment).id;
          setComments((prev) => prev.filter((c) => c.id !== id));
        },
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [battleId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const value = text.trim();
    if (!value) return;
    if (containsProfanity(value)) {
      toast({ title: "Watch the language", description: "Please keep comments clean.", variant: "destructive" });
      return;
    }
    if (Date.now() - lastSentAt < 10_000) {
      toast({ title: "Slow down", description: "One comment every 10 seconds." });
      return;
    }
    setSending(true);
    const { error } = await (supabase as any)
      .from("battle_comments")
      .insert({ battle_id: battleId, user_id: user.id, comment: value });
    setSending(false);
    if (error) {
      toast({
        title: "Couldn't post",
        description: error.message.includes("rate") || error.message.includes("battle_comments")
          ? "One comment every 10 seconds."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setText("");
    setLastSentAt(Date.now());
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("battle_comments").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Live comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div ref={listRef} className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Be the first to comment.</p>
          ) : (
            comments.map((c) => {
              const p = profiles[c.user_id];
              const name = p?.display_name || p?.username || "Listener";
              const canDelete = isAdmin || user?.id === c.user_id;
              return (
                <div key={c.id} className="group flex items-start gap-2 rounded-md border border-border/60 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {p?.username ? (
                        <Link to={`/u/${p.username}`} className="font-medium text-foreground hover:underline">{name}</Link>
                      ) : (
                        <span className="font-medium text-foreground">{name}</span>
                      )}
                      <span>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{c.comment}</p>
                  </div>
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => remove(c.id)}
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
        {user ? (
          <form onSubmit={send} className="flex items-end gap-2">
            <Textarea
              rows={1}
              maxLength={500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Drop a comment…"
              className="resize-none min-h-[40px]"
            />
            <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to join the conversation.
          </p>
        )}
      </CardContent>
    </Card>
  );
};