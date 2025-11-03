import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type RefactorOpportunity = {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'maintainability' | 'security' | 'code-quality' | 'duplication' | 'architecture';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  effort: 'low' | 'medium' | 'high';
  files: string[];
  lineNumbers?: Record<string, number[]>;
  suggestedFix?: string;
  autoFixAvailable: boolean;
  estimatedTime?: string;
};

export type AnalysisStatus = 'idle' | 'scanning' | 'analyzing' | 'completed' | 'error';

interface RefactorState {
  // Analysis state
  analysisStatus: AnalysisStatus;
  analysisProgress: number;
  analysisError: string | null;

  // Opportunities
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  filterCategory: RefactorOpportunity['category'] | 'all';
  filterSeverity: RefactorOpportunity['severity'] | 'all';

  // UI state
  isWizardOpen: boolean;
  currentStep: 'scan' | 'review' | 'execute' | 'results';

  // Actions
  startAnalysis: (projectId: string, projectPath: string) => Promise<void>;
  setAnalysisStatus: (status: AnalysisStatus, progress?: number) => void;
  setAnalysisError: (error: string | null) => void;
  setOpportunities: (opportunities: RefactorOpportunity[]) => void;
  toggleOpportunity: (id: string) => void;
  selectAllOpportunities: () => void;
  clearSelection: () => void;
  setFilterCategory: (category: RefactorOpportunity['category'] | 'all') => void;
  setFilterSeverity: (severity: RefactorOpportunity['severity'] | 'all') => void;

  openWizard: () => void;
  closeWizard: () => void;
  setCurrentStep: (step: RefactorState['currentStep']) => void;
  resetWizard: () => void;
}

export const useRefactorStore = create<RefactorState>()(
  persist(
    (set, get) => ({
      // Initial state
      analysisStatus: 'idle',
      analysisProgress: 0,
      analysisError: null,
      opportunities: [],
      selectedOpportunities: new Set(),
      filterCategory: 'all',
      filterSeverity: 'all',
      isWizardOpen: false,
      currentStep: 'scan',

      // Actions
      startAnalysis: async (projectId: string, projectPath: string) => {
        set({
          analysisStatus: 'scanning',
          analysisProgress: 0,
          analysisError: null,
          opportunities: [],
          selectedOpportunities: new Set()
        });

        try {
          const response = await fetch('/api/refactor/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, projectPath }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
          }

          const data = await response.json();
          set({
            opportunities: data.opportunities || [],
            analysisStatus: 'completed',
            analysisProgress: 100,
            currentStep: 'review',
          });
        } catch (error) {
          set({
            analysisStatus: 'error',
            analysisError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      setAnalysisStatus: (status: AnalysisStatus, progress?: number) => {
        set({
          analysisStatus: status,
          ...(progress !== undefined && { analysisProgress: progress })
        });
      },

      setAnalysisError: (error: string | null) => {
        set({ analysisError: error });
      },

      setOpportunities: (opportunities: RefactorOpportunity[]) => {
        set({ opportunities });
      },

      toggleOpportunity: (id: string) => {
        const selected = new Set(get().selectedOpportunities);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        set({ selectedOpportunities: selected });
      },

      selectAllOpportunities: () => {
        const { opportunities } = get();
        const allIds = new Set(opportunities.map(o => o.id));
        set({ selectedOpportunities: allIds });
      },

      clearSelection: () => {
        set({ selectedOpportunities: new Set() });
      },

      setFilterCategory: (category) => {
        set({ filterCategory: category });
      },

      setFilterSeverity: (severity) => {
        set({ filterSeverity: severity });
      },

      openWizard: () => {
        set({ isWizardOpen: true });
      },

      closeWizard: () => {
        set({ isWizardOpen: false });
      },

      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      resetWizard: () => {
        set({
          analysisStatus: 'idle',
          analysisProgress: 0,
          analysisError: null,
          selectedOpportunities: new Set(),
          currentStep: 'scan',
        });
      },
    }),
    {
      name: 'refactor-wizard-storage',
      partialize: (state) => ({
        opportunities: state.opportunities,
      }),
    }
  )
);
