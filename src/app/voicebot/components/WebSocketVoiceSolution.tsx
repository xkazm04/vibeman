/**
 * WebSocket Voice Solution Component
 * Uses realtime WebSocket connection for voice interaction
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import VoicebotCallButton from './VoicebotCallButton';
import VoicebotSessionLogs from './VoicebotSessionLogs';
import {
  SessionLog,
  SessionState,
  createLog,
  calculateAudioLevel,
  isSilent,
  isSilenceDurationExceeded,
  getUserMediaStream,
  createAudioContext,
  resumeAudioContext,
  stopMediaStream,
  cleanupAudioContext,
  createWebSocketConnection,
  DEFAULT_PROCESSING_CONFIG
} from '../lib';

export default function WebSocketVoiceSolution() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const endSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopListening();
    setSessionState('idle');
    addLog('system', 'Call session terminated');
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
      console.error('Error starting recording:', error);
      setIsListening(false);
      addLog('system', 'Failed to access microphone: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, addLog]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size === 0) {
      addLog('system', 'No audio data recorded');
      return;
    }

    try {
      setSessionState('processing');
      addLog('system', 'Processing audio...');

      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Use POST endpoint since WebSocket upgrade is not implemented
      const response = await fetch('/api/voicebot/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          conversationHistory: logs
            .filter(log => log.type === 'user' || log.type === 'assistant')
            .map(log => ({
              role: log.type,
              content: log.message,
            })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        addLog('user', result.userText);
        addLog('assistant', result.assistantText, result.audioUrl, {
          llmMs: result.timing?.llmMs,
          ttsMs: result.timing?.ttsMs,
          totalMs: result.timing?.totalMs
        });

        // Play audio response if available, then continue listening
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => resolve();
            audio.onerror = () => {
              addLog('system', 'Failed to play audio response');
              resolve(); // Continue anyway
            };
            audio.play().catch(reject);
          });
        }

        // Reset to active state and continue listening
        setSessionState('active');
        await startListening();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      addLog('system', 'Failed to process audio: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('active');
      await startListening();
    }
  }, [logs, addLog, startListening]);

  const startSession = useCallback(async () => {
    try {
      setSessionState('connecting');
      addLog('system', 'Initiating voice call session...');
      addLog('system', 'Note: Currently using POST endpoint (WebSocket upgrade not yet implemented)');

      // Try to create WebSocket connection for future features (optional)
      try {
        const ws = createWebSocketConnection('/api/voicebot/realtime');
        wsRef.current = ws;

        ws.onopen = () => {
          addLog('system', 'WebSocket connected (for future real-time features)');
        };

        ws.onerror = () => {
          // Silently handle WebSocket errors - we'll use POST instead
        };

        ws.onclose = () => {
          // Connection closed
        };
      } catch {
        // WebSocket connection failed, but that's okay - we use POST
      }

      // Start session using POST endpoint
      setSessionState('active');
      addLog('system', 'Call connected successfully (using HTTP POST)');
      startListening();

    } catch (error) {
      console.error('Failed to start session:', error);
      addLog('system', 'Failed to start call session: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setSessionState('error');
    }
  }, [addLog, startListening]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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
