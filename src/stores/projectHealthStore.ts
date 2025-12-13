/**
 * Project Health Score Store
 * Manages state for the project health score dashboard
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DbProjectHealth,
  HealthScoreStats,
  HealthScoreStatus,
  HealthScoreCategory,
  CategoryWeightConfig,
  StatusThresholdConfig,
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_STATUS_THRESHOLDS,
} from '@/app/db/models/project-health.types';

export interface ProjectHealthState {
  // Current health data
  health: DbProjectHealth | null;
  stats: HealthScoreStats | null;
  history: DbProjectHealth[];

  // Configuration
  config: {
    enabled: boolean;
    autoCalculate: boolean;
    calculationFrequency: 'on_change' | 'hourly' | 'daily';
    categoryWeights: CategoryWeightConfig;
    thresholds: StatusThresholdConfig;
  };

  // UI State
  loading: boolean;
  calculating: boolean;
  error: string | null;
  selectedCategory: HealthScoreCategory | null;
  showHistory: boolean;
  showConfig: boolean;

  // AI Insights
  aiExplanation: string | null;
  aiRecommendation: string | null;
  aiFocusArea: HealthScoreCategory | null;
  generatingInsights: boolean;

  // Actions
  setHealth: (health: DbProjectHealth | null) => void;
  setStats: (stats: HealthScoreStats | null) => void;
  setHistory: (history: DbProjectHealth[]) => void;
  setConfig: (config: Partial<ProjectHealthState['config']>) => void;
  setLoading: (loading: boolean) => void;
  setCalculating: (calculating: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedCategory: (category: HealthScoreCategory | null) => void;
  setShowHistory: (show: boolean) => void;
  setShowConfig: (show: boolean) => void;
  setAIInsights: (explanation: string | null, recommendation: string | null, focusArea: HealthScoreCategory | null) => void;
  setGeneratingInsights: (generating: boolean) => void;

  // Async Actions
  fetchHealth: (projectId: string, includeHistory?: boolean) => Promise<void>;
  calculateHealth: (projectId: string) => Promise<void>;
  generateAIInsights: (projectId: string, provider?: string, model?: string) => Promise<void>;
  updateConfig: (projectId: string, config: Partial<ProjectHealthState['config']>) => Promise<void>;
  reset: () => void;
}

const initialState = {
  health: null,
  stats: null,
  history: [],
  config: {
    enabled: true,
    autoCalculate: true,
    calculationFrequency: 'on_change' as const,
    categoryWeights: DEFAULT_CATEGORY_WEIGHTS,
    thresholds: DEFAULT_STATUS_THRESHOLDS,
  },
  loading: false,
  calculating: false,
  error: null,
  selectedCategory: null,
  showHistory: false,
  showConfig: false,
  aiExplanation: null,
  aiRecommendation: null,
  aiFocusArea: null,
  generatingInsights: false,
};

export const useProjectHealthStore = create<ProjectHealthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Simple setters
      setHealth: (health) => set({ health }),
      setStats: (stats) => set({ stats }),
      setHistory: (history) => set({ history }),
      setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
      setLoading: (loading) => set({ loading }),
      setCalculating: (calculating) => set({ calculating }),
      setError: (error) => set({ error }),
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setShowHistory: (showHistory) => set({ showHistory }),
      setShowConfig: (showConfig) => set({ showConfig }),
      setAIInsights: (aiExplanation, aiRecommendation, aiFocusArea) =>
        set({ aiExplanation, aiRecommendation, aiFocusArea }),
      setGeneratingInsights: (generatingInsights) => set({ generatingInsights }),

      // Fetch health score and stats
      fetchHealth: async (projectId, includeHistory = false) => {
        set({ loading: true, error: null });
        try {
          const params = new URLSearchParams({ projectId });
          if (includeHistory) params.set('includeHistory', 'true');

          const response = await fetch(`/api/project-health?${params.toString()}`);

          if (!response.ok) {
            throw new Error('Failed to fetch health score');
          }

          const data = await response.json();

          set({
            health: data.health,
            stats: data.stats,
            history: data.history || [],
            loading: false,
          });

          // Load AI insights if available in the health record
          if (data.health?.ai_explanation) {
            set({
              aiExplanation: data.health.ai_explanation,
              aiRecommendation: data.health.ai_recommendation,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            loading: false,
          });
        }
      },

      // Calculate new health score
      calculateHealth: async (projectId) => {
        set({ calculating: true, error: null });
        try {
          const response = await fetch('/api/project-health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
          });

          if (!response.ok) {
            throw new Error('Failed to calculate health score');
          }

          const data = await response.json();

          set({
            health: data.health,
            stats: data.stats,
            calculating: false,
          });

          // Refresh history after calculation
          get().fetchHealth(projectId, true);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            calculating: false,
          });
        }
      },

      // Generate AI insights
      generateAIInsights: async (projectId, provider, model) => {
        set({ generatingInsights: true, error: null });
        try {
          const response = await fetch('/api/project-health/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, provider, model }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate AI insights');
          }

          const data = await response.json();

          set({
            aiExplanation: data.explanation,
            aiRecommendation: data.recommendation,
            aiFocusArea: data.focusArea,
            generatingInsights: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            generatingInsights: false,
          });
        }
      },

      // Update configuration
      updateConfig: async (projectId, config) => {
        try {
          const response = await fetch('/api/project-health/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              enabled: config.enabled,
              autoCalculate: config.autoCalculate,
              calculationFrequency: config.calculationFrequency,
              categoryWeights: config.categoryWeights,
              thresholds: config.thresholds,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update configuration');
          }

          const data = await response.json();

          set((state) => ({
            config: {
              ...state.config,
              ...data.config,
              categoryWeights: data.config.category_weights || state.config.categoryWeights,
              thresholds: data.config.thresholds || state.config.thresholds,
            },
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      // Reset store
      reset: () => set(initialState),
    }),
    {
      name: 'project-health-storage',
      partialize: (state) => ({
        showHistory: state.showHistory,
        showConfig: state.showConfig,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useHealthScore = () => useProjectHealthStore((state) => state.health?.overall_score ?? null);
export const useHealthStatus = () => useProjectHealthStore((state) => state.health?.status ?? null);
export const useHealthStats = () => useProjectHealthStore((state) => state.stats);
export const useHealthLoading = () => useProjectHealthStore((state) => state.loading || state.calculating);
