'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  
  const [theme, setTheme] = useState('DARK');
  const [lang, setLang] = useState('EN');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/settings/currency')
      .then(r => r.json())
      .then(d => setCurrency(d.currency))
      .catch(() => setCurrency('USD'));
  }, []);

  const handleThemeToggle = () => {
    const newTheme = theme === 'DARK' ? 'LIGHT' : 'DARK';
    setTheme(newTheme);
    document.body.classList.toggle('light-mode', newTheme === 'LIGHT');
  };

  const isLight = theme === 'LIGHT';
  const overlayBg = isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
  const textColor = 'var(--text-primary)';
  const mutedColor = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  return (
    <>
      <nav className={`rekov-nav ${scrolled ? 'scrolled' : ''}`} style={{ zIndex: 100 }}>
        <Link href="/" className="rekov-logo" onClick={() => setMobileOpen(false)}>REKOV</Link>
      </nav>

      {/* Global Bottom-Left Hamburger */}
      <button 
        onClick={() => { setMobileOpen(!mobileOpen); setSettingsOpen(false); }}
        style={{
          position: 'fixed', bottom: 32, right: 32, zIndex: 9999,
          background: 'rgba(255,45,85,0.9)', border: '1px solid rgba(255,255,255,0.2)', 
          color: '#fff', fontSize: 24, cursor: 'pointer',
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
                    color: currentModule === item.href.slice(1) ? '#ff2d55' : textColor,
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
                  color: settingsOpen ? '#ff2d55' : textColor,
                  fontFamily: "'Bebas Neue'", fontSize: 40, letterSpacing: '.1em',
                  transition: 'color 0.2s', cursor: 'pointer'
                }}
              >
                SETTINGS {settingsOpen ? '▲' : '▼'}
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
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: textColor }}>Theme</span>
                <button 
                  onClick={handleThemeToggle}
                  style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 12px', fontSize: 12, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer' }}
                >
                  {theme}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: textColor }}>Language</span>
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 8px', fontSize: 12, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="EN">EN - English</option>
                  <option value="HI">HI - Hindi</option>
                  <option value="ES">ES - Spanish</option>
                  <option value="FR">FR - French</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: textColor }}>Currency</span>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ background: 'var(--bg-main)', border: `1px solid ${borderColor}`, color: '#ff2d55', padding: '4px 8px', fontSize: 12, fontFamily: "'Space Grotesk'", borderRadius: 4, cursor: 'pointer', outline: 'none' }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
