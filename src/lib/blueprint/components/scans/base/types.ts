/**
 * Scan Component Types
 * Core type definitions for the Blueprint scan system
 */

import { ValidationResult } from '../../../types';

/**
 * Execution modes for scans
 */
export type ScanExecutionMode =
  | 'fire-and-forget'    // Queue and return immediately (TaskRunner integration)
  | 'polling'            // Wait for completion (max 10 min)
  | 'direct'             // Direct API call, no requirement file created
  | 'streaming';         // Stream response handling

/**
 * Scan categories for organization
 */
export type ScanCategory =
  | 'project'            // Project-level scans (build, vision, unused)
  | 'context'            // Context-specific scans (review, photo, test)
  | 'batch';             // Batch processing scans (contexts, screen-coverage)

/**
 * Base configuration for all scans
 */
export interface ScanConfig {
  projectId: string;
  projectPath: string;
  projectType?: string;
  projectName?: string;
  projectPort?: number;
  contextId?: string;        // For context-specific scans
  onProgress?: (progress: number, message?: string) => void;
  onLog?: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void;
}

/**
 * Result from scan execution
 */
export interface ScanResult<TData = unknown> {
  success: boolean;
  error?: string;
  data?: TData;
  requirementPath?: string;
  taskId?: string;
  completedAt?: string;
}

/**
 * Decision severity levels
 */
export type DecisionSeverity = 'info' | 'warning' | 'error';

/**
 * Decision data for UI presentation
 */
export interface DecisionData<TData = unknown> {
  type: string;
  title: string;
  description: string;
  severity: DecisionSeverity;
  count?: number;
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: TData;
  customContent?: React.ComponentType<{ data: TData; onAction: (action: string) => void }>;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>;
}

/**
 * Scan component definition for registry
 */
export interface ScanComponentDefinition {
  id: string;
  name: string;
  description: string;
  category: ScanCategory;
  executionMode: ScanExecutionMode;
  requiresContext: boolean;
  supportedProjectTypes: string[];  // ['nextjs', 'fastapi', '*']
  icon?: string;
  color?: string;
  tags?: string[];
}

/**
 * Context for scan execution
 */
export interface ScanExecutionContext {
  executionId: string;
  projectId: string;
  projectPath: string;
  projectType: string;
  projectName?: string;
  projectPort?: number;
  contextId?: string;
  contextName?: string;
  isCancelled: () => boolean;
  onCancel: (callback: () => void) => void;
}

/**
 * Batch scan configuration
 */
export interface BatchScanConfig extends ScanConfig {
  items: BatchScanItem[];
  batchId?: string;
  batchName?: string;
}

/**
 * Individual item in a batch scan
 */
export interface BatchScanItem {
  id: string;
  name: string;
  path?: string;
  selected?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Batch scan result
 */
export interface BatchScanResult {
  success: boolean;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  tasks: Array<{
    itemId: string;
    taskId?: string;
    requirementPath?: string;
    error?: string;
  }>;
}
