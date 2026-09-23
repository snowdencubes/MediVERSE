'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';

const NAV_ITEMS = [
  { href: '/kiosk', label: 'Kiosk', symbol: '\u25C8' },
  { href: '/queue-board', label: 'Queue', symbol: '\u25C9' },
  { href: '/doctor-desk', label: 'Desk', symbol: '\u25CE' },
  { href: '/receptionist', label: 'Receptionist', symbol: '\u25A3' },
  { href: '/history', label: 'History', symbol: '\u25B6' },
];

export function RekovNav({ currentModule }: { currentModule: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Use the global LanguageContext instead of local state
  const { lang, setLang } = useLanguage();
  
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled, status: gestureStatus } = useGesture();
  const [theme, setTheme] = useState('DARK');
  const [currency, setCurrency] = useState('INR');
  const [hfToken, setHfToken] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load currency from localStorage on mount, then try backend
  useEffect(() => {
    const savedCurrency = localStorage.getItem('rekov_currency');
    if (savedCurrency) setCurrency(savedCurrency);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4040/api/v1`;
    fetch(`${apiUrl}/settings/currency`)
      .then(r => r.json())
      .then(d => {
        if (d.currency) {
          setCurrency(d.currency);
          localStorage.setItem('rekov_currency', d.currency);
        }
      })
      .catch(() => {});

    fetch(`${apiUrl}/settings/hf_token`)
      .then(r => r.json())
      .then(d => {
        if (d.token) {
          setHfToken(d.token);
        }
      })
      .catch(() => {});
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('rekov_theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.classList.toggle('light-mode', savedTheme === 'LIGHT');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'DARK' ? 'LIGHT' : 'DARK';
    setTheme(newTheme);
    localStorage.setItem('rekov_theme', newTheme);
    document.body.classList.toggle('light-mode', newTheme === 'LIGHT');
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    localStorage.setItem('rekov_currency', newCurrency);
    // Also persist to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:4040/api/v1`;
    fetch(`${apiUrl}/settings/currency`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency })
    }).catch(() => {});
  };

  const handleHfTokenChange = (newToken: string) => {
    setHfToken(newToken);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:4040/api/v1`;
    fetch(`${apiUrl}/settings/hf_token`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: newToken })
    }).catch(() => {});
  };

  const isLight = theme === 'LIGHT';
  const overlayBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const textColor = 'var(--text-primary)';
  const mutedColor = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  return (
    <>
      <nav className={`rekov-nav ${scrolled ? 'scrolled' : ''}`} style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="rekov-logo" onClick={() => setMobileOpen(false)}>REKOV</Link>

        {/* Navbar-Centered Burger Menu Button */}
        <button 
          onClick={() => { setMobileOpen(!mobileOpen); setSettingsOpen(false); }}
          style={{
            position: 'relative', zIndex: 10000,
            background: 'rgba(255,45,85,0.9)', border: '1px solid rgba(255,255,255,0.2)', 
            color: '#fff', fontSize: 20, cursor: 'pointer',
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
                background: gestureStatus === 'tracking' ? '#00e676' : gestureStatus === 'face_detected' ? '#2d9bff' : '#ff2d55',
                boxShadow: gestureStatus === 'tracking' ? '0 0 6px #00e676' : 'none'
              }} />
              <span style={{
                fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 600,
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
                fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.12em', color: '#ff2d55',
                marginBottom: 16, borderBottom: `1px solid ${borderColor}`, paddingBottom: 8, textTransform: 'uppercase'
              }}>
                Navigation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {NAV_ITEMS.map(item => (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    onClick={() => setMobileOpen(false)}
                    style={{ 
                      background: currentModule === item.href.slice(1) ? 'rgba(255,45,85,0.18)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${currentModule === item.href.slice(1) ? '#ff2d55' : borderColor}`,
                      padding: '16px 12px', borderRadius: 12, textDecoration: 'none',
                      color: currentModule === item.href.slice(1) ? '#ff2d55' : textColor,
                      fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.08em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'all 0.2s', textAlign: 'center'
                    }}
                  >
                    <span>{item.symbol}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN: Settings & Configuration */}
            <div style={{
              flex: '1 1 340px', maxWidth: 420, background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24
            }}>
              <div style={{
                fontFamily: "'Bebas Neue'", fontSize: 24, letterSpacing: '.12em', color: '#ff2d55',
                marginBottom: 20, borderBottom: `1px solid ${borderColor}`, paddingBottom: 8, textTransform: 'uppercase'
              }}>
                Settings & Configuration
              </div>

              {/* Theme */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Theme</span>
                <button 
                  onClick={handleThemeToggle}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 12px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
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
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 8px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
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
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 8px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (&#8377;)</option>
                  <option value="EUR">EUR (&euro;)</option>
                  <option value="GBP">GBP (&pound;)</option>
                  <option value="JPY">JPY (&yen;)</option>
                </select>
              </div>

              {/* HF API Token (Visible plain text) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: textColor, fontWeight: 600 }}>HF API Token</span>
                <input 
                  type="text"
                  value={hfToken}
                  onChange={(e) => handleHfTokenChange(e.target.value)}
                  placeholder="hf_..."
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '6px 10px', fontSize: 13, fontFamily: "'Space Grotesk'", borderRadius: 4, outline: 'none', width: '160px' }}
                />
              </div>

              {/* Gestures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, color: textColor }}>Gestures</span>
                <button 
                  onClick={() => { setGestureEnabled(!gestureEnabled); }}
                  style={{ 
                    background: gestureEnabled ? 'rgba(255,45,85,0.15)' : 'none', 
                    border: `1px solid ${gestureEnabled ? '#ff2d55' : borderColor}`, 
                    color: gestureEnabled ? '#ff2d55' : mutedColor, 
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
