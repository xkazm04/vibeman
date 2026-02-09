/**
 * Reflector Store
 * Zustand store for Executive Analysis UI state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  DbExecutiveAnalysis,
  ExecutiveAIInsight,
  ExecutiveAnalysisStatus,
} from '@/app/db/models/reflector.types';
import type { TimeWindow } from '@/app/features/reflector/sub_Reflection/lib/types';

// ============================================================================
// TYPES
// ============================================================================

interface ReflectorState {
  // Executive Analysis state
  analysisStatus: ExecutiveAnalysisStatus | 'idle';
  runningAnalysisId: string | null;
  promptContent: string | null;
  lastAnalysis: DbExecutiveAnalysis | null;
  aiInsights: ExecutiveAIInsight[];
  aiNarrative: string | null;
  aiRecommendations: string[];

  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface ReflectorActions {
  // Analysis actions
  triggerAnalysis: (options: {
    projectId: string | null;
    projectName?: string;
    contextId: string | null;
    contextName?: string;
    timeWindow?: TimeWindow;
  }) => Promise<void>;

  fetchAnalysisStatus: (projectId: string | null) => Promise<void>;
  cancelAnalysis: (analysisId: string) => Promise<void>;

  // Utilities
  clearError: () => void;
}

type ReflectorStore = ReflectorState & ReflectorActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: ReflectorState = {
  analysisStatus: 'idle',
  runningAnalysisId: null,
  promptContent: null,
  lastAnalysis: null,
  aiInsights: [],
  aiNarrative: null,
  aiRecommendations: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// STORE
// ============================================================================

export const useReflectorStore = create<ReflectorStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================
      // ANALYSIS ACTIONS
      // ========================================

      triggerAnalysis: async (options) => {
        const { projectId, projectName, contextId, contextName, timeWindow = 'all' } = options;

        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/reflector/executive-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              projectName,
              contextId,
              contextName,
              timeWindow,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            // If already running, just update the ID
            if (response.status === 409 && data.analysisId) {
              set({
                analysisStatus: 'running',
                runningAnalysisId: data.analysisId,
                isLoading: false,
                error: 'Analysis already running',
              });
              return;
            }
            throw new Error(data.error || 'Failed to trigger analysis');
          }

          set({
            analysisStatus: 'running',
            runningAnalysisId: data.analysisId,
            promptContent: data.promptContent,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      fetchAnalysisStatus: async (projectId) => {
        try {
          const params = new URLSearchParams();
          if (projectId) params.set('projectId', projectId);

          const response = await fetch(`/api/reflector/executive-analysis?${params.toString()}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch analysis status');
          }

          // Parse AI insights from last completed analysis
          let aiInsights: ExecutiveAIInsight[] = [];
          let aiNarrative: string | null = null;
          let aiRecommendations: string[] = [];

          if (data.lastCompleted) {
            try {
              if (data.lastCompleted.ai_insights) {
                aiInsights = JSON.parse(data.lastCompleted.ai_insights);
              }
              if (data.lastCompleted.ai_narrative) {
                aiNarrative = data.lastCompleted.ai_narrative;
              }
              if (data.lastCompleted.ai_recommendations) {
                aiRecommendations = JSON.parse(data.lastCompleted.ai_recommendations);
              }
            } catch {
              // Ignore parsing errors
            }
          }

          set({
            analysisStatus: data.isRunning ? 'running' : (data.lastCompleted ? 'completed' : 'idle'),
            runningAnalysisId: data.runningAnalysis?.id || null,
            lastAnalysis: data.lastCompleted,
            aiInsights,
            aiNarrative,
            aiRecommendations,
          });
        } catch (error) {
          console.error('[ReflectorStore] Error fetching status:', error);
        }
      },

      cancelAnalysis: async (analysisId) => {
        try {
          const response = await fetch('/api/reflector/executive-analysis', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysisId, error: 'Cancelled by user' }),
          });

          if (response.ok) {
            set({
              analysisStatus: 'failed',
              runningAnalysisId: null,
              promptContent: null,
            });
          }
        } catch (error) {
          console.error('[ReflectorStore] Error cancelling analysis:', error);
        }
      },

      // ========================================
      // UTILITIES
      // ========================================

      clearError: () => set({ error: null }),
    }),
    { name: 'reflector-store' }
  )
);
