/**
 * State Machine Types for Onboarding Flow
 *
 * This module defines a finite state machine for the onboarding wizard where:
 * - Each state represents a scan step or action
 * - Transitions define decision outcomes and flow logic
 * - Configurations are per-project-type and fully customizable
 */

import type { LucideIcon } from 'lucide-react';
import type { ScanHandler } from './blueprintConfig';

/**
 * Scan technique grouping for modular configuration
 */
export type TechniqueGroup =
  | 'project-structure'    // Vision, Contexts
  | 'code-analysis'        // Structure, Build, Unused
  | 'quality-assurance'    // Photo, Selectors
  | 'automation'           // Prototype, Tasker, Fix
  | 'custom';              // User-defined techniques

/**
 * Project type for technique filtering
 */
export type ProjectType = 'nextjs' | 'react' | 'fastapi' | 'python' | 'other';

/**
 * State in the state machine
 */
export interface StateMachineState {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';

  // State type
  type: 'scan' | 'navigate' | 'decision' | 'completion';

  // Technique grouping
  group: TechniqueGroup;

  // Enabled state (can be toggled per project type)
  enabled: boolean;

  // Order in the flow
  order: number;

  // Scan configuration (for scan states)
  scanHandler?: ScanHandler;
  eventTitle?: string;
  contextNeeded?: boolean;

  // Navigation target (for navigate states)
  navigationTarget?: 'ideas' | 'tinder' | 'tasker' | 'reflector';

  // Metadata
  estimatedTime?: string; // e.g., "2-5 min"
  requiredForCompletion?: boolean; // Must complete to finish onboarding
}

/**
 * Transition between states
 */
export interface StateMachineTransition {
  id: string;
  fromState: string;
  toState: string;
  condition?: 'accept' | 'reject' | 'skip' | 'always';
  label?: string;
}

/**
 * Complete state machine configuration
 */
export interface StateMachineConfig {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  version: string; // For migration support

  // States and transitions
  states: StateMachineState[];
  transitions: StateMachineTransition[];

  // Flow configuration
  initialState: string;
  completionStates: string[]; // States that mark onboarding as complete

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Runtime state machine instance
 */
export interface StateMachineInstance {
  configId: string;
  projectId: string;
  currentState: string;
  completedStates: string[];
  skippedStates: string[];
  history: {
    state: string;
    timestamp: string;
    transition?: string;
  }[];

  // Progress tracking
  totalSteps: number;
  completedSteps: number;
  progress: number; // 0-100

  // Status
  status: 'not-started' | 'in-progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
}

/**
 * Technique group definition with metadata
 */
export interface TechniqueGroupDefinition {
  id: TechniqueGroup;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  defaultEnabled: boolean;
  applicableProjectTypes: ProjectType[];
}

/**
 * State machine editor actions
 */
export type StateMachineEditorAction =
  | { type: 'TOGGLE_STATE'; stateId: string }
  | { type: 'REORDER_STATE'; stateId: string; newOrder: number }
  | { type: 'TOGGLE_GROUP'; group: TechniqueGroup }
  | { type: 'ADD_STATE'; state: StateMachineState }
  | { type: 'REMOVE_STATE'; stateId: string }
  | { type: 'ADD_TRANSITION'; transition: StateMachineTransition }
  | { type: 'REMOVE_TRANSITION'; transitionId: string }
  | { type: 'SET_INITIAL_STATE'; stateId: string }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'LOAD_CONFIG'; config: StateMachineConfig };

/**
 * State machine editor state
 */
export interface StateMachineEditorState {
  config: StateMachineConfig;
  isDirty: boolean;
  validationErrors: string[];
}
