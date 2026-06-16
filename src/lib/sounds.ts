/**
 * SubWatch Sound Engine — NATIVE (iOS / Android)
 * Uses expo-av with bundled WAV assets.
 * Web version lives in sounds.web.ts (auto-selected by Metro).
 */

import { Audio } from 'expo-av';

let soundObjects: Record<string, any> = {};
let initialized = false;

async function init() {
  if (initialized) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const sounds = {
      pop: require('@/assets/sounds/pop.wav'),
      whoosh: require('@/assets/sounds/whoosh.wav'),
      celebration: require('@/assets/sounds/celebration.wav'),
      scratch: require('@/assets/sounds/scratch.wav'),
      reveal: require('@/assets/sounds/reveal.wav'),
    };

    for (const [key, source] of Object.entries(sounds)) {
      const { sound } = await Audio.Sound.createAsync(source);
      soundObjects[key] = sound;
    }
    initialized = true;
  } catch (e) {
    console.warn('Audio init failed:', e);
  }
}

async function play(name: string) {
  try {
    if (!initialized) await init();
    const sound = soundObjects[name];
    if (sound) {
      await sound.replayAsync();
    }
  } catch {
    // Silent fail
  }
}

export function playPop() { play('pop'); }
export function playWhoosh() { play('whoosh'); }
export function playCelebration() { play('celebration'); }
export function playScratch() { play('scratch'); }
export function playReveal() { play('reveal'); }
export function unlockAudio() { init(); }
