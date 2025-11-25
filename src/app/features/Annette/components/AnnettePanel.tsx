'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Mic, MicOff, Sparkles, Minimize2, Maximize2, Database } from 'lucide-react';
import StatusChip, { StatusChipTheme } from '@/components/DecisionPanel/StatusChip';
import VoiceVisualizer from '../sub_VoiceInterface/VoiceVisualizer';
import AnnetteThemeSwitcher from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import AnnetteTestButtons from '../sub_VoiceInterface/AnnetteTestButtons';
import { useThemeStore } from '@/stores/themeStore';
import KnowledgeSourcesPanel from './KnowledgeSourcesPanel';
import InsightsPanel from './InsightsPanel';
import VoiceSessionHistory from './VoiceSessionHistory';
import TTSCacheManager from './TTSCacheManager';
import VoiceSessionReplay from './VoiceSessionReplay';
import LiveEventTicker from './LiveEventTicker';
import ContextHUD from './ContextHUD';
import ActionCard from './ActionCard';
import { KnowledgeSource, VoiceSession } from '../lib/voicebotTypes';
import { AnnetteTheme } from '../sub_VoiceInterface/AnnetteThemeSwitcher';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { SupportedProvider } from '@/lib/llm/types';
import { useBlueprintStore } from '@/app/features/Onboarding/sub_Blueprint/store/blueprintStore';
import { useAnnetteAudio } from '../hooks/useAnnetteAudio';
import { useAnnetteSession } from '../hooks/useAnnetteSession';

const WELCOME_PHRASES = [
  "Welcome to your command center.",
  "Systems initialized. Ready to assist.",
  "Blueprint systems online.",
  "All systems operational.",
  "Ready when you are.",
];

