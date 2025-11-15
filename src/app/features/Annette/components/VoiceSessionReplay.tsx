'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, X, Volume2 } from 'lucide-react';
import { VoiceSession, VoiceSessionInteraction } from '../lib/voicebotTypes';
import { AnnetteTheme } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import { THEME_CONFIGS } from '@/stores/themeStore';
import { textToSpeech } from '../lib/voicebotApi';
import VoiceVisualizer from '../sub_VoiceInterface/VoiceVisualizer';

interface VoiceSessionReplayProps {
  session: VoiceSession;
  theme?: AnnetteTheme;
  onClose?: () => void;
  className?: string;
}

/**
 * VoiceSessionReplay - Component for replaying recorded voice sessions
 *
 * Features:
 * - Step-through playback of session interactions
 * - TTS playback of assistant responses
 * - Waveform visualization during playback
 * - Playback controls (play/pause, skip forward/back)
 * - Session metadata display
 */
export default function VoiceSessionReplay({
  session,
  theme = 'midnight',
  onClose,
  className = '',
}: VoiceSessionReplayProps) {
  const themeConfig = THEME_CONFIGS[theme];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const currentInteraction = session.interactions[currentIndex];
  const hasNext = currentIndex < session.interactions.length - 1;
  const hasPrevious = currentIndex > 0;

  // Play assistant response with TTS
  const playInteractionAudio = useCallback(async (interaction: VoiceSessionInteraction) => {
    setIsSpeaking(true);

    try {
      const audioUrl = await textToSpeech(interaction.assistantText);
      const audio = new Audio(audioUrl);

      // Create AudioContext for visualization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audio);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;

      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      setAudioContext(audioCtx);
      setAnalyser(analyserNode);

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPlaying(false);
        setAudioContext(null);
        setAnalyser(null);
        URL.revokeObjectURL(audioUrl);
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPlaying(false);
        setAudioContext(null);
        setAnalyser(null);
        URL.revokeObjectURL(audioUrl);
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('Failed to play interaction audio:', error);
      setIsSpeaking(false);
      setIsPlaying(false);
    }
  }, []);

  // Stop current audio playback
  const stopAudio = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsPlaying(false);
    setAudioContext(null);
    setAnalyser(null);
  }, [audioElement]);

  // Play/pause current interaction
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAudio();
    } else {
      setIsPlaying(true);
      playInteractionAudio(currentInteraction);
    }
  }, [isPlaying, currentInteraction, playInteractionAudio, stopAudio]);

  // Skip to next interaction
  const skipNext = useCallback(() => {
    stopAudio();
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [hasNext, stopAudio]);

  // Skip to previous interaction
  const skipPrevious = useCallback(() => {
    stopAudio();
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [hasPrevious, stopAudio]);

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const durationMs = endTime.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden ${className}`}
      data-testid="voice-session-replay"
    >
      {/* Ambient glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${themeConfig.colors.primary} opacity-5 blur-2xl pointer-events-none`}
      />

      {/* Header */}
      <div className="relative border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
            SESSION REPLAY
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {session.projectName} • {session.totalInteractions} interactions • {formatDuration(session.startTime, session.endTime)}
          </p>
        </div>

        {onClose && (
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
            aria-label="Close replay"
            data-testid="close-replay-btn"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Content */}
      {currentInteraction && (
        <div className="relative p-4 space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Interaction {currentIndex + 1} of {session.totalInteractions}</span>
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${themeConfig.colors.primary}`}
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / session.totalInteractions) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Interaction content */}
          <div className="space-y-3">
            {/* User message */}
            <div className="bg-gray-950/40 border border-gray-700/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded bg-gradient-to-r ${themeConfig.colors.primary} text-white`}>
                  USER
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {currentInteraction.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {currentInteraction.userText}
              </p>
            </div>

            {/* Assistant response */}
            <div className="bg-gray-950/40 border border-gray-700/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                  ASSISTANT
                </span>
                {currentInteraction.timing && (
                  <span className="text-xs text-gray-500 font-mono">
                    {currentInteraction.timing.totalMs}ms
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {currentInteraction.assistantText}
              </p>

              {/* Metadata */}
              {(currentInteraction.sources || currentInteraction.insights || currentInteraction.toolsUsed) && (
                <div className="mt-3 pt-3 border-t border-gray-700/30 space-y-2">
                  {currentInteraction.sources && currentInteraction.sources.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold">Sources:</span> {currentInteraction.sources.map(s => s.name).join(', ')}
                    </div>
                  )}
                  {currentInteraction.toolsUsed && currentInteraction.toolsUsed.length > 0 && (
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold">Tools:</span> {currentInteraction.toolsUsed.map(t => t.name).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {/* Previous button */}
            <motion.button
              onClick={skipPrevious}
              disabled={!hasPrevious}
              whileHover={hasPrevious ? { scale: 1.05 } : {}}
              whileTap={hasPrevious ? { scale: 0.95 } : {}}
              className={`p-2 rounded-lg transition-all ${
                hasPrevious
                  ? `bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50`
                  : 'bg-gray-900/50 text-gray-600 border border-gray-800/50 cursor-not-allowed'
              }`}
              aria-label="Previous interaction"
              data-testid="skip-previous-btn"
            >
              <SkipBack className="w-4 h-4" />
            </motion.button>

            {/* Play/Pause button with visualizer */}
            <div className="relative">
              <motion.button
                onClick={togglePlayPause}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-4 rounded-full transition-all ${
                  isPlaying
                    ? `${themeConfig.colors.bg} border-2 ${themeConfig.colors.border} ${themeConfig.colors.glow}`
                    : `bg-gradient-to-r ${themeConfig.colors.primary} text-white border-2 border-transparent hover:brightness-110`
                }`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                data-testid="play-pause-btn"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </motion.button>

              {/* Visualizer overlay */}
              {isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <VoiceVisualizer
                    isActive={true}
                    theme={theme}
                    audioContext={audioContext || undefined}
                    analyser={analyser || undefined}
                  />
                </div>
              )}
            </div>

            {/* Next button */}
            <motion.button
              onClick={skipNext}
              disabled={!hasNext}
              whileHover={hasNext ? { scale: 1.05 } : {}}
              whileTap={hasNext ? { scale: 0.95 } : {}}
              className={`p-2 rounded-lg transition-all ${
                hasNext
                  ? `bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50`
                  : 'bg-gray-900/50 text-gray-600 border border-gray-800/50 cursor-not-allowed'
              }`}
              aria-label="Next interaction"
              data-testid="skip-next-btn"
            >
              <SkipForward className="w-4 h-4" />
            </motion.button>

            {/* Volume indicator */}
            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${themeConfig.colors.bg} border ${themeConfig.colors.border}`}
              >
                <Volume2 className={`w-3 h-3 ${themeConfig.colors.text}`} />
                <span className={`text-xs font-mono ${themeConfig.colors.text}`}>
                  Playing
                </span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Bottom accent */}
      <div className={`h-0.5 bg-gradient-to-r ${themeConfig.colors.primary} opacity-30`} />
    </motion.div>
  );
}
