/**
 * SubWatch Celebration Engine — WEB
 * Uses canvas-confetti for GPU-accelerated DOM particle effects.
 * Metro auto-selects this for web builds.
 */

import confetti from 'canvas-confetti';

const COLORS = ['#007AFF', '#34C759', '#FFD60A', '#FF2D55', '#AF52DE', '#5AC8FA'];

export function burstConfetti() {
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: COLORS, startVelocity: 45, gravity: 0.8, scalar: 0.9, ticks: 200 });
  setTimeout(() => {
    confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: COLORS, startVelocity: 50 });
    confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: COLORS, startVelocity: 50 });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 30, spread: 100, origin: { y: 0 }, colors: COLORS, startVelocity: 25, gravity: 0.5, scalar: 0.7, ticks: 150 });
  }, 400);
}

export function tickerTape(durationMs = 1500) {
  const endTime = Date.now() + durationMs;
  const frame = () => {
    confetti({
      particleCount: 3, angle: 90, spread: 120,
      origin: { x: Math.random(), y: -0.1 }, colors: COLORS,
      startVelocity: 15, gravity: 0.6, scalar: 0.6, ticks: 120,
      disableForReducedMotion: true,
    });
    if (Date.now() < endTime) requestAnimationFrame(frame);
  };
  frame();
}

export function miniPop() {
  confetti({ particleCount: 25, spread: 50, origin: { y: 0.6 }, colors: COLORS, startVelocity: 30, gravity: 0.7, scalar: 0.7, ticks: 100, disableForReducedMotion: true });
}
