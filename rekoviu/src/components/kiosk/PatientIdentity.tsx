'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useGesture } from '@/contexts/GestureContext';

interface PatientIdentityProps {
  name: string;
  phone: string;
  onChange: (field: 'name' | 'phone', value: string) => void;
}

// ── QWERTY rows ───────────────────────────────────────────────────────────────
const QWERTY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];
const NUMPAD_ROWS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['+','0','⌫'],
];

export const PatientIdentity: React.FC<PatientIdentityProps> = ({ name, phone, onChange }) => {
  const { enabled: gestureEnabled } = useGesture();

  // Which field has the keyboard/mic focus
  const [activeField, setActiveField] = useState<'name' | 'phone' | null>(null);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState('');
  const recognitionRef = useRef<any>(null);

  // ── Voice: continuous keep-alive until field loses focus ──────────────────
  const startVoice = (field: 'name' | 'phone') => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Use Chrome or Edge for voice input.'); return; }
    if (recognitionRef.current) { recognitionRef.current.abort(); }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    recognitionRef.current = rec;
    setListening(true);
    setLiveText('');

    rec.onresult = (e: any) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim = t;
      }
      setLiveText(interim);

      if (finalText) {
        const textToProcess = finalText.trim();
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
        
        fetch(`${apiUrl}/ai/parse_identity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToProcess, field })
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.extracted) {
            onChange(field, data.extracted);
          }
        })
        .catch(err => {
          console.error("Parse identity error:", err);
          // Fallback basic logic
          const words = textToProcess.split(/\s+/);
          if (field === 'name') {
            let cur = name;
            for (const w of words) {
              const low = w.toLowerCase();
              if (low === 'backspace' || low === 'delete') cur = cur.slice(0, -1);
              else if (low === 'clear' || low === 'clear all') cur = '';
              else if (low === 'space') cur += ' ';
              else cur += w.length === 1 ? w.toUpperCase() : w + ' ';
            }
            onChange('name', cur.trimEnd());
          } else {
            let cur = phone;
            for (const w of words) {
              const low = w.toLowerCase();
              if (low === 'backspace' || low === 'delete') cur = cur.slice(0, -1);
              else if (low === 'clear' || low === 'clear all') cur = '';
              else cur += w.replace(/\D/g, '');
            }
            onChange('phone', cur);
          }
        });
        setLiveText('');
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      // Auto restart while field is still active (keeps listening)
      if (recognitionRef.current === rec && activeField === field) {
        try { rec.start(); } catch { setListening(false); }
      } else {
        setListening(false);
      }
    };
    try { rec.start(); } catch { setListening(false); }
  };

  const stopVoice = () => {
    if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
    setListening(false);
    setLiveText('');
  };

  // Stop voice when field changes
  useEffect(() => {
    if (activeField === null) stopVoice();
  }, [activeField]);

  // ── Keyboard key press ────────────────────────────────────────────────────
  const pressKey = (key: string) => {
    if (!activeField) return;
    const cur = activeField === 'name' ? name : phone;
    if (key === '⌫') onChange(activeField, cur.slice(0, -1));
    else if (key === 'SPACE') onChange(activeField, cur + ' ');
    else onChange(activeField, cur + key);
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', fontSize: 'clamp(18px, 2vw, 22px)',
    fontWeight: 700, color: 'var(--text-primary)', outline: 'none', border: 'none',
    fontFamily: "'Space Grotesk', sans-serif", flex: 1
  };
  const fieldWrap: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    padding: '14px 20px', marginBottom: 10, cursor: 'pointer',
    transition: 'border-color 0.2s'
  };
  const fieldWrapActive: React.CSSProperties = {
    ...fieldWrap, borderColor: '#D91636', boxShadow: '0 0 0 2px rgba(217,22,54,0.2)'
  };
  const micBtn = (active: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: '50%',
    background: active ? 'rgba(217,22,54,0.2)' : 'var(--bg-card)',
    border: `2px solid ${active ? '#D91636' : 'var(--border-color)'}`,
    color: active ? '#D91636' : 'var(--text-secondary)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.3s',
    boxShadow: active ? '0 0 16px rgba(255,45,85,0.5)' : 'none',
    animation: active ? 'micPulse 1.2s ease-in-out infinite' : 'none'
  });

  const kbKeyStyle = (wide?: boolean): React.CSSProperties => ({
    minWidth: wide ? 100 : 52, height: 60, borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)',
    color: '#fff', fontSize: 20, fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', userSelect: 'none',
    flexShrink: 0,
  });
  const kbSpecialKey = (color: string): React.CSSProperties => ({
    ...kbKeyStyle(true), background: `rgba(${color},0.18)`,
    border: `1.5px solid rgba(${color},0.5)`,
    color: `rgb(${color})`, fontSize: 16, minWidth: 120,
  });

  const isName = activeField === 'name';

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', width: '100%' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes micPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,22,54,0.6)} 50%{transform:scale(1.1);box-shadow:0 0 0 8px rgba(217,22,54,0)} }
        .kb-key:hover { background: rgba(217,22,54,0.25) !important; border-color: #D91636 !important; transform: scale(1.07); }
        .kb-key:active { transform: scale(0.95); }
      `}} />

      {/* ── LEFT COLUMN: FORM ── */}
      <div style={{ flex: '1 1 50%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '20px 24px', borderRadius: 16 }}>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--text-primary)', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, color: 'var(--bg-main)' }}>{'◈'}</span>
        </div>
        <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: 'var(--text-primary)', letterSpacing: '.06em' }}>PATIENT DETAILS</h2>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px,1.4vw,16px)', color: 'var(--text-secondary)', marginTop: 4 }}>
          Enter your information to begin check-in.
        </p>
      </div>

      {/* ── VOICE COMMAND HELP PANEL (left side, only when listening) ── */}
      {listening && activeField && (
        <div style={{
          position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
          zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10,
          background: 'rgba(10,10,15,0.97)', border: '1px solid rgba(217,22,54,0.4)',
          borderRadius: 16, padding: '18px 14px', minWidth: 160,
          boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
        }}>
          <p style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: '#D91636', letterSpacing: '.1em', margin: '0 0 6px' }}>
            VOICE COMMANDS
          </p>
          {[
            { cmd: 'BACKSPACE', desc: 'Delete last char' },
            { cmd: 'CLEAR ALL', desc: 'Wipe the field' },
            ...(activeField === 'name' ? [
              { cmd: 'A B C...', desc: 'Spell letters' },
              { cmd: 'SPACE', desc: 'Add a space' },
            ] : [
              { cmd: '9 8 7...', desc: 'Say digits' },
            ]),
          ].map(({ cmd, desc }) => (
            <div key={cmd} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8, marginBottom: 2 }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: '#fff', fontWeight: 700 }}>{cmd}</div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: 'var(--text-secondary)' }}>{desc}</div>
            </div>
          ))}
          <button onClick={stopVoice} style={{
            marginTop: 6, padding: '8px 0', borderRadius: 8,
            background: 'rgba(217,22,54,0.2)', border: '1px solid #D91636',
            color: '#D91636', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 13, cursor: 'pointer'
          }}>STOP</button>
        </div>
      )}

      {/* ── Name Field ── */}
      <div
        style={activeField === 'name' ? fieldWrapActive : fieldWrap}
        onClick={() => { setActiveField('name'); }}
      >
        <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px,1.3vw,17px)', color: '#D91636', display: 'block', marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>Full Name</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="text" placeholder="e.g. Jane Doe" value={name}
            onChange={e => onChange('name', e.target.value)}
            onFocus={() => setActiveField('name')}
            style={inputStyle}
          />
          <button
            onClick={e => { e.stopPropagation(); setActiveField('name'); listening && activeField === 'name' ? stopVoice() : startVoice('name'); }}
            style={micBtn(listening && activeField === 'name')}
            title="Tap to start continuous voice — say letters, BACKSPACE, CLEAR ALL"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </button>
        </div>
        {listening && activeField === 'name' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D91636', display: 'inline-block', animation: 'micPulse 1.2s infinite' }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: '#D91636', fontWeight: 700 }}>
              {liveText ? `"${liveText}"` : 'Listening... spell letters or say a name'}
            </span>
          </div>
        )}
      </div>

      {/* ── Phone Field ── */}
      <div
        style={activeField === 'phone' ? fieldWrapActive : fieldWrap}
        onClick={() => { setActiveField('phone'); }}
      >
        <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px,1.3vw,17px)', color: '#D91636', display: 'block', marginBottom: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>Phone Number</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="tel" placeholder="10-digit mobile number" value={phone}
            onChange={e => onChange('phone', e.target.value)}
            onFocus={() => setActiveField('phone')}
            style={inputStyle}
          />
          <button
            onClick={e => { e.stopPropagation(); setActiveField('phone'); listening && activeField === 'phone' ? stopVoice() : startVoice('phone'); }}
            style={micBtn(listening && activeField === 'phone')}
            title="Tap to start voice — say digits, BACKSPACE, CLEAR ALL"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          </button>
        </div>
        {listening && activeField === 'phone' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D91636', display: 'inline-block', animation: 'micPulse 1.2s infinite' }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: '#D91636', fontWeight: 700 }}>
              {liveText ? `"${liveText}"` : 'Listening... say each digit slowly'}
            </span>
          </div>
        )}
      </div>

      {/* ── ABHA Card ── */}
      <div style={{ marginTop: 12, padding: 10, border: '1px dashed rgba(255,45,85,.3)', background: 'rgba(255,45,85,.05)', textAlign: 'center', cursor: 'pointer' }}>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px,1.3vw,16px)', color: '#D91636', fontWeight: 700, letterSpacing: '.05em' }}>
          SCAN ABHA CARD (OPTIONAL)
        </p>
      </div>

      </div>

      {/* ── RIGHT COLUMN: ON-SCREEN KEYBOARD ── */}
      <div style={{
        flex: '1 1 50%', padding: 24,
        background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        animation: 'slideInRight 0.4s ease-out'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        `}} />
          {/* Active field indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, justifyContent: 'center' }}>
            {(['name', 'phone'] as const).map(f => (
              <button key={f} onClick={() => setActiveField(f)} style={{
                padding: '6px 18px', borderRadius: 20,
                background: activeField === f ? '#D91636' : 'rgba(255,255,255,0.07)',
                border: `1.5px solid ${activeField === f ? '#D91636' : 'rgba(255,255,255,0.15)'}`,
                color: '#fff', fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 13,
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.07em'
              }}>
                {f === 'name' ? 'Name' : 'Phone'}
              </button>
            ))}
          </div>

          {/* Preview of current value */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12,
            fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700,
            color: '#fff', minHeight: 44, letterSpacing: '.05em',
            display: 'flex', alignItems: 'center'
          }}>
            {activeField === 'name' ? (name || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Full Name</span>)
              : activeField === 'phone' ? (phone || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Phone Number</span>)
              : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Select a field above</span>}
            <span style={{ width: 2, height: 22, background: '#D91636', display: 'inline-block', marginLeft: 2, animation: 'micPulse 1s infinite' }} />
          </div>

          {/* QWERTY or Numpad */}
          {isName ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', width: '100%', height: 420 }}>
              {QWERTY_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%', flex: 1 }}>
                  {row.map(k => (
                    <button key={k} className="kb-key" onClick={() => pressKey(k)} style={{ ...kbKeyStyle(), flex: 1, height: '100%', fontSize: 28 }}>
                      {k}
                    </button>
                  ))}
                </div>
              ))}
              {/* Bottom row: SPACE, DELETE, CLEAR */}
              <div style={{ display: 'flex', gap: 8, width: '100%', flex: 1 }}>
                <button className="kb-key" onClick={() => pressKey('SPACE')} style={{ ...kbKeyStyle(true), flex: 2, height: '100%', fontSize: 22 }}>SPACE</button>
                <button className="kb-key" onClick={() => pressKey('⌫')} style={{ ...kbSpecialKey('255,100,100'), flex: 1, height: '100%', fontSize: 22 }}>DELETE</button>
                <button className="kb-key" onClick={() => onChange('name', '')} style={{ ...kbSpecialKey('255,50,50'), flex: 1, height: '100%', fontSize: 22 }}>CLEAR</button>
              </div>
            </div>
          ) : (
            // Numpad for phone
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', width: '100%', height: 420 }}>
              {NUMPAD_ROWS.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 12, width: '100%', flex: 1 }}>
                  {row.map(k => (
                    <button key={k} className="kb-key" onClick={() => pressKey(k === '⌫' ? '⌫' : k)}
                      style={{
                        ...kbKeyStyle(), flex: 1, height: '100%', fontSize: 40,
                        ...(k === '⌫' ? { background: 'rgba(255,100,100,0.18)', borderColor: 'rgba(255,100,100,0.5)', color: 'rgb(255,100,100)' } : {})
                      }}>
                      {k}
                    </button>
                  ))}
                </div>
              ))}
              <button className="kb-key" onClick={() => onChange('phone', '')} style={{ ...kbSpecialKey('255,50,50'), flex: 1, width: '100%', height: '100%', fontSize: 28 }}>
                CLEAR ALL
              </button>
            </div>
          )}
        </div>
    </div>
  );
};
