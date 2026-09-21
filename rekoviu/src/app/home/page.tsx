'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { useLanguage } from '@/contexts/LanguageContext';
import { speakBilingualText, cancelCurrentTTS } from '@/services/tts';

const FEATURE_SLIDES = [
  {
    title: 'Express Check-In',
    desc: 'Walk in, tap the screen, select a department and doctor. Token issued in under 60 seconds.',
  },
  {
    title: 'Smart Triage Scoring',
    desc: 'Enter vitals at the kiosk. Emergency cases are automatically bumped to priority queue.',
  },
  {
    title: 'Live Queue Board',
    desc: 'Waiting room TV displays live token status. Audio call when your token is next.',
  },
  {
    title: 'Health Combo Packages',
    desc: 'Add lab tests and screening combos at check-in. Pre-bundled for speed.',
  },
  {
    title: 'Offline-First Database',
    desc: 'System works without internet. Syncs to cloud the moment connectivity returns.',
  },
];

const cardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '36px 24px', background: 'var(--bg-card)',
  border: '1px solid var(--border-color)', textDecoration: 'none',
  transition: 'background .2s, border-color .2s', cursor: 'pointer'
};

export default function Home() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  const getFallbackLang = (l: string) => {
    if (l === 'EN') return 'HI';
    if (['HI', 'BN', 'SAT', 'KVN', 'HOC', 'UNW', 'TA', 'TE', 'MR', 'GU', 'UR', 'KN', 'ML', 'PA'].includes(l)) {
      if (l === 'HI') return 'EN';
      return 'HI';
    }
    return 'EN';
  };
  const subLang = getFallbackLang(lang) as any;



  const [slideIdx, setSlideIdx] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [wakePromptOpen, setWakePromptOpen] = useState(false);
  const [lastSpokenPhrase, setLastSpokenPhrase] = useState('');
  const [isHearingSound, setIsHearingSound] = useState(false);
  const [micUnlocked, setMicUnlocked] = useState(false);
  const [isActivelyListening, setIsActivelyListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const wakePromptOpenRef = useRef(false);
  const isSpeakingTTSRef = useRef(false);
  const shouldListenRef = useRef(true);
  const lastSpokenPhraseRef = useRef('');
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [wakeWords, setWakeWords] = useState<string[]>([
    'wake up', 'hello', 'jaag jao', 'jaag jao prashant', 'wake up prashant', 'hey prashant', 'prashant', 'mediverse', 'rekov'
  ]);
  const [confirmWords, setConfirmWords] = useState<string[]>([
    'yes', 'haan', 'ha', 'sure', 'continue', 'ok', 'okay', 'proceed', 'help', 'assist', 'aage badho', 'chalo'
  ]);
  const dismissWords = [
    'no', 'nahi', 'nahin', 'cancel', 'stop', 'mat karo', 'ruko', 'back', 'close', 'dismiss', 'leave'
  ];

  // Load keywords dynamically from backend
  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
    fetch(`${apiUrl}/ai_voice/keywords`)
      .then(r => r.json())
      .then(d => {
        if (d.wake_words) setWakeWords(d.wake_words);
        if (d.confirm_words) setConfirmWords(d.confirm_words);
      })
      .catch(() => {});
  }, []);

  // Update refs when state changes so event listeners always have fresh state without re-binding
  useEffect(() => {
    wakePromptOpenRef.current = wakePromptOpen;
  }, [wakePromptOpen]);

  const speakPrompt = () => {
    isSpeakingTTSRef.current = true;
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (e) {}

    speakBilingualText({
      text: "Did you say something? Say Yes or Proceed to continue, or No to cancel. क्या आपने कुछ कहा? आगे बढ़ने के लिए Yes कहें।",
      lang: lang === 'HI' ? 'hi-IN' : 'en-IN',
      onStart: () => {
        isSpeakingTTSRef.current = true;
      },
      onEnd: () => {
        isSpeakingTTSRef.current = false;
        safeStart();
      },
      onError: () => {
        isSpeakingTTSRef.current = false;
        safeStart();
      }
    });
  };

  const safeStart = () => {
    if (!shouldListenRef.current || isSpeakingTTSRef.current) return;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (e: any) {
      // Ignore if already started
    }
  };

  // Mic activation handler — called once from the overlay or any user gesture
  const unlockMic = () => {
    if (micUnlocked) return;
    setMicUnlocked(true);
    safeStart();
  };

  // 24/7 Hands-Free Speech Recognition Listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    shouldListenRef.current = true;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    const selfEchoPhrases = [
      'did you say something', 'proceed yes or no', 'क्या आपने कुछ कहा', 'आगे बढ़ने के लिए yes कहें',
      'say yes or proceed', 'to continue or no to cancel'
    ];

    recognition.onsoundstart = () => { setIsHearingSound(true); setIsActivelyListening(true); };
    recognition.onsoundend = () => setIsHearingSound(false);

    recognition.onresult = (event: any) => {
      if (isSpeakingTTSRef.current) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (!text) continue;
        const lower = text.toLowerCase();

        // Ignore echo of system voice
        if (selfEchoPhrases.some(phrase => lower.includes(phrase))) {
          continue;
        }

        setTranscript(text);

        // CASE 1: Confirmation Prompt is ALREADY open
        if (wakePromptOpenRef.current) {
          const isConfirm = confirmWords.some(c => lower.includes(c.toLowerCase()));
          const isDismiss = dismissWords.some(d => lower.includes(d.toLowerCase()));

          if (isConfirm) {
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
            setWakePromptOpen(false);
            wakePromptOpenRef.current = false;
            sessionStorage.setItem('initial_voice_query', lastSpokenPhraseRef.current || text);
            router.push('/voice-assistant');
            return;
          } else if (isDismiss) {
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
            setWakePromptOpen(false);
            wakePromptOpenRef.current = false;
            cancelCurrentTTS();
            return;
          }
        }

        // CASE 2: Confirmation Prompt is NOT open yet
        // Check for direct medical queries / symptom phrases that can jump straight to assistant
        const directPhrases = [
          'doctor', 'fever', 'bukhar', 'headache', 'chest pain', 'heart', 'appointment', 'ticket',
          'check in', 'checkin', 'emergency', 'asthma', 'pediatric', 'dard', 'pain', 'vomit'
        ];
        const isDirect = directPhrases.some(dp => lower.includes(dp)) || wakeWords.some(w => lower.includes(w.toLowerCase()));

        if (isDirect) {
          sessionStorage.setItem('initial_voice_query', text);
          router.push('/voice-assistant');
          return;
        }

        // Ambient speech heard from someone nearby: Ask "Did you say something? Proceed yes or no?"
        if (!wakePromptOpenRef.current && text.length > 2) {
          lastSpokenPhraseRef.current = text;
          setLastSpokenPhrase(text);
          setWakePromptOpen(true);
          wakePromptOpenRef.current = true;
          speakPrompt();

          // Auto-close if no answer in 10s
          if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
          autoCloseTimerRef.current = setTimeout(() => {
            if (wakePromptOpenRef.current) {
              setWakePromptOpen(false);
              wakePromptOpenRef.current = false;
            }
          }, 10000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      setIsActivelyListening(false);
      if (event.error !== 'not-allowed' && shouldListenRef.current && !isSpeakingTTSRef.current) {
        setTimeout(safeStart, 1000);
      }
    };

    recognition.onend = () => {
      setIsActivelyListening(false);
      if (shouldListenRef.current && !isSpeakingTTSRef.current) {
        setTimeout(safeStart, 400);
      }
    };

    // Watchdog Timer: keeps listening alive 24/7
    const watchdog = setInterval(() => {
      if (shouldListenRef.current && !isSpeakingTTSRef.current) {
        safeStart();
      }
    }, 3000);

    // Kiosk touch-to-unlock audio/mic — every click/touch also unlocks
    const handleUnlock = () => {
      if (!micUnlocked) setMicUnlocked(true);
      safeStart();
    };
    window.addEventListener('touchstart', handleUnlock, { passive: true });
    window.addEventListener('click', handleUnlock, { passive: true });

    // DON'T call safeStart() here — wait for user gesture via overlay or click

    return () => {
      shouldListenRef.current = false;
      clearInterval(watchdog);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      window.removeEventListener('touchstart', handleUnlock);
      window.removeEventListener('click', handleUnlock);
      try { recognition.stop(); } catch (e) {}
    };
  }, [router, wakeWords, confirmWords, micUnlocked]);

  const prevSlide = () => setSlideIdx(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 30-second idle timer to auto-load Queue Board TV display
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        router.push('/queue-board');
      }, 30000); // 30 seconds idle
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [router]);


  useEffect(() => {
    const pollCheckin = async () => {
      try {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;
        
        // Check WhatsApp
        let res = await fetch(`${apiUrl}/kiosk/whatsapp/latest`);
        if (res.ok) {
          let data = await res.json();
          if (data.status === 'found' && data.phone_number) {
            localStorage.setItem('whatsapp_phone', data.phone_number);
            setTranscript(`${t('understood')}: WhatsApp Check-In Detected`);
            setTimeout(() => router.push('/kiosk'), 1500);
            return;
          }
        }

        // Check Telegram
        res = await fetch(`${apiUrl}/kiosk/telegram/latest`);
        if (res.ok) {
          let data = await res.json();
          if (data.status === 'found' && data.phone_number) {
            localStorage.setItem('whatsapp_phone', data.phone_number);
            if (data.name) localStorage.setItem('telegram_name', data.name);
            if (data.symptoms) localStorage.setItem('telegram_symptoms', data.symptoms);

            setTranscript(`${t('understood')}: Telegram Check-In Detected`);
            setTimeout(() => router.push('/kiosk'), 1500);
            return;
          }
        }
      } catch (err) {
        // silently fail polling
      }
    };
    const interval = setInterval(pollCheckin, 10000);
    return () => clearInterval(interval);
  }, [router, t]);

  const hoverOn = (e: React.MouseEvent<HTMLElement>, accent = false) => {
    e.currentTarget.style.background = accent ? 'rgba(255,45,85,.12)' : 'var(--bg-hover)';
    e.currentTarget.style.borderColor = accent ? '#D91636' : 'var(--text-primary)';
  };
  const hoverOff = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = 'var(--bg-card)';
    e.currentTarget.style.borderColor = 'var(--border-color)';
  };

  return (
    <>
      <MediVERSENav currentModule="home" />

      {/* Mic Activation Overlay — one tap unlocks 24/7 listening */}
      {!micUnlocked && (
        <div
          onClick={unlockMic}
          onTouchStart={unlockMic}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 24, textAlign: 'center'
          }}
        >
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(217,22,54,0.12)', border: '3px solid #D91636',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 28, boxShadow: '0 0 60px rgba(217,22,54,0.3)',
            animation: 'pulse 1.8s ease-in-out infinite'
          }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#D91636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"></rect>
              <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
              <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue'", fontSize: 'clamp(36px, 6vw, 56px)',
            color: '#fff', letterSpacing: '0.08em', marginBottom: 12, lineHeight: 1
          }}>
            TAP TO ACTIVATE VOICE
          </h2>
          <p style={{
            fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 2vw, 22px)',
            color: '#D91636', fontWeight: 600, marginBottom: 6
          }}>
            आवाज़ सक्रिय करने के लिए टैप करें
          </p>
          <p style={{
            fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.4vw, 17px)',
            color: 'rgba(255,255,255,0.5)', maxWidth: 420, lineHeight: 1.5, marginTop: 16
          }}>
            One tap enables hands-free listening. The kiosk will hear your voice 24/7.
          </p>
        </div>
      )}

      {/* Floating Mic Status Indicator */}
      {micUnlocked && !wakePromptOpen && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9998,
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          border: `1px solid ${isActivelyListening ? 'rgba(217,22,54,0.6)' : 'rgba(255,255,255,0.15)'}`,
          padding: '10px 18px', borderRadius: 32,
          boxShadow: isActivelyListening ? '0 0 20px rgba(217,22,54,0.3)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: isActivelyListening ? '#D91636' : isHearingSound ? '#F5A623' : '#4CD964',
            boxShadow: isActivelyListening ? '0 0 8px rgba(217,22,54,0.8)' : 'none',
            animation: isActivelyListening ? 'pulse 1s infinite' : 'none'
          }} />
          <span style={{
            fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
            color: isActivelyListening ? '#D91636' : 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase'
          }}>
            {isActivelyListening ? (isHearingSound ? 'HEARING VOICE...' : 'LISTENING 24/7') : 'MIC READY'}
          </span>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.85; }
        }
      `}} />

      <main className="relative z-10 min-h-screen w-full flex flex-col justify-start md:justify-center items-center px-4 pt-24 md:pt-32 pb-16 text-center overflow-x-hidden overflow-y-auto">

        {/* Main Action Cards: Responsive */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="w-full max-w-6xl mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-[1px] bg-white/10 border border-white/10 shadow-2xl"
        >
          {/* Card 1: Check-In */}
          <Link href="/kiosk" className="group flex flex-col items-center justify-center p-6 bg-black/60 hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-white transition-all cursor-pointer relative text-decoration-none text-center">
            <span className="text-3xl text-[#D91636] mb-4 drop-shadow-[0_0_8px_rgba(217,22,54,0.5)]">&#9672;</span>
            <div className="flex flex-col items-center">
              <span className="font-['Bebas_Neue'] text-2xl lg:text-3xl tracking-widest text-white">{t('check_in')}</span>
              <span className="font-['Space_Grotesk'] text-sm lg:text-base text-white/50 tracking-wider mt-1">{t('manual_entry', subLang)}</span>
            </div>
          </Link>

          {/* Card 2: Status Check */}
          <Link href="/status" className="group flex flex-col items-center justify-center p-6 bg-black/60 hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-white transition-all cursor-pointer relative text-decoration-none text-center">
            <span className="text-3xl text-white mb-4 opacity-80">&#9678;</span>
            <div className="flex flex-col items-center">
              <span className="font-['Bebas_Neue'] text-2xl lg:text-3xl tracking-widest text-white">{t('status_check')}</span>
              <span className="font-['Space_Grotesk'] text-sm lg:text-base text-white/50 tracking-wider mt-1">{t('token_lookup', subLang)}</span>
            </div>
          </Link>

          {/* Card 3: Schedules */}
          <Link href="/schedules" className="group flex flex-col items-center justify-center p-6 bg-black/60 hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-white transition-all cursor-pointer relative text-decoration-none text-center">
            <span className="text-3xl text-white mb-4 opacity-80">&#9638;</span>
            <div className="flex flex-col items-center">
              <span className="font-['Bebas_Neue'] text-2xl lg:text-3xl tracking-widest text-white">{t('schedules')}</span>
              <span className="font-['Space_Grotesk'] text-sm lg:text-base text-white/50 tracking-wider mt-1">{t('doctor_timings', subLang)}</span>
            </div>
          </Link>

          {/* Card 4: Voice Assistant */}
          <div onClick={() => router.push('/voice-assistant')} className="group flex flex-col items-center justify-center p-6 bg-black/60 hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-white transition-all cursor-pointer relative text-center">
            <span className="flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D91636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(217,22,54,0.5)]">
                <rect x="9" y="2" width="6" height="11" rx="3"></rect>
                <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            </span>
            <div className="flex flex-col items-center">
              <span className="font-['Bebas_Neue'] text-2xl lg:text-3xl tracking-widest text-white">{t('voice_assist')}</span>
              <span className="font-['Space_Grotesk'] text-sm lg:text-base text-white/50 tracking-wider mt-1">{t('speak_naturally', subLang)}</span>
            </div>
          </div>

          {/* Card 5: QR Zero-Touch */}
          <div className="col-span-2 md:col-span-1 group flex flex-col items-center justify-center p-6 bg-black/60 hover:bg-transparent hover:ring-1 hover:ring-inset hover:ring-white transition-all cursor-pointer relative text-center">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://wa.me/15551234567?text=Check%20me%20in&color=ff2d55&bgcolor=111111" 
              alt="WhatsApp QR" width={64} height={64} 
              className="mb-4 border border-white/20 transition-transform group-hover:scale-105 duration-300 w-16 h-16" 
            />
            <div className="flex flex-col items-center">
              <span className="font-['Bebas_Neue'] text-2xl lg:text-3xl tracking-widest text-white">{t('qr_check_in')}</span>
              <span className="font-['Space_Grotesk'] text-sm lg:text-base text-white/50 tracking-wider mt-1">{t('scan_whatsapp', subLang)}</span>
            </div>
          </div>
        </motion.div>

        {/* Feature Slides */}
        <div className="w-full max-w-[500px] relative bg-black/40 border border-white/10 p-6 md:p-8 min-h-[140px] flex items-center justify-center overflow-hidden">
          <button onClick={prevSlide} className="absolute left-2 md:left-4 z-20 text-white/50 hover:text-white text-3xl cursor-pointer bg-transparent border-none p-2">&#8249;</button>
          
          <div className="text-center w-full px-8 relative flex items-center justify-center min-h-[80px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute w-full"
              >
                <p className="font-['Space_Grotesk'] text-[clamp(15px,1.6vw,19px)] font-bold text-[#D91636] tracking-wider mb-2">
                  {FEATURE_SLIDES[slideIdx].title}
                </p>
                <p className="font-['Space_Grotesk'] text-[clamp(13px,1.3vw,17px)] text-white/60 leading-relaxed">
                  {FEATURE_SLIDES[slideIdx].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <button onClick={nextSlide} className="absolute right-2 md:right-4 z-20 text-white/50 hover:text-white text-3xl cursor-pointer bg-transparent border-none p-2">&#8250;</button>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-4">
          {FEATURE_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} style={{
              width: i === slideIdx ? 24 : 8, height: 4,
              background: i === slideIdx ? '#D91636' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', transition: 'all .3s ease'
            }} />
          ))}
        </div>

        {/* Transcript Popup */}
        {transcript && (
          <div style={{ 
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
            background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 20px', 
            borderRadius: 24, fontSize: 'clamp(16px, 1.7vw, 20px)', fontFamily: "'Space Grotesk'", 
            backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', 
            width: 'max-content', maxWidth: 320, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            {transcript}
          </div>
        )}

        {/* Wake Phrase Overlay */}
        {/* Voice Confirmation Overlay */}
        {wakePromptOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24, textAlign: 'center', backdropFilter: 'blur(12px)'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(217,22,54,0.15)', border: '2px solid #D91636',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, boxShadow: '0 0 30px rgba(217,22,54,0.4)',
              animation: 'pulse 1.5s infinite'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D91636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"></rect>
                <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
                <line x1="8" y1="22" x2="16" y2="22"></line>
              </svg>
            </div>

            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 'clamp(32px, 5vw, 48px)', color: '#fff', letterSpacing: '0.05em', marginBottom: 8 }}>
              DID YOU SAY SOMETHING?
            </h2>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 2vw, 22px)', color: '#D91636', fontWeight: 600, marginBottom: 8 }}>
              क्या आपने कुछ कहा?
            </p>

            {lastSpokenPhrase && (
              <div style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                padding: '8px 16px', borderRadius: 8, marginBottom: 16, maxWidth: 440
              }}>
                <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: '#aaa', margin: 0, fontStyle: 'italic' }}>
                  Heard: &quot;{lastSpokenPhrase}&quot;
                </p>
              </div>
            )}

            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: '#ccc', marginBottom: 28, maxWidth: 480, lineHeight: 1.5 }}>
              Hands-Free Active: Speak aloud <strong style={{ color: '#fff' }}>&quot;YES&quot;</strong> or <strong style={{ color: '#fff' }}>&quot;PROCEED&quot;</strong> to start, or <strong style={{ color: '#fff' }}>&quot;NO&quot;</strong> to cancel.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setWakePromptOpen(false);
                  sessionStorage.setItem('initial_voice_query', lastSpokenPhrase || 'Hello');
                  router.push('/voice-assistant');
                }}
                style={{
                  padding: '14px 28px', background: '#D91636', color: '#fff', border: 'none',
                  fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: '0.05em', cursor: 'pointer',
                  borderRadius: 6, boxShadow: '0 4px 16px rgba(217,22,54,0.4)'
                }}
              >
                PROCEED (SAY &quot;YES&quot;)
              </button>
              <button
                onClick={() => {
                  setWakePromptOpen(false);
                  cancelCurrentTTS();
                }}
                style={{
                  padding: '14px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                  fontFamily: "'Space Grotesk'", fontSize: 16, cursor: 'pointer', borderRadius: 6
                }}
              >
                CANCEL (SAY &quot;NO&quot;)
              </button>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center'
        }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(12px, 1.2vw, 16px)',
            color: 'var(--text-muted)', letterSpacing: '.1em'
          }}>&#169; 2025 MediVERSE | Built by pheonix14</p>
        </div>
      </main>
    </>
  );
}
