import React from 'react';
import { Doctor } from '@/types';

interface DoctorCardProps {
  doctor: Doctor;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(doctor.id)}
      style={{
        width: '100%', display: 'flex', alignItems: 'start', textAlign: 'left',
        padding: '16px 20px', marginBottom: 8, cursor: 'pointer',
        background: isSelected ? 'rgba(255,45,85,.08)' : 'var(--bg-card)',
        border: `1px solid ${isSelected ? 'rgba(255,45,85,.3)' : 'var(--border-color)'}`,
        transition: 'background .2s'
      }}
    >
      <div style={{
        width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginRight: 16, flexShrink: 0, fontSize: 'clamp(24px, 2.6vw, 28px)',
        background: isSelected ? 'rgba(255,45,85,.15)' : 'var(--bg-hover)',
        color: isSelected ? '#D91636' : 'var(--text-secondary)',
        border: `1px solid ${isSelected ? 'rgba(255,45,85,.2)' : 'var(--border-color)'}`
      }}>&#9673;</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{
          fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700,
          color: isSelected ? 'var(--text-primary)' : 'var(--text-primary)', marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{doctor.name}</h4>
        <p style={{
          fontFamily: "'Space Grotesk'", fontSize: 'clamp(13px, 1.3vw, 17px)', color: '#D91636',
          marginBottom: 6
        }}>{doctor.specialty}</p>
        <div style={{ display: 'flex', gap: 16, fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-secondary)' }}>
          <span>Wait: {doctor.estimated_wait_minutes}m</span>
          <span>{doctor.room_number}</span>
          <span>Rating: {doctor.rating}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: doctor.is_available ? 'var(--text-primary)' : '#D91636'
        }} />
        <span style={{
          fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700,
          color: 'var(--text-primary)', marginTop: 12
        }}>${doctor.consultation_fee}</span>
      </div>
    </button>
  );
};
