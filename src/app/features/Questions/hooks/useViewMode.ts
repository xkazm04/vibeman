import { useState } from 'react';
import { useQuestionTrees } from '@/lib/queries/questionsDirectionsQueries';
import type { QuestionsViewMode } from '../components/ViewModeToggle';

export function useViewMode(effectiveProjectId?: string) {
  const [viewMode, setViewMode] = useState<QuestionsViewMode>('table');

  const { data: treeData } = useQuestionTrees(effectiveProjectId, viewMode === 'tree' || viewMode === 'topology');

  return {
    viewMode,
    setViewMode,
    treeData,
  };
}
