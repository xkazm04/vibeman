/**
 * Annette Voice Store
 * Manages voice recording, speaking state, and audio mode toggle.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type TtsProvider = 'openai' | 'elevenlabs';

interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  audioEnabled: boolean;
  ttsProvider: TtsProvider;
  elevenlabsVoiceId?: string;
}

interface VoiceActions {
  setRecording: (recording: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  toggleAudio: () => void;
  setTtsProvider: (provider: TtsProvider) => void;
  setElevenlabsVoiceId: (voiceId: string | undefined) => void;
  reset: () => void;
}

type VoiceStore = VoiceState & VoiceActions;

const initialState: VoiceState = {
  isRecording: false,
  isSpeaking: false,
  audioEnabled: false,
  ttsProvider: 'elevenlabs',
  elevenlabsVoiceId: undefined,
};

export const useVoiceStore = create<VoiceStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setRecording: (recording) => set({ isRecording: recording }),
      setSpeaking: (speaking) => set({ isSpeaking: speaking }),
      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
      setTtsProvider: (provider) => set({ ttsProvider: provider }),
      setElevenlabsVoiceId: (voiceId) => set({ elevenlabsVoiceId: voiceId }),

      reset: () => set(initialState),
    }),
    { name: 'annette-voice-store' }
  )
);
