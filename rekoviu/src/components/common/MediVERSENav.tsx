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

export function MediVERSENav({ currentModule }: { currentModule: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Use the global LanguageContext instead of local state
  const { lang, setLang } = useLanguage();
  
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled, status: gestureStatus } = useGesture();
  const [theme, setTheme] = useState('DARK');
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load currency from localStorage on mount, then try backend
  useEffect(() => {
    const savedCurrency = localStorage.getItem('MediVERSE_currency');
    if (savedCurrency) setCurrency(savedCurrency);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000/api/v1`;
    fetch(`${apiUrl}/settings/currency`)
      .then(r => r.json())
      .then(d => {
        if (d.currency) {
          setCurrency(d.currency);
          localStorage.setItem('MediVERSE_currency', d.currency);
        }
      })
      .catch(() => {});
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
    setCurrency(newCurrency);
    localStorage.setItem('MediVERSE_currency', newCurrency);
    // Also persist to backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api/v1`;
    fetch(`${apiUrl}/settings/currency`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: newCurrency })
    }).catch(() => {});
  };

  const isLight = theme === 'LIGHT';
  const overlayBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const textColor = 'var(--text-primary)';
  const mutedColor = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  return (
    <>
      <nav className={`MediVERSE-nav ${scrolled ? 'scrolled' : ''}`} style={{ zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" className="MediVERSE-logo" onClick={() => setMobileOpen(false)}>MediVERSE</Link>
        {/* Gesture Status in Nav */}
        {gestureEnabled && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,0,0,0.5)', padding: '4px 14px',
            borderRadius: 20, border: '1px solid rgba(255,45,85,0.2)',
            marginRight: 16
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
      </nav>

      {/* Global Bottom-Left Hamburger */}
      <button 
        onClick={() => { setMobileOpen(!mobileOpen); setSettingsOpen(false); }}
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: 'rgba(255,45,85,0.9)', border: '1px solid rgba(255,255,255,0.2)', 
          color: '#fff', fontSize: 'clamp(26px, 2.9vw, 30px)', cursor: 'pointer',
          width: 56, height: 56, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(255,45,85,0.4)',
          backdropFilter: 'blur(8px)',
          transition: 'transform 0.2s ease-out',
          transform: mobileOpen ? 'rotate(90deg)' : 'rotate(0deg)'
        }}
      >
        {mobileOpen ? '\u2715' : '\u2630'}
      </button>

      {/* Fullscreen Overlay Menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: overlayBg, zIndex: 9998,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', overflowY: 'auto', pointerEvents: 'auto'
        }}>
          <ul style={{ listStyle: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 40, padding: 0 }}>
            {NAV_ITEMS.map(item => (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  onClick={() => setMobileOpen(false)}
                  style={{ 
                    color: currentModule === item.href.slice(1) ? '#D91636' : textColor,
                    textDecoration: 'none', fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: '.1em',
                    transition: 'color 0.2s'
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            
            {/* Settings Button */}
            <li>
              <button 
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{ 
                  background: 'none', border: 'none',
                  color: settingsOpen ? '#D91636' : textColor,
                  fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: '.1em',
                  transition: 'color 0.2s', cursor: 'pointer'
                }}
              >
                SETTINGS {settingsOpen ? '\u25B2' : '\u25BC'}
              </button>
            </li>
          </ul>

          {/* Expandable Settings Menu */}
          {settingsOpen && (
            <div style={{ 
              borderTop: `1px solid ${borderColor}`, paddingTop: 32, 
              width: '80%', maxWidth: 300, textAlign: 'center',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: textColor }}>Theme</span>
                <button 
                  onClick={handleThemeToggle}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 12px', fontSize: 'clamp(14px, 1.4vw, 18px)', fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer' }}
                >
                  {theme}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: textColor }}>Language</span>
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 8px', fontSize: 'clamp(14px, 1.4vw, 18px)', fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="EN">EN - English</option>
                  <option value="HI">HI - Hindi</option>
                  <option value="ES">ES - Spanish</option>
                  <option value="FR">FR - French</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: textColor }}>Currency</span>
                <select 
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#D91636', padding: '4px 8px', fontSize: 'clamp(14px, 1.4vw, 18px)', fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (&#8377;)</option>
                  <option value="EUR">EUR (&euro;)</option>
                  <option value="GBP">GBP (&pound;)</option>
                  <option value="JPY">JPY (&yen;)</option>
                </select>
              </div>

              {/* Gesture Toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: textColor }}>Gestures</span>
                <button 
                  onClick={() => { setGestureEnabled(!gestureEnabled); }}
                  style={{ 
                    background: gestureEnabled ? 'rgba(255,45,85,0.15)' : 'none', 
                    border: `1px solid ${gestureEnabled ? '#D91636' : borderColor}`, 
                    color: gestureEnabled ? '#D91636' : mutedColor, 
                    padding: '4px 12px', fontSize: 'clamp(14px, 1.4vw, 18px)', fontFamily: "'Space Grotesk'", 
                    borderRadius: 4, cursor: 'pointer', fontWeight: 600 
                  }}
                >
                  {gestureEnabled ? 'ON -- TAP TO TURN OFF' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
