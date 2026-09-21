// ElevenLabs & Browser SpeechSynthesis Dual TTS Service

export interface SpeakOptions {
  text: string;
  lang?: string;
  apiKey?: string;
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export async function speakBilingualText(options: SpeakOptions): Promise<void> {
  const { text, lang = 'hi-IN', onStart, onEnd, onError } = options;
  const apiKey = options.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('elevenlabs_api_key') || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY : '');
  const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel / Multilingual voice

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

      if (!response.ok) throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        if (onEnd) onEnd();
      };
      audio.onerror = (e) => {
        console.warn('ElevenLabs audio play error, falling back to SpeechSynthesis', e);
        fallbackBrowserTTS(text, lang, onStart, onEnd, onError);
      };

      await audio.play();
      return;
    } catch (err) {
      console.warn('ElevenLabs API error, using browser TTS fallback:', err);
    }
  }

  // Fallback to browser SpeechSynthesis
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
    utterance.lang = lang;
    utterance.rate = 0.95;

    // Pick best Hindi / English voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN') || v.name.includes('Hindi') || v.name.includes('India'));
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
