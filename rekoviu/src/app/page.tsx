'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';

export default function LanguageSelectionPage() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled } = useGesture();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      setLoading(false);
    }, 2000);

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
        console.error('IP fetch failed:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [setLang]);

  const handleSelect = (l: 'EN' | 'HI' | 'ES' | 'FR') => {
    setLang(l);
  };

  const handleContinue = () => {
    router.push('/home');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Bebas Neue', sans-serif", fontSize: 48
      }}>
        LOADING...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)', color: 'var(--text-primary)', padding: 24, textAlign: 'center'
    }}>
      <div style={{ position: 'absolute', top: 40, right: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <button
          onClick={() => setGestureEnabled(!gestureEnabled)}
          style={{
            padding: '16px 32px',
            background: gestureEnabled ? 'rgba(255, 45, 85, 0.2)' : 'var(--bg-card)',
            border: `2px solid ${gestureEnabled ? '#ff2d55' : 'var(--border-color)'}`,
            borderRadius: 32,
            color: gestureEnabled ? '#ff2d55' : 'var(--text-primary)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ 
            width: 20, height: 20, borderRadius: '50%', 
            background: gestureEnabled ? '#ff2d55' : 'var(--text-secondary)',
            transition: 'background 0.3s'
          }} />
          {gestureEnabled ? 'Gesture Control ON / इशारे चालू हैं' : 'Enable Gestures / इशारों से चलाएं'}
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
            maxWidth: 300
          }}>
            <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              Point with one finger to move pointer.
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              एक उंगली से पॉइंटर चलाएं।
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              Pinch your thumb and index finger to click.
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
              अंगूठे और उंगली को मिलाकर क्लिक करें।
            </p>
          </div>
        )}
      </div>

      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(48px, 10vw, 80px)',
        letterSpacing: '.08em', marginBottom: 16
      }}>
        SELECT LANGUAGE
      </h1>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', marginBottom: 48, fontSize: 18 }}>
        Please choose your preferred language to continue.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, width: '100%', maxWidth: 600, marginBottom: 48 }}>
        {(['EN', 'HI', 'ES', 'FR'] as const).map(l => (
          <button
            key={l}
            onClick={() => handleSelect(l)}
            style={{
              padding: '24px', background: lang === l ? 'rgba(255,45,85,0.1)' : 'var(--bg-card)',
              border: `2px solid ${lang === l ? '#ff2d55' : 'var(--border-color)'}`,
              borderRadius: 16, color: lang === l ? '#ff2d55' : 'var(--text-primary)',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
            }}
          >
            <span>{l === 'EN' ? 'ENG' : l === 'HI' ? 'HIN' : l === 'ES' ? 'ESP' : 'FRA'}</span>
            {l === 'EN' ? 'English' : l === 'HI' ? 'हिन्दी (Hindi)' : l === 'ES' ? 'Español' : 'Français'}
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        style={{
          padding: '20px 64px', background: '#ff2d55', color: '#fff', border: 'none', borderRadius: 32,
          fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(255,45,85,0.4)', transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        CONTINUE
      </button>
    </div>
  );
}
