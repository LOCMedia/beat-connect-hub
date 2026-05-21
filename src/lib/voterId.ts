// Lightweight voter fingerprint for anonymous voting.
// Real IP is unknown client-side; we use a stable per-browser id stored in localStorage
// and send it as the "ip_address" tracker. The unique index on (entry_id, ip_address)
// prevents the same browser from double-voting.
const KEY = "vk_voter_id";
export function getVoterId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `v_${crypto.randomUUID()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}