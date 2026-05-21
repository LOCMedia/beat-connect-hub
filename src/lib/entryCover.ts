// Generate an AI cover for a competition entry via Pollinations.ai (free, no key),
// re-encode to WebP at 512x512, and upload to the `entry-covers` Supabase bucket.
// Path layout: <user_id>/<entry_id>.webp  (RLS requires user_id as the first folder)
import { supabase } from "@/integrations/supabase/client";

export interface EntryCoverInput {
  entryId: string;
  userId: string;
  artistName: string;
  beatTitle?: string | null;
  videoThumbnailUrl?: string | null; // future: dance challenge video frame
}

const buildPrompt = ({ artistName, beatTitle }: EntryCoverInput) =>
  `Album cover for freestyle entry by ${artistName}${
    beatTitle ? ` on beat "${beatTitle}"` : ""
  }, dark mood, deep purple and pink neon theme, modern abstract artwork, glowing highlights, no text, no letters, no watermark, square composition.`;

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
 * Generates a cover and uploads it to the `entry-covers` bucket.
 * Returns the public URL, or null on failure (caller falls back to gradient).
 */
export const generateAndUploadEntryCover = async (
  input: EntryCoverInput,
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
    const path = `${input.userId}/${input.entryId}.webp`;
    const { error } = await supabase.storage
      .from("entry-covers")
      .upload(path, webp, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("entry-covers").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("Entry cover generation failed; using fallback gradient.", e);
    return null;
  }
};