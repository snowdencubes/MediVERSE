'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { Scanner } from '@yudiel/react-qr-scanner';
import { api } from '@/services/api';

export default function ReceptionistPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scan' | 'timetable' | 'doctors' | 'departments'>('scan');
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'RECEPTIONIST') {
      router.push('/login');
    } else {
      fetchDoctors();
    }
  }, [router]);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/kiosk/doctors');
      setDoctors(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSchedule = async (doctorId: string, newSchedule: string) => {
    try {
      await api.post(`/doctors/${doctorId}/schedule`, { shift_schedule: newSchedule });
      alert('Schedule updated successfully!');
      fetchDoctors();
    } catch (e) {
      alert('Failed to update schedule');
    }
  };

  const onScan = async (result: any) => {
    if (result && result.length > 0) {
      const ticketId = result[0].rawValue;
      setScanResult(ticketId);
      setAiSummary('');
      setLoadingSummary(true);
      
      try {
        const res = await api.get(`/ai/summary/${ticketId}`);
        setAiSummary(res.summary);
      } catch (e) {
        setAiSummary('Unable to generate summary for this patient/ticket.');
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'" }}>
      <MediVERSENav currentModule="receptionist" />
      
      <main style={{ padding: '120px 5% 60px', maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 64, letterSpacing: '.05em', marginBottom: 40 }}>RECEPTIONIST DASHBOARD</h1>

        <div style={{ display: 'flex', gap: 20, marginBottom: 40, flexWrap: 'wrap' }}>
          {['scan', 'timetable', 'doctors', 'departments'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                flex: 1, padding: 16, border: '1px solid var(--border-color)',
                background: activeTab === tab ? '#D91636' : 'var(--bg-card)',
                color: activeTab === tab ? '#fff' : 'var(--text-primary)', 
                fontFamily: "'Space Grotesk'", fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.1em', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'scan' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: 40, borderRadius: 16 }}>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, marginBottom: 20 }}>SCAN PATIENT QR</h2>
            <div style={{ maxWidth: 400, margin: '0 auto', overflow: 'hidden', borderRadius: 12, border: '2px solid var(--border-color)' }}>
              <Scanner onScan={onScan} />
            </div>
            
            {scanResult && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ color: '#D91636', fontSize: 'clamp(26px, 2.9vw, 30px)', fontWeight: 700 }}>Scanned Token: {scanResult}</p>
                
                <div style={{ marginTop: 20, background: 'var(--bg-main)', padding: 20, borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <h3 style={{ fontSize: 'clamp(18px, 1.9vw, 22px)', marginBottom: 12, color: 'var(--text-secondary)' }}>AI PATIENT SUMMARY</h3>
                  {loadingSummary ? (
                    <p style={{ color: '#D91636' }}>Generating summary via HuggingFace...</p>
                  ) : (
                    <p style={{ fontSize: 'clamp(20px, 2.2vw, 24px)', lineHeight: 1.5 }}>{aiSummary}</p>
                  )}
                </div>

                <button style={{ marginTop: 24, background: '#D91636', color: '#fff', padding: '16px 32px', fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8 }}>PRINT FINAL BILL</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timetable' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: 40, borderRadius: 16 }}>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, marginBottom: 20 }}>DOCTOR TIMETABLES</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {doctors.map((doc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-main)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ fontSize: 'clamp(20px, 2.2vw, 24px)', margin: 0 }}>{doc.name}</h3>
                    <p style={{ fontSize: 'clamp(16px, 1.7vw, 20px)', color: 'var(--text-secondary)', margin: 0 }}>{doc.specialty} • {doc.room_number}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input 
                      type="text" 
                      defaultValue={doc.shift_schedule || ''}
                      placeholder="e.g. 09:00 AM - 05:00 PM"
                      onBlur={(e) => handleUpdateSchedule(doc.id, e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'" }}
                    />
                    <span style={{ fontSize: 'clamp(14px, 1.4vw, 18px)', color: doc.is_available ? '#34c759' : '#ff3b30' }}>
                      {doc.is_available ? '● PRESENT' : '● ABSENT'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
