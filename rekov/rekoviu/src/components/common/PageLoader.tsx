'use client';

import { useEffect } from 'react';

export function PageLoader() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById('loader');
      if (el) el.classList.add('done');
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div id="loader">
      <div className="loader-logo">MediVERSE</div>
      <div className="loader-bar-wrap">
        <div className="loader-bar"></div>
      </div>
    </div>
  );
}
