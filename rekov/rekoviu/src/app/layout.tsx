import type { Metadata } from 'next';
import './globals.css';
import { CursorEffect } from '@/components/common/CursorEffect';
import { BackgroundLayer } from '@/components/common/BackgroundLayer';
import { PageLoader } from '@/components/common/PageLoader';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GestureProvider } from '@/contexts/GestureContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { GestureCursor } from '@/components/common/GestureCursor';
import { VoiceCallProvider } from '@/contexts/VoiceCallContext';

export const metadata: Metadata = {
  title: 'MediVERSE | Hospital Self-Service Kiosk',
  description: 'KFC-style hospital self-service kiosk. Express check-in, triage, and live queue management.',
  icons: { icon: '/icon.jpg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Intercept and suppress third-party browser extension crashes from triggering Next.js dev overlay
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  var fn = e.filename || '';
                  var msg = e.message || '';
                  if (
                    fn.indexOf('chrome-extension:') !== -1 ||
                    fn.indexOf('moz-extension:') !== -1 ||
                    msg.indexOf('M_ID') !== -1 ||
                    (msg.indexOf('Cannot read properties of undefined') !== -1 && fn.indexOf('executors') !== -1)
                  ) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var r = (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason || '');
                  if (r.indexOf('chrome-extension:') !== -1 || r.indexOf('M_ID') !== -1) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return true;
                  }
                }, true);
              }
            `,
          }}
        />
      </head>
      <body>
        <GestureProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <VoiceCallProvider>
                <PageLoader />
                <CursorEffect />
                <GestureCursor />
                <BackgroundLayer />
                <div className="bg-grain"></div>
                <div className="vignette"></div>
                <div id="wm" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '20vw', position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, pointerEvents: 'none', zIndex: 0 }}>RITMO</div>
                <div style={{ position: 'relative', zIndex: 10 }}>
                  {children}
                </div>
              </VoiceCallProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </GestureProvider>
      </body>
    </html>
  );
}
