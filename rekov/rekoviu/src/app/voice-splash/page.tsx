'use client';

import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';

export default function VoiceSplashScreen() {
  const router = useRouter();

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <MediVERSENav currentModule="voice-splash" />

      <main style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center', position: 'relative'
      }}>
        {/* Glowing Background FX */}
        <div style={{
          position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(217, 22, 54, 0.15) 0%, transparent 60%)',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
          <h1 style={{
            fontFamily: "'Space Grotesk'", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800,
            color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '-0.02em'
          }}>
            Do you want to proceed to the Voice Assistant?
          </h1>
          <h2 style={{
            fontFamily: "'Space Grotesk'", fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 600,
            color: 'var(--text-secondary)', marginBottom: '4rem'
          }}>
            क्या आप वॉइस असिस्टेंट का उपयोग करना चाहते हैं?
          </h2>

          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/voice-assistant')}
              style={{
                padding: '20px 60px', background: '#D91636', color: '#fff', border: 'none', borderRadius: '50px',
                fontFamily: "'Space Grotesk'", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '.05em', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(217, 22, 54, 0.4)', transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              YES / हाँ
            </button>
            
            <button
              onClick={() => router.push('/kiosk')}
              style={{
                padding: '20px 60px', background: 'transparent', color: 'var(--text-primary)', border: '2px solid var(--border-color)', borderRadius: '50px',
                fontFamily: "'Space Grotesk'", fontSize: '1.5rem', fontWeight: 700, letterSpacing: '.05em', cursor: 'pointer',
                transition: 'background 0.2s ease, color 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              NO / ना
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
