'use client';

import React from 'react';
import { useGesture } from '@/contexts/GestureContext';

export function GestureCursor() {
  const { enabled, pointerPos, isPinching } = useGesture();

  if (!enabled || !pointerPos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor: isPinching ? 'rgba(255, 45, 85, 0.9)' : 'transparent',
        border: `3px solid ${isPinching ? 'rgba(255, 45, 85, 0)' : 'rgba(255, 45, 85, 0.9)'}`,
        transform: `translate(${pointerPos.x - 16}px, ${pointerPos.y - 16}px) scale(${isPinching ? 0.8 : 1})`,
        transition: 'background-color 0.1s, border 0.1s, transform 0.05s ease-out',
        pointerEvents: 'none',
        zIndex: 999999, // Ensure it's on top of everything
        boxShadow: isPinching ? '0 0 15px rgba(255,45,85,0.8)' : 'none',
      }}
    />
  );
}
