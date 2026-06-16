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
 * Fetch indicator data for ALL projects in a single batched request.
 * Returns a map of projectId -> reflection trigger state.
 *
 * Extend the `scope=indicators` route branch when adding new data sources.
 */
async function fetchIndicatorData(
  projectIds: string[]
): Promise<Map<string, { shouldTrigger: boolean; reason: string }>> {
  const map = new Map<string, { shouldTrigger: boolean; reason: string }>();

  try {
    const qs = encodeURIComponent(projectIds.join(','));
    const response = await fetch(`/api/brain/reflection?scope=indicators&projectIds=${qs}`);
    if (response.ok) {
      const json = await response.json();
      const indicators = (json?.indicators ?? {}) as Record<
        string,
        { shouldTrigger?: boolean; reason?: string }
      >;
      for (const [id, value] of Object.entries(indicators)) {
        map.set(id, {
          shouldTrigger: value.shouldTrigger || false,
          reason: value.reason || '',
        });
      }
    }
  } catch {
    // Non-critical - indicators just won't show
  }

  return map;
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

      // Single batched request for all projects (was one request per project)
      const triggerByProject = await fetchIndicatorData(ids);

      // Run evaluators against fetched data
      for (const id of ids) {
        const data: ProjectIndicatorData = {};
        const trigger = triggerByProject.get(id);
        if (trigger) {
          data.reflection = { shouldTrigger: trigger.shouldTrigger, reason: trigger.reason };
        }

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
