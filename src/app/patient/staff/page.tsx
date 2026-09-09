"use client";
import { useState, useEffect } from "react";

export default function StaffSettingsPage() {
  const [isKiosk, setIsKiosk] = useState(false);

  useEffect(() => {
    setIsKiosk(localStorage.getItem("mediverse_kiosk_mode") === "true");
  }, []);

  const toggleKiosk = () => {
    const newValue = !isKiosk;
    setIsKiosk(newValue);
    localStorage.setItem("mediverse_kiosk_mode", newValue ? "true" : "false");
    window.location.reload(); // Reload to apply layout changes
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center pt-8">
      <div className="glass-panel p-8 rounded-3xl w-full max-w-md space-y-6">
        <h1 className="font-serif text-2xl font-bold text-ink">Staff Settings</h1>
        
        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border-2 border-ink/5">
          <div>
            <h3 className="font-bold text-ink">Kiosk Mode</h3>
            <p className="text-sm text-ink/60">Enable big-screen mode</p>
          </div>
          
          <button
            onClick={toggleKiosk}
            className={`w-14 h-8 rounded-full p-1 transition-colors ${
              isKiosk ? "bg-primary" : "bg-ink/20"
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
              isKiosk ? "translate-x-6" : "translate-x-0"
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}
