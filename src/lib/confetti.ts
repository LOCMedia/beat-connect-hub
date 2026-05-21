import confetti from "canvas-confetti";

export function fireVoteConfetti(originX = 0.5, originY = 0.5) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  // small celebratory burst
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    origin: { x: originX, y: originY },
    colors: ["#22c55e", "#a855f7", "#06b6d4", "#fde047"],
    scalar: 0.9,
    zIndex: 9999,
  });
}

export function fireFromButton(el: HTMLElement | null) {
  if (!el) {
    fireVoteConfetti();
    return;
  }
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  fireVoteConfetti(x, y);
}