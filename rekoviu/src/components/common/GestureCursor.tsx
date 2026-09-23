'use client';

import React from 'react';
import { useGesture } from '@/contexts/GestureContext';

export function GestureCursor() {
  const { enabled, pointerPos, isPinching, status } = useGesture();

  if (!enabled || status === 'off') return null;

  // --- Status Banner ---
  const showBanner = status === 'loading' || status === 'no_face' || status === 'face_detected';
  const bannerMap: Record<string, { text: string; color: string }> = {
    loading:       { text: '[ ] Loading camera + AI models...', color: 'var(--text-secondary)' },
    no_face:       { text: '[!] Face not detected -- Show your face to the camera to enable hand tracking / कैमरे के सामने आएं', color: '#D91636' },
    face_detected: { text: '[*] Face detected -- Now show your hand / अब हाथ दिखाएं', color: '#2d9bff' },
  };

  const bannerInfo = bannerMap[status];

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes gesture_pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes cursor_ring { 0%{box-shadow:0 0 0 0 rgba(255,45,85,0.6)} 70%{box-shadow:0 0 0 12px rgba(255,45,85,0)} 100%{box-shadow:0 0 0 0 rgba(255,45,85,0)} }
      `}} />

      {/* Status Banner */}
      {showBanner && bannerInfo && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999998,
          background: 'rgba(0,0,0,0.9)',
          color: bannerInfo.color,
          padding: '14px 28px',
          borderRadius: 12,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 'clamp(15px, 1.6vw, 19px)',
          fontWeight: 600,
          letterSpacing: '.03em',
          border: `1px solid ${bannerInfo.color}33`,
          backdropFilter: 'blur(12px)',
          animation: status === 'no_face' ? 'gesture_pulse 2s infinite' : 'none',
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '90vw',
          lineHeight: 1.6
        }}>
          {bannerInfo.text}
          {status === 'no_face' && (
            <div style={{ fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', marginTop: 6 }}>
              Gesture mode requires your face to be visible for security and accuracy.
            </div>
          )}
        </div>
      )}

      {/* Gesture Mode Indicator now lives in MediVERSENav */}

      {/* Cursor Dot */}
      {pointerPos && status === 'tracking' && (
        <>
          {/* Outer ring */}
          <div style={{
            position: 'fixed', top: 0, left: 0,
            width: 40, height: 40, borderRadius: '50%',
            border: `2px solid ${isPinching ? '#D91636' : 'rgba(255,45,85,0.4)'}`,
            transform: `translate(${pointerPos.x - 20}px, ${pointerPos.y - 20}px)`,
            transition: 'border-color 0.1s',
            pointerEvents: 'none',
            zIndex: 999999,
            animation: isPinching ? 'cursor_ring 0.6s ease-out' : 'none'
          }} />
          {/* Inner dot */}
          <div style={{
            position: 'fixed', top: 0, left: 0,
            width: isPinching ? 10 : 14, height: isPinching ? 10 : 14,
            borderRadius: '50%',
            backgroundColor: isPinching ? '#fff' : '#D91636',
            transform: `translate(${pointerPos.x - (isPinching ? 5 : 7)}px, ${pointerPos.y - (isPinching ? 5 : 7)}px)`,
            transition: 'width 0.1s, height 0.1s, background-color 0.1s',
            pointerEvents: 'none',
            zIndex: 1000000,
            boxShadow: isPinching
              ? '0 0 16px rgba(255,255,255,0.8)'
              : '0 0 12px rgba(255,45,85,0.6)',
          }} />
        </>
      )}
    </>
  );
}
