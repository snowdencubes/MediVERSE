'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { StatusBadge } from '@/components/common/StatusBadge';
import { api } from '@/services/api';
import { QueueTicket } from '@/types';

export default function HistoryPage() {
  const router = useRouter();
  const [lookup, setLookup] = useState('');
  const [history, setHistory] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookup.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/kiosk/history?lookup=${lookup.trim()}`);
      setHistory(res);
    } catch (e) {
      console.error(e);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'" }}>
      <MediVERSENav currentModule="history" />
      
      <main style={{ padding: '120px 5% 60px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 64, letterSpacing: '.05em', marginBottom: 16 }}>PATIENT HISTORY</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>Look up your past visits and queue tickets without needing an account.</p>

        <div style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 40 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 16 }}>
            <input 
              type="text" 
              value={lookup} 
              onChange={(e) => setLookup(e.target.value)}
              placeholder="Enter Phone Number or Token ID (e.g. 555-1234 or GEN-101)"
              style={{
                flex: 1, padding: '16px 20px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 12, fontSize: 'clamp(18px, 1.9vw, 22px)', fontFamily: "'Space Grotesk'", outline: 'none'
              }}
              required
            />
            <button type="submit" disabled={loading} style={{
              background: '#D91636', color: '#fff', border: 'none', padding: '0 32px', borderRadius: 12,
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(18px, 1.9vw, 22px)', fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s', opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'SEARCHING...' : 'LOOKUP'}
            </button>
          </form>
        </div>

        {searched && (
          <div>
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, marginBottom: 20 }}>YOUR VISITS</h2>
            
            {history.length === 0 ? (
              <div style={{ padding: 40, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No visit history found for "{lookup}".</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {history.map(ticket => (
                  <div key={ticket.ticket_id} style={{
                    background: 'var(--bg-card)', padding: 24, borderRadius: 16, border: '1px solid var(--border-color)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 'clamp(26px, 2.9vw, 30px)', fontWeight: 700 }}>{ticket.token_number}</span>
                        <StatusBadge type={ticket.status} />
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        <strong>Department:</strong> {ticket.department_name} <br/>
                        <strong>Doctor:</strong> {ticket.doctor_name || 'Unassigned'} <br/>
                        <strong>Date:</strong> {ticket.created_at}
                      </p>
                    </div>
                    
                    {ticket.combos_selected.length > 0 && (
                      <div style={{ background: 'var(--bg-main)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)', minWidth: 200 }}>
                        <p style={{ fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Packages</p>
                        <ul style={{ margin: 0, paddingLeft: 16, color: '#D91636', fontSize: 'clamp(16px, 1.7vw, 20px)' }}>
                          {ticket.combos_selected.map((combo, idx) => (
                            <li key={idx}>{combo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
