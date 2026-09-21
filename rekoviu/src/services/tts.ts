// Studio-Quality Neural Voice (Edge-TTS / ElevenLabs) Dual TTS Service
import { synthesizeTTSAudio } from '@/services/api';

export interface SpeakOptions {
  text: string;
  lang?: string;
  apiKey?: string;
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Global reference to currently playing neural audio so it can be cleanly cancelled/stopped
let currentPlayingAudio: HTMLAudioElement | null = null;

export function cancelCurrentTTS(): void {
  if (typeof window !== 'undefined') {
    if (currentPlayingAudio) {
      try {
        currentPlayingAudio.pause();
        currentPlayingAudio.currentTime = 0;
      } catch (e) {}
      currentPlayingAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}

export async function speakBilingualText(options: SpeakOptions): Promise<void> {
  const { text, lang = 'hi-IN', onStart, onEnd, onError } = options;
  cancelCurrentTTS();

  const apiKey = options.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('elevenlabs_api_key') || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY : '');
  const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel / Multilingual voice

  // 1. Try ElevenLabs if explicitly configured with an API key
  if (apiKey) {
    try {
      if (onStart) onStart();
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentPlayingAudio = audio;

        audio.onended = () => {
          currentPlayingAudio = null;
          if (onEnd) onEnd();
        };
        audio.onerror = (e) => {
          currentPlayingAudio = null;
          console.warn('ElevenLabs audio error, falling back to neural TTS', e);
          tryBackendNeuralTTS(text, lang, onStart, onEnd, onError);
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('ElevenLabs API error, falling back to neural TTS:', err);
    }
  }

  // 2. Primary Studio Engine: Backend Neural Edge-TTS (Indian English & Hindi Neural Voices)
  await tryBackendNeuralTTS(text, lang, onStart, onEnd, onError);
}

async function tryBackendNeuralTTS(
  text: string,
  lang: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  try {
    const audioB64 = await synthesizeTTSAudio(text);
    if (audioB64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioB64}`);
      currentPlayingAudio = audio;

      audio.onended = () => {
        currentPlayingAudio = null;
        if (onEnd) onEnd();
      };
      audio.onerror = (e) => {
        currentPlayingAudio = null;
        console.warn('Neural audio play error, falling back to browser SpeechSynthesis', e);
        fallbackBrowserTTS(text, lang, onStart, onEnd, onError);
      };

      if (onStart) onStart();
      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('Backend neural TTS failed, falling back to browser SpeechSynthesis', err);
  }

  // 3. Fallback: Browser SpeechSynthesis tuned with Indian English / Hindi voice matching
  fallbackBrowserTTS(text, lang, onStart, onEnd, onError);
}

function fallbackBrowserTTS(
  text: string,
  lang: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasDevanagari ? 'hi-IN' : (lang || 'en-IN');
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best Hindi / English voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => 
      (hasDevanagari && (v.lang.includes('hi') || v.name.includes('Hindi') || v.name.includes('Swara') || v.name.includes('Madhur'))) ||
      (!hasDevanagari && (v.lang.includes('en-IN') || v.name.includes('India') || v.name.includes('Neerja') || v.name.includes('Prabhat'))) ||
      v.lang.includes(utterance.lang)
    ) || voices.find(v => v.lang.includes('IN')) || voices[0];

    if (matchVoice) {
      utterance.voice = matchVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      if (onError) onError(e);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    if (onError) onError(err);
    if (onEnd) onEnd();
  }
}
