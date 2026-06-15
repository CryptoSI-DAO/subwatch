/**
 * SubWatch Celebration Engine
 * Confetti, ticker tape, and visual rewards.
 * Uses canvas-confetti — lightweight, GPU-accelerated, no DOM pollution.
 */
import confetti from 'canvas-confetti';

/**
 * Full confetti burst — used when offers tab first reveals savings.
 * Multi-stage burst for maximum delight.
 */
export function burstConfetti() {
  const colors = ['#007AFF', '#34C759', '#FFD60A', '#FF2D55', '#AF52DE', '#5AC8FA'];

  // Stage 1: Center burst
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.5 },
    colors,
    startVelocity: 45,
    gravity: 0.8,
    scalar: 0.9,
    ticks: 200,
  });

  // Stage 2: Left + Right side cannons (slight delay)
  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
      startVelocity: 50,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
      startVelocity: 50,
    });
  }, 200);

  // Stage 3: Sparkle rain
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 100,
      origin: { y: 0 },
      colors,
      startVelocity: 25,
      gravity: 0.5,
      scalar: 0.7,
      ticks: 150,
    });
  }, 400);
}

/**
 * Ticker tape — a gentler, continuous fall from the top.
 * Used as an ambient effect when browsing offers.
 */
export function tickerTape(durationMs = 1500) {
  const colors = ['#007AFF', '#34C759', '#FFD60A', '#FFFFFF'];
  const endTime = Date.now() + durationMs;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 90,
      spread: 120,
      origin: { x: Math.random(), y: -0.1 },
      colors,
      startVelocity: 15,
      gravity: 0.6,
      scalar: 0.6,
      ticks: 120,
      disableForReducedMotion: true,
    });
    if (Date.now() < endTime) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

/**
 * Mini pop — a small, quick celebration for individual interactions.
 * Used when a user taps an offer to reveal savings.
 */
export function miniPop() {
  const colors = ['#34C759', '#007AFF', '#FFD60A'];
  confetti({
    particleCount: 25,
    spread: 50,
    origin: { y: 0.6 },
    colors,
    startVelocity: 30,
    gravity: 0.7,
    scalar: 0.7,
    ticks: 100,
    disableForReducedMotion: true,
  });
}
