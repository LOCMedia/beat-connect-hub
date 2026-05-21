import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile, initialsFromProfile } from "@/hooks/useProfile";
import { Camera, Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Min 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, underscore"),
  display_name: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  location: z.string().trim().max(80).optional().or(z.literal("")),
});

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useMyProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    document.title = "My profile · VibeKonect";
  }, []);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setLocation(profile.location ?? "");
    }
  }, [profile]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Avatar must be under 3 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
      toast.success("Avatar updated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSave = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse({
      username: username.toLowerCase(),
      display_name: displayName,
      bio,
      location,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      // Username uniqueness check (only if changed)
      if (parsed.data.username !== profile?.username) {
        setCheckingUsername(true);
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", parsed.data.username)
          .neq("user_id", user.id)
          .maybeSingle();
        setCheckingUsername(false);
        if (existing) {
          toast.error("That username is taken");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: parsed.data.username,
          display_name: parsed.data.display_name || null,
          bio: parsed.data.bio || null,
          location: parsed.data.location || null,
        })
        .eq("user_id", user.id);
      if (error) {
        if (error.code === "23505") toast.error("That username is taken");
        else if (error.code === "23514") toast.error("Username format invalid");
        else toast.error(error.message);
        return;
      }
      toast.success("Profile saved");
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const loading = authLoading || profileLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold">My profile</h1>
        <p className="text-sm text-muted-foreground">
          Customize how you appear across VibeKonect.
        </p>

        {loading ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-6 rounded-xl border border-border/60 bg-card/60 p-5 sm:p-6 backdrop-blur">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={username} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-semibold">
                    {initialsFromProfile(profile)}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70 backdrop-blur">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarPick}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Change avatar
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  PNG/JPG up to 3 MB
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">@</span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="yourhandle"
                    maxLength={30}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Lowercase letters, numbers, underscore. 3–30 chars.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={60}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about you…"
                maxLength={280}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {bio.length}/280
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                maxLength={80}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={onSave}
                disabled={saving || checkingUsername}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 font-semibold w-full sm:w-auto"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              {profile?.username && (
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link to={`/u/${profile.username}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View public profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Profile;