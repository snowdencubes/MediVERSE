import React, { useEffect, useState } from 'react';
import { QueueTicket } from '@/types';
import { Volume2, VolumeX, ArrowRight } from 'lucide-react';

interface NowCallingCardProps {
  ticket: QueueTicket | null;
}

export const NowCallingCard: React.FC<NowCallingCardProps> = ({ ticket }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);

  useEffect(() => {
    if (ticket && ticket.ticket_id !== lastAnnouncedId && audioEnabled) {
      if ('speechSynthesis' in window) {
        const text = `Token number ${ticket.token_number}, please proceed to ${ticket.room_number}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
      setLastAnnouncedId(ticket.ticket_id);
    }
  }, [ticket, lastAnnouncedId, audioEnabled]);

  if (!ticket) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6">
          <ArrowRight className="w-10 h-10 text-slate-600" />
        </div>
        <h2 className="text-3xl font-black text-slate-500 mb-2">Waiting for next patient</h2>
        <p className="text-slate-600">The next token will appear here</p>
      </div>
    );
  }

  return (
    <div className="h-full relative overflow-hidden bg-gradient-to-br from-cyan-950 to-slate-900 border-2 border-brand-cyan rounded-[2.5rem] shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-pulse-glow flex flex-col">
      <div className="absolute top-0 right-0 p-6 z-10">
        <button 
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800/50 text-slate-500'}`}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10">
        <div className="inline-block bg-brand-cyan text-slate-950 font-black tracking-widest uppercase px-6 py-2 rounded-full text-sm mb-8 animate-bounce">
          Now Calling
        </div>
        
        <h1 className="text-8xl lg:text-[10rem] font-black tracking-tighter text-white mb-6 drop-shadow-2xl">
          {ticket.token_number}
        </h1>
        
        <div className="w-32 h-1.5 bg-cyan-500/30 rounded-full mb-8" />
        
        <div className="space-y-2">
          <p className="text-2xl font-medium text-cyan-100 uppercase tracking-wide">Please proceed to</p>
          <p className="text-5xl font-black text-brand-cyan">{ticket.room_number}</p>
        </div>
      </div>
      
      <div className="bg-slate-950/50 backdrop-blur-md p-6 border-t border-cyan-900/50 flex justify-between items-center z-10">
        <div>
          <p className="text-sm text-cyan-600 font-semibold uppercase tracking-wider mb-1">Department</p>
          <p className="text-lg font-bold text-slate-200">{ticket.department_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-cyan-600 font-semibold uppercase tracking-wider mb-1">Doctor</p>
          <p className="text-lg font-bold text-slate-200">{ticket.doctor_name}</p>
        </div>
      </div>

      {/* Decorative background elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};
