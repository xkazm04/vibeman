/**
 * Goal Analyzer Types
 *
 * Type contracts for the goal analysis pipeline.
 * The goal analyzer examines a project against a goal to produce
 * a gap report and backlog items for autonomous execution.
 */

import type { BalancingConfig } from '../types';

// ============================================================================
// Gap Analysis
// ============================================================================

export interface GapItem {
  type: 'missing_feature' | 'tech_debt' | 'missing_tests' | 'missing_docs';
  title: string;
  description: string;
  affectedFiles: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface GapReport {
  goalId: string;
  analyzedFiles: string[];
  gaps: GapItem[];
  analyzedAt: string;
}

// ============================================================================
// Backlog Items
// ============================================================================

export interface BacklogItemInput {
  title: string;
  description: string;
  reasoning: string;
  effort: number;
  impact: number;
  risk: number;
  category: string;
  contextId: string | null;
  source: 'structural_analysis' | 'creative_suggestion';
  sourceScanType?: 'zen_architect' | 'bug_hunter' | 'ui_perfectionist';
  relevanceScore: number;
}

// ============================================================================
// Stage I/O
// ============================================================================

export interface GoalAnalyzerInput {
  runId: string;
  projectId: string;
  projectPath: string;
  goal: {
    id: string;
    title: string;
    description: string;
    target_paths?: string | null;
    use_brain?: boolean | number;
  };
  config: BalancingConfig;
  abortSignal?: AbortSignal;
}

export interface GoalAnalyzerOutput {
  gapReport: GapReport;
  backlogItems: BacklogItemInput[];
}

// ============================================================================
// File Discovery
// ============================================================================

export interface DiscoveredFile {
  path: string;
  content: string;
}
