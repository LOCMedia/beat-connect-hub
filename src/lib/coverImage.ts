// Generate a cover image for a beat via Pollinations.ai (free, no API key),
// re-encode to WebP at 512x512 to save storage, and upload to Supabase.
import { supabase } from "@/integrations/supabase/client";

export interface BeatCoverInput {
  beatId: string;
  title: string;
  genre: string;
  bpm: number;
  key: string;
}

const vibeFor = (bpm: number) => {
  if (bpm < 80) return "slow, moody, cinematic";
  if (bpm < 110) return "smooth, atmospheric, emotional";
  if (bpm < 140) return "energetic, hypnotic, modern";
  return "fast, vibrant, intense";
};

export const buildPrompt = ({ title, genre, bpm }: BeatCoverInput) =>
  `Abstract album cover art for a ${genre} beat called "${title}", ${bpm} BPM, ${vibeFor(
    bpm,
  )} vibe. Neon glow, dark background, no text, no letters, no watermark, square composition.`;

const fetchAsBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  return await res.blob();
};

const toWebP = (blob: Blob, size = 512): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      // cover-fit
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("WebP encode failed"))),
        "image/webp",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });

/**
 * Generates a cover image and uploads it. Returns the public URL or null on failure.
 * Caller should save the URL into beats.cover_image_url. On null, the UI falls back
 * to a CSS gradient based on genre/BPM.
 */
export const generateAndUploadCover = async (
  input: BeatCoverInput,
): Promise<string | null> => {
  try {
    const prompt = buildPrompt(input);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt,
    )}?width=512&height=512&model=flux&nologo=true&seed=${Math.floor(
      Math.random() * 1_000_000,
    )}`;
    const raw = await fetchAsBlob(url);
    const webp = await toWebP(raw, 512);
    const path = `${input.beatId}/cover.webp`;
    const { error } = await supabase.storage
      .from("beat-images")
      .upload(path, webp, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("beat-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("Cover generation failed, using fallback gradient", e);
    return null;
  }
};

// Deterministic fallback gradient based on genre + BPM.
export const fallbackGradient = (genre: string, bpm: number): string => {
  const g = (genre || "").toLowerCase();
  const map: Record<string, [number, number]> = {
    trap: [280, 320],
    edm: [200, 280],
    rock: [0, 30],
    house: [180, 220],
    drill: [260, 300],
    rnb: [320, 350],
    hiphop: [250, 290],
    pop: [310, 340],
  };
  const [h1, h2] = map[g.replace(/[^a-z]/g, "")] ?? [220, 300];
  const light = Math.min(60, 25 + Math.round(bpm / 6));
  return `linear-gradient(135deg, hsl(${h1} 80% ${light}%), hsl(${h2} 80% ${Math.max(
    15,
    light - 20,
  )}%))`;
};