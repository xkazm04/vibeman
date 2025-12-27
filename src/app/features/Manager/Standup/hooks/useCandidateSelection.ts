/**
 * useCandidateSelection Hook
 * Manages selection state for goal candidates
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProjectCandidates, GoalCandidate } from '../types';

interface UseCandidateSelectionResult {
  selectedCandidates: Map<string, Set<number>>;
  totalSelected: number;
  toggleCandidate: (projectId: string, index: number) => void;
  selectAll: (projectId: string, candidatesCount: number) => void;
  selectNone: (projectId: string) => void;
  isSelected: (projectId: string, index: number) => boolean;
  getSelectedCount: (projectId: string) => number;
  getSelectedCandidates: (
    projectId: string,
    candidates: GoalCandidate[]
  ) => GoalCandidate[];
}

export function useCandidateSelection(
  projectCandidates: ProjectCandidates[]
): UseCandidateSelectionResult {
  const [selectedCandidates, setSelectedCandidates] = useState<
    Map<string, Set<number>>
  >(new Map());

  // Initialize selection when projectCandidates changes - all selected by default
  useEffect(() => {
    if (projectCandidates.length > 0) {
      const initial = new Map<string, Set<number>>();
      projectCandidates.forEach(pc => {
        initial.set(pc.projectId, new Set(pc.candidates.map((_, i) => i)));
      });
      setSelectedCandidates(initial);
    }
  }, [projectCandidates]);

  const toggleCandidate = useCallback((projectId: string, index: number) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      const projectSet = new Set(newMap.get(projectId) || []);

      if (projectSet.has(index)) {
        projectSet.delete(index);
      } else {
        projectSet.add(index);
      }

      newMap.set(projectId, projectSet);
      return newMap;
    });
  }, []);

  const selectAll = useCallback((projectId: string, candidatesCount: number) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      newMap.set(
        projectId,
        new Set(Array.from({ length: candidatesCount }, (_, i) => i))
      );
      return newMap;
    });
  }, []);

  const selectNone = useCallback((projectId: string) => {
    setSelectedCandidates(prev => {
      const newMap = new Map(prev);
      newMap.set(projectId, new Set());
      return newMap;
    });
  }, []);

  const isSelected = useCallback(
    (projectId: string, index: number) => {
      return selectedCandidates.get(projectId)?.has(index) || false;
    },
    [selectedCandidates]
  );

  const getSelectedCount = useCallback(
    (projectId: string) => {
      return selectedCandidates.get(projectId)?.size || 0;
    },
    [selectedCandidates]
  );

  const getSelectedCandidates = useCallback(
    (projectId: string, candidates: GoalCandidate[]) => {
      const selectedIndices = selectedCandidates.get(projectId) || new Set();
      return candidates.filter((_, i) => selectedIndices.has(i));
    },
    [selectedCandidates]
  );

  const totalSelected = Array.from(selectedCandidates.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );

  return {
    selectedCandidates,
    totalSelected,
    toggleCandidate,
    selectAll,
    selectNone,
    isSelected,
    getSelectedCount,
    getSelectedCandidates,
  };
}
