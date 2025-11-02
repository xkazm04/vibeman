'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { textToSpeech } from '../lib/voicebotApi';
import { playAudio } from '../lib/ttsGen';

interface VoicebotScanButtonProps {
  projectId: string;
  variant?: 'full' | 'quick';
  disabled?: boolean;
  className?: string;
}

type ButtonState = 'idle' | 'loading' | 'speaking' | 'success' | 'error';

/**
 * VoicebotScanButton - Delivers spoken summaries of scan status
 * Integrates Annette Voicebot for hands-free scan updates
 */
export default function VoicebotScanButton({
  projectId,
  variant = 'full',
  disabled = false,
  className = ''
}: VoicebotScanButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handleBriefing = async () => {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    setState('loading');
    setErrorMessage('');

    try {
      // Fetch scan briefing from API
      const response = await fetch(`/api/annette/scan-briefing?projectId=${projectId}&variant=${variant}`);

      if (!response.ok) {
        throw new Error('Failed to fetch scan briefing');
      }

      const data = await response.json();

      if (!data.success || !data.text) {
        throw new Error(data.error || 'No briefing text received');
      }

      const briefingText = data.text;
      console.log('[VoicebotScanButton] Briefing text:', briefingText);

      // Convert to speech
      setState('loading');
      const audioUrl = await textToSpeech(briefingText);

      // Play audio
      setState('speaking');
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);

      audio.onended = () => {
        setState('success');
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        setTimeout(() => setState('idle'), 2000);
      };

      audio.onerror = (error) => {
        console.error('[VoicebotScanButton] Audio playback error:', error);
        setState('error');
        setErrorMessage('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        setTimeout(() => setState('idle'), 3000);
      };

      await audio.play();

    } catch (error) {
      console.error('[VoicebotScanButton] Briefing error:', error);
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate briefing');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const stopBriefing = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setState('idle');
  };

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'speaking':
        return <Volume2 className="w-4 h-4 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Volume2 className="w-4 h-4" />;
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'speaking':
        return 'bg-cyan-600/60 border-cyan-500/40 hover:bg-cyan-500/60 hover:border-cyan-400';
      case 'success':
        return 'bg-green-600/60 border-green-500/40';
      case 'error':
        return 'bg-red-600/60 border-red-500/40';
      case 'loading':
        return 'bg-blue-600/60 border-blue-500/40';
      default:
        return 'bg-purple-600/60 border-purple-500/40 hover:bg-purple-500/60 hover:border-purple-400';
    }
  };

  const getButtonText = () => {
    switch (state) {
      case 'loading':
        return 'Generating...';
      case 'speaking':
        return 'Speaking...';
      case 'success':
        return 'Done!';
      case 'error':
        return 'Error';
      default:
        return variant === 'quick' ? 'Quick Status' : 'Scan Briefing';
    }
  };

  const isDisabled = disabled || state === 'loading' || state === 'speaking';

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={state === 'speaking' ? stopBriefing : handleBriefing}
        disabled={isDisabled && state !== 'speaking'}
        data-testid="voicebot-scan-button"
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-300 font-semibold text-sm ${getButtonColor()} ${
          isDisabled && state !== 'speaking' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        whileHover={!isDisabled || state === 'speaking' ? { scale: 1.05 } : {}}
        whileTap={!isDisabled || state === 'speaking' ? { scale: 0.95 } : {}}
        title={state === 'speaking' ? 'Click to stop' : variant === 'quick' ? 'Get quick scan status update' : 'Get detailed scan briefing'}
      >
        {getIcon()}
        <span className="text-white">{getButtonText()}</span>
        {state === 'speaking' && (
          <VolumeX className="w-4 h-4 text-white/60" />
        )}
      </motion.button>

      {/* Error message tooltip */}
      <AnimatePresence>
        {state === 'error' && errorMessage && (
          <motion.div
            className="absolute top-full mt-2 left-0 bg-red-900/90 border border-red-700/40 rounded-lg shadow-xl p-2 z-50 text-xs text-white min-w-[200px]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
