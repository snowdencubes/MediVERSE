import type { Metadata } from 'next';
import './globals.css';
import { CursorEffect } from '@/components/common/CursorEffect';
import { BackgroundLayer } from '@/components/common/BackgroundLayer';
import { PageLoader } from '@/components/common/PageLoader';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GestureProvider } from '@/contexts/GestureContext';
import { GestureCursor } from '@/components/common/GestureCursor';

export const metadata: Metadata = {
  title: 'MediVERSE | Hospital Self-Service Kiosk',
  description: 'KFC-style hospital self-service kiosk. Express check-in, triage, and live queue management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <GestureProvider>
          <LanguageProvider>
            <PageLoader />
            <CursorEffect />
            <GestureCursor />
            <BackgroundLayer />
            <div className="bg-grain"></div>
            <div className="vignette"></div>
            <div id="wm" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18vw' }}>MediVERSE</div>
            <div style={{ position: 'relative', zIndex: 10 }}>
              {children}
            </div>
          </LanguageProvider>
        </GestureProvider>
      </body>
    </html>
  );
}
