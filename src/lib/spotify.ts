// Spotify track ID validation.
// A valid Spotify ID is a base62 string, exactly 22 characters: [A-Za-z0-9]{22}.
// We also accept full Spotify URLs / URIs and extract the ID from them.

const ID_RE = /^[A-Za-z0-9]{22}$/;

export type SpotifyParseResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Parse a user-provided Spotify track input (raw ID, open.spotify.com URL,
 * or spotify:track: URI) and return the canonical 22-char track ID.
 */
export const parseSpotifyTrackId = (input: string): SpotifyParseResult => {
  const raw = (input || "").trim();
  if (!raw) return { ok: false, error: "Spotify track ID is required" };

  // Already a bare ID
  if (ID_RE.test(raw)) return { ok: true, id: raw };

  // spotify:track:ID URI
  const uriMatch = raw.match(/^spotify:track:([A-Za-z0-9]{22})$/);
  if (uriMatch) return { ok: true, id: uriMatch[1] };

  // open.spotify.com/track/ID or /intl-xx/track/ID, optional query string
  const urlMatch = raw.match(
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})(?:[/?#]|$)/,
  );
  if (urlMatch) return { ok: true, id: urlMatch[1] };

  return {
    ok: false,
    error:
      "Invalid Spotify track. Paste a track URL, spotify:track:… URI, or 22-character ID.",
  };
};

/** Strict check: returns true only for a canonical 22-char base62 ID. */
export const isValidSpotifyTrackId = (id: string | null | undefined): boolean =>
  !!id && ID_RE.test(id);