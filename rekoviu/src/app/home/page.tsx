'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { useLanguage } from '@/contexts/LanguageContext';

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

  const prevSlide = () => setSlideIdx(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    const pollWhatsapp = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api/v1`;
        const res = await fetch(`${apiUrl}/kiosk/whatsapp/latest`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'found' && data.phone_number) {
            localStorage.setItem('whatsapp_phone', data.phone_number);
            setTranscript(`${t('understood')}: WhatsApp Check-In Detected`);
            setTimeout(() => router.push('/kiosk'), 1500);
          }
        }
      } catch (err) {
        // silently fail polling
      }
    };
    const interval = setInterval(pollWhatsapp, 10000);
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

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 16, left: 0, right: 0,
          display: 'flex', justifyContent: 'center'
        }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(12px, 1.2vw, 16px)',
            color: 'var(--text-muted)', letterSpacing: '.1em'
          }}>&#169; 2025 CureX</p>
        </div>
      </main>
    </>
  );
}
