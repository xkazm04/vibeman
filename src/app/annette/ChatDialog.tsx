'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain } from 'lucide-react';
import AnnetteChatBackground from './components/AnnetteChatBackground';
import AnnetteChatHeader from './components/AnnetteChatHeader';
import AnnetteChatInput from './components/AnnetteChatInput';
import TypewriterMessage from '../voicebot/components/TypewriterMessage';
import { OllamaClient } from '@/lib/llm/providers/ollama-client';
import { Project } from '@/types';
import { ProjectContext } from './lib/typesAnnette';

interface ChatDialogProps {
  selectedProject?: Project;
  onSendMessage?: (message: string) => Promise<{ response: string; [key: string]: unknown }>;
  isProcessing?: boolean;
}

const ChatDialog = ({ selectedProject, isProcessing = false }: ChatDialogProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0));
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioAnimationRef = useRef<number | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ollamaClientRef = useRef(new OllamaClient());

  // Audio levels animation - throttled to 15fps for performance
  useEffect(() => {
    if (isAudioActive || isListening || isProcessing) {
      let lastUpdate = 0;
      const targetInterval = 1000 / 15; // 15fps instead of 60fps

      const animateAudio = (timestamp: number) => {
        if (timestamp - lastUpdate >= targetInterval) {
          setAudioLevels(prev => prev.map(() =>
            Math.random() * (isListening ? 100 : isProcessing ? 60 : 30)
          ));
          lastUpdate = timestamp;
        }
        audioAnimationRef.current = requestAnimationFrame(animateAudio);
      };
      audioAnimationRef.current = requestAnimationFrame(animateAudio);
    } else {
      if (audioAnimationRef.current) {
        cancelAnimationFrame(audioAnimationRef.current);
      }
      setAudioLevels(Array(12).fill(0));
    }

    return () => {
      if (audioAnimationRef.current) {
        cancelAnimationFrame(audioAnimationRef.current);
      }
    };
  }, [isAudioActive, isListening, isProcessing]);

  const startVoiceRecording = async () => {
    if (!selectedProject) return;
    try {
      setIsListening(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 512;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSoundTime = Date.now();
      const checkAudioLevel = () => {
        if (analyserRef.current && isListening) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i] * dataArray[i];
          const normalizedLevel = Math.sqrt(sum / bufferLength) / 255;

          if (normalizedLevel > 0.02) lastSoundTime = Date.now();
          else if (Date.now() - lastSoundTime > 3000) { stopVoiceRecording(); return; }

          requestAnimationFrame(checkAudioLevel);
        }
      };
      checkAudioLevel();

      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];
      mediaRecorderRef.current.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      if (audioContextRef.current) audioContextRef.current.close();
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsLoading(true);
    setCurrentResponse('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      const sttResponse = await fetch('/api/voicebot/speech-to-text', { method: 'POST', body: formData });
      if (!sttResponse.ok) throw new Error('Speech-to-text failed');
      const sttData = await sttResponse.json();
      setInputValue(sttData.text);
      await handleSendMessage(sttData.text);
    } catch (error) {
      console.error('Voice processing error:', error);
      setIsLoading(false);
      setCurrentResponse('Error processing voice input. Please try again.');
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const userMessage = messageText || inputValue.trim();
    if (!userMessage || !selectedProject) return;

    setInputValue('');
    setIsLoading(true);
    setCurrentResponse('');

    try {
      const response = await ollamaClientRef.current.generate({
        prompt: `You are a helpful AI assistant analyzing the project "${selectedProject.name}". Respond concisely to: ${userMessage}`,
        model: 'ministral-3:14b',
        projectId: selectedProject.id,
        taskType: 'chat',
        taskDescription: 'User chat message'
      });

      if (response.success && response.response) {
        setCurrentResponse(response.response);
        setIsLoading(false);
        await generateTextToSpeech(response.response);
      } else {
        throw new Error(response.error || 'Failed to generate response');
      }
    } catch (error) {
      console.error('Message processing error:', error);
      setIsLoading(false);
      setCurrentResponse('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const generateTextToSpeech = async (text: string) => {
    try {
      setIsAudioActive(true);
      const response = await fetch('/api/voicebot/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => { setIsAudioActive(false); URL.revokeObjectURL(audioUrl); };
        await audio.play().catch(console.error);
      } else {
        setIsAudioActive(false);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsAudioActive(false);
    }
  };

  const toggleListening = () => {
    if (isListening) stopVoiceRecording();
    else startVoiceRecording();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full relative overflow-hidden"
    >
      <AnnetteChatBackground />
      <div className="relative z-10 flex flex-col h-full border border-cyan-500/20 rounded-2xl shadow-2xl shadow-slate-500/10">
        <AnnetteChatHeader
          selectedProject={selectedProject as ProjectContext | undefined}
          isProcessing={isProcessing || isLoading}
          isListening={isListening}
          audioLevels={audioLevels}
          isAudioActive={isAudioActive}
        />
        <div className="flex-1 p-6 flex items-center justify-center relative">
          {/* Static scanlines pattern - removed infinite animation for performance */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)`
            }}
          />

          <AnimatePresence mode="wait">
            {!currentResponse && !isLoading ? (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center text-center">
                <div className="relative mb-8">
                  {/* Static brain icon - removed infinite rotation for performance */}
                  <Brain className="w-20 h-20 text-cyan-400/60" />
                  {/* Single orbital dot with CSS animation instead of multiple Framer Motion elements */}
                  <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '10s' }}>
                    <div className="w-2 h-2 rounded-full bg-cyan-400 opacity-60" style={{ transform: 'translateX(40px)' }} />
                  </div>
                </div>
                <motion.h4 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-slate-400 bg-clip-text text-transparent mb-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  NEURAL INTERFACE ACTIVE
                </motion.h4>
                <motion.p className="text-cyan-300/60 max-w-md font-mono text-sm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  {`>`} Quantum processing ready<br/>{`>`} Multi-dimensional analysis enabled<br/>{`>`} Project intelligence systems online<br/>
                  {/* Blinking cursor using CSS animation */}
                  <span className="animate-pulse">
                    {`>`} Awaiting neural input...
                  </span>
                </motion.p>
              </motion.div>
            ) : isLoading ? (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                {/* Simplified loading card - removed box-shadow animation for performance */}
                <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-600/20 via-blue-600/10 to-slate-800/20 border border-slate-400/30 backdrop-blur-sm shadow-lg shadow-indigo-500/20">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-blue-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                        {/* Use CSS animate-spin instead of Framer Motion */}
                        <Brain className="w-8 h-8 text-slate-400 animate-spin" style={{ animationDuration: '2s' }} />
                      </div>
                    </div>
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-mono text-slate-300 uppercase tracking-wider">Neural Processing</span>
                        {/* CSS pulse instead of Framer Motion opacity animation */}
                        <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse" />
                      </div>
                      {/* Reduced from 12 to 4 particles, using CSS animation */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-gradient-to-r from-cyan-400 to-slate-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="response" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-3xl w-full">
                <TypewriterMessage message={currentResponse} speed={30} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
        <AnnetteChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          isListening={isListening}
          onToggleListening={toggleListening}
          selectedProject={selectedProject as ProjectContext | undefined}
          isProcessing={isProcessing || isLoading}
          inputRef={inputRef as React.RefObject<HTMLInputElement>}
        />
      </div>
    </motion.div>
  );
};

export default ChatDialog;
