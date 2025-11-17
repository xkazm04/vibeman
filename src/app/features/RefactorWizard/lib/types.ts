/**
 * Shared types for RefactorWizard
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';

// Re-export RefactorOpportunity for use in other modules
export type { RefactorOpportunity };

export interface FileAnalysis {
  path: string;
  content: string;
  size: number;
  lines: number;
}

export interface AnalysisResult {
  opportunities: RefactorOpportunity[];
  summary: {
    totalFiles: number;
    totalLines: number;
    issuesFound: number;
    categoryCounts: Record<string, number>;
  };
}

export interface DetectionResult {
  lineNumbers: number[];
  count: number;
}

// ============================================================================
// PACKAGE-BASED REFACTORING TYPES (Phase 1)
// ============================================================================

/**
 * A strategic refactoring package grouping related opportunities
 */
export interface RefactoringPackage {
  id: string;
  name: string;
  description: string;
  strategy: PackageStrategy;

  // Classification
  category: 'migration' | 'cleanup' | 'security' | 'performance' | 'architecture';
  scope: 'project' | 'module' | 'file';
  modulePattern?: string; // e.g., "src/auth/*"

  // Issues
  opportunities: RefactorOpportunity[];
  issueCount: number;

  // Effort estimation
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large' | 'extra-large';
  estimatedHours: number;

  // Dependencies
  dependsOn: string[]; // Package IDs that must be completed first
  enables: string[]; // Package IDs that this unblocks
  executionOrder: number; // 1 = foundational, higher = more dependent

  // Strategic context
  strategicGoal: string; // High-level objective
  expectedOutcomes: string[]; // Measurable success criteria
  relatedDocs: string[]; // Links to CLAUDE.md sections, etc.

  // Phased execution (for large packages)
  phases?: PackagePhase[];

  // Status tracking
  selected: boolean;
  executed: boolean;
  executionResult?: PackageExecutionResult;
}

/**
 * Strategy for how issues in a package are grouped
 */
export interface PackageStrategy {
  type: 'pattern-based' | 'module-based' | 'migration' | 'tech-upgrade' | 'custom';
  rationale: string; // Why these issues belong together
  approach: string; // How to implement systematically
}

/**
 * Phase within a large package (for step-by-step execution)
 */
export interface PackagePhase {
  id: string;
  name: string;
  description: string;
  opportunities: RefactorOpportunity[];
  order: number; // Sequential ordering within package
  dependsOnPhase?: string; // ID of previous phase that must complete first
}

/**
 * Dependency graph for package visualization and ordering
 */
export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string; // package ID
  label: string; // package name
  level: number; // 0 = foundational, higher = more dependent
  selected: boolean;
}

export interface DependencyEdge {
  from: string; // prerequisite package ID
  to: string; // dependent package ID
  type: 'required' | 'optional' | 'recommended';
}

/**
 * Execution result for tracking package implementation
 */
export interface PackageExecutionResult {
  packageId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  taskId?: string; // Claude Code task ID
  startTime: Date;
  endTime?: Date;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  error?: string;
}

/**
 * Project context loaded from CLAUDE.md and other sources
 */
export interface ProjectContext {
  claudeMd: string; // Full CLAUDE.md content
  readme: string; // README.md content
  projectType: string; // 'next.js', 'react', 'express', etc.
  techStack: string[]; // ['Next.js 14', 'TypeScript 5', 'Tailwind CSS']
  architecture: string; // High-level architecture description
  priorities: string[]; // Extracted priorities from CLAUDE.md
  conventions: string[]; // Code conventions and standards
}

/**
 * Filter state for package selection
 */
export interface PackageFilter {
  category: 'all' | 'migration' | 'cleanup' | 'security' | 'performance' | 'architecture';
  impact: 'all' | 'critical' | 'high' | 'medium' | 'low';
  effort: 'all' | 'small' | 'medium' | 'large' | 'extra-large';
  status?: 'all' | 'selected' | 'unselected' | 'executed';
}
