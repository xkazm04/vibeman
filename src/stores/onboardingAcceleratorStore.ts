/**
 * Onboarding Accelerator Store
 * State management for the AI-powered developer onboarding system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DbLearningPath,
  DbLearningModule,
  DbCodeWalkthrough,
  DbQuizQuestion,
  DbQuizResponse,
  DbLearningMetrics,
  DbOnboardingRecommendation,
  AssignedWorkItem,
  LearningPathStatus,
  LearningModuleStatus,
} from '@/app/db/models/onboarding-accelerator.types';

// Parsed versions of types with JSON fields expanded
export interface LearningPath extends Omit<DbLearningPath, 'assigned_work'> {
  assigned_work: AssignedWorkItem[];
}

export interface LearningModule extends Omit<DbLearningModule, 'prerequisites' | 'key_concepts' | 'code_areas'> {
  prerequisites: string[];
  key_concepts: Array<{ name: string; description: string; importance: string }>;
  code_areas: string[];
}

export interface CodeWalkthrough extends Omit<DbCodeWalkthrough, 'key_points' | 'related_files'> {
  key_points: Array<{ text: string; lineReference?: number }>;
  related_files: string[];
}

export interface QuizQuestion extends Omit<DbQuizQuestion, 'options'> {
  options: Array<{ id: string; text: string }>;
}

// Session tracking for learning speed
interface LearningSession {
  moduleId: string;
  startedAt: Date;
  pausedAt?: Date;
  totalPausedMs: number;
}

// Quiz state
interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  startedAt: Date | null;
  responses: DbQuizResponse[];
}

interface OnboardingAcceleratorState {
  // Current state
  currentPathId: string | null;
  currentModuleId: string | null;
  currentWalkthroughIndex: number;

  // Data
  learningPaths: LearningPath[];
  modules: LearningModule[];
  walkthroughs: CodeWalkthrough[];
  questions: QuizQuestion[];
  metrics: DbLearningMetrics[];
  recommendations: DbOnboardingRecommendation[];

  // Session tracking
  activeSession: LearningSession | null;

  // Quiz state
  quizState: QuizState | null;

  // Loading states
  isLoading: boolean;
  isGenerating: boolean;

  // Actions - Path management
  setCurrentPath: (pathId: string | null) => void;
  setLearningPaths: (paths: LearningPath[]) => void;
  addLearningPath: (path: LearningPath) => void;
  updateLearningPath: (pathId: string, updates: Partial<LearningPath>) => void;
  removeLearningPath: (pathId: string) => void;

  // Actions - Module management
  setCurrentModule: (moduleId: string | null) => void;
  setModules: (modules: LearningModule[]) => void;
  addModule: (module: LearningModule) => void;
  updateModule: (moduleId: string, updates: Partial<LearningModule>) => void;
  removeModule: (moduleId: string) => void;

  // Actions - Walkthrough management
  setWalkthroughs: (walkthroughs: CodeWalkthrough[]) => void;
  setCurrentWalkthroughIndex: (index: number) => void;
  markWalkthroughViewed: (walkthroughId: string) => void;
  nextWalkthrough: () => void;
  prevWalkthrough: () => void;

  // Actions - Quiz management
  setQuestions: (questions: QuizQuestion[]) => void;
  startQuiz: () => void;
  submitAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  endQuiz: () => void;
  addQuizResponse: (response: DbQuizResponse) => void;

  // Actions - Metrics & Recommendations
  setMetrics: (metrics: DbLearningMetrics[]) => void;
  setRecommendations: (recommendations: DbOnboardingRecommendation[]) => void;
  updateRecommendationStatus: (recId: string, status: 'accepted' | 'dismissed') => void;

  // Actions - Session tracking
  startSession: (moduleId: string) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => { moduleId: string; durationMinutes: number } | null;

  // Actions - Loading states
  setLoading: (loading: boolean) => void;
  setGenerating: (generating: boolean) => void;

  // Computed values
  getCurrentPath: () => LearningPath | null;
  getCurrentModule: () => LearningModule | null;
  getCurrentWalkthrough: () => CodeWalkthrough | null;
  getCurrentQuestion: () => QuizQuestion | null;
  getModuleProgress: (moduleId: string) => { walkthroughsViewed: number; totalWalkthroughs: number; quizScore: number };
  getOverallProgress: () => { completedModules: number; totalModules: number; percentage: number };

  // Reset
  reset: () => void;
}

const initialState = {
  currentPathId: null,
  currentModuleId: null,
  currentWalkthroughIndex: 0,
  learningPaths: [],
  modules: [],
  walkthroughs: [],
  questions: [],
  metrics: [],
  recommendations: [],
  activeSession: null,
  quizState: null,
  isLoading: false,
  isGenerating: false,
};

export const useOnboardingAcceleratorStore = create<OnboardingAcceleratorState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Path management
      setCurrentPath: (pathId) => set({ currentPathId: pathId }),

      setLearningPaths: (paths) => set({ learningPaths: paths }),

      addLearningPath: (path) => set((state) => ({
        learningPaths: [...state.learningPaths, path],
      })),

      updateLearningPath: (pathId, updates) => set((state) => ({
        learningPaths: state.learningPaths.map((p) =>
          p.id === pathId ? { ...p, ...updates } : p
        ),
      })),

      removeLearningPath: (pathId) => set((state) => ({
        learningPaths: state.learningPaths.filter((p) => p.id !== pathId),
        currentPathId: state.currentPathId === pathId ? null : state.currentPathId,
      })),

      // Module management
      setCurrentModule: (moduleId) => set({
        currentModuleId: moduleId,
        currentWalkthroughIndex: 0,
        quizState: null,
      }),

      setModules: (modules) => set({ modules }),

      addModule: (module) => set((state) => ({
        modules: [...state.modules, module],
      })),

      updateModule: (moduleId, updates) => set((state) => ({
        modules: state.modules.map((m) =>
          m.id === moduleId ? { ...m, ...updates } : m
        ),
      })),

      removeModule: (moduleId) => set((state) => ({
        modules: state.modules.filter((m) => m.id !== moduleId),
        currentModuleId: state.currentModuleId === moduleId ? null : state.currentModuleId,
      })),

      // Walkthrough management
      setWalkthroughs: (walkthroughs) => set({ walkthroughs }),

      setCurrentWalkthroughIndex: (index) => set({ currentWalkthroughIndex: index }),

      markWalkthroughViewed: (walkthroughId) => set((state) => ({
        walkthroughs: state.walkthroughs.map((w) =>
          w.id === walkthroughId ? { ...w, viewed: 1, viewed_at: new Date().toISOString() } : w
        ),
      })),

      nextWalkthrough: () => {
        const { currentWalkthroughIndex, walkthroughs } = get();
        if (currentWalkthroughIndex < walkthroughs.length - 1) {
          set({ currentWalkthroughIndex: currentWalkthroughIndex + 1 });
        }
      },

      prevWalkthrough: () => {
        const { currentWalkthroughIndex } = get();
        if (currentWalkthroughIndex > 0) {
          set({ currentWalkthroughIndex: currentWalkthroughIndex - 1 });
        }
      },

      // Quiz management
      setQuestions: (questions) => set({ questions }),

      startQuiz: () => set({
        quizState: {
          currentQuestionIndex: 0,
          answers: {},
          startedAt: new Date(),
          responses: [],
        },
      }),

      submitAnswer: (questionId, answer) => set((state) => ({
        quizState: state.quizState ? {
          ...state.quizState,
          answers: { ...state.quizState.answers, [questionId]: answer },
        } : null,
      })),

      nextQuestion: () => {
        const { quizState, questions } = get();
        if (quizState && quizState.currentQuestionIndex < questions.length - 1) {
          set({
            quizState: {
              ...quizState,
              currentQuestionIndex: quizState.currentQuestionIndex + 1,
            },
          });
        }
      },

      prevQuestion: () => {
        const { quizState } = get();
        if (quizState && quizState.currentQuestionIndex > 0) {
          set({
            quizState: {
              ...quizState,
              currentQuestionIndex: quizState.currentQuestionIndex - 1,
            },
          });
        }
      },

      endQuiz: () => set({ quizState: null }),

      addQuizResponse: (response) => set((state) => ({
        quizState: state.quizState ? {
          ...state.quizState,
          responses: [...state.quizState.responses, response],
        } : null,
      })),

      // Metrics & Recommendations
      setMetrics: (metrics) => set({ metrics }),

      setRecommendations: (recommendations) => set({ recommendations }),

      updateRecommendationStatus: (recId, status) => set((state) => ({
        recommendations: state.recommendations.map((r) =>
          r.id === recId ? { ...r, status } : r
        ),
      })),

      // Session tracking
      startSession: (moduleId) => set({
        activeSession: {
          moduleId,
          startedAt: new Date(),
          totalPausedMs: 0,
        },
      }),

      pauseSession: () => {
        const { activeSession } = get();
        if (activeSession && !activeSession.pausedAt) {
          set({
            activeSession: {
              ...activeSession,
              pausedAt: new Date(),
            },
          });
        }
      },

      resumeSession: () => {
        const { activeSession } = get();
        if (activeSession && activeSession.pausedAt) {
          const pausedDuration = new Date().getTime() - activeSession.pausedAt.getTime();
          set({
            activeSession: {
              ...activeSession,
              pausedAt: undefined,
              totalPausedMs: activeSession.totalPausedMs + pausedDuration,
            },
          });
        }
      },

      endSession: () => {
        const { activeSession } = get();
        if (!activeSession) return null;

        const endTime = new Date();
        let totalMs = endTime.getTime() - activeSession.startedAt.getTime();

        // Subtract paused time
        if (activeSession.pausedAt) {
          totalMs -= (endTime.getTime() - activeSession.pausedAt.getTime());
        }
        totalMs -= activeSession.totalPausedMs;

        const result = {
          moduleId: activeSession.moduleId,
          durationMinutes: Math.round(totalMs / 60000),
        };

        set({ activeSession: null });
        return result;
      },

      // Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      setGenerating: (generating) => set({ isGenerating: generating }),

      // Computed values
      getCurrentPath: () => {
        const { currentPathId, learningPaths } = get();
        return learningPaths.find((p) => p.id === currentPathId) || null;
      },

      getCurrentModule: () => {
        const { currentModuleId, modules } = get();
        return modules.find((m) => m.id === currentModuleId) || null;
      },

      getCurrentWalkthrough: () => {
        const { currentWalkthroughIndex, walkthroughs } = get();
        return walkthroughs[currentWalkthroughIndex] || null;
      },

      getCurrentQuestion: () => {
        const { quizState, questions } = get();
        if (!quizState) return null;
        return questions[quizState.currentQuestionIndex] || null;
      },

      getModuleProgress: (moduleId) => {
        const { walkthroughs, quizState, metrics } = get();
        const moduleWalkthroughs = walkthroughs.filter((w) => w.module_id === moduleId);
        const viewedCount = moduleWalkthroughs.filter((w) => w.viewed).length;

        const moduleMetrics = metrics.find((m) => m.module_id === moduleId);
        const quizScore = moduleMetrics?.average_quiz_score || 0;

        return {
          walkthroughsViewed: viewedCount,
          totalWalkthroughs: moduleWalkthroughs.length,
          quizScore,
        };
      },

      getOverallProgress: () => {
        const { modules } = get();
        const completedModules = modules.filter((m) => m.status === 'completed').length;
        const totalModules = modules.length;
        const percentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return { completedModules, totalModules, percentage };
      },

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'onboarding-accelerator-storage',
      partialize: (state) => ({
        currentPathId: state.currentPathId,
        currentModuleId: state.currentModuleId,
        currentWalkthroughIndex: state.currentWalkthroughIndex,
      }),
    }
  )
);
