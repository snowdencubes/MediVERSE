'use client';

import React, { useState, useRef } from 'react';
import { useGesture } from '@/contexts/GestureContext';

interface PatientIdentityProps {
  name: string;
  phone: string;
  onChange: (field: 'name' | 'phone', value: string) => void;
}

export const PatientIdentity: React.FC<PatientIdentityProps> = ({ name, phone, onChange }) => {
  const { enabled: gestureEnabled } = useGesture();
  const [listeningField, setListeningField] = useState<'name' | 'phone' | null>(null);
  const recognitionRef = useRef<any>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', fontSize: 20, fontWeight: 700,
    color: 'var(--text-primary)', outline: 'none', border: 'none',
    fontFamily: "'Space Grotesk', sans-serif", flex: 1
  };

  const fieldWrap: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    padding: '20px 24px', marginBottom: 16
  };

  const micBtnStyle = (isActive: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: '50%',
    background: isActive ? 'rgba(255, 45, 85, 0.2)' : 'var(--bg-card)',
    border: `2px solid ${isActive ? '#ff2d55' : 'var(--border-color)'}`,
    color: isActive ? '#ff2d55' : 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.3s',
    boxShadow: isActive ? '0 0 16px rgba(255,45,85,0.4)' : 'none',
    animation: isActive ? 'pulse 1.5s infinite' : 'none'
  });

  const startVoiceInput = (field: 'name' | 'phone') => {
    if (listeningField === field) {
      // Stop listening
      if (recognitionRef.current) recognitionRef.current.stop();
      setListeningField(null);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;
    setListeningField(field);

    recognition.onresult = (event: any) => {
      const spoken = event.results[0][0].transcript;

      if (field === 'name') {
        // Parse spelled letters: "A B C space D E F" -> "ABC DEF"
        // Say "delete" or "backspace" to remove last char, "clear" to wipe
        const parts = spoken.split(/\s+/);
        let current = name;
        for (const part of parts) {
          const lower = part.toLowerCase();
          if (lower === 'space') {
            current += ' ';
          } else if (lower === 'delete' || lower === 'backspace') {
            current = current.slice(0, -1);
          } else if (lower === 'clear') {
            current = '';
          } else if (part.length === 1 && /[a-zA-Z]/.test(part)) {
            current += part.toUpperCase();
          } else {
            // Could be a full word spoken naturally — append it
            current += part;
          }
        }
        onChange('name', current);
      } else {
        // Parse spoken digits: "9 8 7 6 5 4 3 2 1 0" -> "9876543210"
        // Say "delete" or "backspace" to remove last digit, "clear" to wipe
        const parts = spoken.split(/\s+/);
        let current = phone;
        for (const part of parts) {
          const lower = part.toLowerCase();
          if (lower === 'delete' || lower === 'backspace') {
            current = current.slice(0, -1);
          } else if (lower === 'clear') {
            current = '';
          } else {
            const digits = part.replace(/\D/g, '');
            current += digits;
          }
        }
        onChange('phone', current);
      }
      setListeningField(null);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setListeningField(null);
    };

    recognition.onend = () => {
      setListeningField(null);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setListeningField(null);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: 32
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
      `}} />

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--text-primary)', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: 24, color: 'var(--bg-main)' }}>{'\u25C8'}</span>
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: 'var(--text-primary)', letterSpacing: '.06em' }}>PATIENT DETAILS</h2>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
          Please enter your information to begin check-in.
        </p>
      </div>

      {/* Name Field */}
      <div style={fieldWrap}>
        <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#ff2d55', display: 'block', marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>Full Name</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input 
            type="text" 
            placeholder="e.g. Jane Doe"
            value={name} 
            onChange={e => onChange('name', e.target.value)} 
            style={inputStyle} 
          />
          <button 
            onClick={() => startVoiceInput('name')}
            style={micBtnStyle(listeningField === 'name')}
            title="Speak letters: A B C space D E F"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"></rect>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
              <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
          </button>
        </div>
        {listeningField === 'name' && (
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#ff2d55', marginTop: 8, letterSpacing: '.05em' }}>
            Listening... Spell: "A B C space D E F"
          </p>
        )}
        {gestureEnabled && listeningField !== 'name' && (
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '.03em' }}>
            &#9654; Tap mic and spell letters. Say "space" between words. Say "delete" to erase last letter, "clear" to reset.
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div style={fieldWrap}>
        <label style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#ff2d55', display: 'block', marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>Phone Number</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input 
            type="tel" 
            placeholder="10-digit mobile number"
            value={phone} 
            onChange={e => onChange('phone', e.target.value)} 
            style={inputStyle} 
          />
          <button 
            onClick={() => startVoiceInput('phone')}
            style={micBtnStyle(listeningField === 'phone')}
            title="Speak digits: 9 8 7 6 5 4 3 2 1 0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"></rect>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
              <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
          </button>
        </div>
        {listeningField === 'phone' && (
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#ff2d55', marginTop: 8, letterSpacing: '.05em' }}>
            Listening... Say digits: "9 8 7 6 5 4 3 2 1 0"
          </p>
        )}
        {gestureEnabled && listeningField !== 'phone' && (
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: 'var(--text-muted)', marginTop: 6, letterSpacing: '.03em' }}>
            &#9654; Tap mic and say each digit. Say "delete" to erase last digit, "clear" to reset.
          </p>
        )}
      </div>
      
      <div style={{
        marginTop: 24, padding: 16, border: '1px dashed rgba(255,45,85,.3)', 
        background: 'rgba(255,45,85,.05)', textAlign: 'center', cursor: 'pointer'
      }}>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#ff2d55', fontWeight: 700, letterSpacing: '.05em' }}>
          SCAN ABHA CARD (OPTIONAL)
        </p>
      </div>
    </div>
  );
};