export default function AnnettePanel() {
  const [theme, setTheme] = useState<AnnetteTheme>('midnight');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [replaySession, setReplaySession] = useState<VoiceSession | null>(null);
  const [skipWelcome, setSkipWelcome] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const { activeProject } = useActiveProjectStore();
  const { recommendScan } = useBlueprintStore();
  const { getThemeConfig, getThemeColors } = useThemeStore();
  const themeConfig = getThemeConfig();
  const colors = getThemeColors();

  // Custom Hooks
  const {
    isSpeaking,
    isError,
    volume,
    audioContext,
    analyser,
    isVoiceEnabled,
    setIsVoiceEnabled,
    message,
    setMessage,
    playAudioInternal,
    speakMessage,
    setIsError
  } = useAnnetteAudio();

  const {
    currentSession,
    transcriptEntries,
    showTranscript,
    setShowTranscript,
    showSessionHistory,
    setShowSessionHistory,
    conversationId,
    setConversationId,
    addTranscriptEntry,
    clearTranscript,
    initializeSession,
    addInteractionToCurrentSession,
  } = useAnnetteSession();

  const handleActivateVoice = async () => {
    if (!isVoiceEnabled) {
      setIsVoiceEnabled(true);
    } else {
      setIsVoiceEnabled(false);
    }
  };

  const playDirectResponse = useCallback(async (text: string) => {
    if (!isVoiceEnabled) {
      setSkipWelcome(true);
      setIsVoiceEnabled(true);
    }
    await playAudioInternal(text);
  }, [isVoiceEnabled, playAudioInternal, setIsVoiceEnabled]);

  useEffect(() => {
    if (isVoiceEnabled && !skipWelcome) {
      const randomPhrase = WELCOME_PHRASES[Math.floor(Math.random() * WELCOME_PHRASES.length)];
      speakMessage(randomPhrase);
    }
    if (skipWelcome) {
      setSkipWelcome(false);
    }
  }, [isVoiceEnabled, skipWelcome, speakMessage]);

  const sendToAnnette = useCallback(async (userMessage: string, provider: SupportedProvider) => {
    if (!activeProject) {
      setMessage('No active project selected');
      setIsError(true);
      return;
    }

    if (!currentSession) {
      initializeSession();
    }

    if (!isVoiceEnabled) {
      setSkipWelcome(true);
      setIsVoiceEnabled(true);
    }

    addTranscriptEntry('user', userMessage);

    setIsProcessing(true);
    setIsListening(true);
    setIsError(false);
    setMessage('Processing your request...');

    const startTime = Date.now();

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

      const totalMs = Date.now() - startTime;

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      if (data.sources) setKnowledgeSources(data.sources);
      if (data.insights) setInsights(data.insights);
      if (data.nextSteps) setNextSteps(data.nextSteps);

      if (data.recommendedScans && Array.isArray(data.recommendedScans)) {
        data.recommendedScans.forEach((scanId: string) => {
          recommendScan(scanId);
        });
      }

      addTranscriptEntry('assistant', data.response);

      await addInteractionToCurrentSession(
        userMessage,
        data.response,
        data.sources,
        data.insights,
        data.nextSteps,
        data.toolsUsed,
        { totalMs, llmMs: data.timing?.llmMs, ttsMs: data.timing?.ttsMs }
      );

      setIsListening(false);
      await speakMessage(data.response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Communication error';
      setMessage(errorMessage);
      setIsListening(false);
      setIsError(true);
      addTranscriptEntry('system', `Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [activeProject, conversationId, speakMessage, addTranscriptEntry, isVoiceEnabled, recommendScan, currentSession, initializeSession, addInteractionToCurrentSession, setIsError, setMessage, setIsVoiceEnabled, setConversationId]);

  // Mini Mode Render
  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="relative group">
          {/* Pulse Effect */}
          <div className={`absolute inset-0 bg-cyan-500/30 rounded-full blur-xl transition-all duration-1000 ${isProcessing ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`} />

          <button
            onClick={() => setIsMinimized(false)}
            className="relative w-16 h-16 rounded-full bg-gray-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl flex items-center justify-center overflow-hidden group-hover:border-cyan-400/50 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
            {isSpeaking ? (
              <VoiceVisualizer isActive={true} theme={theme} />
            ) : (
              <Sparkles className="w-6 h-6 text-cyan-400" />
            )}
          </button>

          {/* Status Dot */}
          <div className={`absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-gray-900 ${isError ? 'bg-red-500' : isProcessing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative w-full mx-auto"
    >
      {/* Main Panel Container */}
      <div className="relative flex flex-col bg-gray-950/60 backdrop-blur-2xl border border-gray-800/50 rounded-3xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Ambient glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${themeConfig.colors.primary} opacity-10 blur-3xl pointer-events-none`} />

        {/* Top Glass Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Context HUD */}
        <ContextHUD
          activeProjectName={activeProject?.name || null}
          contextCount={knowledgeSources.length}
          memoryCount={transcriptEntries.length}
          isListening={isListening || isProcessing}
        />

        {/* Content */}
        <div className="relative flex items-center justify-between px-6 py-4 gap-6">

          {/* Left: Status & Message */}
          <div className="flex-1 flex flex-col gap-2" data-testid="annette-status-chip">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-4 h-4 ${themeConfig.colors.text} opacity-70`} />
              <span className={`text-xs font-mono uppercase tracking-widest ${themeConfig.colors.text} opacity-50`}>
                Annette AI System
              </span>
            </div>

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
              className="w-full border-0 bg-transparent p-0 text-lg font-light tracking-wide"
            />
          </div>

          {/* Center: Voice Visualizer */}
          <div className="flex-shrink-0 relative group">
            <motion.button
              onClick={handleActivateVoice}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-10 cursor-pointer"
              title={isVoiceEnabled ? 'Deactivate Voice' : 'Activate Voice'}
            >
              {/* Outer Ring */}
              <div className={`
                absolute inset-0 rounded-full border border-white/10
                ${isSpeaking ? 'scale-110 border-cyan-500/50' : ''}
                transition-all duration-500
              `} />

              {/* Visualizer Container */}
              <div className={`
                relative w-20 h-20 flex items-center justify-center rounded-full 
                bg-gray-900/80 border border-white/10 backdrop-blur-md
                shadow-lg shadow-black/50
                transition-all duration-300
                ${!isVoiceEnabled ? 'opacity-70 grayscale' : ''}
              `}>
                {isVoiceEnabled ? (
                  <VoiceVisualizer
                    isActive={isSpeaking}
                    theme={theme}
                    audioContext={audioContext || undefined}
                    analyser={analyser || undefined}
                  />
                ) : (
                  <MicOff className="w-6 h-6 text-gray-500" />
                )}
              </div>
            </motion.button>

            {/* Glow behind visualizer */}
            <div className={`
              absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10
              transition-opacity duration-500
              ${isSpeaking ? 'opacity-100 scale-150' : 'opacity-0'}
            `} />
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* TTS Cache Manager */}
            <TTSCacheManager theme={theme} />

            {/* History Toggle */}
            <motion.button
              onClick={() => setShowSessionHistory(!showSessionHistory)}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative p-3 rounded-xl transition-all duration-300
                ${showSessionHistory ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}
              `}
              title="Session History"
            >
              <History className="w-5 h-5" />
            </motion.button>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <AnnetteThemeSwitcher />

            {/* Minimize Button */}
            <motion.button
              onClick={() => setIsMinimized(true)}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-xl text-gray-400 hover:text-white transition-all"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Action Cards (Next Steps) */}
        {nextSteps.length > 0 && (
          <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {nextSteps.slice(0, 3).map((step, idx) => (
              <ActionCard
                key={idx}
                title={step}
                delay={idx * 0.1}
                onAction={() => sendToAnnette(`Execute: ${step}`, 'gemini')}
              />
            ))}
          </div>
        )}

        {/* Progress Bar (Bottom) */}
        {isProcessing && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute bottom-8 left-0 right-0 h-0.5 bg-gradient-to-r ${themeConfig.colors.primary}`}
          />
        )}

        {/* Live Event Ticker */}
        <LiveEventTicker projectId={activeProject?.id || null} />

        {/* Action Buttons Section */}
        <div className="p-4 bg-black/20">
          <AnnetteTestButtons
            isProcessing={isProcessing}
            activeProjectId={activeProject?.id || null}
            onSendToAnnette={sendToAnnette}
            onPlayDirectResponse={playDirectResponse}
          />
        </div>
      </div>


      {/* Expandable Panels */}
      <div className="mt-4 space-y-4 px-2">
        <AnimatePresence mode="wait">
          {knowledgeSources.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <KnowledgeSourcesPanel sources={knowledgeSources} onSourceClick={() => { }} />
            </motion.div>
          )}

          {(insights.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <InsightsPanel insights={insights} nextSteps={[]} />
            </motion.div>
          )}

          {showSessionHistory && !replaySession && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <VoiceSessionHistory
                projectId={activeProject?.id}
                theme={theme}
                onSessionSelect={(session) => {
                  setReplaySession(session);
                  setShowSessionHistory(false);
                }}
                onSessionDelete={(sessionId) => {
                  console.log('Session deleted:', sessionId);
                }}
              />
            </motion.div>
          )}

          {replaySession && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <VoiceSessionReplay
                session={replaySession}
                theme={theme}
                onClose={() => {
                  setReplaySession(null);
                  setShowSessionHistory(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
