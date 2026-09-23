import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QueueTicket } from '@/types';
import { StatusBadge } from '../common/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface TicketModalProps {
  ticket: QueueTicket | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = React.useState('');

  React.useEffect(() => {
    if (ticket && typeof window !== 'undefined') {
      setQrUrl(ticket.receipt_pdf_url || `${window.location.protocol}//${window.location.host}/receipt?id=${ticket.ticket_id}`);
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleDownload = async () => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `MediVERSE-ticket-${ticket.ticket_id}.png`;
      link.click();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: 'var(--bg-main)', border: '1px solid var(--border-color)',
        width: '100%', maxWidth: 420, position: 'relative', overflow: 'hidden'
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, width: 32, height: 32,
          background: 'var(--bg-hover)', border: '1px solid var(--border-color)',
          color: 'var(--text-secondary)', fontSize: 'clamp(18px, 1.9vw, 22px)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
        }}>&times;</button>

        {/* Success Header */}
        <div style={{
          background: '#D91636', padding: '40px 32px', textAlign: 'center', position: 'relative'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.2)',
            margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff'
          }}>{'\u2713'}</div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: '#fff', letterSpacing: '.06em' }}>CHECK-IN COMPLETE</h2>
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'rgba(255,255,255,.7)', marginTop: 4 }}>Please take your ticket</p>
        </div>

        {/* Receipt wrapper to capture */}
        <div ref={receiptRef}>
          {/* Receipt */}
          <div style={{ background: '#fff', color: '#000', padding: '32px 28px', position: 'relative' }}>
            {/* Zig-zag */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: 'var(--bg-main)',
              clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0)'
            }} />

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', fontWeight: 700, color: '#999', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR TOKEN NUMBER</p>
              <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 56, color: '#000', letterSpacing: '.04em', lineHeight: 1, marginBottom: 8 }}>{ticket.token_number}</h1>
              <StatusBadge type={ticket.priority_level} />
            </div>

            <div>
              {[
                ['Reference ID', ticket.ticket_id],
                ['Patient', ticket.patient_name],
                ['Department', ticket.department_name],
                ['Doctor', ticket.doctor_name],
                ['Room', ticket.room_number],
                ['Est. Call Time', ticket.estimated_call_time],
              ].map(([label, value]) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid #eee',
                  fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)'
                }}>
                  <span style={{ color: '#888' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: '#000', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeSVG 
                value={qrUrl || 'generating...'} 
                size={100} 
                style={{ marginBottom: 16 }} 
              />
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(11px, 1.1vw, 15px)', color: '#999', letterSpacing: '.1em', textTransform: 'uppercase' }}>Scan QR to view/download PDF receipt</p>
            </div>
          </div>
        </div>

        {/* Voice Assistant Prompt: Ask Yes or No to proceed to voice assistant for future help */}
        <div style={{
          padding: '14px 16px', background: 'rgba(217, 22, 54, 0.08)',
          borderTop: '1px solid var(--border-color)', textAlign: 'center'
        }}>
          <p style={{
            fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 14px)',
            fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8
          }}>
            Need help or directions? Proceed to AI Voice Assistant?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('current_ticket', JSON.stringify(ticket));
                }
                router.push(`/voice-assistant?ticket=${ticket.ticket_id}&pdf=${encodeURIComponent(qrUrl)}`);
              }}
              style={{
                flex: 1, padding: '10px 12px', background: '#D91636', color: '#fff', border: 'none',
                fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 700,
                letterSpacing: '.05em', cursor: 'pointer'
              }}
            >
              YES &#8594; VOICE ASSISTANT
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 12px', background: 'transparent', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)', fontFamily: "'Space Grotesk'",
                fontSize: 'clamp(12px, 1.2vw, 14px)', fontWeight: 700, letterSpacing: '.05em', cursor: 'pointer'
              }}
            >
              NO, FINISH
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12 }}>
          <button onClick={handleDownload} style={{
            flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer'
          }}>DOWNLOAD</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '16px', background: '#D91636', border: 'none',
            color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer'
          }}>FINISH</button>
        </div>
      </div>
    </div>
  );
};
