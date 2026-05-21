// Deterministic "social proof" inflater so numbers stay stable per id across reloads.
// Adds a pseudo-random boost in a range based on a seed string.
function hash(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function inflatePlays(id: string, real: number, min = 420, max = 4800) {
  const span = max - min;
  const boost = (hash(id + ":plays") % span) + min;
  return real + boost;
}

export function inflateVotes(id: string, real: number, min = 38, max = 480) {
  const span = max - min;
  const boost = (hash(id + ":votes") % span) + min;
  return real + boost;
}
