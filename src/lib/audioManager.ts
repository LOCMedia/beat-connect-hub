let current: HTMLAudioElement | null = null;

export function registerPlayingAudio(el: HTMLAudioElement) {
  if (current && current !== el) {
    try {
      current.pause();
    } catch {
      /* noop */
    }
  }
  current = el;
}

export function clearPlayingAudio(el: HTMLAudioElement) {
  if (current === el) current = null;
}

// --- Autoplay queue ---
// BeatCards subscribe with their id and a play() callback. When a beat ends,
// we dispatch a request for the next id in the registered order.
type PlayFn = () => void;
const players = new Map<string, PlayFn>();
let order: string[] = [];

export function registerBeatPlayer(id: string, play: PlayFn) {
  players.set(id, play);
  if (!order.includes(id)) order.push(id);
}

export function unregisterBeatPlayer(id: string) {
  players.delete(id);
  order = order.filter((x) => x !== id);
}

export function setBeatOrder(ids: string[]) {
  order = ids.slice();
}

export function playNextAfter(id: string) {
  const idx = order.indexOf(id);
  if (idx === -1) return;
  for (let i = idx + 1; i < order.length; i++) {
    const fn = players.get(order[i]);
    if (fn) { fn(); return; }
  }
}
