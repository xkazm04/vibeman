import { create } from 'zustand';

interface ProjectsToolbarState {
  // Modal states
  showSettings: boolean;
  showAddProject: boolean;
  showEditProject: boolean;
  showDeleteProject: boolean;
  showAddGoal: boolean;
  showAIReview: boolean;
  
  // Selected items
  selectedGoal: any | null;
  selectedProject: any | null;
  
  // Actions
  setShowSettings: (show: boolean) => void;
  setShowAddProject: (show: boolean) => void;
  setShowEditProject: (show: boolean) => void;
  setShowDeleteProject: (show: boolean) => void;
  setShowAddGoal: (show: boolean) => void;
  setShowAIReview: (show: boolean) => void;
  setSelectedGoal: (goal: any | null) => void;
  setSelectedProject: (project: any | null) => void;
  
  // Reset all modals
  closeAllModals: () => void;
}

export const useProjectsToolbarStore = create<ProjectsToolbarState>((set) => ({
  // Initial state
  showSettings: false,
  showAddProject: false,
  showEditProject: false,
  showDeleteProject: false,
  showAddGoal: false,
  showAIReview: false,
  selectedGoal: null,
  selectedProject: null,
  
  // Actions
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAddProject: (show) => set({ showAddProject: show }),
  setShowEditProject: (show) => set({ showEditProject: show }),
  setShowDeleteProject: (show) => set({ showDeleteProject: show }),
  setShowAddGoal: (show) => set({ showAddGoal: show }),
  setShowAIReview: (show) => set({ showAIReview: show }),
  setSelectedGoal: (goal) => set({ selectedGoal: goal }),
  setSelectedProject: (project) => set({ selectedProject: project }),
  
  // Reset all modals
  closeAllModals: () => set({
    showSettings: false,
    showAddProject: false,
    showEditProject: false,
    showDeleteProject: false,
    showAddGoal: false,
    showAIReview: false,
  }),
}));