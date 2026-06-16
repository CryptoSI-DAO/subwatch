/**
 * SubWatch Celebration Engine — NATIVE (iOS / Android)
 * Uses expo-haptics for tactile feedback.
 * Web version (canvas-confetti) lives in confetti.web.ts.
 */

import * as Haptics from 'expo-haptics';

export function burstConfetti() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}), 150);
  setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 300);
}

export function tickerTape(_durationMs = 1500) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function miniPop() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
