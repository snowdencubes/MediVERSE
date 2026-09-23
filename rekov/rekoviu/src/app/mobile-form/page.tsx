'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4040/api/v1';

const DEPARTMENTS = [
  { id: 'dep_gen', name: 'General Clinic / OPD' },
  { id: 'dep_card', name: 'Cardiology' },
  { id: 'dep_ped', name: 'Pediatrics' },
  { id: 'dep_ortho', name: 'Orthopedics' },
  { id: 'dep_neuro', name: 'Neurology' },
  { id: 'dep_emg', name: 'Emergency Triage' },
  { id: 'dep_derm', name: 'Dermatology' },
  { id: 'dep_ent', name: 'ENT & Audiology' },
];

function MobileFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get('session');

  const [sessionStatus, setSessionStatus] = useState<'valid' | 'expired' | 'checking'>('checking');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_dob: '',
    department_id: '',
    chief_complaint: '',
  });

  // Check session validity on mount
  useEffect(() => {
    if (!sessionId) { setSessionStatus('expired'); return; }
    fetch(`${API_URL}/sessions/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'EXPIRED') setSessionStatus('expired');
        else if (data.status === 'SUBMITTED') router.replace(`/mobile-form/upload?session=${sessionId}`);
        else setSessionStatus('valid');
      })
      .catch(() => setSessionStatus('expired'));
  }, [sessionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_name || !form.patient_phone) {
      setError('Name and phone are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Submission failed');
      }
      router.push(`/mobile-form/upload?session=${sessionId}`);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: '#1a1a1f',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
    color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 16,
    outline: 'none', WebkitAppearance: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  if (sessionStatus === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
        <div style={{ color: '#666', fontFamily: "'Space Grotesk'", fontSize: 16 }}>Verifying QR session…</div>
      </div>
    );
  }

  if (sessionStatus === 'expired') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏱</div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 36, color: '#D91636', letterSpacing: '.06em', marginBottom: 8 }}>QR EXPIRED</h1>
        <p style={{ fontFamily: "'Space Grotesk'", color: '#888', fontSize: 16, maxWidth: 280 }}>
          This QR code has expired. Please scan the fresh QR code on the kiosk screen.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #D91636 0%, #8b0e22 100%)',
        padding: '32px 24px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 22
        }}>🏥</div>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: '.08em', margin: '0 0 4px' }}>
          PATIENT REGISTRATION
        </h1>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          MediVERSE Hospital — Quick Check-In
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 480, margin: '0 auto' }}>

        <div>
          <label style={{ display: 'block', fontFamily: "'Space Grotesk'", fontSize: 12, color: '#D91636', fontWeight: 700, letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Full Name *
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={form.patient_name}
            onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: "'Space Grotesk'", fontSize: 12, color: '#D91636', fontWeight: 700, letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Phone Number *
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={form.patient_phone}
            onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))}
            required
            style={inputStyle}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: "'Space Grotesk'", fontSize: 12, color: '#999', fontWeight: 700, letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Date of Birth (optional)
          </label>
          <input
            type="date"
            value={form.patient_dob}
            onChange={e => setForm(f => ({ ...f, patient_dob: e.target.value }))}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: "'Space Grotesk'", fontSize: 12, color: '#999', fontWeight: 700, letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Department (optional)
          </label>
          <select
            value={form.department_id}
            onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— Select department —</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontFamily: "'Space Grotesk'", fontSize: 12, color: '#999', fontWeight: 700, letterSpacing: '.08em', marginBottom: 8, textTransform: 'uppercase' }}>
            Chief Complaint (optional)
          </label>
          <textarea
            placeholder="Briefly describe your main symptom or reason for visit…"
            value={form.chief_complaint}
            onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
            rows={3}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(217,22,54,0.1)', border: '1px solid rgba(217,22,54,0.4)',
            borderRadius: 10, padding: '12px 16px',
            fontFamily: "'Space Grotesk'", fontSize: 14, color: '#ff6b6b'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '18px', background: submitting ? 'rgba(217,22,54,0.4)' : '#D91636',
            color: '#fff', border: 'none', borderRadius: 14,
            fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, letterSpacing: '.04em',
            cursor: submitting ? 'wait' : 'pointer',
            boxShadow: '0 8px 24px rgba(217,22,54,0.35)',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? 'Submitting…' : 'SUBMIT & CONTINUE →'}
        </button>

        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>
          After submitting, you'll be able to upload documents (prescriptions, insurance card, ID) from your phone.
        </p>

      </form>
    </div>
  );
}

export default function MobileFormPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
        <span style={{ color: '#666', fontFamily: "'Space Grotesk'" }}>Loading…</span>
      </div>
    }>
      <MobileFormContent />
    </Suspense>
  );
}
