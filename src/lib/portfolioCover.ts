// Generate a cover image for a portfolio project via Pollinations.ai (free, no API key),
// re-encode to WebP at 512x512, and upload to the portfolio-covers bucket.
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioCoverInput {
  projectId: string;
  title: string;
  artistName: string;
}

const buildPrompt = ({ title, artistName }: PortfolioCoverInput) =>
  `Modern professional album cover art for "${title}" by ${artistName}. ` +
  `Cinematic, atmospheric, premium music release artwork. ` +
  `Bold composition, rich color grading, subtle neon glow on a dark background. ` +
  `No text, no letters, no typography, no watermark. Square 1:1 composition.`;

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
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });

/**
 * Generates an AI cover image and uploads it. Returns the public URL.
 * Throws on failure so the caller can surface a clear error message.
 */
export const generatePortfolioCover = async (
  input: PortfolioCoverInput,
): Promise<string> => {
  const prompt = buildPrompt(input);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=768&height=768&model=flux&nologo=true&seed=${Math.floor(
    Math.random() * 1_000_000,
  )}`;
  const raw = await fetchAsBlob(url);
  const webp = await toWebP(raw, 512);
  const path = `${input.projectId}/cover-${Date.now()}.webp`;
  const { error } = await supabase.storage
    .from("portfolio-covers")
    .upload(path, webp, { contentType: "image/webp", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("portfolio-covers").getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Deterministic SVG placeholder data URL — used as a final fallback
 * if AI generation fails or before a project has any cover at all.
 */
export const placeholderCoverDataUrl = (title: string, artist: string): string => {
  const initials =
    (title || artist || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "♪";
  // Deterministic hue from title+artist
  const seed = `${title}${artist}`.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const h1 = seed % 360;
  const h2 = (h1 + 60) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='hsl(${h1},80%,45%)'/>
      <stop offset='100%' stop-color='hsl(${h2},80%,20%)'/>
    </linearGradient></defs>
    <rect width='512' height='512' fill='url(#g)'/>
    <text x='50%' y='54%' text-anchor='middle' font-family='Inter,Arial,sans-serif'
      font-size='180' font-weight='800' fill='rgba(255,255,255,0.92)'>${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};