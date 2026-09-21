'use client';

import React from 'react';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { useRouter, usePathname } from 'next/navigation';

export const VoiceCallOverlay: React.FC = () => {
  const { isCallActive, callStatus, isMuted, liveTranscript, toggleCall, toggleMute, interruptAI } = useVoiceCall();
  const router = useRouter();
  const pathname = usePathname();

  // Don't render floating bar if call isn't active
  if (!isCallActive) return null;

  const isAssistantPage = pathname === '/voice-assistant';

  const statusColor = isMuted
    ? '#ff3b30'
    : callStatus === 'AI_SPEAKING'
    ? '#bf5af2'
    : callStatus === 'AI_THINKING'
    ? '#ff9f0a'
    : callStatus === 'USER_SPEAKING'
    ? '#64d2ff'
    : '#30d158'; // LISTENING

  const statusLabel = isMuted
    ? 'MUTED'
    : callStatus === 'AI_SPEAKING'
    ? 'AI SPEAKING...'
    : callStatus === 'AI_THINKING'
    ? 'THINKING...'
    : callStatus === 'USER_SPEAKING'
    ? 'LISTENING...'
    : 'CALL ACTIVE • LISTENING 24/7';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
        pointerEvents: 'none'
      }}
    >
      {/* Real-time caption bubble when user is speaking */}
      {liveTranscript && (
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(15, 15, 20, 0.92)',
            border: '1px solid rgba(100, 210, 255, 0.4)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px rgba(100, 210, 255, 0.2)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            padding: '8px 16px',
            color: '#64d2ff',
            fontSize: '13px',
            fontWeight: 600,
            maxWidth: 340,
            animation: 'fadeInUp 0.2s ease-out'
          }}
        >
          <span style={{ color: 'var(--text-secondary)', marginRight: 6 }}>Word Detected:</span>
          "{liveTranscript}"
        </div>
      )}

      {/* Floating Valorant-Style Voice Call Bar */}
      <div
        style={{
          pointerEvents: 'auto',
          background: 'rgba(10, 10, 15, 0.95)',
          border: `1px solid ${statusColor}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px ${statusColor}44`,
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Pulsing Status Dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
              boxShadow: `0 0 10px ${statusColor}`,
              animation: callStatus === 'USER_SPEAKING' || callStatus === 'AI_SPEAKING' ? 'pulse 1s infinite' : 'none'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '11px',
                fontWeight: 700,
                color: statusColor,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}
            >
              {statusLabel}
            </span>
            <span
              style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontWeight: 500,
                letterSpacing: '0.04em'
              }}
            >
              TAP ANYWHERE TO TALK
            </span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.15)' }} />

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Interrupt Button (if AI speaking) */}
          {callStatus === 'AI_SPEAKING' && (
            <button
              onClick={interruptAI}
              title="Interrupt AI Speech"
              style={{
                background: 'rgba(255, 159, 10, 0.2)',
                border: '1px solid #ff9f0a',
                color: '#ff9f0a',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700
              }}
            >
              HALT
            </button>
          )}

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            style={{
              background: isMuted ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isMuted ? '1px solid #ff3b30' : '1px solid rgba(255, 255, 255, 0.15)',
              color: isMuted ? '#ff3b30' : '#fff',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              transition: 'transform 0.15s ease'
            }}
          >
            {isMuted ? 'OFF' : 'MIC'}
          </button>

          {/* Expand / Full Assistant Page Button */}
          {!isAssistantPage && (
            <button
              onClick={() => router.push('/voice-assistant')}
              title="Open Voice Chat UI"
              style={{
                background: 'rgba(45, 155, 255, 0.2)',
                border: '1px solid #2d9bff',
                color: '#2d9bff',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 700
              }}
            >
              CHAT
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={toggleCall}
            title="End Voice Call"
            style={{
              background: '#ff2d55',
              border: 'none',
              color: '#fff',
              borderRadius: 20,
              padding: '0 12px',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.05em',
              boxShadow: '0 2px 10px rgba(255, 45, 85, 0.4)'
            }}
          >
            <span>END CALL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
