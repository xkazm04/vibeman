import { useState } from 'react';
import { AIReviewMode } from '@/lib/api/aiProjectReviewApi';

/**
 * Type definitions for AI-generated content
 */
export interface Task {
  title: string;
  description: string;
  priority?: string;
  status?: string;
}

export interface Goal {
  title: string;
  description: string;
  type?: string;
}

export interface CodeTask {
  file: string;
  task: string;
  priority?: string;
}

export interface Context {
  filename: string;
  content: string;
}

/**
 * Type mapping for different content modes
 */
type ContentTypeMap = {
  docs: string;
  tasks: Task[];
  goals: Goal[];
  contexts: Context[];
  code: CodeTask[];
};

/**
 * State interface for a single content mode
 */
interface ContentState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Hook return type with all content states
 */
interface AIContentLoaderState {
  docs: ContentState<string>;
  tasks: ContentState<Task[]>;
  goals: ContentState<Goal[]>;
  contexts: ContentState<Context[]>;
  code: ContentState<CodeTask[]>;
}

/**
 * Setter functions for updating content state
 */
interface AIContentLoaderActions {
  setLoading: (mode: keyof ContentTypeMap, loading: boolean) => void;
  setError: (mode: keyof ContentTypeMap, error: string | null) => void;
  setData: <K extends keyof ContentTypeMap>(mode: K, data: ContentTypeMap[K]) => void;
  resetMode: (mode: keyof ContentTypeMap) => void;
  resetAll: () => void;
}

/**
 * Complete hook return type
 */
export interface UseAIContentLoaderReturn {
  state: AIContentLoaderState;
  actions: AIContentLoaderActions;
}

/**
 * Initial state factory
 */
const createInitialState = (): AIContentLoaderState => ({
  docs: { data: '', loading: false, error: null },
  tasks: { data: [], loading: false, error: null },
  goals: { data: [], loading: false, error: null },
  contexts: { data: [], loading: false, error: null },
  code: { data: [], loading: false, error: null },
});

/**
 * Custom hook for managing AI content loading, errors, and data across all modes.
 *
 * This hook provides a unified interface for handling state management for different
 * AI content generation modes (docs, tasks, goals, contexts, code).
 *
 * @returns {UseAIContentLoaderReturn} State object and action functions
 *
 * @example
 * ```tsx
 * const { state, actions } = useAIContentLoader();
 *
 * // Set loading state
 * actions.setLoading('docs', true);
 *
 * // Set data
 * actions.setData('docs', 'Generated documentation content');
 *
 * // Set error
 * actions.setError('docs', 'Failed to generate docs');
 *
 * // Access state
 * if (state.docs.loading) {
 *   return <Spinner />;
 * }
 *
 * // Reset specific mode
 * actions.resetMode('docs');
 *
 * // Reset all modes
 * actions.resetAll();
 * ```
 */
export function useAIContentLoader(): UseAIContentLoaderReturn {
  const [docsState, setDocsState] = useState<ContentState<string>>({
    data: '',
    loading: false,
    error: null,
  });

  const [tasksState, setTasksState] = useState<ContentState<Task[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const [goalsState, setGoalsState] = useState<ContentState<Goal[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const [contextsState, setContextsState] = useState<ContentState<Context[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const [codeState, setCodeState] = useState<ContentState<CodeTask[]>>({
    data: [],
    loading: false,
    error: null,
  });

  /**
   * Set loading state for a specific mode
   */
  const setLoading = (mode: keyof ContentTypeMap, loading: boolean) => {
    switch (mode) {
      case 'docs':
        setDocsState(prev => ({ ...prev, loading }));
        break;
      case 'tasks':
        setTasksState(prev => ({ ...prev, loading }));
        break;
      case 'goals':
        setGoalsState(prev => ({ ...prev, loading }));
        break;
      case 'contexts':
        setContextsState(prev => ({ ...prev, loading }));
        break;
      case 'code':
        setCodeState(prev => ({ ...prev, loading }));
        break;
    }
  };

  /**
   * Set error state for a specific mode
   */
  const setError = (mode: keyof ContentTypeMap, error: string | null) => {
    switch (mode) {
      case 'docs':
        setDocsState(prev => ({ ...prev, error }));
        break;
      case 'tasks':
        setTasksState(prev => ({ ...prev, error }));
        break;
      case 'goals':
        setGoalsState(prev => ({ ...prev, error }));
        break;
      case 'contexts':
        setContextsState(prev => ({ ...prev, error }));
        break;
      case 'code':
        setCodeState(prev => ({ ...prev, error }));
        break;
    }
  };

  /**
   * Set data for a specific mode
   */
  const setData = <K extends keyof ContentTypeMap>(
    mode: K,
    data: ContentTypeMap[K]
  ) => {
    switch (mode) {
      case 'docs':
        setDocsState(prev => ({ ...prev, data: data as string }));
        break;
      case 'tasks':
        setTasksState(prev => ({ ...prev, data: data as Task[] }));
        break;
      case 'goals':
        setGoalsState(prev => ({ ...prev, data: data as Goal[] }));
        break;
      case 'contexts':
        setContextsState(prev => ({ ...prev, data: data as Context[] }));
        break;
      case 'code':
        setCodeState(prev => ({ ...prev, data: data as CodeTask[] }));
        break;
    }
  };

  /**
   * Reset state for a specific mode to initial values
   */
  const resetMode = (mode: keyof ContentTypeMap) => {
    const initialValue = mode === 'docs' ? '' : [];

    switch (mode) {
      case 'docs':
        setDocsState({ data: '', loading: false, error: null });
        break;
      case 'tasks':
        setTasksState({ data: [], loading: false, error: null });
        break;
      case 'goals':
        setGoalsState({ data: [], loading: false, error: null });
        break;
      case 'contexts':
        setContextsState({ data: [], loading: false, error: null });
        break;
      case 'code':
        setCodeState({ data: [], loading: false, error: null });
        break;
    }
  };

  /**
   * Reset all modes to initial values
   */
  const resetAll = () => {
    setDocsState({ data: '', loading: false, error: null });
    setTasksState({ data: [], loading: false, error: null });
    setGoalsState({ data: [], loading: false, error: null });
    setContextsState({ data: [], loading: false, error: null });
    setCodeState({ data: [], loading: false, error: null });
  };

  return {
    state: {
      docs: docsState,
      tasks: tasksState,
      goals: goalsState,
      contexts: contextsState,
      code: codeState,
    },
    actions: {
      setLoading,
      setError,
      setData,
      resetMode,
      resetAll,
    },
  };
}
