'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';

const LANG_GROUPS = [
  { id: 'primary', tLabel: 'primary_lang', items: [
    { code: 'EN', name: 'English', local: 'ENG' },
    { code: 'HI', name: 'हिन्दी (Hindi)', local: 'HIN' },
    { code: 'BN', name: 'বাংলা (Bengali)', local: 'BEN' },
  ]},
  { id: 'jharkhand', tLabel: 'jharkhand_lang', items: [
    { code: 'SAT', name: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', local: 'SAT' },
    { code: 'KVN', name: 'कुड़ुख़ (Kurukh)', local: 'KVN' },
    { code: 'HOC', name: '𑢹𑣗𑣁 (Ho)', local: 'HOC' },
    { code: 'UNW', name: 'मुंडारी (Mundari)', local: 'UNW' },
  ]},
  { id: 'indian', tLabel: 'other_indian', items: [
    { code: 'TA', name: 'தமிழ் (Tamil)', local: 'TAM' },
    { code: 'TE', name: 'తెలుగు (Telugu)', local: 'TEL' },
    { code: 'MR', name: 'मराठी (Marathi)', local: 'MAR' },
    { code: 'GU', name: 'ગુજરાતી (Gujarati)', local: 'GUJ' },
    { code: 'UR', name: 'اردو (Urdu)', local: 'URD' },
    { code: 'KN', name: 'ಕನ್ನಡ (Kannada)', local: 'KAN' },
    { code: 'ML', name: 'മലയാളം (Malayalam)', local: 'MAL' },
    { code: 'PA', name: 'ਪੰਜਾਬੀ (Punjabi)', local: 'PUN' },
  ]},
  { id: 'foreign', tLabel: 'foreign_lang', items: [
    { code: 'ES', name: 'Español (Spanish)', local: 'ESP' },
    { code: 'FR', name: 'Français (French)', local: 'FRA' },
    { code: 'DE', name: 'Deutsch (German)', local: 'DEU' },
    { code: 'ZH', name: '中文 (Chinese)', local: 'ZHO' },
    { code: 'AR', name: 'العربية (Arabic)', local: 'ARA' },
    { code: 'RU', name: 'Русский (Russian)', local: 'RUS' },
    { code: 'JA', name: '日本語 (Japanese)', local: 'JPN' },
  ]}
];

export default function Home() {
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const { enabled: gestureEnabled, setEnabled: setGestureEnabled } = useGesture();
  
  const [expandedGroup, setExpandedGroup] = useState<string>('primary');
  const [isGestureSectionOpen, setIsGestureSectionOpen] = useState(false);

  const renderSmartWrap = (text: string) => {
    if (!text) return text;
    const parts = text.split('(');
    if (parts.length > 1) {
      return (
        <>
          {parts[0].trim()} <span style={{ display: 'inline-block' }}>({parts[1]}</span>
        </>
      );
    }
    return text;
  };

  // Prefetch /home so Continue button is instant
  useEffect(() => { router.prefetch('/home'); }, [router]);

  useEffect(() => {
    // Skip auto-detection if user already chose a language
    const saved = localStorage.getItem('mediverse_lang');
    if (saved) return;

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

  const handleSelect = (l: Language) => { setLang(l); };
  const handleContinue = () => { router.push('/home'); };

  return (
    <div style={{
      position: 'relative', zIndex: 10,
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--text-primary)', padding: '40px 24px',
      overflowY: 'auto'
    }}>
      
      {/* Wrapper to handle mobile view */}
      <div style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 48, width: '100%', maxWidth: 1200, justifyContent: 'center'
      }}>
        
        {/* LEFT SIDE: Language Selection */}
        <div style={{ flex: '1 1 400px', maxWidth: 560, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 6vw, 64px)',
            letterSpacing: '.08em', marginBottom: 8, textAlign: 'center', transition: 'all 0.3s'
          }}>
            {t('select_language')}
          </h1>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', marginBottom: 28, fontSize: 'clamp(16px, 1.7vw, 20px)', textAlign: 'center', transition: 'all 0.3s' }}>
            {t('choose_pref')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 420, marginBottom: 28 }}>
            {LANG_GROUPS.map(group => {
              const isExpanded = expandedGroup === group.id;
              return (
                <div key={group.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden',
                  transition: 'border-color 0.3s'
                }}>
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? '' : group.id)}
                    style={{
                      width: '100%', padding: '16px', background: 'transparent', border: 'none',
                      color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'background 0.3s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {t(group.tLabel)}
                    <span style={{ color: '#D91636', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▶</span>
                  </button>
                  
                  <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, padding: '0 16px 16px 16px'
                    }}>
                      {group.items.map(item => (
                        <button
                          key={item.code}
                          onClick={() => handleSelect(item.code as Language)}
                          style={{
                            padding: '12px', background: lang === item.code ? 'rgba(217, 22, 54, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${lang === item.code ? '#D91636' : 'var(--border-color)'}`,
                            borderRadius: 8, color: lang === item.code ? '#D91636' : 'var(--text-primary)',
                            fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                          }}
                          onMouseEnter={e => { if (lang !== item.code) e.currentTarget.style.borderColor = '#D91636'; }}
                          onMouseLeave={e => { if (lang !== item.code) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                        >
                          <span style={{ fontSize: 'clamp(13px, 1.3vw, 17px)', letterSpacing: '.1em', color: 'var(--text-secondary)' }}>{item.local}</span>
                          <span style={{ fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700 }}>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            className="btn-continue-slide"
            style={{
              padding: '16px 64px', background: '#D91636', color: '#fff', border: 'none', borderRadius: 32,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(18px, 1.9vw, 22px)', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(217, 22, 54, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(217, 22, 54, 0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(217, 22, 54, 0.4)';
            }}
          >
            <span>{t('continue_btn')}</span>
          </button>
        </div>

        {/* Vertical Divider (Hidden on mobile) */}
        <div style={{ width: 1, minHeight: '60%', background: 'var(--border-color)', flexShrink: 0 }} className="mobile-hidden" />

        {/* RIGHT SIDE: Gesture Toggle */}
        <div style={{ flex: '1 1 400px', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => setIsGestureSectionOpen(!isGestureSectionOpen)}
            style={{
              padding: '16px 28px',
              background: 'var(--bg-card)',
              border: `1px solid var(--border-color)`,
              borderRadius: 32,
              color: 'var(--text-primary)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(17px, 1.8vw, 21px)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}
          >
            <span>{renderSmartWrap(t('gesture_off'))}</span>
            <span style={{ color: '#D91636', transform: isGestureSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▶</span>
          </button>

          <div className={`accordion-content ${isGestureSectionOpen ? 'expanded' : ''}`} style={{ width: '100%' }}>
            <div style={{ 
              marginTop: 20, 
              background: 'var(--bg-card)', 
              padding: '24px', 
              borderRadius: 16,
              border: '1px solid var(--border-color)',
              textAlign: 'left',
              fontFamily: "'Space Grotesk', sans-serif",
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              
              {/* ENABLE GESTURE BUTTON */}
              <button
                onClick={() => setGestureEnabled(!gestureEnabled)}
                className="btn-continue-slide"
                style={{
                  padding: '12px 32px',
                  background: gestureEnabled ? 'rgba(217, 22, 54, 0.2)' : '#D91636',
                  border: gestureEnabled ? '1px solid #D91636' : 'none',
                  borderRadius: 32,
                  color: gestureEnabled ? '#D91636' : '#fff',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(16px, 1.7vw, 20px)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 24,
                  width: '100%',
                  justifyContent: 'center',
                  boxShadow: gestureEnabled ? 'none' : '0 4px 16px rgba(217, 22, 54, 0.4)'
                }}
              >
                <div style={{ 
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: gestureEnabled ? '#D91636' : '#fff',
                  transition: 'background 0.3s',
                  boxShadow: gestureEnabled ? '0 0 10px #D91636' : 'none'
                }} />
                <span>{gestureEnabled ? renderSmartWrap(t('gesture_on')) : 'START GESTURES'}</span>
              </button>

              <p style={{ margin: '0 0 16px 0', fontSize: 'clamp(15px, 1.6vw, 19px)', color: '#D91636', fontWeight: 700, letterSpacing: '.05em', textAlign: 'center', textTransform: 'uppercase' }}>
                {t('how_to_use')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)' }}>&#9654; {t('step_1')}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)' }}>&#9654; {t('step_2')}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)' }}>&#9654; {t('step_3')}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 16, width: '100%' }}>
                <p style={{ margin: 0, fontSize: 'clamp(13px, 1.3vw, 17px)', color: '#D91636', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase' }}>
                  [!] {t('face_req')}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  {t('no_touch')}
                </p>
              </div>
            </div>
          </div>

          <div className={`accordion-content ${!isGestureSectionOpen ? 'expanded' : ''}`}>
            <p style={{ marginTop: 24, fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 320 }}>
              {t('gesture_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
