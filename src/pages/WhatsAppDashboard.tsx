import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, CheckCircle2, Archive, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  phone_number: string;
  beat_id: string | null;
  message_history: unknown;
  status: string;
  converted_to_sale: boolean;
  last_message_at: string;
  beat?: { title: string } | null;
}

const WhatsAppDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("*, beat:beats(title)")
      .order("last_message_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as unknown as Conversation[]);
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/auth");
    if (!isAdmin) {
      toast.error("Admin access only");
      return navigate("/");
    }
    load();
  }, [user, isAdmin, loading, navigate]);

  const markConverted = async (id: string) => {
    const { error } = await supabase
      .from("whatsapp_conversations")
      .update({ converted_to_sale: true })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as converted");
    load();
  };

  const archive = async (id: string) => {
    const { error } = await supabase
      .from("whatsapp_conversations")
      .update({ status: "complete" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Archived");
    load();
  };

  const sendTest = (phone: string, beatTitle?: string) => {
    const text = encodeURIComponent(
      `Hey! Following up on the beat${beatTitle ? ` "${beatTitle}"` : ""} you were interested in. Let me know if you'd like a license quote.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  if (loading || busy) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageCircle className="h-7 w-7 text-primary" /> WhatsApp Conversations
            </h1>
            <p className="text-muted-foreground">Manage leads from WhatsApp</p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Beat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last message</TableHead>
                <TableHead>Converted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    No conversations yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(r)}
                  >
                    <TableCell className="font-mono text-xs">{r.phone_number}</TableCell>
                    <TableCell>{r.beat?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "active" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.last_message_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {r.converted_to_sale ? (
                        <Badge className="bg-heat text-background">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Mark converted" onClick={() => markConverted(r.id)}>
                          <CheckCircle2 className="h-4 w-4 text-heat" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Archive" onClick={() => archive(r.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Send test message" onClick={() => sendTest(r.phone_number, r.beat?.title)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Conversation · {selected?.phone_number}</DialogTitle>
            </DialogHeader>
            <pre className="text-xs bg-muted/40 rounded-lg p-4 overflow-auto max-h-[60vh]">
              {JSON.stringify(selected?.message_history ?? [], null, 2)}
            </pre>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default WhatsAppDashboard;