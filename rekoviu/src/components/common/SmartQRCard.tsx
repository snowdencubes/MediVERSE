'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040/api/v1';
const SESSION_DURATION = 30; // seconds

interface SessionData {
  session_id: string;
  expires_at: string;
  status?: string;
  patient_name?: string;
  patient_phone?: string;
  department_id?: string;
}

export function SmartQRCard() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [qrUrl, setQrUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const createSession = useCallback(async () => {
    setLoading(true);
    setSubmitted(false);
    try {
      const res = await fetch(`${API_URL}/sessions/create`, { method: 'POST' });
      const data = await res.json();
      setSession(data);
      setTimeLeft(SESSION_DURATION);
      // Build full URL so phone can open it
      const base = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : '';
      setQrUrl(`${base}${data.qr_url_path}`);
    } catch (e) {
      console.error('Failed to create session', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  // Countdown timer — auto-refresh session at 0
  useEffect(() => {
    if (!session || submitted) return;
    const tick = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          createSession();
          return SESSION_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [session, submitted, createSession]);

  // Poll backend for form submission
  useEffect(() => {
    if (!session || submitted) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/sessions/${session.session_id}`);
        const data = await res.json();
        if (data.status === 'SUBMITTED') {
          setSession(prev => ({ ...prev!, ...data }));
          setSubmitted(true);
        }
      } catch (e) {
        // silently ignore polling errors
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [session, submitted]);

  const urgency = timeLeft <= 8;
  const almostDone = timeLeft <= 15;

  if (loading) {
    return (
      <div style={{
        width: '90%', background: 'var(--bg-card)', border: '1px solid rgba(217,22,54,0.3)',
        borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', zIndex: 5, marginBottom: -32, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        justifyContent: 'center', minHeight: 84
      }}>
        <span style={{ fontFamily: "'Space Grotesk'", color: '#666', fontSize: 13 }}>Generating secure QR…</span>
      </div>
    );
  }

  // Success state — patient submitted form
  if (submitted && session) {
    return (
      <div style={{
        width: '90%', background: 'rgba(48,209,88,0.08)', border: '1px solid #30d158',
        borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', zIndex: 5, marginBottom: -32,
        boxShadow: '0 8px 32px rgba(48,209,88,0.2)',
        animation: 'slideInUp 0.4s ease'
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#30d158',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color: '#fff', flexShrink: 0, boxShadow: '0 0 20px rgba(48,209,88,0.5)'
        }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, color: '#30d158', letterSpacing: '.05em' }}>
            PATIENT READY
          </div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: '#fff', fontWeight: 700 }}>
            {session.patient_name}
          </div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#999', marginTop: 2 }}>
            {session.patient_phone} · {session.department_id || 'Dept TBD'}
          </div>
        </div>
        <button
          onClick={createSession}
          style={{
            background: 'none', border: '1px solid #30d158', color: '#30d158',
            padding: '4px 10px', borderRadius: 6, fontFamily: "'Space Grotesk'",
            fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '.05em'
          }}
        >
          NEW
        </button>
      </div>
    );
  }

  return (
    <div style={{
      width: '90%', background: 'var(--bg-card)',
      border: `1px solid ${urgency ? 'rgba(217,22,54,0.8)' : 'rgba(217,22,54,0.35)'}`,
      borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 14,
      position: 'relative', zIndex: 5, marginBottom: -32,
      boxShadow: urgency ? '0 8px 24px rgba(217,22,54,0.3)' : '0 8px 24px rgba(0,0,0,0.5)',
      transition: 'border-color 0.3s, box-shadow 0.3s'
    }}>
      {/* QR Code */}
      <div style={{
        background: '#fff', padding: 5, borderRadius: 8, flexShrink: 0,
        position: 'relative', overflow: 'hidden'
      }}>
        <QRCodeSVG value={qrUrl || 'loading'} size={62} />
        {/* Countdown overlay when urgent */}
        {urgency && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(217,22,54,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeInOut 0.5s ease'
          }}>
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: '#fff', lineHeight: 1 }}>
              {timeLeft}
            </span>
          </div>
        )}
      </div>

      {/* Text Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: '.05em',
          color: urgency ? '#D91636' : '#fff',
          transition: 'color 0.3s'
        }}>
          SCAN TO REGISTER
        </div>
        <p style={{
          fontFamily: "'Space Grotesk'", color: 'var(--text-secondary)',
          fontSize: 10, margin: '2px 0 6px', lineHeight: 1.3
        }}>
          Fill your form &amp; upload documents from your phone
        </p>

        {/* Progress Bar */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${(timeLeft / SESSION_DURATION) * 100}%`,
            background: urgency ? '#D91636' : almostDone ? '#FF9800' : '#30d158',
            transition: 'width 1s linear, background 0.5s ease',
            borderRadius: 2
          }} />
        </div>
        <div style={{
          fontFamily: "'Space Grotesk'", fontSize: 9, color: urgency ? '#D91636' : '#555',
          marginTop: 3, transition: 'color 0.3s'
        }}>
          {urgency ? `⚠ Refreshing in ${timeLeft}s` : `New QR in ${timeLeft}s`}
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={createSession}
        title="Generate new QR now"
        style={{
          background: 'none', border: 'none', color: '#555', cursor: 'pointer',
          fontSize: 16, padding: 4, flexShrink: 0, transition: 'color 0.2s'
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#D91636')}
        onMouseLeave={e => (e.currentTarget.style.color = '#555')}
      >
        ↻
      </button>
    </div>
  );
}
