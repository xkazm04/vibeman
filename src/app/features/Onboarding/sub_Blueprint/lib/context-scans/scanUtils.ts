/**
 * Shared utilities for Blueprint context scans
 * Reduces code duplication across scan modules
 */

import type React from 'react';

// ============================================================================
// Shared Interfaces
// ============================================================================

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: Record<string, unknown>;
  customContent?: React.ReactNode;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export interface ImplementationLog {
  id: string;
  requirement_name: string;
  title: string;
  overview: string;
  created_at: string;
}

// ============================================================================
// Shared Constants
// ============================================================================

/** Default project port if not specified */
export const DEFAULT_PROJECT_PORT = 3000;

/** Progress update constants */
export const PROGRESS = {
  INITIAL: 10,
  CONTEXT_FETCHED: 30,
  FILE_PATHS_PARSED: 50,
  LOGS_FETCHED: 70,
  COMPLETE: 100,
} as const;

/** File count thresholds */
export const FILE_THRESHOLDS = {
  LARGE: 20,
  MEDIUM: 10,
  SMALL: 5,
} as const;

/** Untested logs thresholds */
export const UNTESTED_LOGS_THRESHOLDS = {
  HIGH: 5,
  MEDIUM: 3,
} as const;

// ============================================================================
// Shared API Functions
// ============================================================================

/**
 * Fetch context details from database
 */
export async function fetchContextDetails(contextId: string, projectId: string) {
  const response = await fetch(`/api/contexts/detail?contextId=${contextId}&projectId=${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch context details: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch context details');
  }

  return result.data;
}

/**
 * Fetch untested implementation logs for a context
 */
export async function fetchUntestedLogs(contextId: string): Promise<ImplementationLog[]> {
  const response = await fetch(`/api/implementation-logs/untested?contextId=${contextId}`);

  if (!response.ok) {
    console.warn('Failed to fetch untested logs, continuing without them');
    return [];
  }

  const result = await response.json();
  return result.success ? result.data : [];
}

/**
 * Fetch test scenarios for a context
 */
export async function fetchTestScenarios(contextId: string) {
  const response = await fetch(`/api/test-case-scenarios?contextId=${contextId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch test scenarios: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch test scenarios');
  }

  return result.scenarios || [];
}

/**
 * Fetch test steps for a scenario
 */
export async function fetchTestSteps(scenarioId: string) {
  const response = await fetch(`/api/test-case-steps?scenarioId=${scenarioId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch test steps: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch test steps');
  }

  return result.steps || [];
}

// ============================================================================
// Shared Utility Functions
// ============================================================================

/**
 * Parse file paths from context data
 * Handles both string and array formats
 */
export function parseFilePaths(context: { file_paths?: string | string[]; filePaths?: string[] }): string[] {
  // API returns filePaths in camelCase if already parsed
  if (Array.isArray(context.filePaths)) {
    return context.filePaths;
  }

  // Legacy format uses snake_case with JSON string
  if (typeof context.file_paths === 'string') {
    try {
      return JSON.parse(context.file_paths);
    } catch {
      return [];
    }
  }

  if (Array.isArray(context.file_paths)) {
    return context.file_paths;
  }

  return [];
}

/**
 * Format date string safely
 */
export function formatDateSafe(
  dateInput: Date | string | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!dateInput) return 'Unknown';

  try {
    const dateStr = dateInput instanceof Date
      ? dateInput.toISOString()
      : String(dateInput);

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }

    return date.toLocaleDateString('en-US', options);
  } catch {
    return 'Unknown';
  }
}

/**
 * Create a requirement file without executing
 */
export async function createRequirementFile(
  projectPath: string,
  requirementName: string,
  content: string,
  overwrite = true
): Promise<{ requirementName: string; requirementPath: string }> {
  const response = await fetch('/api/claude-code/requirement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectPath,
      requirementName,
      content,
      overwrite,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create requirement file');
  }

  return {
    requirementName,
    requirementPath: result.filePath,
  };
}

/**
 * Create a blueprint event
 */
export async function createBlueprintEvent(
  projectId: string,
  title: string,
  description: string,
  type: 'info' | 'success' | 'warning' | 'error',
  message?: string,
  contextId?: string
): Promise<void> {
  await fetch('/api/blueprint/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      title,
      description,
      type,
      agent: 'blueprint',
      message,
      context_id: contextId,
    }),
  });
}

/**
 * Build error decision data
 */
export function buildErrorDecision(
  type: string,
  title: string,
  error: string | undefined,
  projectId: string,
  projectPath: string
): DecisionData {
  return {
    type,
    title,
    description: `An error occurred:\n\n${error || 'Unknown error'}\n\nPlease check the console for more details.`,
    severity: 'error',
    projectId,
    projectPath,
    data: { error },
    onAccept: async () => {},
    onReject: async () => {},
  };
}

/**
 * Determine severity based on file count and other metrics
 */
export function determineSeverity(
  fileCount: number,
  untestedLogsCount = 0
): 'info' | 'warning' | 'error' {
  const hasLargeFileCount = fileCount > FILE_THRESHOLDS.LARGE;
  const hasMediumFileCount = fileCount > FILE_THRESHOLDS.MEDIUM;
  const hasHighUntestedLogs = untestedLogsCount > UNTESTED_LOGS_THRESHOLDS.HIGH;
  const hasUntestedLogs = untestedLogsCount > 0;

  if (hasLargeFileCount || hasHighUntestedLogs) return 'warning';
  if (hasMediumFileCount || hasUntestedLogs) return 'info';
  return 'info';
}

/**
 * Check if a project is active
 */
export function validateActiveProject(activeProject: { id: string; path: string } | null): activeProject is { id: string; path: string } {
  return activeProject !== null && Boolean(activeProject.id) && Boolean(activeProject.path);
}

/**
 * Build a task ID from project and requirement name
 */
export function buildTaskId(projectId: string, requirementName: string): string {
  return `${projectId}:${requirementName}`;
}

/**
 * Sanitize a name for use as a requirement filename
 */
export function sanitizeRequirementName(name: string, prefix: string): string {
  return `${prefix}-${name.toLowerCase().replace(/\s+/g, '-')}`;
}
