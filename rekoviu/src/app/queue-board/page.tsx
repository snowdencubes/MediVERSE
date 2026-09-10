'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchQueueBoard, api } from '@/services/api';
import { QueueBoardResponse, QueueTicket } from '@/types';

export default function QueueBoardPage() {
  const router = useRouter();
  const [boardData, setBoardData] = useState<QueueBoardResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedTicket, setSearchedTicket] = useState<QueueTicket | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const prevCallingId = useRef<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchQueueBoard();
      setBoardData(data);
    };
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Voice Speech Announcement when NOW CALLING changes
  useEffect(() => {
    if (!boardData?.now_calling) return;
    const now = boardData.now_calling;
    if (prevCallingId.current !== now.ticket_id) {
      prevCallingId.current = now.ticket_id;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const text = `Attention please. Patient ${now.patient_name}, token number ${now.token_number}, please proceed to ${now.room_number} for Doctor ${now.doctor_name}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [boardData?.now_calling]);

  // Carousel timer for Doctor queue cards (every 6s)
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(i => i + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchedTicket(null);
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();
    setSearching(true);

    // 1. Search locally in boardData
    if (boardData) {
      if (
        boardData.now_calling?.ticket_id.toLowerCase() === query ||
        boardData.now_calling?.token_number.toLowerCase() === query ||
        (boardData.now_calling?.patient_phone && boardData.now_calling.patient_phone.includes(query))
      ) {
        setSearchedTicket(boardData.now_calling);
        setSearching(false);
        return;
      }

      const recent = boardData.recently_called.find(
        t => t.ticket_id.toLowerCase() === query ||
             t.token_number.toLowerCase() === query ||
             (t.patient_phone && t.patient_phone.includes(query))
      );
      if (recent) {
        setSearchedTicket(recent);
        setSearching(false);
        return;
      }

      const waiting = boardData.waiting_queue.find(
        t => t.ticket_id.toLowerCase() === query ||
             t.token_number.toLowerCase() === query ||
             (t.patient_phone && t.patient_phone.includes(query))
      );
      if (waiting) {
        setSearchedTicket(waiting);
        setSearching(false);
        return;
      }
    }

    // 2. Query backend ticket search endpoint
    try {
      const res = await api.get(`/queue/ticket/${encodeURIComponent(searchQuery.trim())}`);
      if (res && res.ticket_id) {
        setSearchedTicket(res);
      } else {
        setSearchError('Ticket or Phone number not found in queue system.');
      }
    } catch (err) {
      setSearchError('No matching ticket found for Phone Number, Ticket ID, or Token.');
    } finally {
      setSearching(false);
    }
  };

  if (!boardData) {
    return (
      <div style={{
        position: 'relative', zIndex: 10, height: '100vh', background: 'var(--bg-main)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 48, height: 48, border: '3px solid rgba(255,255,255,.1)',
          borderTopColor: '#D91636', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const now = boardData.now_calling;

  // Group waiting queue into Doctor/Department chunks (3 items per slide for TV mode)
  const chunkSize = 4;
  const queueChunks: QueueTicket[][] = [];
  for (let i = 0; i < boardData.waiting_queue.length; i += chunkSize) {
    queueChunks.push(boardData.waiting_queue.slice(i, i + chunkSize));
  }
  if (queueChunks.length === 0) {
    queueChunks.push([]);
  }

  const currentChunk = queueChunks[carouselIndex % queueChunks.length];

  return (
    <>
      <MediVERSENav currentModule="queue-board" />
      <main style={{
        position: 'relative', zIndex: 10, height: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column', paddingTop: 70, overflow: 'hidden',
        background: 'var(--bg-main)'
      }}>

        {/* Top Control Bar with Explicit GO HOME Button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 28px', borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', background: '#D91636', color: '#fff',
                border: 'none', borderRadius: 4, fontFamily: "'Bebas Neue'",
                fontSize: 22, letterSpacing: '.06em', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(217,22,54,0.4)'
              }}
            >
              <span>[ GO HOME ]</span>
            </button>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              LIVE KIOSK TV QUEUE SHOWER
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: '#34c759', fontWeight: 700, letterSpacing: '.1em' }}>
              STATUS: AUTOMATIC 2-HR SYNC
            </span>
          </div>
        </div>

        {/* Split TV Layout - Zero Vertical Scroll */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: NOW CALLING BANNER */}
          <div style={{
            flex: 1.1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid rgba(255,255,255,.08)', padding: 40, textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(217,22,54,0.06) 0%, rgba(0,0,0,0.4) 100%)'
          }}>
            <p style={{
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', letterSpacing: '.3em',
              textTransform: 'uppercase', color: '#D91636', marginBottom: 16, fontWeight: 700
            }}>&#9673; NOW CALLING PATIENT</p>

            {now ? (
              <motion.div
                key={now.ticket_id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
              >
                <div style={{
                  padding: '8px 24px', background: 'rgba(217,22,54,0.15)',
                  border: '2px solid #D91636', borderRadius: 8, marginBottom: 16
                }}>
                  <h2 style={{
                    fontFamily: "'Bebas Neue'", fontSize: 'clamp(48px, 6vw, 72px)',
                    letterSpacing: '.06em', color: '#fff', lineHeight: 1
                  }}>{now.token_number}</h2>
                </div>

                <p style={{
                  fontFamily: "'Space Grotesk'", fontSize: 'clamp(24px, 2.5vw, 32px)', fontWeight: 700,
                  color: '#fff', marginBottom: 12
                }}>{now.patient_name}</p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  <StatusBadge type={now.priority_level} />
                  <span style={{
                    fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 700,
                    padding: '4px 14px', background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)', color: 'var(--text-primary)'
                  }}>{now.department_name}</span>
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '16px 36px', borderRadius: 8
                }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '.15em', textTransform: 'uppercase' }}>PROCEED TO ROOM</span>
                  <div style={{
                    fontFamily: "'Bebas Neue'", fontSize: 44, color: '#D91636',
                    letterSpacing: '.08em', marginTop: 4
                  }}>{now.room_number}</div>
                  <p style={{
                    fontFamily: "'Space Grotesk'", fontSize: 16, color: 'rgba(255,255,255,0.7)',
                    marginTop: 4
                  }}>{now.doctor_name}</p>
                </div>
              </motion.div>
            ) : (
              <p style={{
                fontFamily: "'Space Grotesk'", fontSize: 'clamp(18px, 2vw, 22px)', color: 'rgba(255,255,255,.3)'
              }}>Waiting for next patient call...</p>
            )}
          </div>

          {/* Right: Auto-Sliding Doctor Queue Carousel & Search */}
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Top Search Bar (Phone Number, Ticket ID, Token) */}
            <form onSubmit={handleSearch} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '16px 28px', gap: 12, background: 'var(--bg-card)' }}>
              <input 
                type="text" 
                placeholder="SEARCH WITH PHONE NUMBER / TICKET ID / TOKEN" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontSize: 15, padding: '10px 16px', borderRadius: 4,
                  outline: 'none', fontFamily: "'Space Grotesk'"
                }}
              />
              <button 
                type="submit" 
                disabled={searching}
                style={{
                  background: '#D91636', color: '#fff', border: 'none', padding: '10px 24px',
                  fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, cursor: 'pointer', borderRadius: 4
                }}
              >
                {searching ? 'SEARCHING...' : 'SEARCH YOURS'}
              </button>
            </form>

            {/* Header for 2-Hour Carousel Queue */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 28px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '.05em' }}>
                UPCOMING QUEUE (2-HOUR WINDOW)
              </span>
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)' }}>
                SLIDE {queueChunks.length > 0 ? (carouselIndex % queueChunks.length) + 1 : 1} OF {queueChunks.length || 1}
              </span>
            </div>

            {/* Carousel Cards Container */}
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={carouselIndex % (queueChunks.length || 1)}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}
                >
                  {currentChunk.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Space Grotesk'", fontSize: 18, color: 'rgba(255,255,255,.3)' }}>
                        No patients waiting in queue for the next 2 hours.
                      </p>
                    </div>
                  ) : (
                    currentChunk.map((ticket, idx) => (
                      <div key={ticket.ticket_id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', background: 'rgba(255,255,255,.03)',
                        border: '1px solid rgba(255,255,255,.08)', borderRadius: 6
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700,
                            background: idx === 0 ? 'rgba(255,45,85,.2)' : 'rgba(255,255,255,.06)',
                            color: idx === 0 ? '#D91636' : 'rgba(255,255,255,.6)',
                            border: `1px solid ${idx === 0 ? 'rgba(255,45,85,.4)' : 'rgba(255,255,255,.1)'}`,
                            borderRadius: 4
                          }}>
                            {idx + 1}
                          </div>
                          <div>
                            <p style={{ fontFamily: "'Bebas Neue'", fontSize: 26, color: '#fff', letterSpacing: '.04em', lineHeight: 1.1 }}>
                              {ticket.token_number}
                            </p>
                            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)' }}>
                              {ticket.patient_name} - {ticket.department_name}
                            </p>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: '#D91636' }}>
                            {ticket.room_number || 'PENDING'}
                          </p>
                          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                            {ticket.doctor_name}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Recently Called Row */}
            {boardData.recently_called.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '12px 28px', background: 'rgba(0,0,0,0.3)' }}>
                <p style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>
                  RECENTLY CALLED PATIENTS
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {boardData.recently_called.slice(0, 3).map(t => (
                    <div key={t.ticket_id} style={{ padding: '6px 16px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4 }}>
                      <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t.token_number}</span>
                      <span style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: '#D91636', marginLeft: 8 }}>{t.room_number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Ticket Search Result Modal */}
        {(searchedTicket || searchError) && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)'
          }} onClick={() => { setSearchedTicket(null); setSearchError(''); }}>
            <div style={{
              background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: 36, maxWidth: 440, width: '90%',
              textAlign: 'center', borderRadius: 8
            }} onClick={e => e.stopPropagation()}>
              {searchError ? (
                <>
                  <div style={{ fontSize: 40, color: '#ff3b30', marginBottom: 12, fontWeight: 700 }}>[ NOT FOUND ]</div>
                  <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: '#D91636', marginBottom: 8 }}>SEARCH RESULT</h3>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 16, color: 'rgba(255,255,255,.7)', marginBottom: 24 }}>{searchError}</p>
                </>
              ) : searchedTicket && (
                <>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '.15em' }}>TICKET SEARCH MATCH</span>
                  <h3 style={{ fontFamily: "'Bebas Neue'", fontSize: 44, color: '#fff', marginBottom: 4 }}>{searchedTicket.token_number}</h3>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 20, fontWeight: 700, color: '#D91636', marginBottom: 8 }}>
                    STATUS: {searchedTicket.status.replace('_', ' ')}
                  </p>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 16, color: 'rgba(255,255,255,.8)', marginBottom: 4 }}>
                    PATIENT: {searchedTicket.patient_name}
                  </p>
                  {searchedTicket.patient_phone && (
                    <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                      PHONE: {searchedTicket.patient_phone}
                    </p>
                  )}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    background: 'var(--bg-card)', padding: '16px 24px', border: '1px solid var(--border-color)',
                    borderRadius: 6, marginBottom: 24
                  }}>
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '.1em' }}>ASSIGNED ROOM & DOCTOR</span>
                    <span style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: '#fff', marginTop: 2 }}>{searchedTicket.room_number || 'WAITING ASSIGNMENT'}</span>
                    <span style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{searchedTicket.doctor_name}</span>
                  </div>
                </>
              )}
              <button 
                onClick={() => { setSearchedTicket(null); setSearchError(''); }}
                style={{ width: '100%', padding: '14px', background: '#D91636', color: '#fff', border: 'none', fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 700, cursor: 'pointer', borderRadius: 4 }}
              >
                CLOSE SEARCH
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
