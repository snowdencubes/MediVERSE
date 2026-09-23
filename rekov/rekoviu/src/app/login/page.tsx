'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('rec');
  const [pin, setPin] = useState('12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPin?: string) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const u = customUser !== undefined ? customUser : username;
    const p = customPin !== undefined ? customPin : pin;
    
    try {
      const res = await api.post('/auth/login', { username: u, pin: p });
      // Save session info
      localStorage.setItem('auth_token', res.token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('user_id', res.user_id);
      localStorage.setItem('user_name', res.name);
      
      if (res.role === 'RECEPTIONIST') {
        router.push('/receptionist');
      } else if (res.role === 'DOCTOR') {
        router.push('/doctor-desk');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Invalid ID or PIN.');
    } finally {
      setLoading(false);
    }
  };

  const quickSelect = (u: string, p: string = '12345') => {
    setUsername(u);
    setPin(p);
    handleLogin(undefined, u, p);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'var(--bg-main)', color: 'var(--text-primary)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: '36px 32px', borderRadius: 24,
        border: '1px solid var(--border-color)', width: '100%', maxWidth: 460,
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', backdropFilter: 'blur(20px)'
      }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 44, marginBottom: 6, textAlign: 'center', letterSpacing: '.05em' }}>STAFF LOGIN</h1>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>
          Instant access with password <strong>12345</strong>
        </p>

        {/* Quick-Access Pills */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8, textAlign: 'center' }}>
            [QUICK ACCESS] 1-Click Login
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => quickSelect('rec', '12345')}
              style={{
                background: 'rgba(217, 22, 54, 0.2)', border: '1px solid #D91636', color: '#fff',
                padding: '6px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              Receptionist (rec)
            </button>
            <button
              type="button"
              onClick={() => quickSelect('gen', '12345')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              General (gen)
            </button>
            <button
              type="button"
              onClick={() => quickSelect('card', '12345')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              Cardio (card)
            </button>
            <button
              type="button"
              onClick={() => quickSelect('ped', '12345')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              Pediatric (ped)
            </button>
            <button
              type="button"
              onClick={() => quickSelect('ortho', '12345')}
              style={{
                background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              Ortho (ortho)
            </button>
            <button
              type="button"
              onClick={() => quickSelect('emg', '12345')}
              style={{
                background: 'rgba(255, 45, 85, 0.12)', border: '1px solid rgba(255, 45, 85, 0.4)', color: '#ff4757',
                padding: '6px 10px', borderRadius: 16, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk'", cursor: 'pointer'
              }}
            >
              Emergency (emg)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,45,85,0.12)', border: '1px solid #D91636', color: '#ff4757', padding: 12, borderRadius: 10, marginBottom: 20, fontFamily: "'Space Grotesk'", fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>USER ID / DEPARTMENT (e.g. rec, gen, card)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. rec, gen, card, ped..."
              style={{
                width: '100%', padding: '14px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 10, fontSize: 16, fontFamily: "'Space Grotesk'", outline: 'none'
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>PASSWORD / PIN (Default: 12345)</label>
            <input 
              type="password" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)}
              placeholder="12345"
              style={{
                width: '100%', padding: '14px 16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 10, fontSize: 16, fontFamily: "'Space Grotesk'", outline: 'none'
              }}
              required
            />
          </div>

          <button type="submit" disabled={loading} style={{
            background: '#D91636', color: '#fff', border: 'none', padding: '15px', borderRadius: 10,
            fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
            boxShadow: '0 4px 16px rgba(217, 22, 54, 0.4)', transition: 'all 0.2s', width: '100%', opacity: loading ? 0.7 : 1
          }}>
            {loading ? 'AUTHENTICATING...' : 'LOGIN TO SYSTEM →'}
          </button>
        </form>
      </div>
      
      <button onClick={() => router.push('/')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-secondary)', fontFamily: "'Space Grotesk'", fontSize: 14, cursor: 'pointer' }}>
        ← Back to Home
      </button>
    </div>
  );
}
