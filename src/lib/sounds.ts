/**
 * SubWatch Sound Engine
 * Uses Web Audio API to synthesize sounds programmatically.
 * No audio files needed — everything is generated in-browser.
 * Falls back silently on unsupported platforms (native/SSR).
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (browsers auto-suspend until user interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number; // seconds before this tone plays
  sweep?: number; // target frequency for frequency sweep
}

function playTone(ctx: AudioContext, opts: ToneOptions) {
  const {
    freq,
    duration,
    type = 'sine',
    volume = 0.15,
    delay = 0,
    sweep,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

  if (sweep !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(sweep, 1),
      ctx.currentTime + delay + duration
    );
  }

  // Envelope: quick attack, smooth decay
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

/**
 * Bright "pop" — a quick rising two-note chime.
 * Used when adding a new subscription.
 */
export function playPop() {
  const ctx = getCtx();
  if (!ctx) return;

  // Note 1: C5 (523 Hz) — quick blip
  playTone(ctx, { freq: 523, duration: 0.08, type: 'sine', volume: 0.12 });

  // Note 2: E5 (659 Hz) — slightly delayed, slightly longer
  playTone(ctx, { freq: 659, duration: 0.12, type: 'sine', volume: 0.14, delay: 0.06 });

  // Note 3: G5 (784 Hz) — the satisfying resolution
  playTone(ctx, { freq: 784, duration: 0.18, type: 'triangle', volume: 0.10, delay: 0.12 });
}

/**
 * Soft "whoosh" — a frequency sweep that feels like a page turn.
 * Used when opening subscription details.
 */
export function playWhoosh() {
  const ctx = getCtx();
  if (!ctx) return;

  // Downward sweep with a filter-like feel
  playTone(ctx, {
    freq: 800,
    sweep: 300,
    duration: 0.22,
    type: 'sine',
    volume: 0.08,
  });

  // Subtle harmonic shimmer
  playTone(ctx, {
    freq: 1200,
    sweep: 600,
    duration: 0.18,
    type: 'sine',
    volume: 0.04,
    delay: 0.02,
  });
}

/**
 * Celebratory fanfare — a ascending arpeggio burst.
 * Used when the offers tab reveals savings.
 */
export function playCelebration() {
  const ctx = getCtx();
  if (!ctx) return;

  // Ascending C major arpeggio: C5, E5, G5, C6
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    playTone(ctx, {
      freq,
      duration: 0.15,
      type: 'triangle',
      volume: 0.10,
      delay: i * 0.08,
    });
  });

  // Sparkle on top
  playTone(ctx, {
    freq: 1568, // G6
    duration: 0.25,
    type: 'sine',
    volume: 0.06,
    delay: 0.35,
  });
}

/**
 * Preload the audio context. Call on first user interaction
 * to unlock audio on mobile browsers.
 */
export function unlockAudio() {
  getCtx();
}
