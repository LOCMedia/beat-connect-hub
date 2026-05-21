import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { MessageCircle, Send, ArrowLeft, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type ChatPeer = { user_id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type ChatMessage = { id: string; channel_id: string; user_id: string; message: string; created_at: string };
type Conversation = {
  channel_id: string;
  peer: ChatPeer;
  last_message: string | null;
  last_at: string | null;
  unread: number;
};

interface Ctx {
  open: () => void;
  openWithUser: (otherUserId: string) => Promise<void>;
  unreadTotal: number;
}

const StudioChatContext = createContext<Ctx | undefined>(undefined);

export const useStudioChat = () => {
  const c = useContext(StudioChatContext);
  if (!c) throw new Error("useStudioChat must be used within StudioChatProvider");
  return c;
};

export const StudioChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const unreadTotal = conversations.reduce((s, c) => s + c.unread, 0);

  const loadConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      return;
    }
    const { data: parts } = await (supabase as any)
      .from("chat_participants")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id);
    const channelIds = (parts || []).map((p: any) => p.channel_id);
    if (channelIds.length === 0) {
      setConversations([]);
      return;
    }
    const lastReadMap = new Map<string, string>((parts || []).map((p: any) => [p.channel_id, p.last_read_at]));

    const { data: allParts } = await (supabase as any)
      .from("chat_participants")
      .select("channel_id, user_id")
      .in("channel_id", channelIds);
    const peerIdByChannel = new Map<string, string>();
    (allParts || []).forEach((p: any) => {
      if (p.user_id !== user.id) peerIdByChannel.set(p.channel_id, p.user_id);
    });
    const peerIds = Array.from(new Set(peerIdByChannel.values()));

    const { data: profiles } = peerIds.length
      ? await supabase.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", peerIds)
      : { data: [] as any[] };
    const profileMap = new Map<string, ChatPeer>(
      (profiles || []).map((p: any) => [p.user_id, p as ChatPeer]),
    );

    const { data: msgs } = await (supabase as any)
      .from("chat_messages")
      .select("channel_id, user_id, message, created_at")
      .in("channel_id", channelIds)
      .order("created_at", { ascending: false });
    const lastByChannel = new Map<string, { message: string; created_at: string }>();
    const unreadByChannel = new Map<string, number>();
    (msgs || []).forEach((m: any) => {
      if (!lastByChannel.has(m.channel_id)) {
        lastByChannel.set(m.channel_id, { message: m.message, created_at: m.created_at });
      }
      if (m.user_id !== user.id) {
        const lr = lastReadMap.get(m.channel_id);
        if (!lr || new Date(m.created_at) > new Date(lr)) {
          unreadByChannel.set(m.channel_id, (unreadByChannel.get(m.channel_id) || 0) + 1);
        }
      }
    });

    const convos: Conversation[] = channelIds.map((id: string) => {
      const peerId = peerIdByChannel.get(id);
      const p = peerId ? profileMap.get(peerId) : null;
      const last = lastByChannel.get(id);
      return {
        channel_id: id,
        peer: p || { user_id: peerId || "", username: null, display_name: "User", avatar_url: null },
        last_message: last?.message || null,
        last_at: last?.created_at || null,
        unread: unreadByChannel.get(id) || 0,
      };
    });
    convos.sort((a, b) => (b.last_at || "").localeCompare(a.last_at || ""));
    setConversations(convos);
  }, [user]);

  // Initial load + global subscription for unread badge
  useEffect(() => {
    if (!user) return;
    loadConversations();
    const channel = supabase
      .channel(`user-chat:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        loadConversations();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  // Active channel subscription
  useEffect(() => {
    if (!activeChannelId || !user) return;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("chat_messages")
        .select("id, channel_id, user_id, message, created_at")
        .eq("channel_id", activeChannelId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as ChatMessage[]) || []);
      setLoading(false);
      // mark read
      await (supabase as any)
        .from("chat_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", activeChannelId)
        .eq("user_id", user.id);
      loadConversations();
    })();

    const ch = supabase
      .channel(`chat:${activeChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as ChatMessage;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeChannelId, user, loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const openChannel = useCallback(
    async (channelId: string) => {
      setActiveChannelId(channelId);
      const convo = conversations.find((c) => c.channel_id === channelId);
      if (convo) setPeer(convo.peer);
      else {
        // load peer profile
        const { data: parts } = await (supabase as any)
          .from("chat_participants")
          .select("user_id")
          .eq("channel_id", channelId);
        const otherId = (parts || []).map((p: any) => p.user_id).find((id: string) => id !== user?.id);
        if (otherId) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("user_id, username, display_name, avatar_url")
            .eq("user_id", otherId)
            .maybeSingle();
          if (prof) setPeer(prof as ChatPeer);
        }
      }
    },
    [conversations, user?.id],
  );

  const openWithUser = useCallback(
    async (otherUserId: string) => {
      if (!user) {
        toast.error("Sign in to chat");
        navigate("/auth");
        return;
      }
      if (otherUserId === user.id) {
        toast.info("That's you 😄");
        return;
      }
      const { data, error } = await (supabase as any).rpc("get_or_create_dm_channel", { _other_user: otherUserId });
      if (error || !data) {
        toast.error("Could not open chat");
        console.warn("[chat] open failed", error);
        return;
      }
      setIsOpen(true);
      await loadConversations();
      await openChannel(data as string);
    },
    [user, navigate, loadConversations, openChannel],
  );

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !activeChannelId || !user || sending) return;
    setSending(true);
    const { data, error } = await (supabase as any)
      .from("chat_messages")
      .insert({ channel_id: activeChannelId, user_id: user.id, message: text })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error("Failed to send");
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((m) => m.id === (data as any).id) ? prev : [...prev, data as ChatMessage]));
  };

  const ctx = useMemo<Ctx>(
    () => ({
      open: () => setIsOpen(true),
      openWithUser,
      unreadTotal,
    }),
    [openWithUser, unreadTotal],
  );

  const peerName = peer?.display_name || peer?.username || "User";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <StudioChatContext.Provider value={ctx}>
      {children}
      {user && (
        <button
          type="button"
          aria-label="Open Studio Chat"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </button>
      )}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle className="flex items-center gap-2">
              {activeChannelId ? (
                <>
                  <button
                    onClick={() => {
                      setActiveChannelId(null);
                      setPeer(null);
                      setMessages([]);
                    }}
                    className="rounded p-1 hover:bg-muted"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar className="h-7 w-7">
                    {peer?.avatar_url && <AvatarImage src={peer.avatar_url} alt={peerName} />}
                    <AvatarFallback className="text-xs">{peerName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-base">{peerName}</span>
                </>
              ) : (
                <span className="bg-gradient-primary bg-clip-text text-transparent">Studio Chat</span>
              )}
            </SheetTitle>
          </SheetHeader>

          {!activeChannelId ? (
            <ScrollArea className="flex-1">
              {!user ? (
                <div className="p-6 text-sm text-muted-foreground">
                  Sign in to message producers and artists.
                  <Button className="mt-3 w-full" onClick={() => navigate("/auth")}>
                    Sign in
                  </Button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No conversations yet. Tap "Chat with Producer" on any beat to start one.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {conversations.map((c) => {
                    const name = c.peer.display_name || c.peer.username || "User";
                    return (
                      <li key={c.channel_id}>
                        <button
                          onClick={() => openChannel(c.channel_id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                        >
                          <Avatar className="h-10 w-10">
                            {c.peer.avatar_url && <AvatarImage src={c.peer.avatar_url} alt={name} />}
                            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold">{name}</span>
                              {c.last_at && (
                                <span className="text-[10px] text-muted-foreground">{fmt(c.last_at)}</span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{c.last_message || "No messages yet"}</p>
                          </div>
                          {c.unread > 0 && (
                            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {c.unread}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
                {messages.map((m) => {
                  const mine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p className={`mt-0.5 text-[10px] opacity-70 ${mine ? "text-right" : "text-left"}`}>
                          {fmt(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {!loading && messages.length === 0 && (
                  <div className="py-10 text-center text-xs text-muted-foreground">Say hi 👋</div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="border-t border-border/60 p-3 flex gap-2"
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  maxLength={4000}
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </SheetContent>
      </Sheet>
    </StudioChatContext.Provider>
  );
};