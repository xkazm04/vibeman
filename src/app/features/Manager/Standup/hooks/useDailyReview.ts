/**
 * useDailyReview Hook
 * Manages daily standup review state for all projects
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  DailyReviewDecision,
  ProjectReviewStatus,
  DailyReviewState,
  DailyReviewSummary,
} from '../lib/dailyReviewTypes';

const STORAGE_KEY = 'vibeman_daily_review';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadFromStorage(): DailyReviewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const state = JSON.parse(stored) as DailyReviewState;
    // Only return if it's today's review
    if (state.date === getTodayDateString()) {
      return state;
    }
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: DailyReviewState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

interface Project {
  id: string;
  name: string;
  path: string;
}

interface UseDailyReviewOptions {
  projects: Project[];
}

interface UseDailyReviewReturn {
  state: DailyReviewState | null;
  currentProject: ProjectReviewStatus | null;
  isComplete: boolean;
  hasStarted: boolean;
  summary: DailyReviewSummary | null;
  startReview: () => void;
  submitDecision: (decision: DailyReviewDecision) => void;
  goNext: () => void;
  goPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  resetReview: () => void;
}

export function useDailyReview({ projects }: UseDailyReviewOptions): UseDailyReviewReturn {
  const [state, setState] = useState<DailyReviewState | null>(null);

  // Initialize from storage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setState(stored);
    }
  }, []);

  const hasStarted = state !== null;
  const isComplete = state?.isComplete ?? false;
  const currentProject = state ? state.projects[state.currentIndex] ?? null : null;
  const canGoNext = state ? state.currentIndex < state.projects.length - 1 : false;
  const canGoPrevious = state ? state.currentIndex > 0 : false;

  const startReview = useCallback(() => {
    if (projects.length === 0) return;

    const newState: DailyReviewState = {
      date: getTodayDateString(),
      projects: projects.map(p => ({
        projectId: p.id,
        projectName: p.name,
        projectPath: p.path,
        decision: null,
        reviewedAt: null,
      })),
      currentIndex: 0,
      isComplete: false,
    };
    setState(newState);
    saveToStorage(newState);
  }, [projects]);

  const submitDecision = useCallback((decision: DailyReviewDecision) => {
    if (!state) return;

    const updatedProjects = [...state.projects];
    updatedProjects[state.currentIndex] = {
      ...updatedProjects[state.currentIndex],
      decision,
      reviewedAt: new Date().toISOString(),
    };

    // Check if all projects are reviewed
    const allReviewed = updatedProjects.every(p => p.decision !== null);
    const nextIndex = state.currentIndex < state.projects.length - 1
      ? state.currentIndex + 1
      : state.currentIndex;

    const newState: DailyReviewState = {
      ...state,
      projects: updatedProjects,
      currentIndex: allReviewed ? state.currentIndex : nextIndex,
      isComplete: allReviewed,
    };

    setState(newState);
    saveToStorage(newState);
  }, [state]);

  const goNext = useCallback(() => {
    if (!state || state.currentIndex >= state.projects.length - 1) return;

    const newState: DailyReviewState = {
      ...state,
      currentIndex: state.currentIndex + 1,
    };
    setState(newState);
    saveToStorage(newState);
  }, [state]);

  const goPrevious = useCallback(() => {
    if (!state || state.currentIndex <= 0) return;

    const newState: DailyReviewState = {
      ...state,
      currentIndex: state.currentIndex - 1,
    };
    setState(newState);
    saveToStorage(newState);
  }, [state]);

  const resetReview = useCallback(() => {
    setState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const summary: DailyReviewSummary | null = state ? {
    date: state.date,
    totalProjects: state.projects.length,
    reviewedCount: state.projects.filter(p => p.decision !== null).length,
    newGoals: state.projects.filter(p => p.decision === 'new_goal').length,
    goalUpdates: state.projects.filter(p => p.decision === 'goal_update').length,
    noChanges: state.projects.filter(p => p.decision === 'no_change').length,
  } : null;

  return {
    state,
    currentProject,
    isComplete,
    hasStarted,
    summary,
    startReview,
    submitDecision,
    goNext,
    goPrevious,
    canGoNext,
    canGoPrevious,
    resetReview,
  };
}

export default useDailyReview;
