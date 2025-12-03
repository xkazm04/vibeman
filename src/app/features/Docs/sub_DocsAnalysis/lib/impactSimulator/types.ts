/**
 * Impact Simulator Types
 * Types for the Architecture Impact Simulator (What-If Analysis)
 */

import type { Context, ContextGroup } from '@/stores/contextStore';

/**
 * Severity level for impact predictions
 */
export type ImpactSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Category of impact
 */
export type ImpactCategory =
  | 'import_path'     // Files that would need import path changes
  | 'test_breakage'   // Tests that might break
  | 'build_impact'    // Build size/time impact
  | 'refactor_effort' // Estimated refactoring effort
  | 'dependency'      // Dependency chain impact
  | 'api_contract';   // API contract changes

/**
 * A single impact prediction item
 */
export interface ImpactItem {
  id: string;
  category: ImpactCategory;
  severity: ImpactSeverity;
  title: string;
  description: string;
  affectedFiles: string[];
  estimatedEffort?: {
    files: number;
    lines: number;
    hours: number;
  };
}

/**
 * Import path change prediction
 */
export interface ImportPathChange {
  filePath: string;
  oldImport: string;
  newImport: string;
  line: number;
}

/**
 * Test breakage prediction
 */
export interface TestBreakagePrediction {
  testFile: string;
  testName?: string;
  reason: string;
  confidence: number; // 0-100
}

/**
 * Build impact prediction
 */
export interface BuildImpact {
  bundleSizeChange: number; // bytes (positive = increase)
  affectedChunks: string[];
  treeShakingImpact: 'none' | 'minor' | 'significant';
}

/**
 * The proposed move action
 */
export interface ProposedMove {
  contextId: string;
  contextName: string;
  sourceGroupId: string | null;
  sourceGroupName: string;
  targetGroupId: string;
  targetGroupName: string;
  sourceLayer: 'pages' | 'client' | 'server' | 'external' | null;
  targetLayer: 'pages' | 'client' | 'server' | 'external' | null;
}

/**
 * Summary of refactoring effort
 */
export interface RefactorEffortSummary {
  totalFiles: number;
  totalImportChanges: number;
  estimatedHours: number;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex';
  riskLevel: ImpactSeverity;
}

/**
 * Complete impact analysis result
 */
export interface ImpactAnalysisResult {
  proposedMove: ProposedMove;
  timestamp: Date;
  analysisComplete: boolean;

  // Detailed predictions
  importPathChanges: ImportPathChange[];
  testBreakages: TestBreakagePrediction[];
  buildImpact: BuildImpact;

  // Summary
  summary: RefactorEffortSummary;

  // Categorized impact items for display
  impactItems: ImpactItem[];

  // Warnings and recommendations
  warnings: string[];
  recommendations: string[];
}

/**
 * Simulation mode state
 */
export interface SimulationState {
  isEnabled: boolean;
  isAnalyzing: boolean;
  proposedMove: ProposedMove | null;
  analysisResult: ImpactAnalysisResult | null;
  error: string | null;
}

/**
 * Context with position data for drag and drop
 */
export interface DraggableContext extends Context {
  isDragging?: boolean;
  isDropTarget?: boolean;
}

/**
 * Group with drop zone data
 */
export interface DroppableGroup extends ContextGroup {
  isDropTarget?: boolean;
  isValidDropTarget?: boolean;
}

/**
 * File dependency information
 */
export interface FileDependency {
  filePath: string;
  imports: string[];
  importedBy: string[];
  isTest: boolean;
  module: string | null;
}

/**
 * Import statement parsed from a file
 */
export interface ParsedImport {
  source: string;
  specifiers: string[];
  line: number;
  isRelative: boolean;
  resolvedPath?: string;
}
