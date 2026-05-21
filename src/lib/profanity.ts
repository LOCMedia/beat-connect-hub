// Lightweight profanity filter. Admin-extensible later.
const BLOCKED = [
  "fuck", "shit", "bitch", "cunt", "asshole", "nigger", "faggot", "retard",
];

export function containsProfanity(text: string): boolean {
  const t = text.toLowerCase();
  return BLOCKED.some((w) => new RegExp(`\\b${w}\\b`, "i").test(t));
}