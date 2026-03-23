import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import {
  useSqliteContexts,
  useQuestionsAndDirections,
  useInvalidateQuestionsDirections,
} from '@/lib/queries/questionsDirectionsQueries';
import { groupContextsByGroup } from '../lib/questionsApi';

export function useQuestionsData(propProjectId?: string | null) {
  const { activeProject } = useClientProjectStore();
  const effectiveProjectId = propProjectId || activeProject?.id;

  // Context selection state
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  // Data fetching
  const {
    data: contextsData,
    isLoading: contextLoading,
    error: contextError,
  } = useSqliteContexts(effectiveProjectId);

  const {
    data: combinedData,
    isLoading: combinedLoading,
  } = useQuestionsAndDirections(effectiveProjectId);

  const invalidateAll = useInvalidateQuestionsDirections();

  // Derived data
  const contexts = contextsData?.contexts ?? [];
  const contextGroups = contextsData?.groups ?? [];
  const questionsData = combinedData?.questions;
  const directionsData = combinedData?.directions;
  const questions = questionsData?.items || [];
  const directions = directionsData?.items || [];

  const groupedContexts = useMemo(
    () => groupContextsByGroup(contexts, contextGroups),
    [contexts, contextGroups]
  );

  const answeredQuestions = useMemo(
    () => questions.filter(q => q.status === 'answered'),
    [questions]
  );

  const totalPending = (questionsData?.counts.pending || 0) + (directionsData?.counts.pending || 0);

  // Auto-select all contexts on first load per project
  const hasInitializedRef = useRef(false);
  const lastProjectIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (effectiveProjectId !== lastProjectIdRef.current) {
      lastProjectIdRef.current = effectiveProjectId;
      hasInitializedRef.current = false;
      setSelectedContextIds([]);
    }
    if (contexts.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setSelectedContextIds(contexts.map(c => c.id));
    }
  }, [contexts, effectiveProjectId]);

  const handleToggleContext = useCallback((contextId: string) => {
    setSelectedContextIds(prev =>
      prev.includes(contextId)
        ? prev.filter(id => id !== contextId)
        : [...prev, contextId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedContextIds(contexts.map(c => c.id));
  }, [contexts]);

  const handleClearAll = useCallback(() => {
    setSelectedContextIds([]);
  }, []);

  const handleRefresh = useCallback(() => {
    invalidateAll(effectiveProjectId);
  }, [invalidateAll, effectiveProjectId]);

  return {
    activeProject,
    effectiveProjectId,
    // Context data
    contexts,
    groupedContexts,
    selectedContextIds,
    contextLoading,
    contextError,
    handleToggleContext,
    handleSelectAll,
    handleClearAll,
    // Questions & directions data
    questions,
    directions,
    questionsData,
    directionsData,
    answeredQuestions,
    combinedLoading,
    totalPending,
    // Actions
    invalidateAll,
    handleRefresh,
  };
}
