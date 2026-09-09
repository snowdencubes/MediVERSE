'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QueueTicket } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useSearchParams } from 'next/navigation';

function ReceiptContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`;
    fetch(`${apiUrl}/api/v1/queue/ticket/${id}`)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => setTicket(d))
      .catch((err) => {
        console.error('Fetch error:', err);
        setError(true);
      });
  }, [id]);

  useEffect(() => {
    // Automatically trigger download after rendering the ticket
    if (ticket && receiptRef.current && !downloading) {
      setDownloading(true);
      setTimeout(async () => {
        try {
          if (!receiptRef.current) return;
          const canvas = await html2canvas(receiptRef.current, { scale: 2 });
          const imgData = canvas.toDataURL('image/png');
          
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width / 2, canvas.height / 2]
          });
          
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
          pdf.save(`rekov-receipt-${ticket.ticket_id}.pdf`);
        } catch (e) {
          console.error('Download failed', e);
        }
      }, 500); // Wait for fonts and QR to render
    }
  }, [ticket, downloading]);

  if (!id || error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'" }}>
        <p>Invalid or expired receipt ID.</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: '#ff2d55', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      
      <p style={{ color: '#ff2d55', fontFamily: "'Space Grotesk'", marginBottom: 20, textAlign: 'center' }}>
        {downloading ? 'Downloading your PDF receipt...' : 'Preparing receipt...'}
      </p>

      {/* The receipt element to capture */}
      <div ref={receiptRef} style={{ background: '#fff', color: '#000', padding: '40px 32px', width: '100%', maxWidth: 400, position: 'relative' }}>
        {/* Zig-zag top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: 'var(--bg-main)',
          clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0)'
        }} />

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 4 }}>REKOV DIGITAL RECEIPT</p>
          <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 64, color: '#000', letterSpacing: '.04em', lineHeight: 1, marginBottom: 8 }}>{ticket.token_number}</h1>
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
              padding: '12px 0', borderBottom: '1px solid #eee',
              fontFamily: "'Space Grotesk'", fontSize: 13
            }}>
              <span style={{ color: '#888' }}>{label}</span>
              <span style={{ fontWeight: 700, color: '#000', textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {ticket.combos_selected.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#888', marginBottom: 8 }}>ADD-ONS</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ticket.combos_selected.map(c => (
                <span key={c} style={{ background: 'rgba(255,45,85,0.1)', color: '#ff2d55', padding: '4px 10px', fontSize: 11, fontFamily: "'Space Grotesk'" }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px dashed #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/receipt?id=${ticket.ticket_id}`} size={120} style={{ marginBottom: 16 }} />
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: '#999', letterSpacing: '.1em', textTransform: 'uppercase' }}>Scan to view live queue status</p>
        </div>
      </div>

    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div>Loading receipt...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
