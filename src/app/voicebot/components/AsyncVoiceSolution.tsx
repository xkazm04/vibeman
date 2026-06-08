/**
 * Async Voice Solution Component
 * Uses STT → LLM → TTS pipeline (similar to Annette module)
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Brain, Volume2, Check } from 'lucide-react';
import VoicebotCallButton from './VoicebotCallButton';
import VoicebotSessionLogs from './VoicebotSessionLogs';
import {
  SessionLog,
  SessionState,
  ConversationMessage,
  LLMProvider,
  DEFAULT_LLM_MODELS,
  AVAILABLE_LLM_MODELS,
  createLog,
  calculateAudioLevel,
  isSilent,
  isSilenceDurationExceeded,
  getUserMediaStream,
  createAudioContext,
  resumeAudioContext,
  stopMediaStream,
  cleanupAudioContext,
  playAudio,
  processVoiceMessage,
  DEFAULT_PROCESSING_CONFIG
} from '../lib';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

const LLM_PROVIDERS: Array<{ value: LLMProvider; label: string; description: string }> = [
  { value: 'ollama', label: 'Ollama', description: 'Local GPT-OSS 20B' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-5 Models' },
  { value: 'anthropic', label: 'Claude', description: 'Anthropic AI' },
];

// ── Pipeline Progress Indicator ──────────────────────────────────────

type PipelineStepStatus = 'pending' | 'active' | 'completed';

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'stt', label: 'Speech Recognition', icon: Mic },
  { id: 'llm', label: 'AI Thinking', icon: Brain },
  { id: 'tts', label: 'Voice Synthesis', icon: Volume2 },
];

function PipelineProgressIndicator({ activeStep }: { activeStep: string | null }) {
  if (!activeStep) return null;

  const stepIndex = PIPELINE_STEPS.findIndex((s) => s.id === activeStep);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900/80 border border-cyan-500/20"
    >
      {PIPELINE_STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const status: PipelineStepStatus =
          i < stepIndex ? 'completed' :
          i === stepIndex ? 'active' : 'pending';

        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div className={`w-6 h-px ${status === 'pending' ? 'bg-gray-700' : 'bg-cyan-500/50'}`} />
            )}
            <div className="flex items-center gap-1.5" title={step.label}>
              <motion.div
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-colors ${
                  status === 'completed'
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : status === 'active'
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
                animate={status === 'active' ? { scale: [1, 1.1, 1] } : undefined}
                transition={status === 'active' ? { duration: 1, repeat: Infinity } : undefined}
              >
                {status === 'completed' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <StepIcon className={`w-3.5 h-3.5 ${
                    status === 'active' ? 'text-cyan-400' : 'text-gray-600'
                  }`} />
                )}
              </motion.div>
              <span className={`text-2xs font-medium hidden sm:block ${
                status === 'completed' ? 'text-emerald-400' :
                status === 'active' ? 'text-cyan-400' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </motion.div>
  );
}

export default function AsyncVoiceSolution() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [provider, setProvider] = useState<LLMProvider>('ollama');
  const [model, setModel] = useState<string>(DEFAULT_LLM_MODELS.ollama);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const addLog = useCallback((type: 'user' | 'assistant' | 'system', message: string, audioUrl?: string, timing?: { llmMs?: number; ttsMs?: number; totalMs?: number }) => {
    const newLog = createLog(type, message, audioUrl, timing);
    setLogs(prev => [...prev, newLog]);
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }

    setIsListening(false);
    setAudioLevel(0);

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      cleanupAudioContext(audioContextRef.current);
      audioContextRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    try {
      setSessionState('active');
      addLog('system', 'Voice session started - Speak when ready');

      await startListening();
    } catch (error) {
      addLog('system', 'Failed to start session: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog]);

  const endSession = useCallback(() => {
    stopListening();

    setSessionState('idle');
    addLog('system', 'Voice session ended');
  }, [addLog, stopListening]);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      const stream = await getUserMediaStream();
      streamRef.current = stream;

      audioContextRef.current = createAudioContext();
      await resumeAudioContext(audioContextRef.current);

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = DEFAULT_PROCESSING_CONFIG.fftSize;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSoundTime = Date.now();
      let isActive = true; // Local flag to control the loop

      const checkAudioLevel = () => {
        if (!analyserRef.current || !isActive) {
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        const level = calculateAudioLevel(dataArray);
        setAudioLevel(level);

        if (!isSilent(level, DEFAULT_PROCESSING_CONFIG.silenceThreshold)) {
          lastSoundTime = Date.now();
        } else if (isSilenceDurationExceeded(lastSoundTime, Date.now(), DEFAULT_PROCESSING_CONFIG.silenceDuration)) {
          isActive = false;
          stopListening();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();

      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        isActive = false; // Stop the animation loop
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      setIsListening(false);
      addLog('system', 'Failed to access microphone: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, addLog]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setSessionState('processing');
      setPipelineStep('stt');
      addLog('user', 'Processing voice message...');

      // Advance pipeline steps on a heuristic timer (STT ~1-2s, LLM ~2-4s, TTS ~1-2s)
      // This gives visual progress even though processVoiceMessage is a single call
      const stepTimer1 = setTimeout(() => setPipelineStep('llm'), 1500);
      const stepTimer2 = setTimeout(() => setPipelineStep('tts'), 4500);

      // Use the async pipeline: STT -> LLM -> TTS with selected provider/model
      const result = await processVoiceMessage(audioBlob, conversationHistory, provider, model);

      // Clear timers and pipeline step
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setPipelineStep(null);

      // Add to logs with timing information
      addLog('user', result.userText);
      addLog('assistant', result.assistantText, result.audioUrl, {
        llmMs: result.timing.llmMs,
        ttsMs: result.timing.ttsMs,
        totalMs: result.timing.totalMs
      });

      // Update conversation history (cap to last 20 messages to prevent context overflow)
      const MAX_CONVERSATION_HISTORY = 20;
      setConversationHistory(prev => {
        const updated = [
          ...prev,
          { role: 'user' as const, content: result.userText },
          { role: 'assistant' as const, content: result.assistantText }
        ];
        return updated.length > MAX_CONVERSATION_HISTORY
          ? updated.slice(-MAX_CONVERSATION_HISTORY)
          : updated;
      });

      // Play audio response first
      if (result.audioUrl) {
        await playAudio(result.audioUrl);
      }

      // Reset to idle state - user must click button again to continue
      setSessionState('idle');
      addLog('system', 'Click the button to continue conversation');
    } catch (error) {
      setPipelineStep(null);
      addLog('system', 'Error: ' + (error instanceof Error ? error.message : 'Failed to process audio'));
      setSessionState('error');
    }
  }, [addLog, conversationHistory, provider, model]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setConversationHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        stopMediaStream(streamRef.current);
      }
      if (audioContextRef.current) {
        cleanupAudioContext(audioContextRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Horizontal Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Button - 1 column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-24"
        >
          <VoicebotCallButton
            sessionState={sessionState}
            isListening={isListening}
            audioLevel={audioLevel}
            onStartSession={startSession}
            onEndSession={endSession}
          />
        </motion.div>

        {/* Model Configuration - 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-gray-800/95 rounded-2xl p-4 border-2 border-cyan-500/20 backdrop-blur-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
            {/* Provider Selector */}
            <div>
              <label className="block text-sm font-medium text-cyan-300/80 mb-1 font-mono uppercase">
                Provider
              </label>
              <UniversalSelect
                value={provider}
                onChange={(value) => {
                  const newProvider = value as LLMProvider;
                  setProvider(newProvider);
                  setModel(DEFAULT_LLM_MODELS[newProvider]);
                }}
                options={LLM_PROVIDERS.map(p => ({
                  value: p.value,
                  label: `${p.label} - ${p.description}`
                }))}
                disabled={sessionState !== 'idle'}
                variant="default"
              />
            </div>

            {/* Model Selector or Display */}
            <div>
              <label className="block text-sm font-medium text-cyan-300/80 mb-1 font-mono uppercase">
                Model
              </label>
              {AVAILABLE_LLM_MODELS[provider].length > 1 ? (
                <UniversalSelect
                  value={model}
                  onChange={(value) => setModel(value)}
                  options={AVAILABLE_LLM_MODELS[provider].map(m => ({
                    value: m.value,
                    label: m.label
                  }))}
                  disabled={sessionState !== 'idle'}
                  variant="default"
                />
              ) : (
                <div className="p-2 bg-black/30 rounded-lg border border-cyan-500/20 h-[42px] flex items-center">
                  <div className="text-sm text-cyan-400 font-mono font-semibold truncate">{model}</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Full-Width Session Logs */}
      {/* Pipeline progress indicator */}
      <AnimatePresence>
        {sessionState === 'processing' && (
          <PipelineProgressIndicator activeStep={pipelineStep} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <VoicebotSessionLogs
          logs={logs}
          sessionState={sessionState}
          isListening={isListening}
          onClearLogs={clearLogs}
        />
      </motion.div>
    </div>
  );
}
