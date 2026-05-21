import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  business_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email().max(255),
});

export default function SponsorSignup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent("/sponsor/signup")}`);
      return;
    }
    setEmail(user.email ?? "");
    // If sponsor profile already exists, jump to dashboard
    supabase
      .from("sponsors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate("/sponsor/dashboard", { replace: true });
      });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ business_name: businessName, email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("sponsors").insert({
      user_id: user.id,
      business_name: parsed.data.business_name,
      email: parsed.data.email,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sponsor profile created");
    navigate("/sponsor/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-xl py-12">
        <h1 className="text-3xl font-bold mb-2">Become a Sponsor</h1>
        <p className="text-muted-foreground mb-6">
          Run paid challenges for your music, brand, or social channels.
        </p>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="business">Business / Artist name</Label>
              <Input id="business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120} required />
            </div>
            <div>
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create sponsor profile"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}