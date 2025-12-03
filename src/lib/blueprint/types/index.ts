/**
 * Blueprint System Core Types
 * Defines all shared types for the composable blueprint architecture
 */

// Project types supported by Vibeman
export type ProjectType = 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other';

// Analyzer categories
export type AnalyzerCategory = 'technical' | 'business';

// Component types
export type ComponentType = 'analyzer' | 'processor' | 'executor' | 'tester';

/**
 * Metadata for analyzer project type compatibility
 */
export interface AnalyzerProjectMetadata {
  /** Project types this analyzer supports. 'all' means works with any project */
  supportedProjectTypes: ProjectType[] | 'all';

  /** Category of analyzer: technical (code quality) or business (LLM-based) */
  category: AnalyzerCategory;

  /** File patterns this analyzer scans (for technical analyzers) */
  filePatterns?: string[];

  /** Default exclude patterns */
  excludePatterns?: string[];

  /** Tags for grouping/filtering */
  tags?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ExecutionContext {
  executionId: string;
  projectId: string;
  projectPath: string;
  projectType: string;
  projectName?: string;
  reportProgress: (progress: number, message?: string) => void;
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
  isCancelled: () => boolean;
  onCancel: (callback: () => void) => void;
  getNodeOutput: <T>(nodeId: string) => T | undefined;
  metadata?: Record<string, unknown>;
}

// Issue types (unified from scan patterns)
export interface BaseIssue {
  id: string;
  file: string;
  line: number;
  column?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  code?: string;
  suggestedFix?: string;
  autoFixAvailable: boolean;
}

export interface ConsoleIssue extends BaseIssue {
  category: 'console';
  consoleType: 'log' | 'warn' | 'error' | 'debug' | 'info';
}

export interface AnyTypeIssue extends BaseIssue {
  category: 'any-type';
  variableName?: string;
}

export interface UnusedImportIssue extends BaseIssue {
  category: 'unused-import';
  importName: string;
  importSource: string;
}

export interface LargeFileIssue extends BaseIssue {
  category: 'large-file';
  lineCount: number;
  threshold: number;
}

export interface LongFunctionIssue extends BaseIssue {
  category: 'long-function';
  functionName: string;
  lineCount: number;
  threshold: number;
}

export interface ComplexityIssue extends BaseIssue {
  category: 'complexity';
  functionName: string;
  complexity: number;
  threshold: number;
}

export interface DuplicationIssue extends BaseIssue {
  category: 'duplication';
  duplicateFiles: string[];
  duplicateLines: number[][];
  similarity: number;
}

export interface MagicNumberIssue extends BaseIssue {
  category: 'magic-number';
  value: number | string;
  suggestedConstantName?: string;
}

export interface ReactHookIssue extends BaseIssue {
  category: 'react-hook';
  hookName: string;
  issueType: 'missing-dependency' | 'unnecessary-dependency' | 'missing-array';
  dependencies?: string[];
}

export type Issue =
  | ConsoleIssue
  | AnyTypeIssue
  | UnusedImportIssue
  | LargeFileIssue
  | LongFunctionIssue
  | ComplexityIssue
  | DuplicationIssue
  | MagicNumberIssue
  | ReactHookIssue
  | BaseIssue;

// Decision types
export interface Decision {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  issues: Issue[];
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
  customContent?: React.ReactNode;
}

// Component definition
export interface ComponentDefinition {
  id: string;
  type: ComponentType;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  configSchema: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  inputTypes: string[];
  outputTypes: string[];
  supportedProjectTypes: string[];
  requiresContext: boolean;
  implementationPath: string;
}

// Blueprint configuration types
export interface BlueprintNodeConfig {
  id: string;
  componentId: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface BlueprintEdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
}

export interface BlueprintConfig {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  nodes: BlueprintNodeConfig[];
  edges: BlueprintEdgeConfig[];
  createdAt: string;
  updatedAt: string;
}

// Execution types
export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export interface BlueprintExecutionResult {
  executionId: string;
  blueprintId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  nodeResults: Record<string, NodeExecutionResult>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}
