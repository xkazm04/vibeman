/**
 * Impact Analysis Types
 * Types for code impact visualization and change propagation analysis
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';

/**
 * Impact classification levels
 */
export type ImpactLevel = 'direct' | 'indirect' | 'potential';

/**
 * Node status in impact graph
 */
export type NodeStatus = 'unchanged' | 'modified' | 'affected' | 'excluded';

/**
 * Impact analysis node representing a file in the codebase
 */
export interface ImpactNode {
  id: string;
  path: string;
  fileName: string;
  directory: string;
  extension: string;
  level: ImpactLevel;
  status: NodeStatus;
  isSource: boolean; // True if this file is directly modified by refactoring
  depth: number; // Distance from source nodes
  changeCount: number; // Number of changes in this file
  lineCount?: number;
  complexity?: number;
  // Graph layout properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Edge in the impact graph representing a dependency
 */
export interface ImpactEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: 'import' | 'export' | 'extends' | 'implements' | 'uses' | 'calls';
  weight: number; // Strength of dependency (0-1)
  isAffected: boolean; // True if this edge propagates impact
}

/**
 * Complete impact graph
 */
export interface ImpactGraph {
  nodes: ImpactNode[];
  edges: ImpactEdge[];
  stats: ImpactStats;
}

/**
 * Statistics about the impact analysis
 */
export interface ImpactStats {
  totalFiles: number;
  directlyAffected: number;
  indirectlyAffected: number;
  potentiallyAffected: number;
  totalLines: number;
  affectedLines: number;
  complexity: {
    before: number;
    after: number;
    change: number;
  };
  riskScore: number; // 0-100
}

/**
 * File change preview
 */
export interface FileChangePreview {
  path: string;
  originalContent: string;
  modifiedContent: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  impactLevel: ImpactLevel;
}

/**
 * Diff hunk for showing changes
 */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

/**
 * Single line in a diff
 */
export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Impact analysis result for a set of refactoring opportunities
 */
export interface ImpactAnalysisResult {
  graph: ImpactGraph;
  changePreview: Map<string, FileChangePreview>;
  affectedFiles: string[];
  riskAssessment: RiskAssessment;
  executionPlan: ExecutionStep[];
}

/**
 * Risk assessment for the refactoring
 */
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigation?: string;
}

/**
 * Step in the execution plan
 */
export interface ExecutionStep {
  order: number;
  files: string[];
  description: string;
  dependencies: number[]; // Step orders that must complete first
  estimatedDuration: string;
}

/**
 * Scope adjustment for including/excluding nodes
 */
export interface ScopeAdjustment {
  includedNodes: Set<string>;
  excludedNodes: Set<string>;
  customScope?: string[]; // Custom file patterns
}

/**
 * Impact report for export/sharing
 */
export interface ImpactReport {
  title: string;
  generatedAt: string;
  summary: {
    totalOpportunities: number;
    totalFilesAffected: number;
    riskLevel: string;
    estimatedEffort: string;
  };
  impactBreakdown: {
    direct: string[];
    indirect: string[];
    potential: string[];
  };
  changeDetails: {
    path: string;
    additions: number;
    deletions: number;
    summary: string;
  }[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
}

/**
 * File dependency info for building the graph
 */
export interface FileDependency {
  source: string;
  target: string;
  type: ImpactEdge['type'];
  line?: number;
}

/**
 * Import/export analysis result for a single file
 */
export interface FileImportExport {
  path: string;
  imports: {
    from: string;
    specifiers: string[];
    isDefault: boolean;
    isDynamic: boolean;
  }[];
  exports: {
    name: string;
    isDefault: boolean;
  }[];
}

/**
 * Configuration for impact analysis
 */
export interface ImpactAnalysisConfig {
  maxDepth: number; // How deep to traverse dependencies
  includeTests: boolean; // Include test files
  includeNodeModules: boolean; // Include node_modules
  confidenceThreshold: number; // 0-1, minimum confidence for potential impacts
  filePatterns: string[]; // Glob patterns to include
  excludePatterns: string[]; // Glob patterns to exclude
}

export const DEFAULT_IMPACT_CONFIG: ImpactAnalysisConfig = {
  maxDepth: 5,
  includeTests: true,
  includeNodeModules: false,
  confidenceThreshold: 0.5,
  filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
};
