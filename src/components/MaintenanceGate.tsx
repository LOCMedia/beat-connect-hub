import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Wrench } from "lucide-react";

export const MaintenanceGate = ({ children }: { children: ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  const [maintenance, setMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("admin_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      if (!cancelled) setMaintenance(data?.value === "true");
    };
    load();
    const channel = (supabase as any)
      .channel("admin_settings_maintenance")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_settings" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  if (maintenance === null || loading) return <>{children}</>;
  if (!maintenance || isAdmin) return <>{children}</>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-hero px-4 text-center">
      <div className="max-w-md rounded-2xl border border-border/60 bg-card/70 p-10 backdrop-blur-xl shadow-glow">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Wrench className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">We'll be right back</h1>
        <p className="text-muted-foreground">
          VibeKonect is under maintenance. We'll be back shortly.
        </p>
      </div>
    </main>
  );
};
