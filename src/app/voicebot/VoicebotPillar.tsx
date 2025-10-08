'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, MessageSquare, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TypewriterMessage from './components/TypewriterMessage';

interface VoicebotPillarProps {
  disabled?: boolean;
}

type VoicebotState = 'idle' | 'listening' | 'processing_stt' | 'processing_ai' | 'processing_tts' | 'playing' | 'error';

export default function VoicebotPillar({ disabled = false }: VoicebotPillarProps) {
  const [state, setState] = useState<VoicebotState>('idle');
  const [lastMessage, setLastMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const lastAudioLevelRef = useRef<number>(0);
  const silenceStartRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };
  }, [silenceTimer]);

  const startListening = async () => {
    try {
      setState('listening');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup audio analysis for visualization and silence detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Resume audio context if suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 512; // Increased for better sensitivity
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing for more responsive detection
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      silenceStartRef.current = Date.now();

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Calculate RMS (Root Mean Square) for better audio level detection
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / bufferLength);
          const normalizedLevel = rms / 255;

          setAudioLevel(normalizedLevel);

          // Silence detection with improved algorithm
          const SILENCE_THRESHOLD = 0.02; // Adjusted threshold
          const SILENCE_DURATION = 5000; // 5 seconds as requested

          if (normalizedLevel > SILENCE_THRESHOLD) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
            // Auto-stop after silence
            stopListening();
            return;
          }

          lastAudioLevelRef.current = normalizedLevel;

          // Continue animation only if still listening
          if (state === 'listening') {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        }
      };
      updateAudioLevel();

      // Setup MediaRecorder
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
      setState('error');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && state === 'listening') {
      mediaRecorderRef.current.stop();
      setState('processing_stt');
      setAudioLevel(0);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Convert speech to text using ElevenLabs
      setState('processing_stt');
      const transcription = await speechToText(audioBlob);

      if (transcription) {
        // Send to Ollama for processing
        setState('processing_ai');
        const response = await generateResponse(transcription);

        if (response) {
          setLastMessage(response);
          // Convert response to speech and play
          setState('processing_tts');
          await textToSpeech(response);
          setState('playing');
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setState('error');
      // Auto-reset error state after 3 seconds
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const speechToText = async (audioBlob: Blob): Promise<string | null> => {
    try {
      // ElevenLabs Speech-to-Text API call
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const response = await fetch('/api/voicebot/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Speech-to-text failed');

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return null;
    }
  };

  const generateResponse = async (text: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/kiro/generate-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a helpful AI assistant. Respond concisely in 1-2 sentences to: ${text}`,
          model: 'gpt-oss:20b'
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama API failed');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama error:', error);
      throw error;
    }
  };

  const textToSpeech = async (text: string) => {
    try {
      const response = await fetch('/api/voicebot/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Text-to-speech failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setState('idle'); // Reset to idle when audio finishes
      };

      await audio.play();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setState('idle'); // Reset on error
    }
  };

  const toggleListening = () => {
    if (disabled) return;

    if (state === 'idle') {
      startListening();
    } else if (state === 'listening') {
      stopListening();
    } else if (state === 'error') {
      setState('idle');
    }
  };

  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          icon: Mic,
          color: 'text-green-400 border-green-600/50 bg-green-600/10',
          hoverColor: 'hover:bg-red-600/20 hover:text-red-400 hover:border-red-600/50',
          pulseColor: 'shadow-green-500/30',
          description: 'Listening... (click to stop)'
        };
      case 'processing_stt':
        return {
          icon: Loader2,
          color: 'text-blue-400 border-blue-600/50 bg-blue-600/10',
          hoverColor: 'hover:bg-blue-600/20',
          pulseColor: 'shadow-blue-500/30',
          description: 'Converting speech...'
        };
      case 'processing_ai':
        return {
          icon: MessageSquare,
          color: 'text-blue-400 border-blue-600/50 bg-blue-600/10',
          hoverColor: 'hover:bg-blue-600/20',
          pulseColor: 'shadow-blue-500/30',
          description: 'Thinking...'
        };
      case 'processing_tts':
        return {
          icon: Loader2,
          color: 'text-orange-400 border-orange-600/50 bg-orange-600/10',
          hoverColor: 'hover:bg-orange-600/20',
          pulseColor: 'shadow-orange-500/30',
          description: 'Generating speech...'
        };
      case 'playing':
        return {
          icon: Volume2,
          color: 'text-cyan-400 border-cyan-600/50 bg-cyan-600/10',
          hoverColor: 'hover:bg-cyan-600/20',
          pulseColor: 'shadow-cyan-500/30',
          description: 'Speaking...'
        };
      case 'error':
        return {
          icon: MicOff,
          color: 'text-red-400 border-red-600/50 bg-red-600/10',
          hoverColor: 'hover:bg-red-600/20',
          pulseColor: 'shadow-red-500/30',
          description: 'Error - Click to retry'
        };
      default:
        return {
          icon: MicOff,
          color: 'text-gray-400 border-gray-600/50 bg-gray-600/5',
          hoverColor: 'hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-600/50',
          pulseColor: '',
          description: 'Click to start voice chat'
        };
    }
  };

  const stateConfig = getStateConfig();
  const IconComponent = stateConfig.icon;

  return (
    <div className="fixed top-1/2 right-6 transform -translate-y-1/2 z-50">
      {/* Message Display */}
      <AnimatePresence>
        {lastMessage && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="mb-6 max-w-sm"
            style={{ transform: 'translateX(-100%)' }}
          >
            <TypewriterMessage message={lastMessage} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Button */}
      <div className="flex flex-col items-center">
        <motion.button
          onClick={toggleListening}
          disabled={disabled || (state !== 'idle' && state !== 'listening' && state !== 'error')}
          title={stateConfig.description}
          className={`
            relative w-20 h-20 rounded-full border-2 
            ${stateConfig.color} ${stateConfig.hoverColor}
            transition-all duration-300 
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${stateConfig.pulseColor ? `shadow-lg ${stateConfig.pulseColor}` : ''}
          `}
          whileHover={!disabled && (state === 'idle' || state === 'listening' || state === 'error') ? { scale: 1.05 } : {}}
          whileTap={!disabled && (state === 'idle' || state === 'listening' || state === 'error') ? { scale: 0.95 } : {}}
          animate={
            state === 'listening' ? {
              scale: [1, 1 + audioLevel * 0.4, 1],
              transition: { duration: 0.1 }
            } : state === 'processing_stt' || state === 'processing_tts' ? {
              rotate: 360,
              transition: { duration: 2, repeat: Infinity, ease: "linear" }
            } : state === 'processing_ai' ? {
              scale: [1, 1.1, 1],
              transition: { duration: 1, repeat: Infinity }
            } : state === 'playing' ? {
              scale: [1, 1.05, 1],
              transition: { duration: 0.5, repeat: Infinity }
            } : {}
          }
        >
          <div className="flex items-center justify-center w-full h-full">
            <IconComponent size={28} />
          </div>

          {/* Audio level ring for listening state */}
          {state === 'listening' && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-400/40"
              animate={{
                scale: [1, 1 + audioLevel * 0.6, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 0.2 }}
            />
          )}

          {/* Pulse effect for active states */}
          {(state === 'processing_ai' || state === 'playing') && (
            <motion.div
              className={`absolute inset-0 rounded-full ${state === 'processing_ai' ? 'bg-blue-400/20' : 'bg-cyan-400/20'
                }`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.button>

        {/* State Description */}
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-gray-400 text-center font-medium"
        >
          {stateConfig.description}
        </motion.p>
      </div>
    </div>
  );
}