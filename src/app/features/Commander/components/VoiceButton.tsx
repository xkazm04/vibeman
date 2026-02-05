/**
 * Voice Button
 * Microphone toggle with visual recording indicator
 */

'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2 } from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';

function RecordingWaveform() {
  return (
    <div className="flex items-center gap-[2px] h-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-red-400 rounded-full"
          animate={{
            height: ['8px', '18px', '8px'],
          }}
          transition={{
            duration: 0.6 + i * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceButton() {
  const isRecording = useAnnetteStore((s) => s.isRecording);
  const isSpeaking = useAnnetteStore((s) => s.isSpeaking);
  const setRecording = useAnnetteStore((s) => s.setRecording);

  const toggleRecording = useCallback(() => {
    setRecording(!isRecording);
    // Voice recording integration will be wired in Phase 5+
    // ElevenLabs STT (Scribe v1) handles transcription
  }, [isRecording, setRecording]);

  if (isSpeaking) {
    return (
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="p-2 rounded-full bg-purple-500/20 border border-purple-500/30"
      >
        <Volume2 className="w-5 h-5 text-purple-400" />
      </motion.div>
    );
  }

  return (
    <button
      onClick={toggleRecording}
      className={`p-2 rounded-full transition-all ${
        isRecording
          ? 'bg-red-500/20 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
          : 'bg-slate-700/50 border border-slate-600/30 hover:bg-slate-600/50'
      }`}
      title={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? (
        <RecordingWaveform />
      ) : (
        <Mic className="w-5 h-5 text-slate-400" />
      )}
    </button>
  );
}
