/**
 * State Machine Interpreter
 *
 * Executes state machine configurations and manages flow logic
 */

import type {
  StateMachineConfig,
  StateMachineInstance,
  StateMachineState,
  StateMachineTransition,
} from './stateMachineTypes';

/**
 * Create a new state machine instance
 */
export function createStateMachineInstance(
  config: StateMachineConfig,
  projectId: string
): StateMachineInstance {
  const enabledStates = config.states.filter(s => s.enabled);

  return {
    configId: config.id,
    projectId,
    currentState: config.initialState,
    completedStates: [],
    skippedStates: [],
    history: [
      {
        state: config.initialState,
        timestamp: new Date().toISOString(),
      },
    ],
    totalSteps: enabledStates.filter(s => s.type !== 'completion').length,
    completedSteps: 0,
    progress: 0,
    status: 'not-started',
  };
}

/**
 * Get current state definition
 */
export function getCurrentState(
  config: StateMachineConfig,
  instance: StateMachineInstance
): StateMachineState | null {
  return config.states.find(s => s.id === instance.currentState) || null;
}

/**
 * Get available transitions from current state
 */
export function getAvailableTransitions(
  config: StateMachineConfig,
  instance: StateMachineInstance
): StateMachineTransition[] {
  return config.transitions.filter(t => t.fromState === instance.currentState);
}

/**
 * Get next state based on condition
 */
export function getNextState(
  config: StateMachineConfig,
  instance: StateMachineInstance,
  condition: 'accept' | 'reject' | 'skip' | 'always' = 'always'
): StateMachineState | null {
  const transitions = getAvailableTransitions(config, instance);

  // Find transition matching condition
  let transition = transitions.find(
    t => t.condition === condition || t.condition === 'always'
  );

  // If no transition found and condition is not 'always', try 'always' as fallback
  if (!transition && condition !== 'always') {
    transition = transitions.find(t => t.condition === 'always');
  }

  if (!transition) return null;

  return config.states.find(s => s.id === transition.toState) || null;
}

/**
 * Get enabled non-completion states count
 */
function getEnabledStepsCount(config: StateMachineConfig): number {
  return config.states.filter(s => s.enabled && s.type !== 'completion').length;
}

/**
 * Calculate progress percentage
 */
function calculateProgress(completedCount: number, totalCount: number): number {
  return Math.round((completedCount / totalCount) * 100);
}

/**
 * Determine instance status based on completion and current status
 */
function determineStatus(
  isComplete: boolean,
  currentStatus: string
): 'not-started' | 'in-progress' | 'completed' {
  if (isComplete) return 'completed';
  if (currentStatus === 'not-started') return 'in-progress';
  return currentStatus as 'not-started' | 'in-progress' | 'completed';
}

/**
 * Transition to next state
 */
export function transitionToState(
  config: StateMachineConfig,
  instance: StateMachineInstance,
  targetStateId: string,
  transitionId?: string
): StateMachineInstance {
  const targetState = config.states.find(s => s.id === targetStateId);
  if (!targetState) {
    throw new Error(`State ${targetStateId} not found in configuration`);
  }

  // Update completed/skipped states
  const isSkipped = instance.skippedStates.includes(instance.currentState);
  const isCompleted = instance.completedStates.includes(instance.currentState);

  if (!isSkipped && !isCompleted) {
    instance.completedStates.push(instance.currentState);
  }

  // Calculate progress
  const enabledSteps = getEnabledStepsCount(config);
  const completedSteps = instance.completedStates.length;
  const progress = calculateProgress(completedSteps, enabledSteps);

  // Check if onboarding is completed
  const isOnboardingComplete = config.completionStates.includes(targetStateId);
  const status = determineStatus(isOnboardingComplete, instance.status);

  return {
    ...instance,
    currentState: targetStateId,
    completedSteps,
    progress,
    status,
    completedAt: isOnboardingComplete ? new Date().toISOString() : instance.completedAt,
    startedAt: instance.startedAt || new Date().toISOString(),
    history: [
      ...instance.history,
      {
        state: targetStateId,
        timestamp: new Date().toISOString(),
        transition: transitionId,
      },
    ],
  };
}

