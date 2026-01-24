/**
 * Project Indicator System - Types
 *
 * Extensible notification dot system for project selector buttons.
 * Each indicator represents a condition/status that warrants user attention.
 *
 * To add a new indicator:
 * 1. Define a new IndicatorEvaluator in the evaluators array (useProjectIndicators.ts)
 * 2. The evaluator returns ProjectIndicator | null based on fetched data
 * 3. The dot renders automatically via IndicatorDots component
 */

/**
 * A single indicator dot for a project button
 */
export interface ProjectIndicator {
  /** Unique identifier for this indicator type (e.g., 'reflection-recommended') */
  id: string;
  /** Tailwind color class for the dot (e.g., 'bg-purple-400') */
  color: string;
  /** HTML title attribute for tooltip on hover */
  title: string;
  /** Lower priority = rendered first (leftmost). Default: 10 */
  priority: number;
}

/**
 * Data fetched per project for indicator evaluation.
 * Extend this interface when adding new data sources.
 */
export interface ProjectIndicatorData {
  reflection?: {
    shouldTrigger: boolean;
    reason: string;
  };
}

/**
 * An evaluator function that checks one condition and returns an indicator or null.
 * Evaluators are pure functions - they receive pre-fetched data and return synchronously.
 */
export type IndicatorEvaluator = (
  projectId: string,
  data: ProjectIndicatorData
) => ProjectIndicator | null;
