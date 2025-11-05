'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusChip, { StatusChipTheme } from '@/app/components/ui/StatusChip';
import VoiceVisualizer from '../sub_VoiceInterface/VoiceVisualizer';
import AnnetteThemeSwitcher, { AnnetteTheme, THEME_CONFIGS } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import AnnetteTestButtons from '../sub_VoiceInterface/AnnetteTestButtons';
import KnowledgeSourcesPanel from './KnowledgeSourcesPanel';
import InsightsPanel from './InsightsPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import { textToSpeech } from '../lib/voicebotApi';
import { KnowledgeSource } from '../lib/voicebotTypes';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { SupportedProvider } from '@/lib/llm/types';

const WELCOME_PHRASES = [
  "Welcome to your command center.",
  "Systems initialized. Ready to assist.",
  "Blueprint systems online.",
  "All systems operational.",
  "Ready when you are.",
];

export default function AnnettePanel() {
  const [theme, setTheme] = useState<AnnetteTheme>('midnight');
  const [message, setMessage] = useState('Systems ready - Click to activate voice');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isError, setIsError] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const { activeProject } = useActiveProjectStore();
  const themeConfig = THEME_CONFIGS[theme];

  const speakMessage = useCallback(async (text: string) => {
    if (!isVoiceEnabled) {
      return;
    }

    setMessage(text);
    setIsSpeaking(true);
    setIsError(false);
    setIsListening(false);

    try {
      const audioUrl = await textToSpeech(text);
      const audio = new Audio(audioUrl);

      // Create AudioContext for volume analysis
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audio);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);

      // Store for VoiceVisualizer
      setAudioContext(audioCtx);
      setAnalyser(analyserNode);

      // Update volume in real-time
      const updateVolume = () => {
        if (!audio.paused && !audio.ended) {
          analyserNode.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setVolume(average / 255); // Normalize to 0-1
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();

      audio.onended = () => {
        setIsSpeaking(false);
        setVolume(0.5);
        setAudioContext(null);
        setAnalyser(null);
        URL.revokeObjectURL(audioUrl);
        audioCtx.close();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsError(true);
        setVolume(0.5);
        setAudioContext(null);
        setAnalyser(null);
        URL.revokeObjectURL(audioUrl);
        audioCtx.close();
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
      setIsError(true);
      setVolume(0.5);
      // Check if it's an autoplay error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setMessage('Click to enable voice');
        setIsVoiceEnabled(false);
      } else {
        setMessage('Voice system offline');
      }
    }
  }, [isVoiceEnabled]);

  const handleActivateVoice = async () => {
    if (!isVoiceEnabled) {
      // First click - enable voice (welcome message will play via useEffect)
      setIsVoiceEnabled(true);
    }
  };

  // Play welcome message when voice is first enabled
  useEffect(() => {
    if (isVoiceEnabled && !skipWelcome) {
      const randomPhrase = WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)];
      speakMessage(randomPhrase);
    }
    // Reset skip flag after welcome logic runs
    if (skipWelcome) {
      setSkipWelcome(false);
    }
  }, [isVoiceEnabled, skipWelcome, speakMessage]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const handleThemeChange = (newTheme: AnnetteTheme) => {
    setTheme(newTheme);
  };

  // Send message to Annette and get response
  const sendToAnnette = useCallback(async (userMessage: string, provider: SupportedProvider) => {
    if (!activeProject) {
      setMessage('No active project selected');
      setIsError(true);
      return;
    }

    // Auto-enable voice if not already enabled (for better UX)
    if (!isVoiceEnabled) {
      setSkipWelcome(true); // Skip welcome message when auto-enabling
      setIsVoiceEnabled(true);
    }

    setIsProcessing(true);
    setIsListening(true);
    setIsError(false);
    setMessage('Processing your request...');

    try {
      const response = await fetch('/api/annette/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          projectPath: activeProject.path,
          message: userMessage,
          conversationId,
          provider,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update conversation ID
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Update knowledge sources and insights
      if (data.sources) {
        setKnowledgeSources(data.sources);
      }
      if (data.insights) {
        setInsights(data.insights);
      }
      if (data.nextSteps) {
        setNextSteps(data.nextSteps);
      }

      setIsListening(false);
      // Display response and speak it
      await speakMessage(data.response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Communication error';
      setMessage(errorMessage);
      setIsSpeaking(false);
      setIsListening(false);
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  }, [activeProject, conversationId, speakMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative w-full"
    >
      {/* Main Panel Container */}
      <div className="relative bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
        {/* Ambient glow effect based on theme */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${themeConfig.colors.primary} opacity-5 blur-2xl pointer-events-none`}
        />

        {/* Content */}
        <div className="relative flex items-center justify-between px-4 py-3 gap-4">
          {/* Left: Status Chip */}
          <div className="flex-1" data-testid="annette-status-chip">
            <StatusChip
              status={
                isError ? 'error' :
                isSpeaking ? 'processing' :
                isListening ? 'active' :
                'idle'
              }
              label={message}
              theme={theme as StatusChipTheme}
              animated={true}
              size="md"
              intensity={volume}
              className="w-full border-0 bg-transparent"
            />
          </div>

          {/* Right: Voice Visualizer + Theme Switcher */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Voice Visualizer in Circular Frame - Clickable */}
            <motion.button
              onClick={handleActivateVoice}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative cursor-pointer group"
              title={isVoiceEnabled ? 'Voice active' : 'Click to activate voice'}
            >
              {/* Circular frame */}
              <div
                className={`absolute inset-0 rounded-full border-2 ${themeConfig.colors.border} ${
                  isSpeaking
                    ? themeConfig.colors.glow + ' shadow-lg'
                    : !isVoiceEnabled
                    ? 'animate-pulse'
                    : ''
                } transition-all duration-300`}
              />

              {/* Visualizer */}
              <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-gray-950/50">
                <VoiceVisualizer
                  isActive={isSpeaking}
                  theme={theme}
                  audioContext={audioContext || undefined}
                  analyser={analyser || undefined}
                />
              </div>

              {/* Pulsing outer ring when speaking */}
              {isSpeaking && (
                <motion.div
                  className={`absolute inset-0 rounded-full border-2 ${themeConfig.colors.border}`}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}

              {/* Gentle pulse when not enabled (call to action) */}
              {!isVoiceEnabled && !isSpeaking && (
                <motion.div
                  className={`absolute inset-0 rounded-full border-2 ${themeConfig.colors.border} opacity-50`}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              )}
            </motion.button>

            {/* Theme Switcher Column */}
            <AnnetteThemeSwitcher theme={theme} onThemeChange={handleThemeChange} />
          </div>
        </div>

        {/* Bottom accent line based on theme */}
        <div className={`h-0.5 bg-gradient-to-r ${themeConfig.colors.primary} opacity-30`} />
      </div>

      {/* Test Buttons Section */}
      <div className="mt-4">
        <AnnetteTestButtons
          theme={theme}
          isProcessing={isProcessing}
          activeProjectId={activeProject?.id || null}
          onSendToAnnette={sendToAnnette}
          onPlayDirectResponse={speakMessage}
        />
      </div>

      {/* Processing indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex justify-center"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500" data-testid="annette-processing-indicator">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className={`w-3 h-3 border-2 border-t-transparent rounded-full ${themeConfig.colors.border}`}
            />
            <span>Processing request...</span>
          </div>
        </motion.div>
      )}

      {/* Knowledge Sources Panel */}
      <AnimatePresence>
        {knowledgeSources.length > 0 && (
          <KnowledgeSourcesPanel
            sources={knowledgeSources}
            onSourceClick={() => {
              // Future: Navigate to source or open detail modal
            }}
          />
        )}
      </AnimatePresence>

      {/* Insights Panel */}
      <AnimatePresence>
        {(insights.length > 0 || nextSteps.length > 0) && (
          <InsightsPanel
            insights={insights}
            nextSteps={nextSteps}
          />
        )}
      </AnimatePresence>
    
      {/* Analytics Dashboard */}
      {activeProject && (
        <AnalyticsDashboard projectId={activeProject.id} />
      )}
    </motion.div>
  );
}
