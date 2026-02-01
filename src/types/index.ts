// Idea Category Types
export type { IdeaCategory } from './ideaCategory';
export { IDEA_CATEGORIES, isStandardCategory, getStandardCategories } from './ideaCategory';

// ============================================================================
// Rich Progress Types
// ============================================================================

/**
 * Rich Progress State - Multi-dimensional status model for long-running operations
 *
 * Standardizes progress tracking across Vibeman:
 * - percentage: 0-100 for visual progress bars
 * - message: human-readable context for current activity
 * - currentStep: current phase identifier for step indicators
 * - totalSteps: total phases for completion estimation
 * - startedAt: for elapsed time and ETA calculations
 *
 * Usage patterns:
 * - Scans: Initialize → Gather Files → Execute Scan → Process Results → Complete
 * - Requirement Execution: Create → Queue → Execute → Poll → Complete
 * - Idea Generation: Analyze → Generate → Evaluate → Filter → Complete
 */
export interface RichProgress {
  /** Percentage complete (0-100). Use for progress bars. */
  percentage: number;
  /** Human-readable message describing current activity */
  message: string;
  /** Current step identifier (e.g., 'gather_files', 'execute_scan') */
  currentStep?: string;
  /** Total number of steps for phase indicators */
  totalSteps?: number;
  /** Step number (1-indexed) for "Step X of Y" display */
  stepNumber?: number;
  /** When the operation started (ISO string or timestamp) */
  startedAt?: string | number;
}

/**
 * Progress callback signature used across the system
 *
 * @example
 * const onProgress: ProgressCallback = (progress) => {
 *   console.log(`${progress.percentage}% - ${progress.message}`);
 * };
 */
export type ProgressCallback = (progress: RichProgress) => void;

/**
 * Simple progress callback for backward compatibility
 * Used by LLMProgress and PipelineConfig
 */
export type SimpleProgressCallback = (percentage: number, message?: string) => void;

/**
 * Helper to convert simple progress to RichProgress
 */
export function toRichProgress(
  percentage: number,
  message?: string,
  step?: { current: string; number: number; total: number }
): RichProgress {
  return {
    percentage,
    message: message || '',
    currentStep: step?.current,
    stepNumber: step?.number,
    totalSteps: step?.total,
  };
}

/**
 * Helper to create a RichProgress with step info
 */
export function createStepProgress(
  stepNumber: number,
  totalSteps: number,
  stepName: string,
  message: string,
  startedAt?: string | number
): RichProgress {
  // Calculate percentage based on step completion
  // Each step starts at (stepNumber-1)/totalSteps and ends at stepNumber/totalSteps
  const percentage = Math.round(((stepNumber - 1) / totalSteps) * 100);

  return {
    percentage,
    message,
    currentStep: stepName,
    stepNumber,
    totalSteps,
    startedAt,
  };
}

/**
 * Estimated time remaining calculator
 * Returns null if not enough data or elapsed time too short
 */
export function estimateTimeRemaining(progress: RichProgress): number | null {
  if (!progress.startedAt || progress.percentage <= 0 || progress.percentage >= 100) {
    return null;
  }

  const startTime = typeof progress.startedAt === 'string'
    ? new Date(progress.startedAt).getTime()
    : progress.startedAt;

  const elapsed = Date.now() - startTime;

  // Need at least 5 seconds of data for meaningful estimate
  if (elapsed < 5000) {
    return null;
  }

  const rate = progress.percentage / elapsed;
  const remaining = (100 - progress.percentage) / rate;

  return Math.round(remaining);
}

// Project types for framework detection
export type ProjectType =
  | 'nextjs'
  | 'react'
  | 'express'
  | 'fastapi'
  | 'django'
  | 'rails'
  | 'generic'
  | 'combined';

export interface Project {
  id: string;
  name: string;
  path: string;
  port?: number | null; // Optional - not needed for all project types
  workspaceId?: string | null; // Workspace this project belongs to
  description?: string;
  type?: ProjectType;
  relatedProjectId?: string; // For FastAPI projects connected to NextJS
  allowMultipleInstances?: boolean;
  basePort?: number;
  instanceOf?: string;
  git?: {
    repository: string; // e.g., "owner/repo" or full GitHub URL
    branch: string; // e.g., "main", "develop"
    autoSync?: boolean; // Auto-pull on start
  };
  runScript?: string;
}

