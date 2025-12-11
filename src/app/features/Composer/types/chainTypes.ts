/**
 * Chain Types
 * Type definitions for blueprint chain execution system
 */

// ============================================================================
// Trigger Types
// ============================================================================

export type TriggerType = 'manual' | 'event';

export interface ManualTrigger {
  type: 'manual';
}

export interface EventTrigger {
  type: 'event';
  eventType: string; // Event type to listen for (e.g., 'proposal_accepted', 'scan_completed')
  eventTitle?: string; // Optional: specific event title pattern
  projectId: string; // Which project's events to monitor
}

export type ChainTrigger = ManualTrigger | EventTrigger;

// ============================================================================
// Conditional Branch Types
// ============================================================================

export type ConditionCheckType = 'exists' | 'count_greater_than' | 'latest_within_hours';

export interface EventCondition {
  type: 'event_check';
  eventType: string;
  eventTitle?: string;
  checkType: ConditionCheckType;
  threshold?: number; // For count_greater_than (count) or latest_within_hours (hours)
}

export interface ConditionalBranch {
  id: string;
  name: string; // User-friendly name for the branch
  condition: EventCondition;
  trueChain: string[]; // Blueprint IDs to execute if condition is true
  falseChain: string[]; // Blueprint IDs to execute if condition is false
}

// ============================================================================
// Post-Chain Event
// ============================================================================

export interface PostChainEvent {
  enabled: boolean;
  eventType: string;
  eventTitle: string;
  eventMessage: string;
}

// ============================================================================
// Enhanced ScanChain Type
// ============================================================================

export interface ScanChain {
  id: string;
  name: string;
  description: string;
  blueprints: string[]; // For simple chains without conditionals
  trigger: ChainTrigger;
  conditionalBranches?: ConditionalBranch[]; // Optional: for conditional execution trees
  postChainEvent?: PostChainEvent; // Optional: event to emit after chain completes
  isActive: boolean; // On/off toggle for event listeners (only applies to event-based triggers)
  lastRun?: string; // ISO timestamp of last execution
  runCount: number; // How many times this chain has been executed
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Chain Execution State
// ============================================================================

export type ChainExecutionStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';

export interface ChainExecutionState {
  chainId: string;
  status: ChainExecutionStatus;
  currentBlueprintIndex: number;
  totalBlueprints: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  currentBranch?: 'true' | 'false' | null; // For conditional execution
}

// ============================================================================
// Chain Statistics
// ============================================================================

export interface ChainStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number; // in milliseconds
  lastRunDuration?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a default manual trigger
 */
export function createManualTrigger(): ManualTrigger {
  return { type: 'manual' };
}

/**
 * Create a default event trigger
 */
export function createEventTrigger(projectId: string): EventTrigger {
  return {
    type: 'event',
    eventType: '',
    projectId,
  };
}

/**
 * Create a new chain with defaults
 */
export function createNewChain(
  id: string,
  name: string,
  description: string,
  projectId: string
): ScanChain {
  return {
    id,
    name,
    description,
    blueprints: [],
    trigger: createManualTrigger(),
    isActive: false, // Start disabled for event-based chains
    runCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if a chain can be activated (only event-based chains)
 */
export function canActivateChain(chain: ScanChain): boolean {
  return chain.trigger.type === 'event';
}

/**
 * Check if a chain is ready to run
 */
export function isChainValid(chain: ScanChain): boolean {
  // Must have at least one blueprint or conditional branch
  const hasBlueprints = chain.blueprints.length > 0;
  const hasBranches = chain.conditionalBranches && chain.conditionalBranches.length > 0;

  if (!hasBlueprints && !hasBranches) {
    return false;
  }

  // If event-based trigger, must have eventType
  if (chain.trigger.type === 'event' && !chain.trigger.eventType) {
    return false;
  }

  return true;
}
