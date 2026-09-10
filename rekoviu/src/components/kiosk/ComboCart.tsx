import React from 'react';
import { HealthComboPackage } from '@/types';

interface ComboCartProps {
  combos: HealthComboPackage[];
  selectedComboIds: string[];
  onToggleCombo: (id: string) => void;
  baseFee: number;
}

export const ComboCart: React.FC<ComboCartProps> = ({ combos, selectedComboIds, onToggleCombo, baseFee }) => {
  const selectedCombos = combos.filter(c => selectedComboIds.includes(c.id));
  const comboTotal = selectedCombos.reduce((sum, c) => sum + c.price, 0);
  const grandTotal = baseFee + comboTotal;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', height: 480, overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-card)'
      }}>
        <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '.05em' }}>
          DIAGNOSTIC ADD-ONS
        </h2>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {combos.map((combo) => {
          const isSelected = selectedComboIds.includes(combo.id);
          return (
            <div
              key={combo.id}
              onClick={() => onToggleCombo(combo.id)}
              style={{
                padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'start',
                background: isSelected ? 'rgba(255,45,85,.06)' : 'var(--bg-card)',
                border: `1px solid ${isSelected ? 'rgba(255,45,85,.2)' : 'var(--border-color)'}`,
                transition: 'background .2s'
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', marginRight: 12, marginTop: 2,
                border: `2px solid ${isSelected ? '#D91636' : 'var(--text-muted)'}`,
                background: isSelected ? '#D91636' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(13px, 1.3vw, 17px)', color: 'var(--text-primary)', flexShrink: 0
              }}>
                {isSelected ? '\u2713' : ''}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h4 style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {combo.title}
                  </h4>
                  <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', fontWeight: 700, color: '#D91636', marginLeft: 8 }}>${combo.price}</span>
                </div>
                <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>{combo.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {combo.included_tests.map((test, idx) => (
                    <span key={idx} style={{
                      fontFamily: "'Space Grotesk'", fontSize: 'clamp(11px, 1.1vw, 15px)', padding: '2px 6px',
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)'
                    }}>{test}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 20, borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)', marginBottom: 6 }}>
          <span>Base Fee</span><span>${baseFee.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)', color: 'var(--text-secondary)', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border-color)' }}>
          <span>Add-ons</span><span>${comboTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
          <span style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: '#D91636', letterSpacing: '.04em' }}>${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
