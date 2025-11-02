'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Moon, Eclipse, Lightbulb, FileText, Sparkles } from 'lucide-react';
import NeonStatusDisplay from './NeonStatusDisplay';
import VoiceVisualizer from './VoiceVisualizer';
import KnowledgeSourcesPanel from './KnowledgeSourcesPanel';
import InsightsPanel from './InsightsPanel';
import { textToSpeech } from '../lib/voicebotApi';
import { KnowledgeSource } from '../lib/voicebotTypes';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export type AnnetteTheme = 'phantom' | 'midnight' | 'shadow';

const WELCOME_PHRASES = [
  "Welcome to your command center.",
  "Systems initialized. Ready to assist.",
  "Blueprint systems online.",
  "All systems operational.",
  "Ready when you are.",
];

// Theme configurations
const THEME_CONFIGS = {
  phantom: {
    name: 'Phantom Frequency',
    icon: Eclipse,
    colors: {
      primary: 'from-purple-500 via-violet-500 to-fuchsia-500',
      glow: 'shadow-purple-500/50',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
    },
  },
  midnight: {
    name: 'Midnight Pulse',
    icon: Moon,
    colors: {
      primary: 'from-blue-600 via-cyan-500 to-blue-400',
      glow: 'shadow-cyan-500/50',
      text: 'text-cyan-300',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
    },
  },
  shadow: {
    name: 'Shadow Nexus',
    icon: Zap,
    colors: {
      primary: 'from-red-600 via-rose-500 to-pink-500',
      glow: 'shadow-red-500/50',
      text: 'text-red-300',
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
    },
  },
};

export default function AnnettePanel() {
  const [theme, setTheme] = useState<AnnetteTheme>('midnight');
  const [message, setMessage] = useState('Systems ready - Click to activate voice');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isError, setIsError] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const { activeProject } = useActiveProjectStore();
  const themeConfig = THEME_CONFIGS[theme];

  const speakMessage = useCallback(async (text: string) => {
    if (!isVoiceEnabled) {
      console.warn('[Annette] Voice not enabled yet. User must click to activate.');
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      // Update volume in real-time
      const updateVolume = () => {
        if (!audio.paused && !audio.ended) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setVolume(average / 255); // Normalize to 0-1
          requestAnimationFrame(updateVolume);
        }
      };
      updateVolume();

      audio.onended = () => {
        setIsSpeaking(false);
        setVolume(0.5);
        URL.revokeObjectURL(audioUrl);
        audioContext.close();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsError(true);
        setVolume(0.5);
        URL.revokeObjectURL(audioUrl);
        audioContext.close();
      };

      setAudioElement(audio);
      await audio.play();
    } catch (error) {
      console.error('[Annette] TTS error:', error);
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
    if (isVoiceEnabled) {
      const randomPhrase = WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)];
      speakMessage(randomPhrase);
    }
  }, [isVoiceEnabled, speakMessage]);

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
  const sendToAnnette = useCallback(async (userMessage: string) => {
    if (!activeProject) {
      setMessage('No active project selected');
      setIsError(true);
      return;
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
      console.error('[Annette] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Communication error';
      setMessage(errorMessage);
      setIsSpeaking(false);
      setIsListening(false);
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  }, [activeProject, conversationId, speakMessage]);

  // Test button handlers
  const handleTestIdeasCount = () => {
    sendToAnnette('How many pending ideas does this project have?');
  };

  const handleTestDocsRetrieval = () => {
    sendToAnnette('Can you retrieve the high-level documentation for this project?');
  };

  const handleTestSummarize = () => {
    sendToAnnette('Please summarize the project vision for me.');
  };

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
          {/* Left: Neon Status Display */}
          <div className="flex-1">
            <NeonStatusDisplay
              message={message}
              theme={theme}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isError={isError}
              volume={volume}
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
            <div className="flex flex-col gap-1.5">
              {(Object.keys(THEME_CONFIGS) as AnnetteTheme[]).map((themeKey) => {
                const config = THEME_CONFIGS[themeKey];
                const Icon = config.icon;
                const isActive = theme === themeKey;

                return (
                  <motion.button
                    key={themeKey}
                    onClick={() => handleThemeChange(themeKey)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-1.5 rounded-lg transition-all duration-300 ${
                      isActive
                        ? `${config.colors.bg} border ${config.colors.border}`
                        : 'bg-gray-800/40 border border-gray-700/30 hover:bg-gray-700/50'
                    }`}
                    title={config.name}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? config.colors.text : 'text-gray-500'
                      }`}
                    />

                    {/* Active indicator glow */}
                    {isActive && (
                      <motion.div
                        className={`absolute inset-0 rounded-lg blur-sm ${config.colors.glow} -z-10`}
                        animate={{
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom accent line based on theme */}
        <div className={`h-0.5 bg-gradient-to-r ${themeConfig.colors.primary} opacity-30`} />
      </div>

      {/* Test Buttons Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 flex gap-3 justify-center"
      >
        {/* Test Button 1: Ideas Count */}
        <motion.button
          onClick={handleTestIdeasCount}
          disabled={isProcessing || !activeProject}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative px-4 py-2 rounded-lg border transition-all duration-300 ${
            isProcessing || !activeProject
              ? 'border-gray-700/30 bg-gray-800/20 text-gray-600 cursor-not-allowed'
              : `border-purple-500/30 bg-purple-500/10 ${themeConfig.colors.text} hover:border-purple-500/50 hover:bg-purple-500/20`
          }`}
          title="Ask for pending ideas count"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-mono">Ideas Count</span>
          </div>
        </motion.button>

        {/* Test Button 2: Docs Retrieval */}
        <motion.button
          onClick={handleTestDocsRetrieval}
          disabled={isProcessing || !activeProject}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative px-4 py-2 rounded-lg border transition-all duration-300 ${
            isProcessing || !activeProject
              ? 'border-gray-700/30 bg-gray-800/20 text-gray-600 cursor-not-allowed'
              : `border-cyan-500/30 bg-cyan-500/10 ${themeConfig.colors.text} hover:border-cyan-500/50 hover:bg-cyan-500/20`
          }`}
          title="Ask if docs can be retrieved"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-mono">Check Docs</span>
          </div>
        </motion.button>

        {/* Test Button 3: Summarize Vision */}
        <motion.button
          onClick={handleTestSummarize}
          disabled={isProcessing || !activeProject}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative px-4 py-2 rounded-lg border transition-all duration-300 ${
            isProcessing || !activeProject
              ? 'border-gray-700/30 bg-gray-800/20 text-gray-600 cursor-not-allowed'
              : `border-pink-500/30 bg-pink-500/10 ${themeConfig.colors.text} hover:border-pink-500/50 hover:bg-pink-500/20`
          }`}
          title="Ask to summarize project vision"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-mono">Summarize</span>
          </div>
        </motion.button>
      </motion.div>

      {/* Processing indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 flex justify-center"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
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
            onSourceClick={(source) => {
              console.log('[Annette] Source clicked:', source);
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
    </motion.div>
  );
}
