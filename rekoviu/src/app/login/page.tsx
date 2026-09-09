'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

export default function LoginPage() {
  const [username, setUsername] = useState('sadmin');
  const [pin, setPin] = useState('sadmin');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await api.post('/auth/login', { username, pin });
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
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'var(--bg-main)', color: 'var(--text-primary)'
    }}>
      <div style={{
        background: 'var(--bg-card)', padding: 40, borderRadius: 24,
        border: '1px solid var(--border-color)', width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(20px)'
      }}>
        <h1 style={{ fontFamily: "'Bebas Neue'", fontSize: 48, marginBottom: 8, textAlign: 'center' }}>STAFF LOGIN</h1>
        <p style={{ fontFamily: "'Space Grotesk'", fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 32 }}>
          Access Receptionist & Doctor Portals
        </p>

        {error && (
          <div style={{ background: 'rgba(255,45,85,0.1)', color: '#ff2d55', padding: 12, borderRadius: 8, marginBottom: 20, fontFamily: "'Space Grotesk'", fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>USER ID / USERNAME</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or doc_1"
              style={{
                width: '100%', padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 12, fontSize: 16, fontFamily: "'Space Grotesk'", outline: 'none'
              }}
              required
            />
          </div>

          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>SECURE PIN</label>
            <input 
              type="password" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              style={{
                width: '100%', padding: '16px', background: 'var(--bg-input)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: 12, fontSize: 16, fontFamily: "'Space Grotesk'", outline: 'none'
              }}
              required
            />
          </div>

          <button type="submit" style={{
            background: '#ff2d55', color: '#fff', border: 'none', padding: '16px', borderRadius: 12,
            fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 12,
            transition: 'background 0.2s', width: '100%'
          }}>
            LOGIN TO SYSTEM
          </button>
        </form>
      </div>
      
      <button onClick={() => router.push('/')} style={{ marginTop: 24, background: 'none', border: 'none', color: 'var(--text-secondary)', fontFamily: "'Space Grotesk'", fontSize: 14, cursor: 'pointer' }}>
        ← Back to Home
      </button>
    </div>
  );
}
