'use client';

import { useEffect, useState } from 'react';

// Dark medical / clinical background images
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1551190822-a9ce113ac100?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=1600&q=80&fm=webp&fit=crop',
  'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=1600&q=80&fm=webp&fit=crop',
];

export function BackgroundLayer() {
  const [fadeClass, setFadeClass] = useState('fade-in');

  useEffect(() => {
    const el = document.getElementById('bg-img') as HTMLImageElement;
    if (!el) return;

    let idx = Math.floor(Math.random() * BG_IMAGES.length);
    el.src = BG_IMAGES[idx];

    const interval = setInterval(() => {
      setFadeClass('fade-out');
      setTimeout(() => {
        idx = (idx + 1) % BG_IMAGES.length;
        el.src = BG_IMAGES[idx];
        setFadeClass('fade-in');
      }, 600);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div id="bg-wrap">
      <img id="bg-img" src="" alt="" className={fadeClass} />
    </div>
  );
}
