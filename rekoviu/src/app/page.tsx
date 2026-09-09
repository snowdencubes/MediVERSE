'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';

export default function LanguageSelectionPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled } = useGesture();

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 2000);

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        const country = data.country_code;
        if (country === 'IN') setLang('HI');
        else if (country === 'ES' || country === 'MX' || country === 'AR') setLang('ES');
        else if (country === 'FR') setLang('FR');
        else setLang('EN');
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('IP fetch failed:', err);
      })
      .finally(() => { clearTimeout(timeoutId); });

    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [setLang]);

  const handleSelect = (l: 'EN' | 'HI' | 'ES' | 'FR') => { setLang(l); };
  const handleContinue = () => { router.push('/home'); };

  return (
    <div style={{
      position: 'relative', zIndex: 10,
      height: '100vh', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--text-primary)', padding: '24px 48px',
      gap: 48, overflow: 'hidden'
    }}>

      {/* LEFT SIDE: Language Selection */}
      <div style={{ flex: '1 1 50%', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 6vw, 64px)',
          letterSpacing: '.08em', marginBottom: 8, textAlign: 'center'
        }}>
          SELECT LANGUAGE
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14, textAlign: 'center' }}>
          Choose your preferred language to continue.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', maxWidth: 420, marginBottom: 28 }}>
          {(['EN', 'HI', 'ES', 'FR'] as const).map(l => (
            <button
              key={l}
              onClick={() => handleSelect(l)}
              style={{
                padding: '16px', background: lang === l ? 'rgba(255,45,85,0.1)' : 'var(--bg-card)',
                border: `2px solid ${lang === l ? '#ff2d55' : 'var(--border-color)'}`,
                borderRadius: 12, color: lang === l ? '#ff2d55' : 'var(--text-primary)',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
              }}
            >
              <span style={{ fontSize: 14 }}>{l === 'EN' ? 'ENG' : l === 'HI' ? 'HIN' : l === 'ES' ? 'ESP' : 'FRA'}</span>
              <span>{l === 'EN' ? 'English' : l === 'HI' ? 'हिन्दी (Hindi)' : l === 'ES' ? 'Español' : 'Français'}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          style={{
            padding: '14px 56px', background: '#ff2d55', color: '#fff', border: 'none', borderRadius: 32,
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(255,45,85,0.4)', transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          CONTINUE
        </button>
      </div>

      {/* Vertical Divider */}
      <div style={{ width: 1, height: '60%', background: 'var(--border-color)', flexShrink: 0 }} />

      {/* RIGHT SIDE: Gesture Toggle */}
      <div style={{ flex: '1 1 50%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setGestureEnabled(!gestureEnabled)}
          style={{
            padding: '14px 28px',
            background: gestureEnabled ? 'rgba(255, 45, 85, 0.2)' : 'var(--bg-card)',
            border: `2px solid ${gestureEnabled ? '#ff2d55' : 'var(--border-color)'}`,
            borderRadius: 32,
            color: gestureEnabled ? '#ff2d55' : 'var(--text-primary)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textAlign: 'left'
          }}
        >
          <div style={{ 
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            background: gestureEnabled ? '#ff2d55' : 'var(--text-secondary)',
            transition: 'background 0.3s'
          }} />
          {gestureEnabled
            ? 'Gesture Control ON (No Screen Touch) / इशारे चालू हैं (बिना छुए)'
            : 'Enable Gestures (No Screen Touch Method) / इशारे चालू करें (स्क्रीन छूने की ज़रूरत नहीं)'}
        </button>

        {gestureEnabled && (
          <div style={{ 
            marginTop: 16, 
            background: 'var(--bg-card)', 
            padding: '16px 24px', 
            borderRadius: 16,
            border: '1px solid var(--border-color)',
            textAlign: 'left',
            fontFamily: "'Space Grotesk', sans-serif",
            width: '100%', maxWidth: 380
          }}>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#ff2d55', fontWeight: 700, letterSpacing: '.05em', textAlign: 'center' }}>
              HOW TO USE / कैसे इस्तेमाल करें
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              &#9654; Step 1: Face the camera -- your face must be visible to activate.
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16 }}>
              पहला कदम: कैमरे के सामने आएं -- चेहरा दिखना ज़रूरी है।
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              &#9654; Step 2: Raise one finger = Pointer moves on screen.
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16 }}>
              एक उंगली उठाएं = स्क्रीन पर पॉइंटर चलेगा।
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              &#9654; Step 3: Pinch (thumb + index) = Click.
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16 }}>
              चुटकी (अंगूठा + उंगली) = क्लिक।
            </p>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 10 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#ff2d55', fontWeight: 600, textAlign: 'center' }}>
                [!] Face detection required for security and accuracy.
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                No screen touch needed. / स्क्रीन छूने की ज़रूरत नहीं।
              </p>
            </div>
          </div>
        )}

        {!gestureEnabled && (
          <p style={{ marginTop: 16, fontFamily: "'Space Grotesk'", fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 320 }}>
            Gesture mode uses your camera to detect hand movements. No data is stored or transmitted.
          </p>
        )}
      </div>
    </div>
  );
}
