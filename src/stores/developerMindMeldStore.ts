/**
 * Developer Mind-Meld Store
 * State management for personalized AI learning system
 */

import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type {
  DbDeveloperProfile,
  DbLearningInsight,
  DbSkillTracking,
} from '@/app/db/models/types';

export interface PreferenceScore {
  scanType: string;
  acceptanceRate: number;
  sampleCount: number;
  recommendation: 'preferred' | 'neutral' | 'avoided';
}

export interface LearningProgress {
  overallConfidence: number;
  decisionsRecorded: number;
  acceptanceRate: number;
  preferredAgents: string[];
  avoidedAgents: string[];
  topSkills: Array<{ area: string; proficiency: number }>;
  areasToImprove: Array<{ area: string; proficiency: number }>;
  activeInsightsCount: number;
}

export interface PredictionResult {
  willAccept: boolean;
  confidence: number;
  reasoning: string;
  basedOn: {
    scanTypeMatch: number;
    categoryMatch: number;
    effortImpactMatch: number;
  };
}

interface DeveloperMindMeldState {
  // State
  isEnabled: boolean;
  isLoading: boolean;
  profile: DbDeveloperProfile | null;
  insights: DbLearningInsight[];
  skills: DbSkillTracking[];
  preferences: PreferenceScore[];
  progress: LearningProgress | null;
  lastFetch: string | null;
  error: string | null;

  // UI state
  showInsightsPanel: boolean;
  showSkillsPanel: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setProfile: (profile: DbDeveloperProfile | null) => void;
  setInsights: (insights: DbLearningInsight[]) => void;
  setSkills: (skills: DbSkillTracking[]) => void;
  setPreferences: (preferences: PreferenceScore[]) => void;
  setProgress: (progress: LearningProgress | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleInsightsPanel: () => void;
  toggleSkillsPanel: () => void;

  // API actions
  fetchProfile: (projectId: string) => Promise<void>;
  updateProfile: (projectId: string, updates: Partial<{
    enabled: boolean;
    preferredScanTypes: string[];
    avoidedScanTypes: string[];
    securityPosture: 'strict' | 'balanced' | 'relaxed';
    performanceThreshold: 'high' | 'medium' | 'low';
  }>) => Promise<void>;
  recordDecision: (projectId: string, decision: {
    decisionType: string;
    entityId: string;
    entityType: string;
    scanType?: string;
    category?: string;
    effort?: number;
    impact?: number;
    accepted: boolean;
    feedback?: string;
  }) => Promise<void>;
  dismissInsight: (insightId: string) => Promise<void>;
  acknowledgeInsight: (insightId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  isEnabled: true,
  isLoading: false,
  profile: null,
  insights: [],
  skills: [],
  preferences: [],
  progress: null,
  lastFetch: null,
  error: null,
  showInsightsPanel: false,
  showSkillsPanel: false,
};

export const useDeveloperMindMeldStore = create<DeveloperMindMeldState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Simple setters
        setEnabled: (enabled) => set({ isEnabled: enabled }),
        setProfile: (profile) => set({ profile }),
        setInsights: (insights) => set({ insights }),
        setSkills: (skills) => set({ skills }),
        setPreferences: (preferences) => set({ preferences }),
        setProgress: (progress) => set({ progress }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
        toggleInsightsPanel: () => set((state) => ({ showInsightsPanel: !state.showInsightsPanel })),
        toggleSkillsPanel: () => set((state) => ({ showSkillsPanel: !state.showSkillsPanel })),

        // Fetch profile and insights
        fetchProfile: async (projectId) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch(`/api/developer-mind-meld?projectId=${projectId}`);
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to fetch profile');
            }

            set({
              profile: data.profile,
              insights: data.insights?.activeInsights || [],
              skills: data.insights?.skills || [],
              preferences: data.insights?.scanTypePreferences || [],
              progress: data.progress,
              isEnabled: data.profile?.enabled === 1,
              lastFetch: new Date().toISOString(),
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false,
            });
          }
        },

        // Update profile settings
        updateProfile: async (projectId, updates) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/developer-mind-meld', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, ...updates }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to update profile');
            }

            set({
              profile: data.profile,
              isEnabled: data.profile?.enabled === 1,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false,
            });
          }
        },

        // Record a decision
        recordDecision: async (projectId, decision) => {
          if (!get().isEnabled) return;

          try {
            const response = await fetch('/api/developer-mind-meld', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, ...decision }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to record decision');
            }

            if (data.progress) {
              set({ progress: data.progress });
            }
          } catch (error) {
            console.error('Failed to record decision:', error);
            // Don't set error state for background operations
          }
        },

        // Dismiss an insight
        dismissInsight: async (insightId) => {
          try {
            const response = await fetch('/api/developer-mind-meld/insights', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ insightId, action: 'dismiss' }),
            });

            if (response.ok) {
              set((state) => ({
                insights: state.insights.filter((i) => i.id !== insightId),
              }));
            }
          } catch (error) {
            console.error('Failed to dismiss insight:', error);
          }
        },

        // Acknowledge an insight
        acknowledgeInsight: async (insightId) => {
          try {
            const response = await fetch('/api/developer-mind-meld/insights', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ insightId, action: 'acknowledge' }),
            });

            if (response.ok) {
              set((state) => ({
                insights: state.insights.map((i) =>
                  i.id === insightId ? { ...i, status: 'acknowledged' as const } : i
                ),
              }));
            }
          } catch (error) {
            console.error('Failed to acknowledge insight:', error);
          }
        },

        // Reset store
        reset: () => set(initialState),
      }),
      {
        name: 'developer-mind-meld-store',
        version: 1,
        partialize: (state) => ({
          isEnabled: state.isEnabled,
          showInsightsPanel: state.showInsightsPanel,
          showSkillsPanel: state.showSkillsPanel,
        }),
      }
    ),
    { name: 'developer-mind-meld' }
  )
);

export default useDeveloperMindMeldStore;
