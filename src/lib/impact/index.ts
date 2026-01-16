/**
 * Impact Analysis Library Exports
 * Code impact visualization and change propagation analysis
 */

// Types
export type {
  ImpactLevel,
  NodeStatus,
  ImpactNode,
  ImpactEdge,
  ImpactGraph,
  ImpactStats,
  FileChangePreview,
  DiffHunk,
  DiffLine,
  ImpactAnalysisResult,
  RiskAssessment,
  RiskFactor,
  ExecutionStep,
  ScopeAdjustment,
  ImpactReport,
  FileDependency,
  FileImportExport,
  ImpactAnalysisConfig,
} from './types';

export { DEFAULT_IMPACT_CONFIG } from './types';

// Impact Analyzer
export { ImpactAnalyzer, impactAnalyzer } from './impactAnalyzer';

// Dependency Graph Builder
export { DependencyGraphBuilder, dependencyGraphBuilder } from './dependencyGraphBuilder';
