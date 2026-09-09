'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RekovNav } from '@/components/common/RekovNav';
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

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [slideIdx, setSlideIdx] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const prevSlide = () => setSlideIdx(i => (i - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % FEATURE_SLIDES.length);

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
    const interval = setInterval(pollWhatsapp, 3000);
    return () => clearInterval(interval);
  }, [router, t]);

  const startVoice = async () => {
    if (isListening) {
      setIsListening(false);
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      recorder.onstart = () => {
        setIsListening(true);
        setTranscript(t('listening'));
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setTranscript(`${t('processing')}...`);
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000/api/v1`;
          const res = await fetch(`${apiUrl}/kiosk/voice-audio`, {
            method: 'POST',
            body: formData
          });
          
          const data = await res.json();
          if (res.ok && data.department_id) {
            setTranscript(`${t('understood')}: "${data.raw_text}"`);
            localStorage.setItem('voice_intent_dept', data.department_id);
            localStorage.setItem('voice_intent_issue', data.issue || '');
            localStorage.setItem('voice_intent_emergency', data.is_emergency ? 'true' : 'false');
            setTimeout(() => router.push('/kiosk'), 2000);
          } else {
            setTranscript(t('network_error') + " " + (data.detail || ''));
            setTimeout(() => setTranscript(''), 3000);
          }
        } catch (err) {
          setTranscript(t('network_error'));
          setTimeout(() => setTranscript(''), 3000);
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
    } catch (e) {
      console.error(e);
      alert('Microphone access denied or error starting recording.');
    }
  };

  return (
    <>
      <RekovNav currentModule="home" />

      <main style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '80px 24px 100px', textAlign: 'center'
      }}>

        {/* WhatsApp Zero-Touch Check-in */}
        <div style={{
          position: 'absolute', top: '50%', right: 24, transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid #ff2d55',
          boxShadow: '0 8px 24px rgba(255,45,85,0.2)'
        }}>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: '#ff2d55', letterSpacing: '.1em', marginBottom: 8 }}>
            Zero-Touch Check-In
          </p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://wa.me/15551234567?text=Check%20me%20in&color=ffffff&bgcolor=111111" alt="WhatsApp QR" width={120} height={120} style={{ borderRadius: 8, marginBottom: 8 }} />
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: 'var(--text-secondary)' }}>Scan with WhatsApp to check in</p>
        </div>



        {/* Main Action Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, width: '100%', maxWidth: 800, marginBottom: 48
        }}>
          {/* Card 1: Kiosk */}
          <Link href="/kiosk" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '36px 24px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', textDecoration: 'none',
            transition: 'background .2s, border-color .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,85,.12)'; e.currentTarget.style.borderColor = '#ff2d55' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            <span style={{ fontSize: 28, color: '#ff2d55', marginBottom: 12 }}>&#9672;</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
              letterSpacing: '.1em', color: 'var(--text-primary)'
            }}>{t('check_in')}</span>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
              color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '.05em'
            }}>{t('manual_entry')}</span>
          </Link>

          {/* Card 2: Status */}
          <Link href="/status" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '36px 24px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', textDecoration: 'none',
            transition: 'background .2s, border-color .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            <span style={{ fontSize: 28, color: 'var(--text-primary)', marginBottom: 12 }}>&#9678;</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
              letterSpacing: '.1em', color: 'var(--text-primary)'
            }}>{t('status_check')}</span>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
              color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '.05em'
            }}>{t('token_lookup')}</span>
          </Link>

          {/* Card 3: Schedules */}
          <Link href="/schedules" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '36px 24px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', textDecoration: 'none',
            transition: 'background .2s, border-color .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            <span style={{ fontSize: 28, color: 'var(--text-primary)', marginBottom: 12 }}>&#9638;</span>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
              letterSpacing: '.1em', color: 'var(--text-primary)'
            }}>{t('schedules')}</span>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 11,
              color: 'var(--text-secondary)', marginTop: 8, letterSpacing: '.05em'
            }}>{t('doctor_timings')}</span>
          </Link>
        </div>

        {/* Feature Slides */}
        <div style={{
          width: '100%', maxWidth: 500, position: 'relative',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          padding: '28px 48px', minHeight: 100
        }}>
          <button onClick={prevSlide} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 20, cursor: 'pointer', padding: 4
          }}>&#8249;</button>

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
              fontWeight: 700, color: '#ff2d55', letterSpacing: '.05em', marginBottom: 6
            }}>{FEATURE_SLIDES[slideIdx].title}</p>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12,
              color: 'var(--text-secondary)', lineHeight: 1.6
            }}>{FEATURE_SLIDES[slideIdx].desc}</p>
          </div>

          <button onClick={nextSlide} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            fontSize: 20, cursor: 'pointer', padding: 4
          }}>&#8250;</button>
        </div>

        {/* Dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {FEATURE_SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlideIdx(i)} style={{
              width: i === slideIdx ? 24 : 8, height: 4, borderRadius: 2,
              background: i === slideIdx ? '#ff2d55' : 'var(--border-color)',
              border: 'none', cursor: 'pointer', transition: 'width .3s, background .3s'
            }} />
          ))}
        </div>

        {/* Floating Voice Button */}
        <div style={{ position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button onClick={startVoice} style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isListening ? '#ff2d55' : 'var(--bg-card)',
            border: `1px solid ${isListening ? '#ff2d55' : 'var(--border-color)'}`,
            color: isListening ? '#fff' : 'var(--text-primary)',
            cursor: 'pointer', outline: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isListening ? '0 0 24px rgba(255,45,85,0.5)' : '0 4px 16px rgba(0,0,0,0.3)',
            transition: 'all .3s ease',
            backdropFilter: 'blur(12px)'
          }}>
             <span style={{ animation: isListening ? 'pulse 1.5s infinite' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               {isListening ? (
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <rect x="9" y="2" width="6" height="11" rx="3"></rect>
                   <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
                   <line x1="12" y1="19" x2="12" y2="22"></line>
                   <line x1="8" y1="22" x2="16" y2="22"></line>
                 </svg>
               ) : (
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <rect x="9" y="2" width="6" height="11" rx="3"></rect>
                   <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
                   <line x1="12" y1="19" x2="12" y2="22"></line>
                   <line x1="8" y1="22" x2="16" y2="22"></line>
                 </svg>
               )}
             </span>
          </button>
          {transcript && (
             <div style={{ 
               position: 'absolute', top: '100%', marginTop: 16,
               background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 20px', 
               borderRadius: 24, fontSize: 14, fontFamily: "'Space Grotesk'", 
               backdropFilter: 'blur(10px)', border: '1px solid var(--border-color)', 
               width: 'max-content', maxWidth: 320, textAlign: 'center', animation: 'fadeIn 0.2s', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
             }}>
                {transcript}
             </div>
          )}
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: 24, left: 0, right: 0,
          display: 'flex', justifyContent: 'center'
        }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 10,
            color: 'var(--text-muted)', letterSpacing: '.1em'
          }}>&#169; 2025 REKOV SYSTEMS</p>
        </div>
      </main>
    </>
  );
}
