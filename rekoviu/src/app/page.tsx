'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useGesture } from '@/contexts/GestureContext';
import { speakBilingualText } from '@/services/tts';

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
  const [heardSpeech, setHeardSpeech] = useState<string>('');
  const [showSpeechPrompt, setShowSpeechPrompt] = useState(false);
  const [isListeningActive, setIsListeningActive] = useState(false);
  const [isHearingSound, setIsHearingSound] = useState<boolean>(false);

  const renderSmartWrap = (text: string) => text;

  // 24/7 Speech Recognition Listener with Devanagari + English Wake Words & Kiosk Touch Auto-Unlock
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let shouldKeepListening = true;
    let isStarted = false;
    let lastPromptTime = 0;
    let isSpeakingTTS = false;

    const wakeWords = [
      // English / Hinglish
      'wake up', 'wakeup', 'hello', 'hey mediverse', 'mediverse', 'assistant', 'voice',
      'jaag jao', 'jag jao', 'bhai', 'doctor', 'help', 'madad', 'sunoo', 'suno', 'kaha', 'aaye',
      'bukhar', 'fever', 'headache', 'ticket', 'appointment', 'check in', 'checkin', 'pain', 'dard',
      // Devanagari Hindi Script
      'वेक अप', 'वेकअप', 'वैकाप', 'जाग जाओ', 'जग जाओ', 'हलो', 'हेलो', 'मेडिवर्स', 'भाई',
      'डॉक्टर', 'डाक्टर', 'हेल्प', 'मदद', 'सुनो', 'बुखार', 'फीवर', 'सर दर्द', 'दर्द', 'टिकट', 'अपॉइंटमेंट'
    ];

    const selfEchoPhrases = [
      'did you say something', 'क्या आपने कुछ कहा', 'क्या आप कुछ कह रहे हैं', 'heard speech',
      'yes help me', 'हाँ सहायता करें'
    ];

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Better for picking up "wake up" in English/Hinglish

    const safeStart = () => {
      if (!shouldKeepListening || isStarted || isSpeakingTTS) return;
      try {
        recognition.start();
        isStarted = true;
        setIsListeningActive(true);
      } catch (e: any) {
        if (e?.name === 'InvalidStateError') {
          isStarted = true;
        }
      }
    };

    const speakPromptInHindiAndEnglish = () => {
      const now = Date.now();
      if (now - lastPromptTime < 5000) return; // 5 sec cooldown
      lastPromptTime = now;

      isSpeakingTTS = true;
      speakBilingualText({
        text: "Did you say something? क्या आपने कुछ कहा?",
        lang: 'hi-IN',
        onStart: () => {
          isSpeakingTTS = true;
        },
        onEnd: () => {
          isSpeakingTTS = false;
          safeStart();
        },
        onError: () => {
          isSpeakingTTS = false;
          safeStart();
        }
      });
    };

    let soundResetTimer: any = null;

    recognition.onsoundstart = () => {
      setIsHearingSound(true);
    };

    recognition.onsoundend = () => {
      setIsHearingSound(false);
    };

    recognition.onspeechstart = () => {
      setIsHearingSound(true);
    };

    recognition.onspeechend = () => {
      setIsHearingSound(false);
    };

    recognition.onresult = (event: any) => {
      if (isSpeakingTTS) return;

      setIsHearingSound(true);
      if (soundResetTimer) clearTimeout(soundResetTimer);
      soundResetTimer = setTimeout(() => setIsHearingSound(false), 2000);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (!text) continue;
        const lower = text.toLowerCase();

        // Ignore self-echo from device speakers
        if (selfEchoPhrases.some(phrase => lower.includes(phrase))) {
          continue;
        }

        setHeardSpeech(text);
        setIsListeningActive(true);

        // Confirmation logic: if they say a wake word OR confirm word, route to assistant.
        const confirmWords = ['yes', 'haan', 'ha', 'sure', 'continue', 'ok', 'okay', 'help', 'assist', 'proceed', 'aage badho'];
        const dismissWords = ['no', 'nahi', 'nahin', 'cancel', 'stop', 'mat karo', 'ruko', 'dismiss'];

        if (dismissWords.some(d => lower.includes(d))) {
          setShowSpeechPrompt(false);
          if (typeof window !== 'undefined') window.speechSynthesis.cancel();
          return;
        }

        const isWake = wakeWords.some(w => lower.includes(w)) || confirmWords.some(w => lower.includes(w));
        
        if (isWake) {
          sessionStorage.setItem('initial_voice_query', text);
          router.push('/voice-assistant');
          return;
        }

        // General speech detected but not a wake word — ask "Did you say something? / क्या आप कुछ कह रहे हैं?"
        setShowSpeechPrompt(true);
        speakPromptInHindiAndEnglish();
      }
    };

    recognition.onerror = (event: any) => {
      isStarted = false;
      if (event.error === 'not-allowed') {
        setIsListeningActive(false);
      } else if (shouldKeepListening && !isSpeakingTTS) {
        setTimeout(safeStart, 1000);
      }
    };

    recognition.onend = () => {
      isStarted = false;
      if (shouldKeepListening && !isSpeakingTTS) {
        setTimeout(safeStart, 400);
      }
    };

    // Watchdog Timer: keeps listening active 24/7 without sleeping
    const watchdog = setInterval(() => {
      if (shouldKeepListening && !isStarted && !isSpeakingTTS) {
        safeStart();
      }
    }, 3000);

    // Screen Touch / Click Listener for Kiosk mode:
    // Ensures any touch on the kiosk touchscreen auto-unlocks browser audio & 24/7 listening
    const handleScreenTouch = () => {
      if (shouldKeepListening && !isSpeakingTTS) {
        safeStart();
      }
    };

    window.addEventListener('touchstart', handleScreenTouch, { passive: true });
    window.addEventListener('click', handleScreenTouch, { passive: true });

    safeStart();

    return () => {
      shouldKeepListening = false;
      clearInterval(watchdog);
      window.removeEventListener('touchstart', handleScreenTouch);
      window.removeEventListener('click', handleScreenTouch);
      try { recognition.stop(); } catch (e) {}
    };
  }, [router]);

  const handleSelect = (l: Language) => { setLang(l); };
  const handleContinue = () => { router.push('/home'); };

  return (
    <div style={{
      position: 'relative', zIndex: 10,
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--text-primary)', padding: '40px 24px',
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
          background: 'var(--bg-card)', border: `1px solid ${isHearingSound ? 'rgba(0,230,118,0.6)' : 'rgba(217, 22, 54, 0.4)'}`, borderRadius: 24, padding: '32px 24px',
          boxShadow: isHearingSound ? '0 8px 40px rgba(0, 230, 118, 0.25)' : '0 8px 32px rgba(217, 22, 54, 0.15)', textAlign: 'center', position: 'relative',
          transition: 'all 0.3s'
        }}>
          {/* Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: isHearingSound ? 'rgba(0,230,118,0.2)' : 'rgba(0,230,118,0.1)',
            border: `1px solid ${isHearingSound ? '#00e676' : 'rgba(0,230,118,0.3)'}`,
            padding: '6px 16px', borderRadius: 20, marginBottom: 16, transition: 'all 0.3s'
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isHearingSound ? '#00e676' : '#00e676',
              boxShadow: isHearingSound ? '0 0 12px #00e676' : '0 0 8px #00e676',
              transform: isHearingSound ? 'scale(1.3)' : 'scale(1)',
              transition: 'all 0.2s'
            }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: '#00e676', letterSpacing: '.05em' }}>
              {isHearingSound ? 'HEARING VOICE NOW' : 'LISTENING 24/7'}
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
            Always active. Say a wake command or tap the microphone to interact instantly.
          </p>

          {/* Interactive Voice Mic Circle with Sound-Triggered Pulsing Ring */}
          <div 
            onClick={() => router.push('/voice-assistant')}
            style={{
              position: 'relative', cursor: 'pointer', margin: '8px 0 16px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', width: 110, height: 110
            }}
          >
            <div style={{
              position: 'absolute', width: 100, height: 100, borderRadius: '50%',
              background: isHearingSound ? 'rgba(0, 230, 118, 0.3)' : 'rgba(217, 22, 54, 0.25)',
              border: `2px solid ${isHearingSound ? '#00e676' : 'rgba(217, 22, 54, 0.4)'}`,
              boxShadow: isHearingSound ? '0 0 32px rgba(0,230,118,0.8)' : '0 0 16px rgba(217,22,54,0.4)',
              transform: isHearingSound ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.2s ease-in-out'
            }} />
            <button 
              onClick={() => router.push('/voice-assistant')}
              style={{
                position: 'relative', zIndex: 2, width: 72, height: 72, borderRadius: '50%',
                background: isHearingSound ? 'linear-gradient(135deg, #00e676, #00b0ff)' : 'linear-gradient(135deg, #D91636, #ff2d55)',
                border: '2px solid rgba(255,255,255,0.6)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isHearingSound ? '0 0 30px rgba(0,230,118,0.8)' : '0 0 24px rgba(217,22,54,0.6)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"></rect>
                <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            </button>
          </div>

          {/* Real-time Live Speech Caption Display Box (Enlarged) */}
          <div style={{
            margin: '16px 0', padding: '16px 20px', width: '100%',
            background: isHearingSound ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255,255,255,0.06)',
            border: `2px solid ${isHearingSound ? 'rgba(0, 230, 118, 0.8)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 16, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(16px, 2vw, 22px)',
              color: isHearingSound ? '#00e676' : 'var(--text-primary)',
              fontWeight: 700, letterSpacing: '0.5px'
            }}>
              {heardSpeech ? `HEARD: "${heardSpeech}"` : isHearingSound ? 'HEARING VOICE NOW...' : 'LISTENING 24/7... (Say "Wake Up" or "जाग जाओ")'}
            </span>
          </div>

          {/* Wake Words Hint Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'Space Grotesk'" }}>
              &quot;Wake Up&quot;
            </span>
            <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'Space Grotesk'" }}>
              &quot;Jaag Jao&quot;
            </span>
            <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'Space Grotesk'" }}>
              &quot;Hello&quot;
            </span>
          </div>

          <button
            onClick={() => router.push('/voice-assistant')}
            className="btn-continue-slide"
            style={{
              width: '100%', padding: '14px', background: '#D91636', color: '#fff', border: 'none', borderRadius: 32,
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(15px, 1.6vw, 18px)', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(217, 22, 54, 0.4)', transition: 'all 0.2s'
            }}
          >
            START VOICE ASSIST
          </button>
        </div>

        {/* Divider 2 */}
        <div style={{ width: 1, background: 'var(--border-color)', flexShrink: 0, alignSelf: 'stretch' }} className="mobile-hidden" />

        {/* SEGMENT 3 (RIGHT): Instant Telegram & WhatsApp QR Card + Gesture Toggle */}
        <div style={{ flex: '1 1 340px', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Dual QR Register Card (Telegram Bot API & WhatsApp Chat) */}
          <div style={{
            width: '100%', marginBottom: 20, background: 'var(--bg-card)',
            border: '1px solid rgba(0, 136, 204, 0.4)', borderRadius: 20, padding: '20px 16px',
            textAlign: 'center', boxShadow: '0 8px 32px rgba(0, 136, 204, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: '.05em', color: 'var(--text-primary)', margin: 0 }}>
                CHAT REGISTER (TELEGRAM &amp; WHATSAPP)
              </h3>
            </div>

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Scan QR to register via Telegram Bot API or WhatsApp &amp; receive instant appointment tickets!
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Telegram Bot API QR */}
              <div style={{
                background: 'rgba(0, 136, 204, 0.08)', border: '1px solid rgba(0, 136, 204, 0.3)',
                borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 130px'
              }}>
                <div style={{ background: '#fff', padding: 6, borderRadius: 10, marginBottom: 6 }}>
                  <QRCodeSVG value="https://t.me/MediVERSE_Health_Bot" size={90} level="H" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0088cc', fontWeight: 700, fontSize: 12, fontFamily: "'Space Grotesk'" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0088cc"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-2.07 9.77c-.15.68-.56.85-1.13.53l-3.17-2.34-1.53 1.47c-.17.17-.31.31-.64.31l.23-3.23 5.87-5.3c.25-.23-.06-.35-.39-.13l-7.25 4.56-3.13-.98c-.68-.21-.69-.68.14-1l12.24-4.72c.57-.21 1.07.13.89.86z"/></svg>
                  Telegram Bot
                </div>
              </div>

              {/* WhatsApp Chat QR */}
              <div style={{
                background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.3)',
                borderRadius: 14, padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1 1 130px'
              }}>
                <div style={{ background: '#fff', padding: 6, borderRadius: 10, marginBottom: 6 }}>
                  <QRCodeSVG value="https://wa.me/919876543210?text=Hi%20MediVERSE%20Register" size={90} level="H" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#25D366', fontWeight: 700, fontSize: 12, fontFamily: "'Space Grotesk'" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.999 1.591-1.148 4.192 4.294-1.126 1.598 1.002z"/></svg>
                  WhatsApp Chat
                </div>
              </div>
            </div>
          </div>

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

      {/* Speech Reaction Modal: "Are you saying something? / क्या आपने कुछ कहा?" */}
      {showSpeechPrompt && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 10000,
          background: 'rgba(15, 15, 20, 0.95)', border: '1px solid #D91636', borderRadius: 20,
          padding: '20px 28px', color: '#fff', width: '90%', maxWidth: 520, textAlign: 'center',
          boxShadow: '0 12px 40px rgba(217, 22, 54, 0.4)', backdropFilter: 'blur(16px)',
          animation: 'slideUp 0.3s ease-out'
        }}>
          <style>{`@keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00e676', boxShadow: '0 0 10px #00e676' }} />
            <span style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: '.05em', color: '#D91636' }}>
              HEARD SPEECH / आवाज़ सुनी गई
            </span>
          </div>

          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, margin: '4px 0 8px 0', color: '#fff' }}>
            &quot;Did you say something? / क्या आप कुछ कह रहे हैं?&quot;
          </p>

          {heardSpeech && (
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginBottom: 16 }}>
              Heard: &quot;{heardSpeech}&quot;
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => {
                if (heardSpeech) sessionStorage.setItem('initial_voice_query', heardSpeech);
                router.push('/voice-assistant');
              }}
              style={{
                padding: '10px 24px', background: '#D91636', color: '#fff', border: 'none',
                borderRadius: 24, fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(217,22,54,0.4)'
              }}
            >
              YES, HELP ME / हाँ, सहायता करें
            </button>
            <button
              onClick={() => setShowSpeechPrompt(false)}
              style={{
                padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#aaa',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, fontFamily: "'Space Grotesk'", fontSize: 14, cursor: 'pointer'
              }}
            >
              CANCEL / बंद करें
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
