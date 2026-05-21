import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { formatWhatsAppNumber, isValidWhatsAppNumber, subscribeToNotifications } from "@/lib/notifySubscribe";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const SUBSCRIBED_KEY = "vk_subscribed_v1";

export function markSubscribedLocal(email?: string) {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, email ? email.toLowerCase() : "1");
  } catch {
    /* noop */
  }
}

export function isSubscribedLocal() {
  try {
    return !!localStorage.getItem(SUBSCRIBED_KEY);
  } catch {
    return false;
  }
}

type Props = {
  source: string;
  variant?: "card" | "inline" | "compact";
  title?: string;
  description?: string;
  defaultPreferences?: { competitions: boolean; new_beats: boolean; winners: boolean; platform_news: boolean };
  onSuccess?: () => void;
};

const labels: Record<string, string> = {
  competitions: "Upcoming competitions",
  new_beats: "New beat drops",
  winners: "Winner announcements",
  platform_news: "Platform news & features",
};

export default function SubscribeForm({
  source,
  variant = "card",
  title = "Get VibeKonect updates",
  description = "Be first to hear about competitions, drops, and winners.",
  defaultPreferences,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [prefs, setPrefs] = useState(defaultPreferences ?? { competitions: true, new_beats: true, winners: true, platform_news: false });
  const [phone, setPhone] = useState("");
  const [waOptIn, setWaOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Only hide the form when we have positively confirmed (via DB) that the
  // current logged-in user is already subscribed. Visitors and logged-in
  // users who aren't subscribed should always see the form.
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const userEmail = user?.email?.toLowerCase();
    if (!userEmail) {
      // Visitor — always show the form.
      setHidden(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("notification_subscribers")
        .select("email,is_active")
        .eq("email", userEmail)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        markSubscribedLocal(userEmail);
        setHidden(true);
      } else {
        setHidden(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const formattedPhone = formatWhatsAppNumber(phone);
    if (phone.trim() && !isValidWhatsAppNumber(phone)) {
      toast.error("Enter WhatsApp number in international format, e.g. +447123456789.");
      return;
    }
    if (waOptIn && !formattedPhone) {
      toast.error("Add a WhatsApp number to receive WhatsApp updates.");
      return;
    }
    setBusy(true);
    try {
      await subscribeToNotifications({
        email,
        preferences: prefs,
        source,
        form_location: source,
        phone_number: formattedPhone ?? undefined,
        whatsapp_opted_in: waOptIn && !!formattedPhone,
      });
      setDone(true);
      markSubscribedLocal(email);
      toast.success("Subscribed! You'll receive updates from VibeKonect.");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setBusy(false);
    }
  };

  if (hidden && !done) {
    return (
      <div className="rounded-xl border border-border bg-card/70 p-4 text-center text-sm text-muted-foreground">
        <CheckCircle2 className="inline h-4 w-4 mr-2 text-[hsl(142_70%_45%)]" />
        You're already subscribed to VibeKonect updates.
      </div>
    );
  }

  if (done) {
    return (
      <div className={variant === "card" ? "rounded-xl border border-border bg-card/70 p-6 text-center" : "text-sm text-muted-foreground"}>
        <CheckCircle2 className="mx-auto h-8 w-8 text-[hsl(142_70%_45%)] mb-2" />
        <p className="font-semibold">You're subscribed!</p>
        <p className="text-sm text-muted-foreground mt-1">Check your email for confirmation.</p>
      </div>
    );
  }

  const wrapperCls =
    variant === "card"
      ? "rounded-xl border border-border bg-card/70 p-6 backdrop-blur-sm"
      : variant === "inline"
        ? "space-y-3"
        : "space-y-2";

  return (
    <form onSubmit={submit} className={wrapperCls}>
      {variant === "card" && (
        <div className="mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> {title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          className="flex-1"
        />
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
        </Button>
      </div>
      <div className="mt-2 flex flex-col sm:flex-row gap-2">
        <Input
          type="tel"
          placeholder="WhatsApp number (optional, e.g. +447…)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setPhone(formatWhatsAppNumber(phone) ?? "")}
          maxLength={32}
          className="flex-1"
        />
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={waOptIn} onCheckedChange={(v) => setWaOptIn(!!v)} />
        <span>Receive updates on WhatsApp too</span>
      </label>
      {variant !== "compact" && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(labels) as Array<keyof typeof prefs>).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={prefs[k]}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [k]: !!v }))}
              />
              <span>{labels[k]}</span>
            </label>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">Unsubscribe anytime. We'll never share your email.</p>
    </form>
  );
}