import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#8C2F39',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FBF3F1',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: 22,
          fontFamily: 'serif'
        }}
      >
        M
      </div>
    ),
    { ...size }
  )
}
