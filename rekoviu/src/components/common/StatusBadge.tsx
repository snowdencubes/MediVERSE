'use client';

export function StatusBadge({ type }: { type: string }) {
  let bg = 'rgba(255,255,255,.08)';
  let color = 'rgba(255,255,255,.5)';
  let border = 'rgba(255,255,255,.12)';
  let label = type;

  switch (type) {
    case 'EMERGENCY':
      bg = 'rgba(255,45,85,.15)';
      color = '#D91636';
      border = 'rgba(255,45,85,.3)';
      break;
    case 'URGENT':
      bg = 'rgba(255,255,255,.08)';
      color = '#fff';
      border = 'rgba(255,255,255,.2)';
      break;
    case 'STANDARD':
      bg = 'rgba(255,255,255,.04)';
      color = 'rgba(255,255,255,.5)';
      border = 'rgba(255,255,255,.08)';
      break;
    case 'NOW_CALLING':
      bg = 'rgba(255,45,85,.12)';
      color = '#D91636';
      border = 'rgba(255,45,85,.25)';
      label = 'NOW CALLING';
      break;
    case 'WAITING':
      bg = 'rgba(255,255,255,.04)';
      color = 'rgba(255,255,255,.4)';
      border = 'rgba(255,255,255,.08)';
      break;
    case 'COMPLETED':
      bg = 'rgba(255,255,255,.06)';
      color = 'rgba(255,255,255,.3)';
      border = 'rgba(255,255,255,.1)';
      break;
  }

  return (
    <span style={{
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 'clamp(12px, 1.2vw, 16px)',
      fontWeight: 700,
      letterSpacing: '.1em',
      textTransform: 'uppercase',
      padding: '3px 10px',
      background: bg,
      color: color,
      border: `1px solid ${border}`,
      display: 'inline-block'
    }}>
      {label}
    </span>
  );
}
