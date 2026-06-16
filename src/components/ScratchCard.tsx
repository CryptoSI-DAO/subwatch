/**
 * ScratchCard — NATIVE (iOS / Android)
 * Tap-to-reveal with shake + fade animation.
 * Web version (canvas scratching) lives in ScratchCard.web.tsx.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { playScratch, playReveal } from '@/src/lib/sounds';
import { miniPop } from '@/src/lib/confetti';

export function ScratchCard({
  revealed,
  onReveal,
  height = 140,
  children,
}: {
  revealed: boolean;
  onReveal: () => void;
  height?: number;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const shaking = useRef(false);

  const handleTap = () => {
    if (revealed || shaking.current) return;
    shaking.current = true;
    playScratch();

    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.97, duration: 50, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      playReveal();
      miniPop();
      onReveal();
    });
  };

  return (
    <View style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      {children}

      {!revealed && (
        <Animated.View
          style={[
            styles.foil,
            {
              height,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Pressable onPress={handleTap} style={StyleSheet.absoluteFill}>
            <View style={styles.foilContent}>
              <Text style={styles.foilIcon}>🎟️</Text>
              <Text style={styles.foilLabel}>TAP TO REVEAL</Text>
              <Text style={styles.foilHint}>✨ Surprise deal inside! ✨</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  foil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#C0C0C0',
  },
  foilContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  foilIcon: {
    fontSize: 32,
  },
  foilLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.4)',
    letterSpacing: 1.5,
  },
  foilHint: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.25)',
  },
});
