'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QueueTicket } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useSearchParams, useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';

function ReceiptContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();

  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Helper to try loading from localStorage
    const tryLocalStorage = () => {
      try {
        const savedStr = localStorage.getItem('current_ticket');
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (parsed && (parsed.ticket_id || parsed.token_number)) {
            setTicket(parsed);
            return true;
          }
        }
      } catch (e) {
        console.error('LocalStorage parse error', e);
      }
      return false;
    };

    if (!id) {
      if (!tryLocalStorage()) setError(true);
      return;
    }

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:8000/api/v1`;

    fetch(`${apiUrl}/queue/ticket/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        setTicket(d);
        localStorage.setItem('current_ticket', JSON.stringify(d));
      })
      .catch((err) => {
        console.warn('API ticket lookup failed, attempting local fallback:', err);
        if (!tryLocalStorage()) {
          setError(true);
        }
      });
  }, [id]);

  const generatePDF = async () => {
    if (!receiptRef.current || !ticket) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`MediVERSE-receipt-${ticket.ticket_id || ticket.token_number}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setDownloading(false);
    }
  };

  const sendToWhatsApp = () => {
    if (!ticket) return;
    const phone = localStorage.getItem('whatsapp_phone') || '';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `🏥 *MediVERSE Digital Receipt*\n` +
      `🎟️ *Token:* ${ticket.token_number}\n` +
      `👤 *Patient:* ${ticket.patient_name}\n` +
      `🏢 *Dept:* ${ticket.department_name}\n` +
      `👨‍⚕️ *Doctor:* ${ticket.doctor_name} (${ticket.room_number})\n` +
      `⏱️ *Est. Wait:* ${ticket.estimated_call_time}\n` +
      `🔗 *Receipt Link:* ${window.location.href}`
    );
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    setWhatsappSent(true);
  };

  if (error) {
    return (
      <>
        <MediVERSENav currentModule="home" />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'", textAlign: 'center', padding: 20 }}>
          <h2 style={{ fontSize: 24, marginBottom: 12, color: '#D91636' }}>Receipt Not Available</h2>
          <p style={{ color: '#888', marginBottom: 24 }}>The ticket session could not be found or has expired.</p>
          <button 
            onClick={() => router.push('/kiosk')}
            style={{ padding: '12px 24px', background: '#D91636', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: '0.05em' }}
          >
            BOOK NEW TICKET
          </button>
        </div>
      </>
    );
  }

  if (!ticket) {
    return (
      <>
        <MediVERSENav currentModule="home" />
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: '#D91636', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </>
    );
  }

  return (
    <>
      <MediVERSENav currentModule="home" />
      <div style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 40px' }}>
        
        {/* Action Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={generatePDF}
            disabled={downloading}
            style={{
              padding: '10px 20px', background: downloading ? '#666' : '#D91636', color: '#fff',
              border: 'none', fontWeight: 700, fontFamily: "'Space Grotesk'", cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
            }}
          >
            📥 {downloading ? 'GENERATING PDF...' : 'DOWNLOAD PDF RECEIPT'}
          </button>

          <button
            onClick={sendToWhatsApp}
            style={{
              padding: '10px 20px', background: '#25D366', color: '#fff',
              border: 'none', fontWeight: 700, fontFamily: "'Space Grotesk'", cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            💬 {whatsappSent ? 'SENT TO WHATSAPP' : 'SEND TO WHATSAPP'}
          </button>

          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontFamily: "'Space Grotesk'", cursor: 'pointer'
            }}
          >
            🖨️ PRINT
          </button>
        </div>

        {/* The receipt element to capture & print */}
        <div ref={receiptRef} style={{ background: '#fff', color: '#000', padding: '40px 32px', width: '100%', maxWidth: 420, position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          {/* Top Decorative Border */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: '#D91636'
          }} />

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, color: '#888', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>MediVERSE DIGITAL RECEIPT</p>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 56, color: '#000', letterSpacing: '.04em', lineHeight: 1, marginBottom: 8 }}>{ticket.token_number}</h1>
            <StatusBadge type={ticket.priority_level} />
          </div>

          <div>
            {[
              ['Reference ID', ticket.ticket_id],
              ['Patient Name', ticket.patient_name],
              ['Department', ticket.department_name],
              ['Assigned Doctor', ticket.doctor_name],
              ['Room Number', ticket.room_number],
              ['Total Fee', `₹${ticket.total_fee || 35.0}`],
              ['Est. Call Time', ticket.estimated_call_time || '~5 mins'],
              ['Date & Time', ticket.created_at || new Date().toLocaleTimeString()]
            ].map(([label, value]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid #eee',
                fontFamily: "'Space Grotesk'", fontSize: 14
              }}>
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ fontWeight: 700, color: '#000', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          {ticket.combos_selected && ticket.combos_selected.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#888', marginBottom: 6 }}>ADD-ONS</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ticket.combos_selected.map(c => (
                  <span key={c} style={{ background: 'rgba(217,22,54,0.1)', color: '#D91636', padding: '3px 8px', fontSize: 12, fontFamily: "'Space Grotesk'", fontWeight: 600 }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '2px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/receipt?id=${ticket.ticket_id}`} size={110} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#777', letterSpacing: '.1em', textTransform: 'uppercase', textAlign: 'center' }}>
              Scan QR code to track live queue position
            </p>
          </div>
        </div>

      </div>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Loading receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
