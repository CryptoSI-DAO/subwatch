/**
 * SubWatch Sound Engine — Cross-Platform
 * ========================================
 * Web:    Web Audio API (synthesized tones, zero audio files)
 * Native: expo-av with bundled WAV assets
 * 
 * Falls back silently on unsupported platforms.
 */

import { Platform } from 'react-native';

// ============================================================
// WEB: Web Audio API synthesizer
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (Platform.OS !== 'web') return null;
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

// ============================================================
// NATIVE: expo-av audio playback
// ============================================================

let soundObjects: Record<string, any> = {};
let nativeReady = false;

async function initNative() {
  if (Platform.OS === 'web' || nativeReady) return;
  try {
    const { Audio } = await import('expo-av');
    const sounds = {
      pop: require('@/assets/sounds/pop.wav'),
      whoosh: require('@/assets/sounds/whoosh.wav'),
      celebration: require('@/assets/sounds/celebration.wav'),
    };
    for (const [key, source] of Object.entries(sounds)) {
      const { sound } = await Audio.Sound.createAsync(source);
      soundObjects[key] = sound;
    }
    nativeReady = true;
  } catch (e) {
    console.warn('Native audio init failed:', e);
  }
}

async function playNative(name: string) {
  try {
    if (!nativeReady) await initNative();
    const sound = soundObjects[name];
    if (sound) {
      await sound.replayAsync();
    }
  } catch (e) {
    // Silent fail
  }
}

// ============================================================
// PUBLIC API — same functions, auto-routed to the right platform
// ============================================================

/** Bright "pop" — adding a new subscription. */
export function playPop() {
  if (Platform.OS === 'web') {
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, { freq: 523, duration: 0.08, type: 'sine', volume: 0.12 });
    playTone(ctx, { freq: 659, duration: 0.12, type: 'sine', volume: 0.14, delay: 0.06 });
    playTone(ctx, { freq: 784, duration: 0.18, type: 'triangle', volume: 0.10, delay: 0.12 });
  } else {
    playNative('pop');
  }
}

/** Soft "whoosh" — opening subscription details. */
export function playWhoosh() {
  if (Platform.OS === 'web') {
    const ctx = getCtx();
    if (!ctx) return;
    playTone(ctx, { freq: 800, sweep: 300, duration: 0.22, type: 'sine', volume: 0.08 });
    playTone(ctx, { freq: 1200, sweep: 600, duration: 0.18, type: 'sine', volume: 0.04, delay: 0.02 });
  } else {
    playNative('whoosh');
  }
}

/** Celebratory fanfare — offers reveal with savings. */
export function playCelebration() {
  if (Platform.OS === 'web') {
    const ctx = getCtx();
    if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone(ctx, { freq, duration: 0.15, type: 'triangle', volume: 0.10, delay: i * 0.08 });
    });
    playTone(ctx, { freq: 1568, duration: 0.25, type: 'sine', volume: 0.06, delay: 0.35 });
  } else {
    playNative('celebration');
  }
}

/** Unlock audio context on first interaction (mobile web autoplay fix). */
export function unlockAudio() {
  if (Platform.OS === 'web') {
    getCtx();
  } else {
    initNative();
  }
}
