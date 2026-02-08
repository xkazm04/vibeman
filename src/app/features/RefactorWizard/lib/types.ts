/**
 * RefactorWizard Types - Stub for backward compatibility
 *
 * This file provides type definitions for the scan system.
 * The RefactorWizard feature may have been refactored or removed,
 * but these types are still needed by the scan techniques.
 */

export interface FileAnalysis {
  path: string;
  content: string;
  size?: number;
  extension?: string;
  language?: string;
}

export interface ScanOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSize?: number;
}

export interface ScanResult {
  analyzedFiles: number;
  opportunitiesFound: number;
  duration: number;
}

export interface RefactoringPackage {
  id: string;
  name: string;
  description?: string;
  opportunities: string[]; // opportunity IDs
  estimatedEffort?: string;
  priority?: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  type: string;
  label: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: string;
}

export interface ProjectContext {
  projectId: string;
  projectPath: string;
  framework?: string;
  language?: string;
}

export interface PackageFilter {
  category?: string;
  severity?: string;
  minPriority?: number;
}
