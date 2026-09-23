'use client';

const MQ_ITEMS = [
  'Express Check-In', 'Live Queue', 'Triage Scoring', 'Token System',
  'Health Combos', 'Doctor Select', 'Self-Service', 'Priority Queue'
];

export function Marquee() {
  const items = [...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS, ...MQ_ITEMS];

  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {items.map((txt, i) => (
          <div key={i} className="marquee-item">
            <span className="dot"></span>
            {txt}
          </div>
        ))}
      </div>
    </div>
  );
}
