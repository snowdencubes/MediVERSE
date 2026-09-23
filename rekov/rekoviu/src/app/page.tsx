'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { SmartQRCard } from '@/components/common/SmartQRCard';

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

  const handleSelect = (l: Language) => { setLang(l); };
  const handleContinue = () => { router.push('/kiosk'); };

  return (
    <>
      <MediVERSENav currentModule="home" />
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: 'var(--text-primary)', padding: '90px 24px 40px 24px',
        overflowY: 'auto'
      }}>
      
      {/* 3-Segment Layout */}
      <div style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 24, width: '100%', maxWidth: 1380, justifyContent: 'center', alignItems: 'stretch'
      }}>
        
        {/* SEGMENT 1 (LEFT): Language Selection & Telegram Bot QR */}
        <div style={{ flex: '1 1 340px', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
            <img src="/favicon.ico" alt="MediVERSE Logo" style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 10, boxShadow: '0 8px 32px rgba(217, 22, 54, 0.25)' }} />
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 6vw, 64px)', margin: 0, letterSpacing: '.1em', color: 'var(--text-primary)', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>MediVERSE</h2>
          </div>
          
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(24px, 4vw, 34px)',
            letterSpacing: '.08em', marginBottom: 4, textAlign: 'center'
          }}>
            {t('select_language')}
          </h1>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', marginBottom: 16, fontSize: 'clamp(14px, 1.4vw, 17px)', textAlign: 'center' }}>
            {t('choose_pref')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 16 }}>
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
                      width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
                      color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(15px, 1.5vw, 18px)', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    {t(group.tLabel)}
                    <span style={{ color: '#D91636', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▶</span>
                  </button>
                  
                  <div className={`accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, padding: '0 12px 12px 12px'
                    }}>
                      {group.items.map(item => (
                        <button
                          key={item.code}
                          onClick={() => handleSelect(item.code as Language)}
                          style={{
                            padding: '10px', background: lang === item.code ? 'rgba(217, 22, 54, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${lang === item.code ? '#D91636' : 'var(--border-color)'}`,
                            borderRadius: 8, color: lang === item.code ? '#D91636' : 'var(--text-primary)',
                            fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer', transition: 'all 0.2s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                          }}
                        >
                          <span style={{ fontSize: 'clamp(12px, 1.2vw, 15px)', letterSpacing: '.1em', color: 'var(--text-secondary)' }}>{item.local}</span>
                          <span style={{ fontSize: 'clamp(14px, 1.5vw, 18px)', fontWeight: 700 }}>{item.name}</span>
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
              padding: '24px 48px', background: '#D91636', color: '#fff', border: 'none', borderRadius: 28,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(217, 22, 54, 0.4)', transition: 'transform 0.2s, box-shadow 0.2s', width: '100%', marginBottom: 16
            }}
          >
            <span>{t('continue_btn')}</span>
          </button>
        </div>

        {/* Divider 1 */}
        <div style={{ width: 1, background: 'var(--border-color)', flexShrink: 0, alignSelf: 'stretch' }} className="mobile-hidden" />

        {/* SEGMENT 2 (MIDDLE): Compact 24/7 Voice AI Card */}
        <div style={{ flex: '1 1 320px', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Smart Session QR Card (replaces Telegram QR) */}
          <SmartQRCard />

          <div style={{
            width: '100%', background: 'var(--bg-card)', border: '1px solid rgba(48, 209, 88, 0.5)', borderRadius: 20, paddingTop: 48, paddingBottom: 20, paddingLeft: 20, paddingRight: 20,
            boxShadow: '0 8px 32px rgba(48, 209, 88, 0.12)', textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            {/* Status Badge */}
            <div
              onClick={() => router.push('/voice-assistant')}
              style={{
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(48, 209, 88, 0.15)', border: '1px solid #30d158',
                padding: '4px 14px', borderRadius: 16, marginBottom: 12
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158', boxShadow: '0 0 10px #30d158' }} />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: '#30d158', letterSpacing: '.05em' }}>
                PROCEED TO VOICE AI
              </span>
            </div>

            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(28px, 4vw, 36px)',
              letterSpacing: '.08em', marginBottom: 4, color: 'var(--text-primary)', lineHeight: 1
            }}>
              24/7 VOICE AI
            </h2>

            <p style={{
              fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12
            }}>
              Open mic assistant. Tap mic or call button to speak.
            </p>

            {/* Mic Circle */}
            <div
              onClick={() => router.push('/voice-assistant')}
              style={{
                position: 'relative', cursor: 'pointer', margin: '4px 0 12px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 90, height: 90
              }}
            >
              <div style={{
                position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(48, 209, 88, 0.25)', border: '2px solid #30d158',
                boxShadow: '0 0 24px rgba(48,209,88,0.7)', animation: 'pulse 2s infinite ease-in-out'
              }} />
              <button
                onClick={e => { e.stopPropagation(); router.push('/voice-assistant'); }}
                style={{
                  position: 'relative', zIndex: 2, width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #30d158, #00b0ff)',
                  border: '2px solid rgba(255,255,255,0.6)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(48,209,88,0.5)', transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            </div>

            {/* Caption hint */}
            <div style={{
              background: 'rgba(0,0,0,0.5)', border: '1px solid #30d158',
              borderRadius: 10, padding: '8px 12px', width: '100%', marginBottom: 12
            }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: 'var(--text-secondary)' }}>
                Tap to open — voice starts instantly inside
              </span>
            </div>

            {/* Call Action Button */}
            <button
              onClick={() => router.push('/voice-assistant')}
              style={{
                width: '100%', padding: '12px 20px', background: '#30d158',
                color: '#fff', border: 'none', borderRadius: 24,
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(48,209,88,0.4)'
              }}
            >
              OPEN FULL VOICE CHAT UI
            </button>
          </div>
        </div>

        {/* Divider 2 */}
        <div style={{ width: 1, background: 'var(--border-color)', flexShrink: 0, alignSelf: 'stretch' }} className="mobile-hidden" />

        {/* SEGMENT 3 (RIGHT): Dedicated Hand Gesture Guidance */}
        <div style={{ flex: '1 1 380px', maxWidth: 480, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{
            background: 'var(--bg-card)', border: `1.5px solid ${gestureEnabled ? '#00e676' : 'var(--border-color)'}`,
            borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, height: '100%'
          }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: gestureEnabled ? '#00e676' : '#D91636',
                  boxShadow: gestureEnabled ? '0 0 8px #00e676' : 'none'
                }} />
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '.06em', color: 'var(--text-primary)', margin: 0 }}>
                  TOUCHLESS HAND GESTURE GUIDANCE
                </h3>
              </div>

              <button
                onClick={() => setGestureEnabled(!gestureEnabled)}
                style={{
                  padding: '8px 16px',
                  background: gestureEnabled ? 'rgba(0,230,118,0.15)' : '#D91636',
                  border: `1px solid ${gestureEnabled ? '#00e676' : '#D91636'}`,
                  borderRadius: 10, color: gestureEnabled ? '#00e676' : '#fff',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '.04em'
                }}
              >
                {gestureEnabled ? 'GESTURES ACTIVE' : 'ENABLE GESTURES'}
              </button>
            </div>

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>
              Control the entire kiosk screen using camera AI vision. Zero data saved.
            </p>

            {/* Bilingual Instructions Boxes (Full Space) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
              
              {/* English Instructions */}
              <div style={{
                background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#D91636', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                  [GUIDE] English Instructions
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-primary)' }}>
                  <div><strong>1. Palm Cursor:</strong> Raise open palm facing the screen to move pointer.</div>
                  <div><strong>2. Pinch to Click:</strong> Pinch thumb and index fingertips together to click.</div>
                  <div><strong>3. Swipe / Drag:</strong> Drag hand vertically or horizontally to scroll pages.</div>
                </div>
              </div>

              {/* Hindi Instructions */}
              <div style={{
                background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 14
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#00e676', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                  [निर्देश] हिन्दी गाइड (Hindi)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-primary)' }}>
                  <div><strong>1. हथेली कर्सर:</strong> खुली हथेली दिखाएं, स्क्रीन पर कर्सर चलेगा।</div>
                  <div><strong>2. पिंच क्लिक:</strong> क्लिक करने के लिए अंगूठे और पहली उंगली को मिलाएं।</div>
                  <div><strong>3. स्वाइप / स्क्रॉल:</strong> स्क्रॉल करने के लिए हाथ को ऊपर-नीचे या दाएं-बाएं घुमाएं।</div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-secondary)' }}>
              [Privacy] 100% on-device vision processing. No video streams stored or uploaded.
            </div>

          </div>

        </div>

      </div>

    </div>
    </>
  );
}
