import React from 'react';
import { VitalsInput } from '@/types';

interface VitalsPickerProps {
  vitals: VitalsInput;
  onChange: (vitals: VitalsInput) => void;
}

export const VitalsPicker: React.FC<VitalsPickerProps> = ({ vitals, onChange }) => {
  const handleChange = (field: keyof VitalsInput, value: number) => {
    onChange({ ...vitals, [field]: value });
  };

  const getPainColor = (score: number) => {
    if (score <= 3) return 'rgba(255,255,255,.5)';
    if (score <= 6) return '#fff';
    return '#D91636';
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', fontSize: 'clamp(26px, 2.9vw, 30px)', fontWeight: 700,
    color: 'var(--text-primary)', outline: 'none', border: 'none',
    fontFamily: "'Space Grotesk', sans-serif"
  };

  const fieldWrap: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
    padding: '16px 20px'
  };

  return (
    <div style={{
      background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: 28
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <span style={{ fontSize: 'clamp(24px, 2.6vw, 28px)', color: '#D91636' }}>&#9878;</span>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(18px, 1.9vw, 22px)', fontWeight: 700, color: 'var(--text-primary)' }}>Self-Triage Vitals</h2>
          <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-secondary)' }}>Provide vitals for priority assessment</p>
        </div>
      </div>

      {/* Pain Level */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 8 }}>
          <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Pain Level (0-10)
          </label>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: getPainColor(vitals.pain_score) }}>{vitals.pain_score}</span>
        </div>
        <input
          type="range" min="0" max="10"
          value={vitals.pain_score}
          onChange={e => handleChange('pain_score', parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#D91636' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Grotesk'", fontSize: 'clamp(11px, 1.1vw, 15px)', color: 'var(--text-muted)', marginTop: 4 }}>
          <span>NO PAIN (0)</span><span>SEVERE (10)</span>
        </div>
      </div>

      {/* Blood Pressure */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={fieldWrap}>
          <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Systolic BP</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input type="number" value={vitals.systolic_bp} onChange={e => handleChange('systolic_bp', parseInt(e.target.value))} style={inputStyle} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)' }}>mmHg</span>
          </div>
        </div>
        <div style={fieldWrap}>
          <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Diastolic BP</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input type="number" value={vitals.diastolic_bp} onChange={e => handleChange('diastolic_bp', parseInt(e.target.value))} style={inputStyle} />
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)' }}>mmHg</span>
          </div>
        </div>
      </div>

      {/* Heart Rate & Temp */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 'clamp(22px, 2.4vw, 26px)', color: '#D91636' }}>&#9829;</span>
          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Heart Rate</label>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <input type="number" value={vitals.heart_rate} onChange={e => handleChange('heart_rate', parseInt(e.target.value))} style={{ ...inputStyle, width: 60, fontSize: 'clamp(22px, 2.4vw, 26px)' }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(11px, 1.1vw, 15px)', color: 'var(--text-muted)' }}>bpm</span>
            </div>
          </div>
        </div>
        <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 'clamp(22px, 2.4vw, 26px)', color: 'var(--text-secondary)' }}>&#9832;</span>
          <div>
            <label style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Body Temp</label>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <input type="number" step="0.1" value={vitals.temperature_c} onChange={e => handleChange('temperature_c', parseFloat(e.target.value))} style={{ ...inputStyle, width: 60, fontSize: 'clamp(22px, 2.4vw, 26px)' }} />
              <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(11px, 1.1vw, 15px)', color: 'var(--text-muted)' }}>C</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
