import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AnalysisStore {
  // State
  isActive: boolean;
  currentGoalId: string | null;
  
  // Actions
  startAnalysis: (goalId: string) => void;
  stopAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isActive: false,
      currentGoalId: null,
      
      // Start analysis and set timeout
      startAnalysis: (goalId) => {
        set({ isActive: true, currentGoalId: goalId });
        
        // Auto-stop after 30 seconds
        setTimeout(() => {
          const state = get();
          if (state.isActive && state.currentGoalId === goalId) {
            set({ isActive: false, currentGoalId: null });
          }
        }, 30000);
      },
      
      // Stop analysis manually
      stopAnalysis: () => {
        set({ isActive: false, currentGoalId: null });
      },
    }),
    {
      name: 'analysis-store',
    }
  )
);

export default useAnalysisStore; 