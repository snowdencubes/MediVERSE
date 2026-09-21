'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
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
  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const sessionIdRef = useRef('');

  // Keep sessionIdRef synced
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role, content, timestamp: now }]);
  };

  const startListening = () => {
    if (isSpeakingRef.current || isProcessingRef.current || isListeningRef.current) return;
    transcriptRef.current = '';
    setLiveTranscript('');
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        isListeningRef.current = true;
        setIsListening(true);
      }
    } catch (e: any) {
      if (e?.name === 'InvalidStateError') {
        isListeningRef.current = true;
        setIsListening(true);
      }
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {}
  };

  const toggleListen = () => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      if (isSpeakingRef.current && typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      }
      startListening();
    }
  };

  const fallbackTTS = (text: string, onEnd: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const hasDevanagari = /[\u0900-\u097F]/.test(text);
      utterance.lang = hasDevanagari ? 'hi-IN' : 'en-IN';

      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(v => v.lang === utterance.lang) || voices[0];
      if (matchVoice) utterance.voice = matchVoice;
      utterance.rate = 1.0;

      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      onEnd();
    }
  };

  const speakText = (text: string, audioBase64?: string) => {
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    stopListening();

    const onEnd = () => {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      // Auto-resume listening hands-free after AI finishes talking
      setTimeout(() => {
        if (!isProcessingRef.current && !isSpeakingRef.current) {
          startListening();
        }
      }, 350);
    };

    if (audioBase64) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audio.onended = onEnd;
        audio.onerror = () => fallbackTTS(text, onEnd);
        audio.play().catch(e => {
          fallbackTTS(text, onEnd);
        });
        return;
      } catch (e) {
        fallbackTTS(text, onEnd);
        return;
      }
    }

    fallbackTTS(text, onEnd);
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProcessingRef.current) return;

    addMessage('user', trimmed);
    isProcessingRef.current = true;
    setIsProcessing(true);
    stopListening();

    try {
      const currentSid = sessionIdRef.current;
      const res = await chatWithVoiceAssistant(currentSid, trimmed);
      if (res.session_id && res.session_id !== currentSid) {
        setSessionId(res.session_id);
        sessionIdRef.current = res.session_id;
      }

      addMessage('assistant', res.reply);
      speakText(res.reply, res.audio_base64);

      // Handle actions
      if (res.action === 'UPLOAD_ABHA_DOCUMENTS') {
        setShowAbhaModal(true);
      } else if (res.action === 'GO_BACK') {
        setShowAbhaModal(false);
      } else if (res.action === 'BOOK_TICKET' && res.action_data) {
        addMessage('system', 'Booking your appointment...');
        try {
          const registeredPhone = typeof window !== 'undefined' ? localStorage.getItem('whatsapp_phone') || 'N/A' : 'N/A';
          const ticket = await createTicket({
            department_id: res.action_data.dept_id || 'dep_gen',
            doctor_id: res.action_data.doctor_id || '',
            combo_package_ids: [],
            payment_method: 'CASH',
            patient: {
              national_id: 'GUEST-000',
              full_name: res.action_data.patient_name || 'Voice Patient',
              phone: registeredPhone,
              age: 30,
              gender: 'O',
              insurance_member: false
            }
          });
          if (ticket) {
            const confirmMsg = `Appointment confirmed! Your Token is ${ticket.token_number} (${ticket.department_name}).`;
            addMessage('assistant', confirmMsg);
            speakText(confirmMsg);
          }
        } catch (err) {
          console.error('Ticket booking error:', err);
        }
      }
    } catch (err) {
      console.error('Voice AI Error:', err);
      const errMsg = 'I had trouble connecting to the hospital assistant. Please try again.';
      addMessage('assistant', errMsg);
      speakText(errMsg);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Init speech recognition & session once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialSid = generateSessionId();
    setSessionId(initialSid);
    sessionIdRef.current = initialSid;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: any = null;

    if (SR) {
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognitionRef.current = recognition;

      let debounceTimer: any = null;

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return;

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

        const currentText = (final || interim).trim();
        if (currentText) {
          transcriptRef.current = currentText;
          setLiveTranscript(currentText);

          // Auto-send when user pauses speech for 1.4 seconds
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const textToSend = transcriptRef.current.trim();
            if (textToSend.length > 0 && !isProcessingRef.current && !isSpeakingRef.current) {
              transcriptRef.current = '';
              setLiveTranscript('');
              handleSend(textToSend);
            }
          }, 1400);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        const text = transcriptRef.current.trim();
        if (text.length > 0 && !isProcessingRef.current && !isSpeakingRef.current) {
          transcriptRef.current = '';
          setLiveTranscript('');
          handleSend(text);
        } else if (!isProcessingRef.current && !isSpeakingRef.current) {
          setTimeout(() => startListening(), 350);
        }
      };

      recognition.onerror = (event: any) => {
        isListeningRef.current = false;
        setIsListening(false);
        if (event.error !== 'not-allowed' && !isProcessingRef.current && !isSpeakingRef.current) {
          setTimeout(() => startListening(), 800);
        }
      };
    }

    // Hands-Free Watchdog Timer: keeps mic listening 24/7
    const watchdog = setInterval(() => {
      if (!isListeningRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
        startListening();
      }
    }, 2500);

    // Process initial voice query if routed from home/landing, or speak initial greeting
    const initialQuery = sessionStorage.getItem('initial_voice_query');
    if (initialQuery && initialQuery.trim().length > 1) {
      sessionStorage.removeItem('initial_voice_query');
      setTimeout(() => {
        handleSend(initialQuery.trim());
      }, 500);
    } else {
      const greeting = "Hello, I am MediVERSE AI. How can I help you today?";
      setTimeout(() => {
        addMessage('assistant', greeting);
        speakText(greeting);
      }, 400);
    }

    // Touch screen unlock
    const handleScreenTouch = () => {
      if (!isListeningRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
        startListening();
      }
    };
    window.addEventListener('touchstart', handleScreenTouch, { passive: true });
    window.addEventListener('click', handleScreenTouch, { passive: true });

    return () => {
      clearInterval(watchdog);
      window.removeEventListener('touchstart', handleScreenTouch);
      window.removeEventListener('click', handleScreenTouch);
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status text & Word Detection Indicator
  const statusText = isProcessing 
    ? 'THINKING...' 
    : isSpeaking 
    ? 'AI SPEAKING...' 
    : liveTranscript 
    ? `WORD DETECTED: "${liveTranscript}"` 
    : isListening 
    ? 'HANDS-FREE LISTENING 24/7...' 
    : 'AUTO-LISTENING ACTIVE';

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
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
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
                {msg.role === 'assistant' && i === messages.length - 1 && !isProcessing && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleSend('yes')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(46, 213, 115, 0.15)',
                        border: '1px solid #2ed573',
                        color: '#2ed573',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>✓ YES / हाँ / PROCEED</span>
                    </button>
                    <button
                      onClick={() => handleSend('no')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        background: 'rgba(255, 71, 87, 0.15)',
                        border: '1px solid #ff4757',
                        color: '#ff4757',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>✗ NO / नहीं / CANCEL</span>
                    </button>
                  </div>
                )}
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
          flex: '0 0 340px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start', padding: '24px 20px',
          gap: 20, overflowY: 'auto', borderLeft: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {/* Big Mic Button */}
          <button
            onClick={toggleListen}
            style={{
              width: 120, height: 120, borderRadius: '50%',
              background: isListening ? 'rgba(255,45,85,0.2)' : isSpeaking ? 'rgba(45,155,255,0.15)' : 'var(--bg-card)',
              border: `3px solid ${isListening ? '#D91636' : isSpeaking ? '#2d9bff' : 'var(--border-color)'}`,
              color: isListening ? '#D91636' : isSpeaking ? '#2d9bff' : 'var(--text-primary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: isListening ? '0 0 40px rgba(255,45,85,0.5)' : isSpeaking ? '0 0 40px rgba(45,155,255,0.4)' : 'none',
              animation: (isListening || isSpeaking) ? 'pulse 1.5s infinite' : 'none'
            }}
          >
            {isSpeaking ? <SpeakerIcon size={44} /> : <MicIcon size={44} />}
          </button>

          {/* Status */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 24,
              letterSpacing: '.08em', color: isListening ? '#ff4757' : isSpeaking ? '#2d9bff' : 'var(--text-primary)', marginBottom: 4
            }}>{statusText}</h2>
            <p style={{
              fontFamily: "'Space Grotesk'", fontSize: 13,
              color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0
            }}>
              Continuous 24/7 Voice Listening Active.<br/>
              Speak in Hindi, English, or any language.
            </p>
          </div>

          {/* Quick Voice Checkpoint Action Controls */}
          <div style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 11,
              fontFamily: "'Space Grotesk'",
              letterSpacing: '.08em',
              fontWeight: 600,
              color: '#00f2fe'
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f2fe', animation: 'blink 1.2s infinite' }} />
              VOICE CHECKPOINT: SAY OR TAP
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => handleSend('yes')}
                disabled={isProcessing}
                style={{
                  padding: '12px 6px',
                  background: 'rgba(46, 213, 115, 0.15)',
                  border: '1px solid #2ed573',
                  color: '#2ed573',
                  borderRadius: 8,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all 0.2s',
                  boxShadow: '0 0 15px rgba(46, 213, 115, 0.2)'
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>✓ YES / हाँ</span>
                <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 500 }}>PROCEED</span>
              </button>
              <button
                onClick={() => handleSend('no')}
                disabled={isProcessing}
                style={{
                  padding: '12px 6px',
                  background: 'rgba(255, 71, 87, 0.15)',
                  border: '1px solid #ff4757',
                  color: '#ff4757',
                  borderRadius: 8,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all 0.2s',
                  boxShadow: '0 0 15px rgba(255, 71, 87, 0.2)'
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700 }}>✗ NO / नहीं</span>
                <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 500 }}>CANCEL</span>
              </button>
            </div>
          </div>

          {/* Submenu Options List */}
          <div style={{
            padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)',
            borderRadius: 8, width: '100%', display: 'flex', flexDirection: 'column', gap: 6
          }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: '#888', letterSpacing: '.1em', textTransform: 'uppercase', margin: '0 0 4px 0' }}>QUICK ASSIST</p>
            <button
              onClick={() => handleSend('I want to upload ABHA card or medical documents')}
              style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 4 }}
            >
              1. UPLOAD ABHA / REPORTS
            </button>
            <button
              onClick={() => handleSend('Tell me available doctors')}
              style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#fff', fontFamily: "'Space Grotesk'", fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 4 }}
            >
              2. LIST DOCTORS & FEES
            </button>
            <button
              onClick={() => handleSend('back')}
              style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #444', color: '#888', fontFamily: "'Space Grotesk'", fontSize: 12, cursor: 'pointer', textAlign: 'left', borderRadius: 4 }}
            >
              3. RESET / MAIN MENU
            </button>
          </div>

          {/* Session Info */}
          <div style={{
            padding: '10px 16px', background: 'var(--bg-card)',
            border: '1px solid var(--border-color)', borderRadius: 8,
            width: '100%', textAlign: 'center'
          }}>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: 'var(--text-muted)', letterSpacing: '.05em', margin: 0 }}>
              SESSION: {sessionId.slice(0, 16)}...
            </p>
            <p style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {messages.filter(m => m.role === 'user').length} voice messages exchanged
            </p>
          </div>

          {/* Back button */}
          <button
            onClick={() => router.push('/home')}
            style={{
              width: '100%',
              padding: '10px 16px', background: 'transparent',
              border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
              borderRadius: 8, fontFamily: "'Space Grotesk'", fontSize: 13,
              cursor: 'pointer', letterSpacing: '.05em', transition: 'all 0.2s'
            }}
          >
            BACK TO HOME
          </button>
        </div>
      </div>

      {/* ABHA & Document Upload Modal */}
      {showAbhaModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#111', border: '1px solid #333', padding: 32, maxWidth: 440, width: '100%',
            borderRadius: 8, color: '#fff', fontFamily: "'Space Grotesk'", textAlign: 'center', position: 'relative'
          }}>
            <button
              onClick={() => setShowAbhaModal(false)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer' }}
            >
              ✕
            </button>
            
            <h2 style={{ fontFamily: "'Bebas Neue'", fontSize: 32, letterSpacing: '0.05em', color: '#fff', marginBottom: 8 }}>
              SMART ABHA & DOCUMENT UPLOAD
            </h2>
            <p style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>
              Scan this QR code to upload your ABHA card or medical records. It will auto-fill your details instantly.
            </p>

            <div style={{ background: '#fff', padding: 20, display: 'inline-block', borderRadius: 8, marginBottom: 20 }}>
              <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/kiosk?abha_ref=${sessionId}`} size={160} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  localStorage.setItem('whatsapp_phone', '9876543210');
                  addMessage('system', 'ABHA Card Scanned: Patient details auto-filled');
                  setShowAbhaModal(false);
                }}
                style={{ padding: '12px', background: '#D91636', color: '#fff', border: 'none', fontFamily: "'Bebas Neue'", fontSize: 20, cursor: 'pointer' }}
              >
                SIMULATE ABHA AUTO-FILL SCAN
              </button>
              <button
                onClick={() => setShowAbhaModal(false)}
                style={{ padding: '10px', background: 'transparent', border: '1px solid #444', color: '#aaa', fontFamily: "'Space Grotesk'", fontSize: 14, cursor: 'pointer' }}
              >
                CLOSE & RETURN TO CHAT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
