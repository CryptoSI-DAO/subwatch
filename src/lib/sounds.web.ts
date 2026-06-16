/**
 * SubWatch Sound Engine — WEB
 * Uses Web Audio API to synthesize sounds programmatically.
 * No audio files needed. Metro auto-selects this for web builds.
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
  delay?: number;
  sweep?: number;
}

function playTone(ctx: AudioContext, opts: ToneOptions) {
  const { freq, duration, type = 'sine', volume = 0.15, delay = 0, sweep } = opts;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  if (sweep !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(sweep, 1), ctx.currentTime + delay + duration);
  }
  gain.gain.setValueAtTime(0, ctx.currentTime + delay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

export function playPop() {
  const ctx = getCtx();
  if (!ctx) return;
  playTone(ctx, { freq: 523, duration: 0.08, type: 'sine', volume: 0.12 });
  playTone(ctx, { freq: 659, duration: 0.12, type: 'sine', volume: 0.14, delay: 0.06 });
  playTone(ctx, { freq: 784, duration: 0.18, type: 'triangle', volume: 0.10, delay: 0.12 });
}

export function playWhoosh() {
  const ctx = getCtx();
  if (!ctx) return;
  playTone(ctx, { freq: 800, sweep: 300, duration: 0.22, type: 'sine', volume: 0.08 });
  playTone(ctx, { freq: 1200, sweep: 600, duration: 0.18, type: 'sine', volume: 0.04, delay: 0.02 });
}

export function playCelebration() {
  const ctx = getCtx();
  if (!ctx) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    playTone(ctx, { freq, duration: 0.15, type: 'triangle', volume: 0.10, delay: i * 0.08 });
  });
  playTone(ctx, { freq: 1568, duration: 0.25, type: 'sine', volume: 0.06, delay: 0.35 });
}

export function playScratch() {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * 0.15);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2500;
  filter.Q.value = 1.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + 0.2);
}

export function playReveal() {
  const ctx = getCtx();
  if (!ctx) return;
  playTone(ctx, { freq: 988,  duration: 0.10, type: 'sine',     volume: 0.12 });
  playTone(ctx, { freq: 1319, duration: 0.12, type: 'sine',     volume: 0.14, delay: 0.05 });
  playTone(ctx, { freq: 1976, duration: 0.20, type: 'triangle', volume: 0.10, delay: 0.10 });
}

export function unlockAudio() {
  getCtx();
}
