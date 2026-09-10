'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchQueueBoard, callNextPatient, api } from '@/services/api';
import { QueueBoardResponse, Doctor, QueueTicket } from '@/types';

export default function DoctorDeskPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [boardData, setBoardData] = useState<QueueBoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isPresent, setIsPresent] = useState(true);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const docId = localStorage.getItem('user_id');
    const docName = localStorage.getItem('user_name');
    
    if (role !== 'DOCTOR' || !docId) {
      router.push('/login');
    } else {
      setDoctor({
        id: docId,
        name: docName || 'Doctor',
        department_id: '',
        specialty: '',
        room_number: 'Desk A',
        is_available: true,
        estimated_wait_minutes: 0,
        consultation_fee: 0,
        rating: 0,
        experience_years: 0
      });
      loadBoard();
    }
  }, [router]);

  const loadBoard = async () => {
    try {
      const data = await fetchQueueBoard();
      setBoardData(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!doctor) return;
    const interval = setInterval(loadBoard, 5000);
    return () => clearInterval(interval);
  }, [doctor]);

  useEffect(() => {
    if (boardData?.now_calling?.ticket_id) {
      fetchSummary(boardData.now_calling.ticket_id);
    } else {
      setAiSummary('');
    }
  }, [boardData?.now_calling?.ticket_id]);

  const fetchSummary = async (ticketId: string) => {
    setLoadingSummary(true);
    try {
      const res = await api.get(`/ai/summary/${ticketId}`);
      setAiSummary(res.summary);
    } catch (e) {
      setAiSummary('Failed to load AI summary for this patient.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCallNext = async () => {
    if (!doctor) return;
    setLoading(true);
    await callNextPatient(doctor.id, doctor.room_number);
    await loadBoard();
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const togglePresence = async () => {
    if (!doctor) return;
    try {
      const newPresence = !isPresent;
      await api.post(`/doctors/${doctor.id}/presence`, { is_present: newPresence });
      setIsPresent(newPresence);
      alert(newPresence ? 'Marked as PRESENT (Arrival Logged)' : 'Marked as ABSENT');
    } catch (e) {
      alert('Failed to update presence');
    }
  };

  if (!doctor || !boardData) {
    return (
      <main style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <p style={{ color: 'var(--text-primary)' }}>Loading Desk...</p>
      </main>
    );
  }

  const currentPatient = boardData.now_calling;

  return (
    <>
      <MediVERSENav currentModule="doctor-desk" />
      <main style={{
        position: 'relative', zIndex: 10, height: '100vh', background: 'var(--bg-main)',
        display: 'flex', flexDirection: 'column', paddingTop: 80, color: 'var(--text-primary)'
      }}>
        {/* Top Bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 32px', borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-secondary)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Signed in as</span>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700, marginLeft: 8 }}>{doctor.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={togglePresence} style={{
              padding: '8px 20px', background: isPresent ? '#34c759' : '#ff3b30', border: 'none',
              color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)',
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4
            }}>
              {isPresent ? 'PRESENT' : 'ABSENT'}
            </button>
            <button onClick={handleLogout} style={{
              padding: '8px 20px', background: 'none',
              border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', letterSpacing: '.1em',
              textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4
            }}>SIGN OUT</button>
          </div>
        </div>

        {/* Split Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Call Actions */}
          <div style={{
            width: 360, borderRight: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: 32, textAlign: 'center',
            background: 'var(--bg-card)'
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(255,45,85,.1)', border: '2px solid rgba(255,45,85,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#D91636', marginBottom: 24
            }}>&#9673;</div>

            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 28, letterSpacing: '.06em', marginBottom: 8 }}>CALL NEXT PATIENT</h2>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)', marginBottom: 24 }}>
              {boardData.waiting_queue.length} patient(s) waiting
            </p>

            <button
              onClick={handleCallNext}
              disabled={loading || boardData.waiting_queue.length === 0}
              style={{
                width: '100%', maxWidth: 260, padding: '18px', background: '#D91636',
                color: '#fff', border: 'none', fontFamily: "'Space Grotesk'", borderRadius: 8,
                fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700, letterSpacing: '.1em', cursor: 'pointer',
                opacity: loading || boardData.waiting_queue.length === 0 ? 0.4 : 1
              }}
            >
              {loading ? 'CALLING...' : 'CALL NEXT'}
            </button>
          </div>

          {/* Right: Current + Queue */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Current Patient */}
            <div style={{ padding: 28, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
              {currentPatient ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: '#D91636', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 4 }}>NOW IN CONSULTATION</p>
                      <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: '.04em' }}>{currentPatient.patient_name}</h3>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700, padding: '4px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 4 }}>
                          {currentPatient.token_number}
                        </span>
                      </div>
                    </div>
                    <button style={{
                      padding: '10px 24px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                      fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', fontWeight: 700, borderRadius: 4, color: 'var(--text-primary)',
                      letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer'
                    }}>COMPLETE</button>
                  </div>
                  
                  {/* AI Summary Box */}
                  <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <h4 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: '#D91636', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                      AI Medical Summary
                    </h4>
                    {loadingSummary ? (
                      <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: 'var(--text-secondary)' }}>Generating via HuggingFace...</p>
                    ) : (
                      <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(18px, 1.9vw, 22px)', lineHeight: 1.5 }}>{aiSummary}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)', textAlign: 'center', padding: 16 }}>
                  No patient currently in consultation.
                </p>
              )}
            </div>

            {/* Queue Table */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700, letterSpacing: '.05em' }}>UPCOMING QUEUE</span>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-secondary)', padding: '3px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12 }}>
                  {boardData.waiting_queue.length} waiting
                </span>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                  <tr>
                    {['Token', 'Patient', 'Wait'].map(h => (
                      <th key={h} style={{
                        fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', fontWeight: 700,
                        color: 'var(--text-secondary)', letterSpacing: '.1em',
                        textTransform: 'uppercase', textAlign: 'left',
                        padding: '10px 12px', borderBottom: '1px solid var(--border-color)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boardData.waiting_queue.map(t => (
                    <tr key={t.ticket_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700 }}>{t.token_number}</td>
                      <td style={{ padding: '12px', fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', color: 'var(--text-secondary)' }}>{t.patient_name}</td>
                      <td style={{ padding: '12px', fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)' }}>{t.estimated_call_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
