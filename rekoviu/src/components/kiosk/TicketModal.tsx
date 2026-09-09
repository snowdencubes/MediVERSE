import React, { useRef } from 'react';
import { QueueTicket } from '@/types';
import { StatusBadge } from '../common/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface TicketModalProps {
  ticket: QueueTicket | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!ticket) return null;

  const handleDownload = async () => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `rekov-ticket-${ticket.ticket_id}.png`;
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
          color: 'var(--text-secondary)', fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
        }}>&times;</button>

        {/* Success Header */}
        <div style={{
          background: '#ff2d55', padding: '40px 32px', textAlign: 'center', position: 'relative'
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,.2)',
            margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: '#fff'
          }}>{'\u2713'}</div>
          <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: '#fff', letterSpacing: '.06em' }}>CHECK-IN COMPLETE</h2>
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 4 }}>Please take your ticket</p>
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
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR TOKEN NUMBER</p>
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
                  fontFamily: "'Space Grotesk'", fontSize: 12
                }}>
                  <span style={{ color: '#888' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: '#000', textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <QRCodeSVG 
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/receipt?id=${ticket.ticket_id}`} 
                size={100} 
                style={{ marginBottom: 16 }} 
              />
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 9, color: '#999', letterSpacing: '.1em', textTransform: 'uppercase' }}>Scan QR to save your receipt</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12 }}>
          <button onClick={handleDownload} style={{
            flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--border-color)',
            color: 'var(--text-primary)', fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer'
          }}>DOWNLOAD</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '16px', background: '#ff2d55', border: 'none',
            color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700,
            letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer'
          }}>FINISH</button>
        </div>
      </div>
    </div>
  );
};
