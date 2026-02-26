/**
 * Voice Companion Store
 * Zustand store for the always-on voice companion state.
 * Manages the AmbientVoiceEngine lifecycle and exposes reactive state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  AmbientVoiceEngine,
  type CompanionMode,
  type CompanionState,
  type AmbientTranscript,
  type ProactiveSuggestion,
  type VoiceCompanionConfig,
  DEFAULT_COMPANION_CONFIG,
} from '@/lib/voice/ambientVoiceEngine';

// ─── Types ───

interface VoiceCompanionState {
  /** Current companion mode */
  mode: CompanionMode;
  /** Engine state (idle, listening, processing, speaking, error) */
  engineState: CompanionState;
  /** Whether the engine has been started */
  isActive: boolean;
  /** Current microphone audio level (0-1) */
  audioLevel: number;
  /** Recent ambient transcripts */
  transcripts: AmbientTranscript[];
  /** Active proactive suggestions */
  suggestions: ProactiveSuggestion[];
  /** Last response from Annette */
  lastResponse: string | null;
  /** Last response audio base64 */
  lastResponseAudio: string | null;
  /** Error message if any */
  error: string | null;
  /** Pipeline configuration */
  pipeline: 'annette' | 'simple';
  /** TTS enabled */
  ttsEnabled: boolean;
  /** Auto-play TTS */
  autoPlay: boolean;
  /** Whether the ambient panel is expanded */
  isPanelOpen: boolean;
}

interface VoiceCompanionActions {
  /** Start the voice companion engine */
  startCompanion: () => Promise<void>;
  /** Stop the voice companion engine */
  stopCompanion: () => void;
  /** Switch companion mode */
  setMode: (mode: CompanionMode) => void;
  /** Start push-to-talk recording */
  startPushToTalk: () => void;
  /** Stop push-to-talk recording */
  stopPushToTalk: () => void;
  /** Interrupt current response */
  interrupt: () => void;
  /** Dismiss a proactive suggestion */
  dismissSuggestion: (id: string) => void;
  /** Update pipeline selection */
  setPipeline: (pipeline: 'annette' | 'simple') => void;
  /** Toggle TTS */
  toggleTts: () => void;
  /** Toggle auto-play */
  toggleAutoPlay: () => void;
  /** Toggle panel open/closed */
  togglePanel: () => void;
  /** Clear error */
  clearError: () => void;
  /** Clear transcripts */
  clearTranscripts: () => void;
  /** Reset store */
  reset: () => void;
}

type VoiceCompanionStore = VoiceCompanionState & VoiceCompanionActions;

// ─── Engine Instance ───

let engineInstance: AmbientVoiceEngine | null = null;

// ─── Initial State ───

const initialState: VoiceCompanionState = {
  mode: 'ambient',
  engineState: 'idle',
  isActive: false,
  audioLevel: 0,
  transcripts: [],
  suggestions: [],
  lastResponse: null,
  lastResponseAudio: null,
  error: null,
  pipeline: 'annette',
  ttsEnabled: true,
  autoPlay: true,
  isPanelOpen: false,
};

// ─── Store ───

export const useVoiceCompanionStore = create<VoiceCompanionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      startCompanion: async () => {
        if (engineInstance) return;

        const { mode, pipeline, ttsEnabled, autoPlay } = get();

        const engine = new AmbientVoiceEngine(
          {
            mode,
            pipeline,
            ttsEnabled,
            autoPlay,
          },
          {
            onStateChange: (state) => set({ engineState: state }),
            onTranscript: (transcript) => {
              set((s) => ({
                transcripts: [...s.transcripts.slice(-49), transcript],
              }));
            },
            onResponse: (response, audioBase64) => {
              set({ lastResponse: response, lastResponseAudio: audioBase64 ?? null });
            },
            onSuggestion: (suggestion) => {
              set((s) => ({
                suggestions: [...s.suggestions.filter((x) => !x.dismissed), suggestion],
              }));
            },
            onAudioLevel: (level) => set({ audioLevel: level }),
            onError: (error) => set({ error }),
          }
        );

        engineInstance = engine;
        set({ isActive: true, error: null });
        await engine.start();
      },

      stopCompanion: () => {
        if (engineInstance) {
          engineInstance.stop();
          engineInstance = null;
        }
        set({ isActive: false, engineState: 'idle', audioLevel: 0 });
      },

      setMode: (mode) => {
        set({ mode });
        engineInstance?.setMode(mode);
      },

      startPushToTalk: () => {
        engineInstance?.startPushToTalk();
      },

      stopPushToTalk: () => {
        engineInstance?.stopPushToTalk();
      },

      interrupt: () => {
        engineInstance?.interrupt();
      },

      dismissSuggestion: (id) => {
        engineInstance?.dismissSuggestion(id);
        set((s) => ({
          suggestions: s.suggestions.map((x) =>
            x.id === id ? { ...x, dismissed: true } : x
          ),
        }));
      },

      setPipeline: (pipeline) => {
        set({ pipeline });
        engineInstance?.updateConfig({ pipeline });
      },

      toggleTts: () => {
        const next = !get().ttsEnabled;
        set({ ttsEnabled: next });
        engineInstance?.updateConfig({ ttsEnabled: next });
      },

      toggleAutoPlay: () => {
        const next = !get().autoPlay;
        set({ autoPlay: next });
        engineInstance?.updateConfig({ autoPlay: next });
      },

      togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),

      clearError: () => set({ error: null }),

      clearTranscripts: () => set({ transcripts: [], suggestions: [] }),

      reset: () => {
        if (engineInstance) {
          engineInstance.stop();
          engineInstance = null;
        }
        set(initialState);
      },
    }),
    { name: 'voice-companion-store' }
  )
);
