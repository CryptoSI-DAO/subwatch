/**
 * SubWatch Celebration Engine — Cross-Platform
 * ==============================================
 * Web:    canvas-confetti (GPU-accelerated DOM particles)
 * Native: expo-haptics (haptic feedback — the native equivalent of "reward feedback")
 */

import { Platform } from 'react-native';

// Web-only static import — tree-shaken on native builds
let confettiLib: any = null;
if (Platform.OS === 'web') {
  try {
    confettiLib = require('canvas-confetti').default || require('canvas-confetti');
  } catch {
    confettiLib = null;
  }
}

// Native haptic feedback (lazy loaded)
async function nativeHaptic(
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
) {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = (await import('expo-haptics')).default;
    const impactMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    if (style in impactMap) {
      await Haptics.impactAsync(impactMap[style as keyof typeof impactMap]);
    } else {
      const notifyMap = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      await Haptics.notificationAsync(
        notifyMap[style as keyof typeof notifyMap]
      );
    }
  } catch {
    // Silent fail
  }
}

/** Full confetti burst — offers tab reveals savings. */
export function burstConfetti() {
  if (Platform.OS === 'web' && confettiLib) {
    const colors = ['#007AFF', '#34C759', '#FFD60A', '#FF2D55', '#AF52DE', '#5AC8FA'];
    confettiLib({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors, startVelocity: 45, gravity: 0.8, scalar: 0.9, ticks: 200 });
    setTimeout(() => {
      confettiLib({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, startVelocity: 50 });
      confettiLib({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, startVelocity: 50 });
    }, 200);
    setTimeout(() => {
      confettiLib({ particleCount: 30, spread: 100, origin: { y: 0 }, colors, startVelocity: 25, gravity: 0.5, scalar: 0.7, ticks: 150 });
    }, 400);
  } else {
    nativeHaptic('success');
    setTimeout(() => nativeHaptic('medium'), 150);
    setTimeout(() => nativeHaptic('light'), 300);
  }
}

/** Ticker tape — gentle ambient effect. */
export function tickerTape(durationMs = 1500) {
  if (Platform.OS === 'web' && confettiLib) {
    const colors = ['#007AFF', '#34C759', '#FFD60A', '#FFFFFF'];
    const endTime = Date.now() + durationMs;
    const frame = () => {
      confettiLib({
        particleCount: 3, angle: 90, spread: 120,
        origin: { x: Math.random(), y: -0.1 }, colors,
        startVelocity: 15, gravity: 0.6, scalar: 0.6, ticks: 120,
        disableForReducedMotion: true,
      });
      if (Date.now() < endTime) requestAnimationFrame(frame);
    };
    frame();
  } else {
    nativeHaptic('light');
  }
}

/** Mini pop — tapping an individual offer. */
export function miniPop() {
  if (Platform.OS === 'web' && confettiLib) {
    const colors = ['#34C759', '#007AFF', '#FFD60A'];
    confettiLib({ particleCount: 25, spread: 50, origin: { y: 0.6 }, colors, startVelocity: 30, gravity: 0.7, scalar: 0.7, ticks: 100, disableForReducedMotion: true });
  } else {
    nativeHaptic('light');
  }
}
