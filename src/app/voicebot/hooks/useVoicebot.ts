import { useState, useRef, useCallback } from 'react';

export interface VoicebotState {
  isListening: boolean;
  isProcessing: boolean;
  hasError: boolean;
  lastMessage: string;
  audioLevel: number;
}

export const useVoicebot = () => {
  const [state, setState] = useState<VoicebotState>({
    isListening: false,
    isProcessing: false,
    hasError: false,
    lastMessage: '',
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const updateState = useCallback((updates: Partial<VoicebotState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetError = useCallback(() => {
    updateState({ hasError: false });
  }, [updateState]);

  const setMessage = useCallback((message: string) => {
    updateState({ lastMessage: message });
  }, [updateState]);

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (mediaRecorderRef.current && state.isListening) {
      mediaRecorderRef.current.stop();
    }
    updateState({
      isListening: false,
      isProcessing: false,
      audioLevel: 0,
    });
  }, [state.isListening, updateState]);

  return {
    state,
    updateState,
    resetError,
    setMessage,
    cleanup,
    refs: {
      mediaRecorderRef,
      audioContextRef,
      analyserRef,
    },
  };
};