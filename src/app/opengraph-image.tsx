import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const alt = 'MediVERSE - AYUSH Care, Made Simple'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
 
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#8C2F39',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FBF3F1',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: 40,
            background: 'rgba(251, 243, 241, 0.1)',
            marginBottom: 40
          }}
        >
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/>
            <path d="m18 15-2-2"/>
            <path d="m15 18-2-2"/>
          </svg>
        </div>
        <div style={{ fontSize: 100, fontWeight: 'bold', fontFamily: 'serif', letterSpacing: '-0.02em' }}>MediVERSE</div>
        <div style={{ fontSize: 40, marginTop: 24, opacity: 0.8, letterSpacing: '0.1em' }}>AYUSH CARE, MADE SIMPLE</div>
      </div>
    ),
    { ...size }
  )
}
