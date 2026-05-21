import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { placeholderCoverDataUrl } from "@/lib/portfolioCover";
import type { PortfolioEntry } from "@/components/ProducerPortfolio";

const TYPE_LABEL: Record<PortfolioEntry["entry_type"], string> = {
  produced: "🔥 Produced",
  featured: "🎤 Featured",
  project: "📀 Project",
};

export default function PortfolioAdmin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PortfolioEntry[]>([]);
  const [reordering, setReordering] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("portfolio_entries" as any)
      .select("*")
      .order("display_order", { ascending: true })
      .order("release_date", { ascending: false });
    if (error) toast.error(error.message);
    else setEntries(((data as unknown) as PortfolioEntry[]) || []);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.display_order - b.display_order),
    [entries],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-10">Loading…</main>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const remove = async (e: PortfolioEntry) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    const { error } = await supabase
      .from("portfolio_entries" as any)
      .delete()
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Entry deleted");
    load();
  };

  const toggleFeatured = async (e: PortfolioEntry) => {
    const { error } = await supabase
      .from("portfolio_entries" as any)
      .update({ featured: !e.featured })
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    setEntries((prev) =>
      prev.map((x) => (x.id === e.id ? { ...x, featured: !x.featured } : x)),
    );
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const list = sorted;
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    setReordering(a.id);
    const { error: e1 } = await supabase
      .from("portfolio_entries" as any)
      .update({ display_order: b.display_order })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("portfolio_entries" as any)
      .update({ display_order: a.display_order })
      .eq("id", b.id);
    setReordering(null);
    if (e1 || e2) {
      toast.error((e1 || e2)!.message);
      return;
    }
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-5xl py-10 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Portfolio</h1>
            <p className="text-muted-foreground">
              Manage produced tracks, features, and full projects shown on the homepage.
            </p>
          </div>
          <Button onClick={() => navigate("/admin/portfolio/new")}>
            <Plus className="h-4 w-4 mr-2" /> Add entry
          </Button>
        </div>

        {sorted.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            No entries yet. Add your first one.
          </Card>
        ) : (
          <div className="space-y-3">
            {sorted.map((e, idx) => (
              <Card key={e.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start">
                  <img
                    src={
                      e.cover_image_url ||
                      placeholderCoverDataUrl(e.title, e.artist_name || "LocBeatx")
                    }
                    alt=""
                    className="h-20 w-20 rounded-md object-cover bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{TYPE_LABEL[e.entry_type]}</Badge>
                      <h3 className="font-semibold truncate">{e.title}</h3>
                      {e.featured && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" /> Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {e.artist_name || "—"}
                      {e.credit_text ? ` · ${e.credit_text}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>Order: {e.display_order}</span>
                      {e.release_date && <span>· {e.release_date}</span>}
                      {e.external_link && (
                        <a
                          href={e.external_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === 0 || reordering === e.id}
                      onClick={() => move(idx, -1)}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={idx === sorted.length - 1 || reordering === e.id}
                      onClick={() => move(idx, 1)}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleFeatured(e)}
                      title="Toggle featured"
                    >
                      <Star
                        className={`h-4 w-4 ${e.featured ? "fill-primary text-primary" : ""}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/admin/portfolio/${e.id}/edit`)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(e)}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}