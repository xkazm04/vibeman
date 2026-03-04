/**
 * Canonical Signal Type Definitions
 * Single source of truth for all signal types across the application.
 *
 * This enum and metadata are used by:
 * - API validation (signals/route.ts)
 * - Database repositories
 * - Canvas visualization
 * - Signal mappers and collectors
 */

/**
 * All possible behavioral signal types in the system
 */
export enum SignalType {
  GIT_ACTIVITY = 'git_activity',
  API_FOCUS = 'api_focus',
  CONTEXT_FOCUS = 'context_focus',
  IMPLEMENTATION = 'implementation',
  CROSS_TASK_ANALYSIS = 'cross_task_analysis',
  CROSS_TASK_SELECTION = 'cross_task_selection',
  CLI_MEMORY = 'cli_memory',
}

/**
 * Metadata for each signal type
 */
export interface SignalTypeMetadata {
  /** Display name for UI */
  displayName: string;
  /** Short label for compact views */
  shortLabel: string;
  /** Color for visualization */
  color: string;
  /** Whether this signal can be visualized on the canvas */
  canVisualize: boolean;
  /** Description of what this signal tracks */
  description: string;
}

/**
 * Complete metadata registry for all signal types
 */
export const SIGNAL_METADATA: Record<SignalType, SignalTypeMetadata> = {
  [SignalType.GIT_ACTIVITY]: {
    displayName: 'Git Activity',
    shortLabel: 'Git',
    color: '#10b981', // green
    canVisualize: true,
    description: 'Tracks git commits, file changes, and repository activity',
  },
  [SignalType.API_FOCUS]: {
    displayName: 'API Focus',
    shortLabel: 'API',
    color: '#3b82f6', // blue
    canVisualize: true,
    description: 'Tracks API endpoint usage and performance',
  },
  [SignalType.CONTEXT_FOCUS]: {
    displayName: 'Context Focus',
    shortLabel: 'Context',
    color: '#a855f7', // purple
    canVisualize: true,
    description: 'Tracks time spent and actions in different contexts',
  },
  [SignalType.IMPLEMENTATION]: {
    displayName: 'Implementation',
    shortLabel: 'Impl',
    color: '#f59e0b', // orange
    canVisualize: true,
    description: 'Tracks requirement implementation outcomes',
  },
  [SignalType.CROSS_TASK_ANALYSIS]: {
    displayName: 'Cross-Task Analysis',
    shortLabel: 'Analysis',
    color: '#8b5cf6', // violet
    canVisualize: false,
    description: 'Tracks multi-project analysis activities',
  },
  [SignalType.CROSS_TASK_SELECTION]: {
    displayName: 'Cross-Task Selection',
    shortLabel: 'Selection',
    color: '#ec4899', // pink
    canVisualize: false,
    description: 'Tracks plan selection in cross-task workflows',
  },
  [SignalType.CLI_MEMORY]: {
    displayName: 'CLI Memory',
    shortLabel: 'Memory',
    color: '#14b8a6', // teal
    canVisualize: false,
    description: 'Tracks insights and decisions from CLI sessions',
  },
};

/**
 * Type-safe union of signal type values
 */
export type BehavioralSignalType = `${SignalType}`;

/**
 * Get all signal types
 */
export function getAllSignalTypes(): BehavioralSignalType[] {
  return Object.values(SignalType);
}

/**
 * Get only visualizable signal types
 */
export function getVisualizableSignalTypes(): BehavioralSignalType[] {
  return Object.entries(SIGNAL_METADATA)
    .filter(([, meta]) => meta.canVisualize)
    .map(([type]) => type as BehavioralSignalType);
}

/**
 * Check if a signal type can be visualized
 */
export function canVisualizeSignal(type: BehavioralSignalType): boolean {
  return SIGNAL_METADATA[type as SignalType]?.canVisualize ?? false;
}

/**
 * Get metadata for a signal type
 */
export function getSignalMetadata(type: BehavioralSignalType): SignalTypeMetadata | undefined {
  return SIGNAL_METADATA[type as SignalType];
}

/**
 * Validate if a string is a valid signal type
 */
export function isValidSignalType(value: unknown): value is BehavioralSignalType {
  return typeof value === 'string' && Object.values(SignalType).includes(value as SignalType);
}
