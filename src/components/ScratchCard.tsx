/**
 * ScratchCard Component — Cross-Platform Gamification
 * =====================================================
 * 
 * Web:    Real HTML5 canvas scratching — user drags finger/mouse to erase foil
 * Native: Tap-to-reveal with animated peel-away effect
 * 
 * Props:
 *   - revealed: boolean (controlled — is this card already revealed?)
 *   - onReveal: () => void (fired once when fully scratched/tapped)
 *   - height: number (card height in px)
 *   - children: the content shown underneath the foil
 *   - foilColor: optional override for the foil gradient
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { playScratch, playReveal } from '@/src/lib/sounds';
import { miniPop } from '@/src/lib/confetti';

// ============================================================
// WEB: Canvas-based real scratch effect
// ============================================================

function WebScratchOverlay({
  revealed,
  onReveal,
  height,
  width,
}: {
  revealed: boolean;
  onReveal: () => void;
  height: number;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasRevealed = useRef(false);
  const checkInterval = useRef<number | null>(null);

  // Draw the foil
  useEffect(() => {
    if (revealed) return; // don't draw foil if already revealed
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Metallic gradient foil
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(0.3, '#E8E8E8');
    gradient.addColorStop(0.5, '#F5F5F5');
    gradient.addColorStop(0.7, '#D0D0D0');
    gradient.addColorStop(1, '#A8A8A8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sparkle dots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'destination-out';
  }, [width, height, revealed]);

  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const px = x - rect.left;
      const py = y - rect.top;

      ctx.beginPath();
      ctx.arc(px, py, 22, 0, Math.PI * 2);
      ctx.fill();

      if (lastPos.current) {
        ctx.beginPath();
        ctx.lineWidth = 44;
        ctx.lineCap = 'round';
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      lastPos.current = { x: px, y: py };
    },
    []
  );

  const checkProgress = useCallback(() => {
    if (hasRevealed.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sample pixels to estimate scratched percentage
    const sampleSize = 50;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const step = Math.floor(data.length / 4 / sampleSize) * 4;
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 50) transparent++;
    }
    const pct = transparent / sampleSize;

    if (pct > 0.45) {
      hasRevealed.current = true;
      // Clear the canvas fully
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      playReveal();
      miniPop();
      onReveal();
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    }
  }, [onReveal]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (revealed || hasRevealed.current) return;
    isDrawing.current = true;
    lastPos.current = null;
    playScratch();
    scratch(e.clientX, e.clientY);
    if (!checkInterval.current) {
      checkInterval.current = window.setInterval(checkProgress, 200);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || revealed || hasRevealed.current) return;
    scratch(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  if (revealed) return null;

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: height,
        zIndex: 10,
        cursor: 'grab',
        touchAction: 'none',
        borderRadius: 14,
      }}
    >
      <div style={styles.foilText}>🎟️ SCRATCH TO REVEAL</div>
    </canvas>
  );
}

// ============================================================
// NATIVE: Tap-to-reveal with peel animation
// ============================================================

function NativeScratchOverlay({
  revealed,
  onReveal,
  height,
}: {
  revealed: boolean;
  onReveal: () => void;
  height: number;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const shaking = useRef(false);

  const handleTap = () => {
    if (revealed || shaking.current) return;
    shaking.current = true;
    playScratch();

    // Shake wobble animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.05, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.97, duration: 50, useNativeDriver: true }),
      // Fade out
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      playReveal();
      miniPop();
      onReveal();
    });
  };

  if (revealed) return null;

  return (
    <Animated.View
      style={[
        styles.nativeFoil,
        {
          height: height,
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
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

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
  const [dimensions, setDimensions] = useState({ width: 300, height });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w } = e.nativeEvent.layout;
    setDimensions({ width: w, height });
  };

  return (
    <View onLayout={onLayout} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      {/* Content underneath the foil */}
      {children}

      {/* Foil overlay */}
      {Platform.OS === 'web' ? (
        <WebScratchOverlay
          revealed={revealed}
          onReveal={onReveal}
          height={height}
          width={dimensions.width}
        />
      ) : (
        <NativeScratchOverlay revealed={revealed} onReveal={onReveal} height={height} />
      )}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  foilText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'rgba(0,0,0,0.3)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    userSelect: 'none',
  } as any,
  nativeFoil: {
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
