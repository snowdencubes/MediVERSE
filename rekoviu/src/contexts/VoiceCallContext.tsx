'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { speakBilingualText, cancelCurrentTTS } from '@/services/tts';

export type CallStatus = 'IDLE' | 'CONNECTING' | 'LISTENING' | 'USER_SPEAKING' | 'AI_THINKING' | 'AI_SPEAKING' | 'MUTED';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface VoiceCallContextType {
  isCallActive: boolean;
  callStatus: CallStatus;
  isMuted: boolean;
  liveTranscript: string;
  latestUserQuery: string;
  latestAssistantReply: string;
  messages: ChatMessage[];
  sessionId: string;
  latestTicket: any | null;
  startCall: () => void;
  endCall: () => void;
  toggleCall: () => void;
  toggleMute: () => void;
  sendTextMessage: (text: string) => Promise<void>;
  interruptAI: () => void;
}

const VoiceCallContext = createContext<VoiceCallContextType | undefined>(undefined);

export const VoiceCallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('IDLE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [latestUserQuery, setLatestUserQuery] = useState<string>('');
  const [latestAssistantReply, setLatestAssistantReply] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [latestTicket, setLatestTicket] = useState<any | null>(null);

  // Mutable refs for safe event handler access
  const isCallActiveRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const isStartedRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);
  const ttsWatchdogRef = useRef<any>(null);
  const sessionIdRef = useRef<string>('');

  // Sync state to refs
  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Generate session ID on mount
  useEffect(() => {
    const sid = 'call-session-' + Math.random().toString(36).substring(2, 9);
    setSessionId(sid);
    sessionIdRef.current = sid;
  }, []);

  // Safe STT start wrapper preventing InvalidStateError
  const safeStartRecognition = () => {
    if (typeof window === 'undefined') return;
    if (!isCallActiveRef.current || isMutedRef.current) return;
    if (isStartingRef.current || isStartedRef.current) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    try {
      if (!recognitionRef.current) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Works great for English, Hindi & Hinglish

        recognition.onstart = () => {
          isStartingRef.current = false;
          isStartedRef.current = true;
          if (!isSpeakingRef.current && !isProcessingRef.current) {
            setCallStatus('LISTENING');
          }
        };

        recognition.onspeechstart = () => {
          // If AI is speaking when user starts talking -> BARGE IN INTERRUPT!
          if (isSpeakingRef.current) {
            interruptAI();
          }
          setCallStatus('USER_SPEAKING');
        };

        recognition.onresult = (event: any) => {
          // If AI is speaking, allow user barge-in!
          if (isSpeakingRef.current) {
            interruptAI();
          }

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

          const text = (final || interim).trim();
          if (text) {
            transcriptRef.current = text;
            setLiveTranscript(text);
            setCallStatus('USER_SPEAKING');

            // Auto-send when user pauses speech for 900ms
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
              const textToSend = transcriptRef.current.trim();
              if (textToSend.length > 0 && !isProcessingRef.current) {
                transcriptRef.current = '';
                setLiveTranscript('');
                processUserMessage(textToSend);
              }
            }, 900);
          }
        };

        recognition.onerror = (event: any) => {
          isStartingRef.current = false;
          isStartedRef.current = false;
          if (event.error === 'not-allowed') {
            setIsMuted(true);
            setCallStatus('MUTED');
          } else if (isCallActiveRef.current && !isMutedRef.current && !isSpeakingRef.current) {
            setTimeout(safeStartRecognition, 400);
          }
        };

        recognition.onend = () => {
          isStartingRef.current = false;
          isStartedRef.current = false;

          // Process remaining transcript if any
          const textToSend = transcriptRef.current.trim();
          if (textToSend.length > 0 && !isProcessingRef.current) {
            transcriptRef.current = '';
            setLiveTranscript('');
            processUserMessage(textToSend);
          } else if (isCallActiveRef.current && !isMutedRef.current && !isSpeakingRef.current) {
            setTimeout(safeStartRecognition, 250);
          }
        };

        recognitionRef.current = recognition;
      }

      isStartingRef.current = true;
      recognitionRef.current.start();
    } catch (e) {
      isStartingRef.current = false;
      isStartedRef.current = false;
    }
  };

  // Interrupt AI speech (Barge-in capability)
  const interruptAI = () => {
    cancelCurrentTTS();
    isSpeakingRef.current = false;
    if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
    if (isCallActiveRef.current && !isMutedRef.current) {
      setCallStatus('LISTENING');
      safeStartRecognition();
    }
  };

  // Speak response with strict fallback timer watchdog
  const speakAIResponse = (text: string) => {
    if (!text) return;

    // Stop previous audio
    cancelCurrentTTS();
    isSpeakingRef.current = true;
    setCallStatus('AI_SPEAKING');

    // Watchdog timer: safety max 12 seconds in case speech fails to fire onend
    if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
    ttsWatchdogRef.current = setTimeout(() => {
      isSpeakingRef.current = false;
      if (isCallActiveRef.current && !isMutedRef.current) {
        setCallStatus('LISTENING');
        safeStartRecognition();
      }
    }, 12000);

    speakBilingualText({
      text,
      lang: 'hi-IN',
      onStart: () => {
        isSpeakingRef.current = true;
        setCallStatus('AI_SPEAKING');
      },
      onEnd: () => {
        if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
        isSpeakingRef.current = false;
        if (isCallActiveRef.current && !isMutedRef.current) {
          setCallStatus('LISTENING');
          safeStartRecognition();
        }
      },
      onError: () => {
        if (ttsWatchdogRef.current) clearTimeout(ttsWatchdogRef.current);
        isSpeakingRef.current = false;
        if (isCallActiveRef.current && !isMutedRef.current) {
          setCallStatus('LISTENING');
          safeStartRecognition();
        }
      }
    });
  };

  // Process User Speech or Text Message
  const processUserMessage = async (userText: string) => {
    if (!userText || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setCallStatus('AI_THINKING');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: userText, timestamp }]);

    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;

      const res = await fetch(`${apiUrl}/ai_voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: userText
        })
      });

      if (!res.ok) throw new Error('Voice API error');

      const data = await res.json();
      const reply = data.reply || "I am here to help you. What department or service do you need?";

      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // Check for actions (e.g. ticket booking action)
      if (data.action === 'book_appointment' && data.intent) {
        await handleTicketBooking(data.intent, reply);
      } else {
        speakAIResponse(reply);
      }
    } catch (err) {
      const errMsg = "I'm having trouble connecting right now. Please try speaking again.";
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      speakAIResponse(errMsg);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Ticket booking helper action
  const handleTicketBooking = async (intent: any, replyText: string) => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:4040/api/v1`;

      const pName = intent.patient_name || 'Kiosk Guest';
      const pPhone = intent.patient_phone || '9999999999';
      const dept = intent.department_name || 'General OPD';
      const pAge = intent.patient_age || 30;

      const res = await fetch(`${apiUrl}/tickets/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_name: dept,
          priority_level: intent.is_emergency ? 'EMERGENCY' : 'STANDARD',
          triage_score: intent.is_emergency ? 3 : 1,
          combo_ids: [],
          patient_info: {
            national_id: 'GUEST-VOICE',
            full_name: pName,
            phone: pPhone,
            age: pAge,
            gender: 'O',
            insurance_member: false
          }
        })
      });

      if (res.ok) {
        const ticket = await res.json();
        setLatestTicket(ticket);
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_ticket', JSON.stringify(ticket));
        }
        const confirmMsg = `${replyText} Your Token is ${ticket.token_number}.`;
        speakAIResponse(confirmMsg);
      } else {
        speakAIResponse(replyText);
      }
    } catch (e) {
      speakAIResponse(replyText);
    }
  };

  // Start Call Mode
  const startCall = () => {
    setIsCallActive(true);
    setIsMuted(false);
    setCallStatus('CONNECTING');

    // Greet user on call start
    const greeting = "MediVERSE Voice Call active. How can I assist you?";
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: greeting, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      speakAIResponse(greeting);
    }, 400);
  };

  // End Call Mode
  const endCall = () => {
    setIsCallActive(false);
    setCallStatus('IDLE');
    cancelCurrentTTS();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  const toggleCall = () => {
    if (isCallActive) {
      endCall();
    } else {
      startCall();
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute) {
      setCallStatus('MUTED');
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      setCallStatus('LISTENING');
      safeStartRecognition();
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!isCallActive) {
      setIsCallActive(true);
    }
    await processUserMessage(text);
  };

  // Self-Healing Watchdog Loop: keeps mic alive when in call
  useEffect(() => {
    const interval = setInterval(() => {
      if (isCallActiveRef.current && !isMutedRef.current && !isSpeakingRef.current && !isProcessingRef.current && !isStartedRef.current && !isStartingRef.current) {
        safeStartRecognition();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Window Screen-Tap Listener: Any touch/click unlocks mic & audio context instantly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScreenTap = () => {
      if (isCallActiveRef.current && !isMutedRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
        safeStartRecognition();
      }
    };

    window.addEventListener('click', handleScreenTap, { passive: true });
    window.addEventListener('touchstart', handleScreenTap, { passive: true });

    return () => {
      window.removeEventListener('click', handleScreenTap);
      window.removeEventListener('touchstart', handleScreenTap);
    };
  }, []);

  return (
    <VoiceCallContext.Provider
      value={{
        isCallActive,
        callStatus,
        isMuted,
        liveTranscript,
        messages,
        sessionId,
        latestTicket,
        startCall,
        endCall,
        toggleCall,
        toggleMute,
        sendTextMessage,
        interruptAI
      }}
    >
      {children}
    </VoiceCallContext.Provider>
  );
};

export const useVoiceCall = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error('useVoiceCall must be used within a VoiceCallProvider');
  }
  return context;
};
