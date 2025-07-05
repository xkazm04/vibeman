import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AnalysisStore {
  // State
  isActive: boolean;
  currentGoalId: string | null;
  currentProjectId: string | null;
  
  // Actions
  startAnalysis: (goalId: string, projectId: string) => void;
  stopAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      isActive: false,
      currentGoalId: null,
      currentProjectId: null,
      
      // Start analysis and set timeout
      startAnalysis: (goalId, projectId) => {
        console.log('Starting analysis for goal:', goalId, 'project:', projectId);
        
        set({ 
          isActive: true, 
          currentGoalId: goalId,
          currentProjectId: projectId
        });
        
        // Auto-stop after 30 seconds
        setTimeout(() => {
          const state = get();
          if (state.isActive && state.currentGoalId === goalId) {
            console.log('Auto-stopping analysis after timeout');
            get().stopAnalysis();
          }
        }, 30000);
      },
      
      // Stop analysis manually
      stopAnalysis: () => {
        console.log('Stopping analysis');
        set({ 
          isActive: false, 
          currentGoalId: null,
          currentProjectId: null
        });
      },
    }),
    {
      name: 'analysis-store',
    }
  )
);

export default useAnalysisStore; 