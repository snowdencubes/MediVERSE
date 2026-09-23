'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QueueTicket } from '@/types';
import { getTicketStatus } from '@/services/api';

function ReceiptContent() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getTicketStatus(id)
        .then(res => {
          setTicket(res);
          setLoading(false);
          // If the receipt has a valid Supabase URL, try to redirect to it
          if (res.receipt_pdf_url && !res.receipt_pdf_url.includes('localhost') && !res.receipt_pdf_url.includes('127.0.0.1')) {
            window.location.href = res.receipt_pdf_url;
          }
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) return <div style={{ padding: 40, color: '#fff', textAlign: 'center', fontFamily: "'Space Grotesk'" }}>Loading Receipt...</div>;

  if (!ticket) return <div style={{ padding: 40, color: '#fff', textAlign: 'center', fontFamily: "'Space Grotesk'" }}>Receipt Not Found.</div>;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: "'Space Grotesk'", color: '#fff' }}>
      <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: '#D91636', letterSpacing: '.06em', textAlign: 'center' }}>MEDIVERSE RECEIPT</h1>
      
      <div style={{ background: '#fff', color: '#000', padding: 32, borderRadius: 16, marginTop: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        <p style={{ textAlign: 'center', color: '#999', fontFamily: "'Space Grotesk'", fontSize: 14, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>TOKEN NUMBER</p>
        <h2 style={{ fontSize: 64, fontFamily: "'Bebas Neue'", textAlign: 'center', marginBottom: 24, color: '#000', lineHeight: 1 }}>{ticket.token_number}</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Patient</span>
          <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 18 }}>{ticket.patient_name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Department</span>
          <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 18 }}>{ticket.department_name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Doctor</span>
          <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 18 }}>{ticket.doctor_name || 'Duty Specialist'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eee' }}>
          <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Room</span>
          <span style={{ fontWeight: 700, fontFamily: "'Space Grotesk'", fontSize: 18 }}>{ticket.room_number || 'TBD'}</span>
        </div>
        
        {ticket.receipt_pdf_url ? (
          <a 
            href={ticket.receipt_pdf_url} 
            download
            style={{ 
              display: 'block', width: '100%', padding: 18, background: '#D91636', 
              color: '#fff', textAlign: 'center', textDecoration: 'none', 
              fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, marginTop: 32, borderRadius: 12,
              letterSpacing: '.05em'
            }}
          >
            DOWNLOAD PDF RECEIPT
          </a>
        ) : (
          <div style={{ marginTop: 24, textAlign: 'center', color: '#666', fontFamily: "'Space Grotesk'" }}>PDF is generating, please refresh in a moment.</div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: '#fff', textAlign: 'center' }}>Loading...</div>}>
      <ReceiptContent />
    </Suspense>
  );
}
