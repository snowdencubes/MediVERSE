'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MediVERSENav } from '@/components/common/MediVERSENav';
import { chatWithVoiceAssistant, createTicket } from '@/services/api';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

function generateSessionId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

function MicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="11" rx="3"></rect>
      <path d="M5 10v2a7 7 0 0 0 14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="22"></line>
      <line x1="8" y1="22" x2="16" y2="22"></line>
    </svg>
  );
}

function SpeakerIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  );
}

export default function VoiceAssistantPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef('');

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Init speech recognition — auto-detect language
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    // Use en-IN as base but browser will accept Hindi/other languages too
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (final) {
        transcriptRef.current = final;
        setLiveTranscript(final);
      } else {
        setLiveTranscript(interim);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = transcriptRef.current.trim();
      if (text.length > 0) {
        handleSend(text);
      }
      transcriptRef.current = '';
      setLiveTranscript('');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
    };

    // Greet on mount
    const greeting = "Hello, I am MediVERSE AI. How can I help you today?";
    addMessage('assistant', greeting);
    speakText(greeting);

    return () => {
      recognition.abort();
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role, content, timestamp: now }]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing) return;
    addMessage('user', text);
    setIsProcessing(true);

    try {
      const res = await chatWithVoiceAssistant(sessionId, text);
      if (res.session_id && res.session_id !== sessionId) {
        setSessionId(res.session_id);
      }

      addMessage('assistant', res.reply);
      speakText(res.reply);

      // Handle actions
      if (res.action === 'BOOK_TICKET' && res.action_data) {
        addMessage('system', 'Booking your appointment...');
        try {
          const ticket = await createTicket({
            department_id: res.action_data.dept_id || 'dep_gen',
            doctor_id: res.action_data.doctor_id || '',
            patient: {
              national_id: 'GUEST-000',
              full_name: res.action_data.patient_name || 'Guest Patient',
              phone: 'N/A',
              age: 25,
              gender: 'O',
              insurance_member: false
            },
            payment_method: 'CASH',
            combo_package_ids: []
          });
          localStorage.setItem('current_ticket', JSON.stringify(ticket));
          addMessage('system', `Ticket ${ticket.token_number} booked! Redirecting to receipt...`);
          setTimeout(() => router.push(`/receipt?id=${ticket.ticket_id}`), 2000);
        } catch (e) {
          addMessage('system', 'Booking failed. Please try the manual kiosk.');
        }
      }
    } catch (e) {
      console.error(e);
      addMessage('assistant', 'I had trouble processing that. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to detect if text contains Hindi/Devanagari
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';

    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang === utterance.lang) || voices[0];
    if (matchVoice) utterance.voice = matchVoice;
    utterance.rate = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-listen after AI finishes speaking
      setTimeout(() => startListening(), 500);
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (isSpeaking) window.speechSynthesis.cancel();
    if (!recognitionRef.current || isListening || isProcessing) return;
    transcriptRef.current = '';
    setLiveTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListen = () => {
    if (isListening) stopListening();
    else startListening();
  };

  // Status text
  const statusText = isProcessing ? 'THINKING...' : isSpeaking ? 'AI SPEAKING...' : isListening ? 'LISTENING...' : 'TAP MIC TO SPEAK';

  return (
    <>
      <MediVERSENav currentModule="voice-assistant" />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}} />

      <div style={{
        position: 'relative', zIndex: 10,
        height: '100vh', display: 'flex', flexDirection: 'row',
        background: 'transparent', color: 'var(--text-primary)',
        overflow: 'hidden'
      }}>

        {/* LEFT: Chat History */}
        <div style={{
          flex: '1 1 60%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border-color)',
          paddingTop: 80
        }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 24px',
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : msg.role === 'system' ? '8px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' 
                    ? '#D91636' 
                    : msg.role === 'system'
                    ? 'rgba(255,45,85,0.1)'
                    : 'var(--bg-card)',
                  border: msg.role === 'system' ? '1px dashed rgba(255,45,85,0.3)' : '1px solid var(--border-color)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                }}>
                  <p style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 'clamp(16px, 1.7vw, 20px)', lineHeight: 1.5, margin: 0
                  }}>{msg.content}</p>
                  <p style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 'clamp(12px, 1.2vw, 16px)', color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                    marginTop: 4, textAlign: 'right'
                  }}>{msg.timestamp}</p>
                </div>
              </div>
            ))}

            {/* Live transcript */}
            {liveTranscript && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '75%', padding: '12px 16px',
                  borderRadius: '16px 16px 4px 16px',
                  background: 'rgba(255,45,85,0.3)',
                  border: '1px solid rgba(255,45,85,0.5)',
                  color: '#fff'
                }}>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', margin: 0, fontStyle: 'italic' }}>
                    {liveTranscript}...
                  </p>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 20px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)'
                }}>
                  <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', color: 'var(--text-secondary)', margin: 0, animation: 'blink 1s infinite' }}>
                    Thinking...
                  </p>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Text input fallback */}
          <div style={{
            padding: '12px 24px', borderTop: '1px solid var(--border-color)',
            display: 'flex', gap: 8
          }}>
            <input
              type="text"
              placeholder="Type a message (or use mic)..."
              style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', padding: '12px 16px', borderRadius: 8,
                fontFamily: "'Space Grotesk'", fontSize: 'clamp(16px, 1.7vw, 20px)', outline: 'none'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  handleSend((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <button
              onClick={toggleListen}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: isListening ? '#D91636' : 'var(--bg-card)',
                border: `2px solid ${isListening ? '#D91636' : 'var(--border-color)'}`,
                color: isListening ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.3s',
                animation: isListening ? 'pulse 1.5s infinite' : 'none'
              }}
            >
              <MicIcon size={20} />
            </button>
          </div>
        </div>

        {/* RIGHT: Status Panel */}
        <div style={{
          flex: '0 0 320px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 32,
          gap: 32
        }}>
          {/* Big Mic Button */}
          <button
            onClick={toggleListen}
            style={{
              width: 140, height: 140, borderRadius: '50%',
              background: isListening ? 'rgba(255,45,85,0.2)' : isSpeaking ? 'rgba(45,155,255,0.15)' : 'var(--bg-card)',
              border: `3px solid ${isListening ? '#D91636' : isSpeaking ? '#2d9bff' : 'var(--border-color)'}`,
              color: isListening ? '#D91636' : isSpeaking ? '#2d9bff' : 'var(--text-primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: isListening ? '0 0 40px rgba(255,45,85,0.5)' : isSpeaking ? '0 0 40px rgba(45,155,255,0.4)' : 'none',
              animation: (isListening || isSpeaking) ? 'pulse 1.5s infinite' : 'none'
            }}
          >
            {isSpeaking ? <SpeakerIcon size={48} /> : <MicIcon size={48} />}
          </button>

          {/* Status */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 28,
              letterSpacing: '.08em', color: 'var(--text-primary)', marginBottom: 8
            }}>{statusText}</h2>
            <p style={{
              fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)',
              color: 'var(--text-secondary)', lineHeight: 1.6
            }}>
              Speak in any language.<br/>
              Hindi, English, Tamil, Bengali...<br/>
              I will understand and respond.
            </p>
          </div>

          {/* Session Info */}
          <div style={{
            padding: '12px 20px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', borderRadius: 8,
            width: '100%', textAlign: 'center'
          }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', letterSpacing: '.05em' }}>
              SESSION: {sessionId.slice(0, 16)}...
            </p>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 'clamp(12px, 1.2vw, 16px)', color: 'var(--text-muted)', marginTop: 4 }}>
              {messages.filter(m => m.role === 'user').length} messages sent
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/home')}
            style={{
              padding: '12px 24px', background: 'transparent',
              border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              borderRadius: 8, fontFamily: "'Space Grotesk'", fontSize: 'clamp(14px, 1.4vw, 18px)',
              cursor: 'pointer', letterSpacing: '.05em', transition: 'all 0.2s'
            }}
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </>
  );
}
