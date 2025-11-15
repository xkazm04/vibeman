import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TestExecution } from '@/app/db';

/**
 * Test Result Summary for a specific scan/column
 */
export interface TestResultSummary {
  scanType: string; // 'build', 'context', 'photo', 'structure', 'vision', etc.
  totalTests: number;
  passedTests: number;
  failedTests: number;
  runningTests: number;
  lastRunAt: string | null;
  executions: TestExecution[];
  screenshots: string[]; // Array of screenshot paths
}

/**
 * Test Result Store State
 */
interface TestResultState {
  // State
  results: Record<string, Record<string, TestResultSummary>>; // projectId -> scanType -> summary
  loading: boolean;
  lastUpdated: number | null;

  // Actions
  loadTestResults: (projectId: string) => Promise<void>;
  getResultsForScan: (projectId: string, scanType: string) => TestResultSummary | null;
  getOverallStats: (projectId: string) => {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    runningTests: number;
  };
  clearResults: () => void;
  updateResult: (projectId: string, scanType: string, summary: TestResultSummary) => void;
}

/**
 * Test Result Store
 * Manages test execution results and provides real-time status for Blueprint
 */
export const useTestResultStore = create<TestResultState>()(
  devtools(
    (set, get) => ({
      // Initial state
      results: {},
      loading: false,
      lastUpdated: null,

      /**
       * Load test results for a project from the API
       */
      loadTestResults: async (projectId: string) => {
        set({ loading: true });
        try {
          const response = await fetch(`/api/test-results?projectId=${projectId}`);

          if (!response.ok) {
            throw new Error('Failed to fetch test results');
          }

          const data = await response.json();

          if (data.success && data.results) {
            set((state) => ({
              results: {
                ...state.results,
                [projectId]: data.results,
              },
              lastUpdated: Date.now(),
            }));
          }
        } catch (error) {
          console.error('[TestResultStore] Failed to load test results:', error);
        } finally {
          set({ loading: false });
        }
      },

      /**
       * Get test results for a specific scan type
       */
      getResultsForScan: (projectId: string, scanType: string) => {
        const { results } = get();
        const projectResults = results[projectId];

        if (!projectResults) return null;

        return projectResults[scanType] || null;
      },

      /**
       * Get overall test statistics for a project
       */
      getOverallStats: (projectId: string) => {
        const { results } = get();
        const projectResults = results[projectId];

        if (!projectResults) {
          return { totalTests: 0, passedTests: 0, failedTests: 0, runningTests: 0 };
        }

        const stats = Object.values(projectResults).reduce(
          (acc, summary) => ({
            totalTests: acc.totalTests + summary.totalTests,
            passedTests: acc.passedTests + summary.passedTests,
            failedTests: acc.failedTests + summary.failedTests,
            runningTests: acc.runningTests + summary.runningTests,
          }),
          { totalTests: 0, passedTests: 0, failedTests: 0, runningTests: 0 }
        );

        return stats;
      },

      /**
       * Clear all results
       */
      clearResults: () => {
        set({ results: {}, lastUpdated: null });
      },

      /**
       * Update a specific test result
       */
      updateResult: (projectId: string, scanType: string, summary: TestResultSummary) => {
        set((state) => {
          const projectResults = state.results[projectId] || {};

          return {
            results: {
              ...state.results,
              [projectId]: {
                ...projectResults,
                [scanType]: summary,
              },
            },
            lastUpdated: Date.now(),
          };
        });
      },
    })
  )
);

export default useTestResultStore;