export interface ProcessInfo {
  pid: number;
  port: number;
  status: 'running' | 'stopped' | 'error' | 'stopping';
  startTime?: Date;
  logs: string[];
}

export interface ProjectInstance {
  project: Project;
  status: ProcessInfo | null;
}

export interface GitStatus {
  hasChanges: boolean;
  ahead: number;
  behind: number;
  currentBranch: string;
  lastFetch?: Date;
  error?: string;
}

// AI Agentic UI Types
export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  description: string;
  detailedDescription: string;
  children?: TreeNode[];
  path: string; // File path - always present for unified path handling
}

export interface ImpactedFile {
  filepath: string;
  type: 'update' | 'create' | 'delete';
}

export interface BacklogProposal {
  id: string;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  steps?: string[]; // Array of implementation steps
  impactedFiles?: ImpactedFile[]; // Array of file objects with filepath and type
}

export interface CustomBacklogItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  type: 'custom';
  steps?: string[]; // Array of implementation steps
  impactedFiles?: ImpactedFile[]; // Array of file objects with filepath and type
}

export interface EventLogEntry {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  timestamp: Date;
  agent?: string;
  message?: string;
  rawMessage?: string; // For modal display of full event data
}

export interface AppState {
  activeTab: string;
  activeAgents: Set<string>;
  selectedNodes: Set<string>;
  highlightedNodes: Set<string>; // New: nodes highlighted by backlog items
  eventLog: EventLogEntry[];
  backlogProposals: BacklogProposal[];
  inProgressProposals: BacklogProposal[]; // New: accepted proposals in progress
  customBacklogItems: CustomBacklogItem[];
}

/**
 * Frontend Goal type (camelCase properties)
 *
 * NAMING CONVENTION - order field mapping:
 * - Frontend: `order` (this interface)
 * - API requests: `orderIndex` (CreateGoalRequest, UpdateGoalRequest in goalQueries.ts)
 * - Database: `order_index` (DbGoal in types.ts)
 *
 * The mapping chain:
 * 1. Component uses `goal.order`
 * 2. GoalContext maps `order` → `orderIndex` when calling API
 * 3. API route maps `orderIndex` → `order_index` when saving to DB
 * 4. goalQueries.ts maps `order_index` → `order` when fetching from API
 */
export interface Goal {
  id: string;
  projectId: string;
  contextId?: string; // Optional context association
  /** Display order. Maps to `orderIndex` in API requests and `order_index` in database. */
  order: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  // Extended fields
  progress?: number;
  targetDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  githubItemId?: string | null;
  // Database fields (optional for compatibility)
  created_at?: string;
  updated_at?: string;
}

export interface AppStore extends AppState {
  setActiveTab: (tabId: string) => void;
  toggleAgent: (agentId: string) => void;
  toggleNode: (nodeId: string) => void;
  toggleNodeWithFolder: (nodeId: string, fileStructure: TreeNode | null) => void; // Enhanced toggle with folder support
  highlightNodes: (nodeIds: string[]) => void; // Highlight specific nodes
  clearHighlights: () => void; // Clear all highlights
  clearSelection: () => void; // Clear all selected nodes
  selectPaths: (filePaths: string[], fileStructure: TreeNode | null) => void; // Unified path-based selection API
  addEvent: (event: EventLogEntry) => void;
  acceptProposal: (proposalId: string) => void;
  rejectProposal: (proposalId: string) => void;
  addCustomBacklogItem: (item: CustomBacklogItem) => void;
  moveToInProgress: (proposalId: string) => void; // Move accepted proposals to in-progress
  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null) => string[]; // Get selected file paths
}

/**
 * Database Goal type (snake_case properties)
 *
 * This mirrors the database schema. For frontend usage, use the `Goal` type instead.
 * See `Goal` interface for the naming convention documentation.
 */
export interface DatabaseGoal {
  id: string;
  project_id: string;
  /** Database column for ordering. Maps to `order` in frontend Goal type. */
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  created_at: string;
  updated_at: string;
}

export interface DatabaseBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  type: 'proposal' | 'custom';
  impacted_files: ImpactedFile[] | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}