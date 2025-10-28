/**
 * Async Voice Solution Component
 * Uses STT → LLM → TTS pipeline (similar to Annette module)
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
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
import { generateCallId, generateMessageId, isMonitoringEnabled } from '@/app/monitor/lib';

const LLM_PROVIDERS: Array<{ value: LLMProvider; label: string; description: string }> = [
  { value: 'ollama', label: 'Ollama', description: 'Local GPT-OSS 20B' },
  { value: 'openai', label: 'OpenAI', description: 'GPT-5 Models' },
  { value: 'anthropic', label: 'Claude', description: 'Anthropic AI' },
  { value: 'gemini', label: 'Gemini', description: 'Google AI' }
];

export default function AsyncVoiceSolution() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [provider, setProvider] = useState<LLMProvider>('ollama');
  const [model, setModel] = useState<string>(DEFAULT_LLM_MODELS.ollama);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const callStartTimeRef = useRef<string | null>(null);

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
      
      // Create monitoring call if enabled
      if (isMonitoringEnabled()) {
        const callId = generateCallId();
        const startTime = new Date().toISOString();
        
        callStartTimeRef.current = startTime;
        setCurrentCallId(callId);
        
        await fetch('/api/monitor/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callId,
            userId: 'async-voice-user',
            startTime,
            status: 'active',
            intent: 'async-voice-test',
            promptVersionId: `${provider}:${model}`,
            metadata: { provider, model, type: 'async-voice' }
          })
        });
      }
      
      await startListening();
    } catch (error) {
      console.error('Failed to start session:', error);
      addLog('system', 'Failed to start session: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog]);

  const endSession = useCallback(() => {
    stopListening();
    
    // Update monitoring call if enabled and call exists
    if (currentCallId && callStartTimeRef.current) {
      const endTime = new Date().toISOString();
      const startMs = new Date(callStartTimeRef.current).getTime();
      const endMs = new Date(endTime).getTime();
      const duration = endMs - startMs;
      
      fetch('/api/monitor/calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: currentCallId,
          endTime,
          duration,
          status: 'completed',
          outcome: 'user-ended'
        })
      }).catch(error => console.error('Failed to update monitoring call:', error));
      
      setCurrentCallId(null);
      callStartTimeRef.current = null;
    }
    
    setSessionState('idle');
    addLog('system', 'Voice session ended');
  }, [addLog, stopListening, currentCallId]);

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
      console.error('Error starting recording:', error);
      setIsListening(false);
      addLog('system', 'Failed to access microphone: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, addLog]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      setSessionState('processing');
      addLog('user', 'Processing voice message...');

      // Use the async pipeline: STT → LLM → TTS with selected provider/model
      const result = await processVoiceMessage(audioBlob, conversationHistory, provider, model);

      // Track messages if monitoring is enabled
      if (currentCallId) {
        const timestamp = new Date().toISOString();
        
        // Track user message
        await fetch('/api/monitor/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: generateMessageId(),
            callId: currentCallId,
            role: 'user',
            content: result.userText,
            timestamp,
            metadata: { source: 'stt' }
          })
        });
        
        // Track assistant message
        await fetch('/api/monitor/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: generateMessageId(),
            callId: currentCallId,
            role: 'assistant',
            content: result.assistantText,
            timestamp: new Date().toISOString(),
            latencyMs: result.timing.totalMs,
            metadata: {
              llmMs: result.timing.llmMs,
              ttsMs: result.timing.ttsMs,
              provider,
              model
            }
          })
        });
      }

      // Add to logs with timing information
      addLog('user', result.userText);
      addLog('assistant', result.assistantText, result.audioUrl, {
        llmMs: result.timing.llmMs,
        ttsMs: result.timing.ttsMs,
        totalMs: result.timing.totalMs
      });

      // Update conversation history
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: result.userText },
        { role: 'assistant', content: result.assistantText }
      ]);

      // Play audio response first
      if (result.audioUrl) {
        await playAudio(result.audioUrl);
      }

      // Reset to idle state - user must click button again to continue
      setSessionState('idle');
      addLog('system', 'Click the button to continue conversation');
    } catch (error) {
      console.error('Error processing audio:', error);
      addLog('system', 'Error: ' + (error instanceof Error ? error.message : 'Failed to process audio'));
      setSessionState('error');
    }
  }, [addLog, conversationHistory, provider, model, currentCallId]);

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
              <select
                value={provider}
                onChange={(e) => {
                  const newProvider = e.target.value as LLMProvider;
                  setProvider(newProvider);
                  setModel(DEFAULT_LLM_MODELS[newProvider]);
                }}
                disabled={sessionState !== 'idle'}
                className="w-full bg-gray-800/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-white text-sm font-mono disabled:opacity-50 hover:border-cyan-400/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label} - {p.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selector or Display */}
            <div>
              <label className="block text-sm font-medium text-cyan-300/80 mb-1 font-mono uppercase">
                Model
              </label>
              {AVAILABLE_LLM_MODELS[provider].length > 1 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={sessionState !== 'idle'}
                  className="w-full bg-gray-800/80 border border-cyan-500/30 rounded-lg px-3 py-2 text-white text-sm font-mono disabled:opacity-50 hover:border-cyan-400/50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
                >
                  {AVAILABLE_LLM_MODELS[provider].map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
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
