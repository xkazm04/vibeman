/**
 * Annette Voice Store
 * Manages voice recording, speaking state, and audio mode toggle.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface VoiceState {
  isRecording: boolean;
  isSpeaking: boolean;
  audioEnabled: boolean;
}

interface VoiceActions {
  setRecording: (recording: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  toggleAudio: () => void;
  reset: () => void;
}

type VoiceStore = VoiceState & VoiceActions;

const initialState: VoiceState = {
  isRecording: false,
  isSpeaking: false,
  audioEnabled: false,
};

export const useVoiceStore = create<VoiceStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setRecording: (recording) => set({ isRecording: recording }),
      setSpeaking: (speaking) => set({ isSpeaking: speaking }),
      toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

      reset: () => set(initialState),
    }),
    { name: 'annette-voice-store' }
  )
);
