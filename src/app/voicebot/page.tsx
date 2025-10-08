'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import VoicebotSessionLogs from './components/VoicebotSessionLogs';
import VoicebotCallButton from './components/VoicebotCallButton';

interface SessionLog {
  id: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system';
  message: string;
  audioUrl?: string;
}

type SessionState = 'idle' | 'connecting' | 'active' | 'processing' | 'error';

export default function VoicebotPage() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const addLog = useCallback((type: 'user' | 'assistant' | 'system', message: string, audioUrl?: string) => {
    const newLog: SessionLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      audioUrl
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    setAudioLevel(0);
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
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
    };
  }, []);

  const startSession = useCallback(async () => {
    try {
      setSessionState('connecting');
      addLog('system', 'Initiating voice call session...');

      const ws = new WebSocket('ws://localhost:3000/api/voicebot/realtime');
      wsRef.current = ws;

      ws.onopen = () => {
        setSessionState('active');
        addLog('system', 'Call connected successfully');
        startListening();
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'response') {
          addLog('assistant', data.text, data.audioUrl);
          
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            await audio.play().catch(console.error);
          }
          
          if (sessionState === 'active') {
            startListening();
          }
        } else if (data.type === 'error') {
          addLog('system', `Error: ${data.message}`);
          setSessionState('error');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('system', 'Connection error occurred');
        setSessionState('error');
      };

      ws.onclose = () => {
        addLog('system', 'Call ended');
        setSessionState('idle');
        stopListening();
      };

    } catch (error) {
      console.error('Failed to start session:', error);
      addLog('system', 'Failed to start call session');
      setSessionState('error');
    }
  }, [addLog, stopListening]);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 512;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSoundTime = Date.now();
      const SILENCE_THRESHOLD = 0.02;
      const SILENCE_DURATION = 3000;

      const checkAudioLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / bufferLength);
          const normalizedLevel = rms / 255;
          setAudioLevel(normalizedLevel);

          if (normalizedLevel > SILENCE_THRESHOLD) {
            lastSoundTime = Date.now();
          } else if (Date.now() - lastSoundTime > SILENCE_DURATION) {
            stopListening();
            return;
          }

          animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();

      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
      addLog('system', 'Failed to access microphone');
    }
  }, [isListening, stopListening, addLog]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('system', 'Connection not available');
      return;
    }

    try {
      setSessionState('processing');
      
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: base64Audio.split(',')[1]
          }));
          
          addLog('user', 'Sending voice message...');
        }
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      addLog('system', 'Failed to process audio');
      setSessionState('active');
      startListening();
    }
  }, [addLog, startListening]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900/30 to-blue-900/20 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent mb-2 font-mono">
            VOICEBOT CALL SESSION
          </h1>
          <p className="text-cyan-300/60 font-mono">
            Experimental phone call-like voice interaction powered by OpenAI Realtime API
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <VoicebotCallButton
              sessionState={sessionState}
              isListening={isListening}
              audioLevel={audioLevel}
              onStartSession={startSession}
              onEndSession={endSession}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <VoicebotSessionLogs
              logs={logs}
              sessionState={sessionState}
              isListening={isListening}
              onClearLogs={clearLogs}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-6 bg-gray-900/50 border border-cyan-500/20 rounded-2xl backdrop-blur-sm"
        >
          <h3 className="text-lg font-bold text-cyan-400 mb-3 font-mono">SESSION INFO</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-mono">
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="ml-2 text-white">gpt-4o-realtime-preview-2024-10-01</span>
            </div>
            <div>
              <span className="text-gray-400">Auto-send:</span>
              <span className="ml-2 text-white">3s silence detection</span>
            </div>
            <div>
              <span className="text-gray-400">Mode:</span>
              <span className="ml-2 text-white">Continuous conversation</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
