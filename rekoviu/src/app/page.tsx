'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';
import { useVoiceCall } from '@/contexts/VoiceCallContext';
import { MediVERSENav } from '@/components/common/MediVERSENav';

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
    { code: 'KN', name: '<ctrl42>ಕನ್ನಡ (Kannada)', local: 'KAN' },
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
  const { isCallActive, callStatus, liveTranscript, toggleCall, startCall } = useVoiceCall();

  const [expandedGroup, setExpandedGroup] = useState<string>('primary');
  const [isGestureSectionOpen, setIsGestureSectionOpen] = useState(false);

  const handleSelect = (l: Language) => { setLang(l); };
  const handleContinue = () => { router.push('/kiosk'); };

  const isUserSpeaking = callStatus === 'USER_SPEAKING';
  const isAISpeaking = callStatus === 'AI_SPEAKING';

  return (
    <>
      <MediVERSENav currentModule="home" />
      <div style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: 'var(--text-primary)', padding: '90px 24px 40px 24px',
        overflowY: 'auto'
      }}>
      
      {/* 3-Segment Wrapper */}
      <div style={{
        display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 32, width: '100%', maxWidth: 1380, justifyContent: 'center', alignItems: 'stretch'
      }}>
        
        {/* SEGMENT 1 (LEFT): Language Selection */}
        <div style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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

        {/* Divider 1 */}
        <div style={{ width: 1, background: 'var(--border-color)', flexShrink: 0, alignSelf: 'stretch' }} className="mobile-hidden" />

        {/* SEGMENT 2 (MIDDLE): 24/7 Voice AI Assistant Button */}
        <div style={{
          flex: '1 1 340px', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-card)', border: `1px solid ${isCallActive ? '#30d158' : 'rgba(217, 22, 54, 0.4)'}`, borderRadius: 24, padding: '32px 24px',
          boxShadow: isCallActive ? '0 8px 40px rgba(48, 209, 88, 0.3)' : '0 8px 32px rgba(217, 22, 54, 0.15)', textAlign: 'center', position: 'relative',
          transition: 'all 0.3s'
        }}>
          {/* Status Badge */}
          <div 
            onClick={toggleCall}
            style={{
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              background: isCallActive ? 'rgba(48, 209, 88, 0.15)' : 'rgba(217, 22, 54, 0.15)',
              border: `1px solid ${isCallActive ? '#30d158' : 'rgba(217, 22, 54, 0.4)'}`,
              padding: '6px 16px', borderRadius: 20, marginBottom: 16, transition: 'all 0.3s'
            }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isCallActive ? '#30d158' : '#D91636',
              boxShadow: isCallActive ? '0 0 12px #30d158' : '0 0 8px #D91636',
              animation: isUserSpeaking || isAISpeaking ? 'pulse 1s infinite' : 'none'
            }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: isCallActive ? '#30d158' : '#ff4757', letterSpacing: '.05em' }}>
              {isAISpeaking ? 'AI SPEAKING...' : isUserSpeaking ? 'LISTENING TO YOU...' : isCallActive ? 'VOICE CALL ACTIVE 24/7' : 'START VOICE CALL'}
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(32px, 5vw, 44px)',
            letterSpacing: '.08em', marginBottom: 6, color: 'var(--text-primary)'
          }}>
            24/7 VOICE AI
          </h2>

          <p style={{
            fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', fontSize: 'clamp(14px, 1.4vw, 17px)', marginBottom: 16
          }}>
            Always active Valorant-style open mic. Tap the call button or anywhere to speak instantly.
          </p>

          {/* Interactive Voice Mic Circle */}
          <div 
            onClick={toggleCall}
            style={{
              position: 'relative', cursor: 'pointer', margin: '8px 0 16px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 110, height: 110
            }}
          >
            <div style={{
              position: 'absolute', width: 100, height: 100, borderRadius: '50%',
              background: isCallActive ? 'rgba(48, 209, 88, 0.25)' : 'rgba(217, 22, 54, 0.25)',
              border: `2px solid ${isCallActive ? '#30d158' : 'rgba(217, 22, 54, 0.4)'}`,
              boxShadow: isCallActive ? '0 0 32px rgba(48,209,88,0.8)' : '0 0 16px rgba(217,22,54,0.4)',
              transform: isUserSpeaking || isAISpeaking ? 'scale(1.18)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out'
            }} />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleCall();
              }}
              style={{
                position: 'relative', zIndex: 2, width: 72, height: 72, borderRadius: '50%',
                background: isCallActive ? 'linear-gradient(135deg, #30d158, #00b0ff)' : 'linear-gradient(135deg, #D91636, #ff2d55)',
                border: '2px solid rgba(255,255,255,0.6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: isCallActive ? '0 4px 24px rgba(48,209,88,0.5)' : '0 4px 20px rgba(217, 22, 54, 0.5)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          </div>

          {/* Realtime Live Caption */}
          <div style={{
            background: 'rgba(0,0,0,0.5)', border: `1px solid ${isCallActive ? '#30d158' : 'var(--border-color)'}`,
            borderRadius: 12, padding: '10px 14px', width: '100%', minHeight: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
          }}>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 13,
              color: liveTranscript ? '#64d2ff' : 'var(--text-secondary)', fontWeight: liveTranscript ? 600 : 400
            }}>
              {liveTranscript ? `"${liveTranscript}"` : isCallActive ? 'LISTENING 24/7... (Speak now)' : 'VOICE CALL OFF — CLICK TO START'}
            </span>
          </div>

          {/* Join / Start Call Primary Action Button */}
          <button
            onClick={() => {
              if (isCallActive) {
                router.push('/voice-assistant');
              } else {
                startCall();
              }
            }}
            style={{
              width: '100%', padding: '14px 24px',
              background: isCallActive ? '#30d158' : '#D91636',
              color: '#fff', border: 'none', borderRadius: 28,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700,
              cursor: 'pointer', boxShadow: isCallActive ? '0 4px 20px rgba(48,209,88,0.4)' : '0 4px 20px rgba(217,22,54,0.4)',
              transition: 'all 0.2s'
            }}
          >
            {isCallActive ? 'OPEN FULL VOICE CHAT UI' : 'START VOICE CALL NOW'}
          </button>
        </div>

        {/* Divider 2 */}
        <div style={{ width: 1, background: 'var(--border-color)', flexShrink: 0, alignSelf: 'stretch' }} className="mobile-hidden" />

        {/* SEGMENT 3 (RIGHT): Chat Register & Gestures */}
        <div style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Chat Register Options (Telegram & WhatsApp) */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16
          }}>
            <h3 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(22px, 3vw, 28px)',
              letterSpacing: '.06em', color: 'var(--text-primary)', margin: 0, textAlign: 'center'
            }}>
              CHAT REGISTER (TELEGRAM & WHATSAPP)
            </h3>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', fontSize: 13, margin: 0, textAlign: 'center'
            }}>
              Scan QR to register via Telegram bot API or WhatsApp & receive instant appointment tickets!
            </p>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
              {/* Telegram QR */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(45, 155, 255, 0.3)', borderRadius: 12, padding: 12
              }}>
                <div style={{ background: '#fff', padding: 6, borderRadius: 8 }}>
                  <QRCodeSVG value="https://t.me/rekov_bot" size={90} />
                </div>
                <a
                  href="https://t.me/rekov_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#2d9bff', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <span>Telegram Bot</span>
                </a>
              </div>

              {/* WhatsApp QR */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: 12, padding: 12
              }}>
                <div style={{ background: '#fff', padding: 6, borderRadius: 8 }}>
                  <QRCodeSVG value="https://wa.me/14155238886?text=join%20rekov" size={90} />
                </div>
                <a
                  href="https://wa.me/14155238886?text=join%20rekov"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#25D366', textDecoration: 'none', fontSize: 12, fontWeight: 700,
                    fontFamily: "'Space Grotesk', sans-serif", display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <span>WhatsApp Chat</span>
                </a>
              </div>
            </div>
          </div>

          {/* Enable Gestures Accordion Box */}
          <div style={{
            background: 'var(--bg-card)', border: `1px solid ${gestureEnabled ? '#00e676' : 'var(--border-color)'}`,
            borderRadius: 20, overflow: 'hidden', transition: 'all 0.3s'
          }}>
            <button
              onClick={() => setIsGestureSectionOpen(!isGestureSectionOpen)}
              style={{
                width: '100%', padding: '18px 24px', background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700,
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: gestureEnabled ? '#00e676' : '#D91636',
                  boxShadow: gestureEnabled ? '0 0 8px #00e676' : 'none'
                }} />
                <span>Touchless Gestures (No-Touch Interaction)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: gestureEnabled ? '#00e676' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {gestureEnabled ? '[ACTIVE]' : '[OFF]'}
                </span>
                <span style={{ color: '#D91636', transform: isGestureSectionOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▶</span>
              </div>
            </button>

            {isGestureSectionOpen && (
              <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                    Control the kiosk without touching the glass using camera-based AI vision. Zero data recorded.
                  </p>
                  <button
                    onClick={() => setGestureEnabled(!gestureEnabled)}
                    style={{
                      padding: '10px 20px',
                      background: gestureEnabled ? 'rgba(0,230,118,0.15)' : '#D91636',
                      border: `1px solid ${gestureEnabled ? '#00e676' : '#D91636'}`,
                      borderRadius: 10, color: gestureEnabled ? '#00e676' : '#fff',
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '.04em'
                    }}
                  >
                    {gestureEnabled ? 'DISABLE GESTURES' : 'ENABLE GESTURES NOW'}
                  </button>
                </div>

                {/* Bilingual Instructions Box */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16,
                  marginTop: 8
                }}>
                  {/* English Instructions */}
                  <div style={{
                    background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#D91636', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      [GUIDE] English Instructions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                      <div><strong>1. Face Alignment:</strong> Look towards the front camera. The facial tracking frame locks in automatically.</div>
                      <div><strong>2. Palm Cursor:</strong> Raise open palm facing the screen. The on-screen pointer will track your hand movement.</div>
                      <div><strong>3. Pinch to Click:</strong> Bring thumb and index finger tips together to click any button without touching.</div>
                      <div><strong>4. Swipe Navigation:</strong> Move your hand horizontally left or right to switch departments or flip views.</div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      [Privacy] 100% on-device vision processing. No photos or video streams are stored or uploaded.
                    </div>
                  </div>

                  {/* Hindi Instructions */}
                  <div style={{
                    background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 16
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#00e676', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                      [निर्देश] हिन्दी गाइड (Hindi)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                      <div><strong>1. चेहरा संरेखण:</strong> सीधे कैमरे की ओर देखें। फेशियल ट्रैकिंग स्वचालित रूप से लॉक हो जाएगी।</div>
                      <div><strong>2. हथेली कर्सर:</strong> खुली हथेली स्क्रीन के सामने उठाएं। स्क्रीन पर लेज़र कर्सर आपके हाथ के साथ चलेगा।</div>
                      <div><strong>3. पिंच क्लिक:</strong> बटन पर क्लिक करने के लिए अंगूठे और तर्जनी उंगली के सिरों को आपस में मिलाएं।</div>
                      <div><strong>4. स्वाइप नेविगेशन:</strong> पेज बदलने या विभाग बदलने के लिए हाथ को बाईं या दाईं ओर घुमाएं।</div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-secondary)' }}>
                      [गोपनीयता] ऑन-डिवाइस विज़न प्रोसेसिंग। कोई फोटो या वीडियो रिकॉर्ड या सेव नहीं किया जाता।
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
    </>
  );
}
