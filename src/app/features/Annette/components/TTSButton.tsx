/**
 * TTSButton
 *
 * Inline button to speak a message via the selected TTS provider.
 */

'use client';

import { useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useVoiceStore } from '@/stores/annette/voiceStore';

interface TTSButtonProps {
  text: string;
  className?: string;
}

export function TTSButton({ text, className }: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const ttsProvider = useVoiceStore((s) => s.ttsProvider);

  const handleSpeak = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      const endpoint =
        ttsProvider === 'elevenlabs'
          ? '/api/annette/tts'
          : '/api/voicebot/text-to-speech';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('TTS failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={handleSpeak}
      disabled={isPlaying}
      className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${className}`}
      title="Read aloud"
    >
      {isPlaying ? (
        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
      )}
    </button>
  );
}
