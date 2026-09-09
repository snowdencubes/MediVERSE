'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RekovNav } from '@/components/common/RekovNav';
import { api, fetchDoctors } from '@/services/api';
import { Doctor } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SchedulesPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [view, setView] = useState<'MONTH' | 'WEEK'>('MONTH');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoctors().then(docs => {
      setDoctors(docs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4); // Friday

  const weekStr = `${startOfWeek.getDate()} ${startOfWeek.toLocaleString('default', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleString('default', { month: 'short' })}`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: "'Space Grotesk'" }}>
      <RekovNav currentModule="schedules" />
      
      <main style={{ padding: '120px 5% 60px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 64, letterSpacing: '.05em', marginBottom: 8, lineHeight: 1 }}>{t('doctor_timings')}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>View available specialists and their consultation timings.</p>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
            <button 
              onClick={() => setView('MONTH')}
              style={{
                padding: '12px 24px', background: view === 'MONTH' ? '#ff2d55' : 'transparent',
                color: view === 'MONTH' ? '#fff' : 'var(--text-secondary)', border: 'none',
                fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: '.05em', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              MONTH VIEW
            </button>
            <button 
              onClick={() => setView('WEEK')}
              style={{
                padding: '12px 24px', background: view === 'WEEK' ? '#ff2d55' : 'transparent',
                color: view === 'WEEK' ? '#fff' : 'var(--text-secondary)', border: 'none',
                fontFamily: "'Bebas Neue'", fontSize: 20, letterSpacing: '.05em', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              WEEK VIEW
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>LOADING SCHEDULES...</div>
        ) : (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 700, margin: 0 }}>
                {view === 'MONTH' ? `Schedule for ${currentMonth}` : `Schedule for ${weekStr} (Mon - Fri)`}
              </h2>
            </div>
            
            <div style={{ padding: 32 }}>
              {view === 'MONTH' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                  {doctors.map(doc => (
                    <div key={doc.id} style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 24, background: 'var(--bg-main)' }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: 20, fontFamily: "'Bebas Neue'", letterSpacing: '.05em' }}>{doc.name}</h3>
                      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)' }}>{doc.specialty}</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>TIME:</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{doc.shift_schedule || '09:00 AM - 05:00 PM'}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>ROOM:</span>
                        <span style={{ fontSize: 14 }}>{doc.room_number}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Doctor Name</th>
                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Specialty</th>
                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Mon - Fri Timings</th>
                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Room</th>
                        <th style={{ padding: '16px 8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map(doc => (
                        <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '20px 8px', fontWeight: 600 }}>{doc.name}</td>
                          <td style={{ padding: '20px 8px', color: 'var(--text-secondary)' }}>{doc.specialty}</td>
                          <td style={{ padding: '20px 8px', fontFamily: "monospace", fontSize: 14 }}>{doc.shift_schedule || '09:00 AM - 05:00 PM'}</td>
                          <td style={{ padding: '20px 8px' }}>{doc.room_number}</td>
                          <td style={{ padding: '20px 8px' }}>
                            <span style={{ 
                              background: doc.is_available ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', 
                              color: doc.is_available ? '#34c759' : '#ff3b30', 
                              padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 
                            }}>
                              {doc.is_available ? 'ON DUTY' : 'OFF DUTY'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
