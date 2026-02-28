/**
 * Voice Button
 * Microphone toggle with visual recording indicator.
 * Now wired to the always-on voice companion engine:
 * - Click toggles the companion on/off
 * - Long-press activates push-to-talk when in PTT mode
 * - Visual states reflect companion engine state (listening, processing, speaking)
 */

'use client';

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Ear, Loader2 } from 'lucide-react';
import { useVoiceStore } from '@/stores/annette/voiceStore';
import { useVoiceCompanionStore } from '@/stores/voiceCompanionStore';

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

function ListeningPulse() {
  return (
    <div className="flex items-center gap-[2px] h-5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-emerald-400 rounded-full"
          animate={{
            height: ['6px', '10px', '6px'],
          }}
          transition={{
            duration: 1.2 + i * 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Downsample audio buffer to 16kHz mono for reduced STT upload size.
 * Call this before sending audio to the transcription API.
 */
export function downsampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate = 16000
): Float32Array {
  const channel = audioBuffer.getChannelData(0); // mono: first channel
  const sourceSampleRate = audioBuffer.sampleRate;

  if (sourceSampleRate === targetSampleRate) return channel;

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(channel.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(low + 1, channel.length - 1);
    const frac = srcIndex - low;
    // Linear interpolation for smooth downsampling
    result[i] = channel[low] * (1 - frac) + channel[high] * frac;
  }

  return result;
}

export default function VoiceButton() {
  const isSpeaking = useVoiceStore((s) => s.isSpeaking);
  const {
    isActive, engineState, mode,
    startCompanion, stopCompanion, startPushToTalk, stopPushToTalk,
  } = useVoiceCompanionStore();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handleClick = useCallback(async () => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isActive) {
      stopCompanion();
    } else {
      await startCompanion();
    }
  }, [isActive, startCompanion, stopCompanion]);

  const handlePointerDown = useCallback(() => {
    if (mode !== 'push-to-talk' || !isActive) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      startPushToTalk();
    }, 200);
  }, [mode, isActive, startPushToTalk]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress.current) {
      stopPushToTalk();
    }
  }, [stopPushToTalk]);

  // Speaking state (from Annette chat TTS, not companion)
  if (isSpeaking) {
    return (
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="p-2 rounded-full bg-purple-500/20 border border-purple-500/30"
        role="status"
        aria-label="Annette is speaking"
      >
        <Volume2 className="w-5 h-5 text-purple-400" />
      </motion.div>
    );
  }

  // Companion speaking
  if (engineState === 'speaking') {
    return (
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
        className="p-2 rounded-full bg-purple-500/20 border border-purple-500/30"
        role="status"
        aria-label="Annette is speaking"
      >
        <Volume2 className="w-5 h-5 text-purple-400" />
      </motion.div>
    );
  }

  // Processing
  if (engineState === 'processing') {
    return (
      <div className="p-2 rounded-full bg-amber-500/15 border border-amber-500/30">
        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Ambient listening
  if (isActive && engineState === 'listening' && mode === 'ambient') {
    return (
      <button
        onClick={handleClick}
        className="p-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 transition-all hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(52,211,153,0.1)] focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
        title="Voice companion active (ambient mode) — click to stop"
        aria-label="Voice companion listening — click to stop"
      >
        <ListeningPulse />
      </button>
    );
  }

  // PTT recording
  if (isActive && engineState === 'listening' && mode === 'push-to-talk') {
    return (
      <button
        onPointerUp={handlePointerUp}
        className="p-2 rounded-full bg-red-500/20 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)] focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
        title="Recording — release to send"
        aria-label="Recording — release to send"
      >
        <RecordingWaveform />
      </button>
    );
  }

  // Active but idle (PTT mode, waiting for push)
  if (isActive && mode === 'push-to-talk') {
    return (
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="p-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 transition-all hover:bg-cyan-500/20 focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
        title="Voice companion active (push-to-talk) — hold to speak, click to stop"
        aria-label="Voice companion active — hold to speak"
      >
        <Ear className="w-5 h-5 text-cyan-400" />
      </button>
    );
  }

  // Inactive / default
  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-full transition-all bg-slate-700/50 border border-slate-600/30 hover:bg-slate-600/50 focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
      title="Start voice companion"
      aria-label="Start voice companion"
    >
      <Mic className="w-5 h-5 text-slate-400" />
    </button>
  );
}
