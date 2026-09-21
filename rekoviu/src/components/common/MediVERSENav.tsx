'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';
import { useCurrency, Currency } from '@/contexts/CurrencyContext';

const NAV_ITEMS = [
  { href: '/', label: 'Home', symbol: '⌂' },
  { href: '/kiosk', label: 'Kiosk', symbol: '◈' },
  { href: '/queue-board', label: 'Queue', symbol: '◉' },
  { href: '/doctor-desk', label: 'Desk', symbol: '◍' },
  { href: '/receptionist', label: 'Receptionist', symbol: '▣' },
  { href: '/history', label: 'History', symbol: '▶' },
];

export function MediVERSENav({ currentModule }: { currentModule: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Global contexts
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled, status: gestureStatus } = useGesture();

  const [theme, setTheme] = useState('DARK');
  const [hfToken, setHfToken] = useState('');
  const [hfStatus, setHfStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'empty'>('idle');
  const [hfUsername, setHfUsername] = useState<string>('');
  const verifyTimerRef = useRef<any>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const checkHfToken = (tokenToTest: string) => {
    const trimmed = (tokenToTest || '').trim();
    if (!trimmed) {
      setHfStatus('empty');
      setHfUsername('');
      return;
    }
    setHfStatus('checking');
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
    fetch(`${apiUrl}/settings/hf_token/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: trimmed })
    })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'valid') {
          setHfStatus('valid');
          setHfUsername(d.username || '');
        } else if (d.status === 'invalid') {
          setHfStatus('invalid');
          setHfUsername('');
        } else {
          setHfStatus('invalid');
          setHfUsername('');
        }
      })
      .catch(() => {
        setHfStatus('invalid');
      });
  };

  // Load HF token and run initial verification
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;

    fetch(`${apiUrl}/settings/hf_token`)
      .then(r => r.json())
      .then(d => {
        if (d.token) {
          setHfToken(d.token);
          checkHfToken(d.token);
        } else {
          setHfStatus('empty');
        }
      })
      .catch(() => {
        setHfStatus('empty');
      });
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('MediVERSE_theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.classList.toggle('light-mode', savedTheme === 'LIGHT');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'DARK' ? 'LIGHT' : 'DARK';
    setTheme(newTheme);
    localStorage.setItem('MediVERSE_theme', newTheme);
    document.body.classList.toggle('light-mode', newTheme === 'LIGHT');
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency as Currency);
  };

  const handleHfTokenChange = (newToken: string) => {
    setHfToken(newToken);
    setHfStatus('checking');

    // Debounce save & verify
    if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    verifyTimerRef.current = setTimeout(() => {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
      fetch(`${apiUrl}/settings/hf_token`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken })
      }).catch(() => {});

      checkHfToken(newToken);
    }, 400);
  };

  const isLight = theme === 'LIGHT';
  const overlayBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const textColor = 'var(--text-primary)';
  const mutedColor = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  return (
    <>
      <nav className={`MediVERSE-nav ${scrolled ? 'scrolled' : ''}`} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="MediVERSE-logo" onClick={() => setMobileOpen(false)}>MediVERSE</Link>

        {/* Navbar-Centered Burger Menu Button */}
        <button 
          onClick={() => { setMobileOpen(!mobileOpen); setSettingsOpen(false); }}
          style={{
            position: 'relative', zIndex: 10000,
            background: 'rgba(255,45,85,0.9)', border: '1px solid rgba(255,255,255,0.2)', 
            color: '#fff', fontSize: 'clamp(20px, 2vw, 24px)', cursor: 'pointer',
            width: 44, height: 44, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(255,45,85,0.4)',
            backdropFilter: 'blur(8px)',
            transition: 'transform 0.2s ease-out',
            transform: mobileOpen ? 'rotate(90deg)' : 'rotate(0deg)'
          }}
        >
          {mobileOpen ? '\u2715' : '\u2630'}
        </button>

        {/* Right Side Status Container */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 100, justifyContent: 'flex-end' }}>
          {gestureEnabled && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,0,0,0.5)', padding: '4px 14px',
              borderRadius: 20, border: '1px solid rgba(255,45,85,0.2)'
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: gestureStatus === 'tracking' ? '#00e676' : gestureStatus === 'face_detected' ? '#2d9bff' : '#D91636',
                boxShadow: gestureStatus === 'tracking' ? '0 0 6px #00e676' : 'none'
              }} />
              <span style={{
                fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', fontWeight: 600,
                color: gestureStatus === 'tracking' ? '#00e676' : gestureStatus === 'face_detected' ? '#2d9bff' : 'var(--text-secondary)',
                letterSpacing: '.04em'
              }}>
                {gestureStatus === 'tracking' ? 'TRACKING' :
                 gestureStatus === 'face_detected' ? 'SHOW HAND' :
                 gestureStatus === 'no_face' ? 'NO FACE' :
                 gestureStatus === 'loading' ? 'LOADING...' : 'GESTURE'}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Fullscreen Overlay Menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: overlayBg, zIndex: 9998,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '100px 24px 40px 24px', backdropFilter: 'blur(16px)', overflowY: 'auto', pointerEvents: 'auto'
        }}>
          {/* Side-by-Side Content Container */}
          <div style={{
            display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 40,
            width: '100%', maxWidth: 900, justifyContent: 'center', alignItems: 'flex-start'
          }}>
            {/* LEFT COLUMN: Navigation Options */}
            <div style={{ flex: '1 1 320px', maxWidth: 420 }}>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.12em', color: '#D91636',
                marginBottom: 16, borderBottom: `1px solid ${borderColor}`, paddingBottom: 8, textTransform: 'uppercase'
              }}>
                Navigation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {NAV_ITEMS.map(item => {
                  const isItemActive = item.href === '/'
                    ? (currentModule === '' || currentModule === 'home')
                    : currentModule === item.href.slice(1);
                  return (
                    <Link 
                      key={item.href}
                      href={item.href} 
                      onClick={() => setMobileOpen(false)}
                      style={{ 
                        background: isItemActive ? 'rgba(217,22,54,0.18)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isItemActive ? '#D91636' : borderColor}`,
                        padding: '16px 12px', borderRadius: 12, textDecoration: 'none',
                        color: isItemActive ? '#D91636' : textColor,
                        fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.08em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'all 0.2s', textAlign: 'center'
                      }}
                    >
                      <span>{item.symbol}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: Settings & Configuration */}
            <div style={{
              flex: '1 1 340px', maxWidth: 420, background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24
            }}>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.12em', color: '#D91636',
                marginBottom: 20, borderBottom: `1px solid ${borderColor}`, paddingBottom: 8, textTransform: 'uppercase'
              }}>
                Settings & Configuration
              </div>

              {/* Theme */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Theme</span>
                <button 
                  onClick={handleThemeToggle}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 12px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                >
                  {theme}
                </button>
              </div>

              {/* Language */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Language</span>
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 8px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="EN">EN - English</option>
                  <option value="HI">HI - Hindi</option>
                  <option value="ES">ES - Spanish</option>
                  <option value="FR">FR - French</option>
                </select>
              </div>

              {/* Currency */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Currency</span>
                <select 
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 8px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="INR">INR (&#8377; - Rupees)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (&euro;)</option>
                  <option value="GBP">GBP (&pound;)</option>
                  <option value="JPY">JPY (&yen;)</option>
                </select>
              </div>

              {/* HF API Token (with Live Health Indicator: Green / Yellow / Red) */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: textColor, fontWeight: 600 }}>HF API Token</span>
                  
                  {/* Status Indicator Pill */}
                  {hfStatus === 'valid' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,230,118,0.15)', border: '1px solid #00e676', color: '#00e676', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, fontFamily: "'Space Grotesk'" }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 6px #00e676' }} />
                      CONNECTED {hfUsername ? `(${hfUsername})` : ''}
                    </span>
                  )}
                  {hfStatus === 'checking' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,193,7,0.15)', border: '1px solid #ffc107', color: '#ffc107', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, fontFamily: "'Space Grotesk'" }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffc107' }} />
                      CHECKING...
                    </span>
                  )}
                  {hfStatus === 'invalid' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(217,22,54,0.15)', border: '1px solid #D91636', color: '#ff4757', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, fontFamily: "'Space Grotesk'" }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D91636', boxShadow: '0 0 6px #D91636' }} />
                      INVALID / ERROR
                    </span>
                  )}
                  {hfStatus === 'empty' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: `1px solid ${borderColor}`, color: mutedColor, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, fontFamily: "'Space Grotesk'" }}>
                      NO TOKEN
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input 
                    type="text"
                    value={hfToken}
                    onChange={(e) => handleHfTokenChange(e.target.value)}
                    placeholder="hf_..."
                    style={{ 
                      flex: 1,
                      background: 'var(--bg-main)', 
                      border: `1px solid ${hfStatus === 'valid' ? 'rgba(0,230,118,0.6)' : hfStatus === 'invalid' ? 'rgba(217,22,54,0.6)' : borderColor}`, 
                      color: '#D91636', padding: '6px 10px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, outline: 'none' 
                    }}
                  />
                  <button
                    onClick={() => checkHfToken(hfToken)}
                    title="Test Token with Hugging Face API"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                      borderRadius: 4,
                      padding: '0 10px',
                      fontSize: 12,
                      fontFamily: "'Space Grotesk'",
                      cursor: 'pointer'
                    }}
                  >
                    Test
                  </button>
                </div>
              </div>

              {/* Gestures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Gestures</span>
                <button 
                  onClick={() => { setGestureEnabled(!gestureEnabled); }}
                  style={{ 
                    background: gestureEnabled ? 'rgba(217,22,54,0.15)' : 'none', 
                    border: `1px solid ${gestureEnabled ? '#D91636' : borderColor}`, 
                    color: gestureEnabled ? '#D91636' : mutedColor, 
                    padding: '4px 12px', fontSize: 13, fontFamily: "'Space Grotesk'", 
                    borderRadius: 4, cursor: 'pointer', fontWeight: 600 
                  }}
                >
                  {gestureEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
