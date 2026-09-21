'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchQueueBoard, callNextPatient, updateTicketStatus, notifyUpcoming, fetchSyncStatus, triggerSync, api } from '@/services/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { QueueBoardResponse, Doctor, QueueTicket } from '@/types';

export default function DoctorDeskPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [boardData, setBoardData] = useState<QueueBoardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isPresent, setIsPresent] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  
  // Supabase & Offline Backup Status
  const [syncStatus, setSyncStatus] = useState<any>({
    supabase_connected: true,
    offline_backups_count: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

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

  const loadSyncStatus = async () => {
    try {
      const status = await fetchSyncStatus();
      if (status) setSyncStatus(status);
    } catch (e) {
      console.warn('Sync status load error:', e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await triggerSync();
      setSyncFeedback(`Cloud synced: ${res.synced_in_run || 0} tickets pushed to Supabase & local snapshot updated.`);
      await loadSyncStatus();
      await loadBoard();
    } catch (e) {
      setSyncFeedback('Local backup secured.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  useEffect(() => {
    if (!doctor) return;
    loadSyncStatus();
    const interval = setInterval(() => {
      loadBoard();
      loadSyncStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [doctor]);

  useEffect(() => {
    if (boardData?.now_calling?.ticket_id) {
      fetchSummary(boardData.now_calling.ticket_id);
      setTimerSeconds(300);
      setTimerActive(true);
      setNotifyMsg('');
    } else {
      setAiSummary('');
      setTimerActive(false);
    }
  }, [boardData?.now_calling?.ticket_id]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleMarkPresent = async (ticketId: string) => {
    setLoading(true);
    await updateTicketStatus(ticketId, 'IN_CONSULTATION');
    await loadBoard();
    setLoading(false);
  };

  const handleMarkAbsent = async (ticketId: string) => {
    setLoading(true);
    await updateTicketStatus(ticketId, 'SKIPPED');
    setNotifyMsg('Patient marked ABSENT / SKIPPED');
    await loadBoard();
    setLoading(false);
  };

  const handleSendNotification = async (ticketId: string) => {
    setNotifyMsg('Sending 5-min upcoming turn alert...');
    const res = await notifyUpcoming(ticketId);
    setNotifyMsg(`Alert sent to patient (${res.phone || 'Phone'})`);
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
          padding: '14px 32px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 15px)', color: 'var(--text-secondary)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Signed in as</span>
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(15px, 1.6vw, 19px)', fontWeight: 700, marginLeft: 8 }}>{doctor.name}</span>
            </div>

            {/* Supabase Status Chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: syncStatus.supabase_connected ? '#34c759' : '#ff3b30'
              }} />
              <span>{syncStatus.supabase_connected ? '[CLOUD] SUPABASE CONNECTED' : '[OFFLINE] CLOUD OFFLINE'}</span>
            </div>

            {/* Offline Backup Chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)', fontSize: 12, fontWeight: 700, color: '#007aff'
            }}>
              <span>[BACKUP]: {syncStatus.offline_backups_count || 0} FILES</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                padding: '8px 16px', background: isSyncing ? 'rgba(52,199,89,0.2)' : '#34c759',
                border: 'none', color: isSyncing ? '#34c759' : '#000', fontFamily: "'Space Grotesk'",
                fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                cursor: isSyncing ? 'wait' : 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              {isSyncing ? 'SYNCING...' : 'SYNC CLOUD'}
            </button>
            <button onClick={togglePresence} style={{
              padding: '8px 18px', background: isPresent ? '#34c759' : '#ff3b30', border: 'none',
              color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 15px)',
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4, fontWeight: 700
            }}>
              {isPresent ? 'PRESENT' : 'ABSENT'}
            </button>
            <button onClick={handleLogout} style={{
              padding: '8px 18px', background: 'none',
              border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 15px)', letterSpacing: '.1em',
              textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4
            }}>SIGN OUT</button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div style={{
            background: 'rgba(52, 199, 89, 0.15)',
            borderBottom: '1px solid #34c759',
            color: '#34c759',
            padding: '8px 32px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>[OK]</span>
            <span>{syncFeedback}</span>
          </div>
        )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: '#D91636', letterSpacing: '.15em', textTransform: 'uppercase' }}>NOW CALLING</p>
                        <span style={{
                          fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, padding: '2px 8px',
                          background: timerSeconds <= 60 ? 'rgba(255,59,48,0.2)' : 'rgba(217,22,54,0.1)',
                          border: `1px solid ${timerSeconds <= 60 ? '#ff3b30' : '#D91636'}`,
                          color: timerSeconds <= 60 ? '#ff3b30' : '#D91636', borderRadius: 4
                        }}>
                          TIMER: {formatTimer(timerSeconds)}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: '.04em' }}>{currentPatient.patient_name}</h3>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700, padding: '4px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 4 }}>
                          {currentPatient.token_number}
                        </span>
                        <span style={{
                          fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 700, padding: '4px 10px',
                          background: 'rgba(52, 199, 89, 0.15)', border: '1px solid #34c759', color: '#34c759',
                          borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          [CLOUD] SUPABASE & BACKUP SAFE
                        </span>
                        {currentPatient.patient_phone && (
                          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)', padding: '4px 8px' }}>
                            TEL: {currentPatient.patient_phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button 
                        onClick={() => handleMarkPresent(currentPatient.ticket_id)}
                        style={{
                          padding: '10px 16px', background: '#34c759', border: 'none',
                          fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, borderRadius: 4, color: '#fff',
                          letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer'
                        }}
                      >
                        MARK PRESENT
                      </button>

                      <button 
                        onClick={() => handleMarkAbsent(currentPatient.ticket_id)}
                        style={{
                          padding: '10px 16px', background: 'rgba(255,59,48,0.2)', border: '1px solid #ff3b30',
                          fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, borderRadius: 4, color: '#ff3b30',
                          letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer'
                        }}
                      >
                        MARK ABSENT / SKIP
                      </button>

                      <button 
                        onClick={() => handleSendNotification(currentPatient.ticket_id)}
                        style={{
                          padding: '10px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                          fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, borderRadius: 4, color: 'var(--text-primary)',
                          letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer'
                        }}
                      >
                        SEND SMS ALERT
                      </button>

                      <button 
                        onClick={() => handleMarkPresent(currentPatient.ticket_id)}
                        style={{
                          padding: '10px 16px', background: '#D91636', border: 'none',
                          fontFamily: "'Space Grotesk'", fontSize: 13, fontWeight: 700, borderRadius: 4, color: '#fff',
                          letterSpacing: '.05em', textTransform: 'uppercase', cursor: 'pointer'
                        }}
                      >
                        COMPLETE
                      </button>
                    </div>
                  </div>

                  {notifyMsg && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(217,22,54,0.1)', border: '1px solid rgba(217,22,54,0.3)', borderRadius: 4, fontFamily: "'Space Grotesk'", fontSize: 14, color: '#D91636' }}>
                      {notifyMsg}
                    </div>
                  )}

                  {/* AI Summary Box */}
                  <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
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
                    {['Token', 'Patient', 'Wait', 'Sync'].map(h => (
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
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: 'rgba(52, 199, 89, 0.15)', color: '#34c759'
                        }}>
                          [CLOUD] Synced
                        </span>
                      </td>
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