/**
 * Skip current state and move to next
 */
export function skipState(
  config: StateMachineConfig,
  instance: StateMachineInstance
): StateMachineInstance {
  const nextState = getNextState(config, instance, 'skip');
  if (!nextState) {
    throw new Error('No skip transition available from current state');
  }

  // Add to skipped states
  const skippedStates = [...instance.skippedStates, instance.currentState];

  const updatedInstance = transitionToState(config, instance, nextState.id);
  return {
    ...updatedInstance,
    skippedStates,
  };
}

/**
 * Get ordered list of enabled states
 */
export function getEnabledStates(config: StateMachineConfig): StateMachineState[] {
  return config.states
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get states grouped by technique group
 */
export function getStatesByGroup(
  config: StateMachineConfig
): Map<string, StateMachineState[]> {
  const grouped = new Map<string, StateMachineState[]>();

  config.states.forEach(state => {
    const group = state.group;
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(state);
  });

  // Sort states within each group by order
  grouped.forEach(states => {
    states.sort((a, b) => a.order - b.order);
  });

  return grouped;
}

/**
 * Validate state machine configuration
 */
export function validateStateMachine(config: StateMachineConfig): string[] {
  const errors: string[] = [];

  // Check initial state exists
  if (!config.states.find(s => s.id === config.initialState)) {
    errors.push(`Initial state "${config.initialState}" not found`);
  }

  // Check completion states exist
  config.completionStates.forEach(cs => {
    if (!config.states.find(s => s.id === cs)) {
      errors.push(`Completion state "${cs}" not found`);
    }
  });

  // Check all transitions reference valid states
  config.transitions.forEach(t => {
    if (!config.states.find(s => s.id === t.fromState)) {
      errors.push(`Transition ${t.id}: fromState "${t.fromState}" not found`);
    }
    if (!config.states.find(s => s.id === t.toState)) {
      errors.push(`Transition ${t.id}: toState "${t.toState}" not found`);
    }
  });

  // Check for duplicate state IDs
  const stateIds = config.states.map(s => s.id);
  const duplicates = stateIds.filter((id, index) => stateIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate state IDs: ${duplicates.join(', ')}`);
  }

  // Check for unreachable states
  const reachableStates = new Set<string>([config.initialState]);
  const queue = [config.initialState];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const transitions = config.transitions.filter(t => t.fromState === current);

    transitions.forEach(t => {
      if (!reachableStates.has(t.toState)) {
        reachableStates.add(t.toState);
        queue.push(t.toState);
      }
    });
  }

  const enabledStates = config.states.filter(s => s.enabled);
  const unreachable = enabledStates.filter(s => !reachableStates.has(s.id));

  if (unreachable.length > 0) {
    errors.push(
      `Unreachable states: ${unreachable.map(s => s.id).join(', ')}`
    );
  }

  return errors;
}

/**
 * Get progress summary
 */
export function getProgressSummary(
  config: StateMachineConfig,
  instance: StateMachineInstance
): {
  total: number;
  completed: number;
  skipped: number;
  remaining: number;
  percentComplete: number;
} {
  const enabledStates = config.states.filter(
    s => s.enabled && s.type !== 'completion'
  );

  const total = enabledStates.length;
  const completed = instance.completedStates.filter(id =>
    enabledStates.some(s => s.id === id)
  ).length;
  const skipped = instance.skippedStates.filter(id =>
    enabledStates.some(s => s.id === id)
  ).length;
  const remaining = total - completed - skipped;

  return {
    total,
    completed,
    skipped,
    remaining,
    percentComplete: instance.progress,
  };
}
