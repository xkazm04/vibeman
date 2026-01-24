/**
 * useProjectIndicators Hook
 *
 * Fetches indicator data for all projects and evaluates registered conditions.
 * Returns a Map of projectId -> ProjectIndicator[] for rendering dots.
 *
 * Data is refreshed on mount and every REFRESH_INTERVAL_MS.
 * Evaluators are pure functions registered in the EVALUATORS array.
 *
 * To add a new indicator:
 * 1. Extend ProjectIndicatorData if new data source needed
 * 2. Add fetch logic in fetchProjectData()
 * 3. Add evaluator function to EVALUATORS array
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProjectIndicator, ProjectIndicatorData, IndicatorEvaluator } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** How often to refresh indicator data (ms) */
const REFRESH_INTERVAL_MS = 60_000;

// ============================================================================
// EVALUATORS - Add new indicator checks here
// ============================================================================

/**
 * Reflection recommended: purple dot when threshold is reached
 */
const reflectionEvaluator: IndicatorEvaluator = (_projectId, data) => {
  if (data.reflection?.shouldTrigger) {
    return {
      id: 'reflection-recommended',
      color: 'bg-purple-400',
      title: 'Reflection recommended',
      priority: 10,
    };
  }
  return null;
};

/**
 * Registry of all evaluators.
 * Add new evaluators here for additional indicator types.
 */
const EVALUATORS: IndicatorEvaluator[] = [
  reflectionEvaluator,
  // Future: securityEvaluator, dependencyEvaluator, etc.
];

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch indicator data for a single project.
 * Extend this function when adding new data sources.
 */
async function fetchProjectData(projectId: string): Promise<ProjectIndicatorData> {
  const data: ProjectIndicatorData = {};

  try {
    const response = await fetch(`/api/brain/reflection?projectId=${projectId}`);
    if (response.ok) {
      const json = await response.json();
      data.reflection = {
        shouldTrigger: json.shouldTrigger || false,
        reason: json.triggerReason || '',
      };
    }
  } catch {
    // Non-critical - indicator just won't show
  }

  return data;
}

// ============================================================================
// HOOK
// ============================================================================

export function useProjectIndicators(
  projectIds: string[]
): Map<string, ProjectIndicator[]> {
  const [indicatorMap, setIndicatorMap] = useState<Map<string, ProjectIndicator[]>>(new Map());
  const isFetchingRef = useRef(false);
  const projectIdsRef = useRef<string[]>([]);

  const refresh = useCallback(async (ids: string[]) => {
    if (isFetchingRef.current || ids.length === 0) return;
    isFetchingRef.current = true;

    try {
      const results = new Map<string, ProjectIndicator[]>();

      // Fetch data for all projects in parallel
      const dataEntries = await Promise.all(
        ids.map(async (id) => {
          const data = await fetchProjectData(id);
          return { id, data };
        })
      );

      // Run evaluators against fetched data
      for (const { id, data } of dataEntries) {
        const indicators: ProjectIndicator[] = [];
        for (const evaluator of EVALUATORS) {
          const indicator = evaluator(id, data);
          if (indicator) {
            indicators.push(indicator);
          }
        }
        if (indicators.length > 0) {
          results.set(id, indicators);
        }
      }

      setIndicatorMap(results);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Track project ID changes
  useEffect(() => {
    const idsKey = projectIds.join(',');
    const prevKey = projectIdsRef.current.join(',');
    if (idsKey !== prevKey) {
      projectIdsRef.current = projectIds;
      refresh(projectIds);
    }
  }, [projectIds, refresh]);

  // Periodic refresh
  useEffect(() => {
    if (projectIds.length === 0) return;

    const interval = setInterval(() => {
      refresh(projectIdsRef.current);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [projectIds.length, refresh]);

  return indicatorMap;
}
