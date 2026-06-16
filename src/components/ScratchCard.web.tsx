/**
 * ScratchCard — WEB
 * Real HTML5 canvas scratching — drag to erase metallic foil.
 * Metro auto-selects this for web builds.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasRevealed = useRef(false);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [width, setWidth] = useState(300);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  // Draw the metallic foil overlay
  useEffect(() => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(0.3, '#E8E8E8');
    gradient.addColorStop(0.5, '#F5F5F5');
    gradient.addColorStop(0.7, '#D0D0D0');
    gradient.addColorStop(1, '#A8A8A8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'destination-out';
  }, [width, height, revealed]);

  const doScratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
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
  }, []);

  const checkProgress = useCallback(() => {
    if (hasRevealed.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    const sampleSize = 50;
    const step = Math.floor(data.length / 4 / sampleSize) * 4;
    for (let i = 3; i < data.length; i += step) {
      if (data[i] < 50) transparent++;
    }
    if (transparent / sampleSize > 0.45) {
      hasRevealed.current = true;
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
    doScratch(e.clientX, e.clientY);
    if (!checkInterval.current) {
      checkInterval.current = setInterval(checkProgress, 200);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || revealed || hasRevealed.current) return;
    doScratch(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  return (
    <View onLayout={onLayout} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      {children}

      {!revealed && (
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'absolute' as any,
            top: 0,
            left: 0,
            width: '100%',
            height: height,
            zIndex: 10,
            cursor: 'grab',
            touchAction: 'none',
            borderRadius: 14,
          }}
        />
      )}
    </View>
  );
}
