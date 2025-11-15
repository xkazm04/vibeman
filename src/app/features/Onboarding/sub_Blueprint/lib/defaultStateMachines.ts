/**
 * Default state machine configurations for different project types
 */

import {
  Eye,
  Layers,
  Box,
  Hammer,
  Trash2,
  Sparkles,
  Code,
  Bug,
  Camera,
  Target,
  FlaskConical,
  Scissors,
  FileEdit,
  type LucideIcon,
} from 'lucide-react';
import type {
  StateMachineConfig,
  TechniqueGroupDefinition,
  StateMachineState,
  StateMachineTransition,
} from './stateMachineTypes';
import * as structureScan from './context-scans/blueprintStructureScan';
import * as photoScan from './context-scans/blueprintPhotoScan';
import * as visionScan from './blueprintVisionScan';
import * as contextsScan from './blueprintContextsScan';
import * as buildScan from './blueprintBuildScan';
import * as selectorsScan from './blueprintSelectorsScan';
import * as unusedScan from './blueprintUnusedScan';
import * as testScan from './context-scans/blueprintTestScan';
import * as separatorScan from './context-scans/blueprintSeparatorScan';
import * as testDesignScan from './context-scans/blueprintTestDesign';

/**
 * Helper type for state creation
 */
type StateConfig = Partial<StateMachineState> & {
  id: string;
  label: string;
  description: string;
};

/**
 * Create a scan state with common defaults
 */
function createScanState(config: StateConfig): StateMachineState {
  return {
    type: 'scan',
    enabled: true,
    color: 'blue',
    icon: Box,
    group: 'code-analysis',
    ...config,
  } as StateMachineState;
}

/**
 * Create a navigate state with common defaults
 */
function createNavigateState(config: StateConfig): StateMachineState {
  return {
    type: 'navigate',
    enabled: false,
    group: 'automation',
    navigationTarget: 'tasker',
    estimatedTime: '1 min',
    ...config,
  } as StateMachineState;
}

/**
 * Create a completion state
 */
function createCompletionState(order: number = 99): StateMachineState {
  return {
    id: 'completed',
    label: 'Completed',
    description: 'Onboarding completed successfully',
    icon: Sparkles,
    color: 'green',
    type: 'completion',
    group: 'custom',
    enabled: true,
    order,
  };
}

/**
 * Create a linear transition chain
 */
function createLinearTransitions(stateIds: string[]): StateMachineTransition[] {
  const transitions: StateMachineTransition[] = [];
  for (let i = 0; i < stateIds.length - 1; i++) {
    transitions.push({
      id: `t${transitions.length + 1}`,
      fromState: stateIds[i],
      toState: stateIds[i + 1],
      condition: 'always',
    });
  }
  return transitions;
}

/**
 * Technique group definitions
 */
export const TECHNIQUE_GROUPS: TechniqueGroupDefinition[] = [
  {
    id: 'project-structure',
    label: 'Project Structure',
    description: 'Analyze project vision, contexts, and organization',
    icon: Eye,
    color: 'cyan',
    defaultEnabled: true,
    applicableProjectTypes: ['nextjs', 'react', 'fastapi', 'python', 'other'],
  },
  {
    id: 'code-analysis',
    label: 'Code Analysis',
    description: 'Scan code structure, build configuration, and unused code',
    icon: Box,
    color: 'blue',
    defaultEnabled: true,
    applicableProjectTypes: ['nextjs', 'react', 'fastapi', 'python', 'other'],
  },
  {
    id: 'quality-assurance',
    label: 'Quality Assurance',
    description: 'Test coverage analysis and selector validation',
    icon: Camera,
    color: 'pink',
    defaultEnabled: true,
    applicableProjectTypes: ['nextjs', 'react'],
  },
  {
    id: 'automation',
    label: 'Automation',
    description: 'Automated code generation and task execution',
    icon: Sparkles,
    color: 'green',
    defaultEnabled: false,
    applicableProjectTypes: ['nextjs', 'react', 'fastapi', 'python', 'other'],
  },
];

/**
 * Default state machine for Next.js/React projects
 */
export const DEFAULT_NEXTJS_STATE_MACHINE: StateMachineConfig = {
  id: 'default-nextjs',
  name: 'Next.js Onboarding Flow',
  description: 'Complete onboarding wizard for Next.js projects',
  projectType: 'nextjs',
  version: '1.0.0',
  initialState: 'vision',
  completionStates: ['completed'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  states: [
    // Project Structure Group
    createScanState({
      id: 'vision',
      label: 'Vision',
      description: 'Define project vision and goals',
      icon: Eye,
      color: 'cyan',
      group: 'project-structure',
      order: 1,
      eventTitle: 'Vision Scan Completed',
      estimatedTime: '2-3 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: visionScan.executeVisionScan,
        buildDecision: visionScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'contexts',
      label: 'Contexts',
      description: 'Identify and document code contexts',
      icon: Layers,
      color: 'blue',
      group: 'project-structure',
      order: 2,
      eventTitle: 'Contexts Scan Completed',
      estimatedTime: '3-5 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: contextsScan.executeContextsScan,
        buildDecision: contextsScan.buildDecisionData,
      },
    }),

    // Code Analysis Group
    createScanState({
      id: 'structure',
      label: 'Structure',
      description: 'Analyze project structure and architecture',
      icon: Box,
      color: 'blue',
      group: 'code-analysis',
      order: 3,
      eventTitle: 'Structure Scan Completed',
      estimatedTime: '2-4 min',
      scanHandler: {
        execute: structureScan.executeStructureScan,
        buildDecision: structureScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'build',
      label: 'Build',
      description: 'Check build configuration and dependencies',
      icon: Hammer,
      color: 'indigo',
      group: 'code-analysis',
      order: 4,
      eventTitle: 'Build Scan Completed',
      estimatedTime: '1-2 min',
      scanHandler: {
        execute: buildScan.executeBuildScan,
        buildDecision: buildScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'unused',
      label: 'Unused',
      description: 'Find unused code and dependencies',
      icon: Trash2,
      color: 'red',
      group: 'code-analysis',
      order: 5,
      eventTitle: 'Unused Code Scan Completed',
      estimatedTime: '2-3 min',
      scanHandler: {
        execute: unusedScan.executeUnusedScan,
        buildDecision: unusedScan.buildDecisionData,
      },
    }),

    // Quality Assurance Group
    createScanState({
      id: 'photo',
      label: 'Photo',
      description: 'Visual regression testing setup',
      icon: Camera,
      color: 'pink',
      group: 'quality-assurance',
      order: 6,
      eventTitle: 'Photo Scan Completed',
      contextNeeded: true,
      estimatedTime: '3-5 min',
      scanHandler: {
        execute: photoScan.executePhotoScan,
        buildDecision: photoScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'selectors',
      label: 'Selectors',
      description: 'Validate test selectors and coverage',
      icon: Target,
      color: 'cyan',
      group: 'quality-assurance',
      order: 7,
      eventTitle: 'Selectors Scan Completed',
      contextNeeded: true,
      estimatedTime: '2-3 min',
      scanHandler: {
        execute: async () => ({
          success: false,
          error: 'Context ID is required for this scan',
        }),
        buildDecision: selectorsScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'test',
      label: 'Test',
      description: 'Generate and run Playwright tests',
      icon: FlaskConical,
      color: 'green',
      group: 'quality-assurance',
      order: 8,
      eventTitle: 'Test Scan Completed',
      contextNeeded: true,
      estimatedTime: '5-10 min',
      scanHandler: {
        execute: async () => ({
          success: false,
          error: 'Context ID is required for this scan',
        }),
        buildDecision: testScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'testDesign',
      label: 'Test Design',
      description: 'Design and generate test scenarios for comprehensive coverage',
      icon: FileEdit,
      color: 'yellow',
      group: 'quality-assurance',
      order: 9,
      eventTitle: 'Test Design Scan Completed',
      contextNeeded: true,
      estimatedTime: '4-6 min',
      scanHandler: {
        execute: testDesignScan.executeTestDesignScan,
        buildDecision: testDesignScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'separator',
      label: 'Separator',
      description: 'Intelligently separate contexts into smaller, focused units',
      icon: Scissors,
      color: 'purple',
      group: 'quality-assurance',
      order: 10,
      eventTitle: 'Separator Scan Completed',
      contextNeeded: true,
      estimatedTime: '3-5 min',
      scanHandler: {
        execute: separatorScan.executeSeparatorScan,
        buildDecision: separatorScan.buildDecisionData,
      },
    }),

    // Automation Group
    createNavigateState({
      id: 'prototype',
      label: 'Prototype',
      description: 'Navigate to prototyping tools',
      icon: Sparkles,
      color: 'green',
      order: 9,
    }),
    createNavigateState({
      id: 'tasker',
      label: 'Tasker',
      description: 'Navigate to task automation',
      icon: Code,
      color: 'cyan',
      order: 10,
    }),
    createNavigateState({
      id: 'fix',
      label: 'Fix',
      description: 'Navigate to bug fixing tools',
      icon: Bug,
      color: 'red',
      order: 11,
    }),

    // Completion state
    createCompletionState(),
  ],

  transitions: [
    ...createLinearTransitions([
      'vision',
      'contexts',
      'structure',
      'build',
      'unused',
      'photo',
      'selectors',
      'test',
      'separator',
      'prototype',
      'tasker',
      'fix',
      'completed',
    ]),
    // Add skip transition from separator to completed
    { id: 't13', fromState: 'separator', toState: 'completed', condition: 'skip' },
  ],
};

/**
 * Default state machine for FastAPI/Python projects
 */
export const DEFAULT_FASTAPI_STATE_MACHINE: StateMachineConfig = {
  id: 'default-fastapi',
  name: 'FastAPI Onboarding Flow',
  description: 'Complete onboarding wizard for FastAPI projects',
  projectType: 'fastapi',
  version: '1.0.0',
  initialState: 'vision',
  completionStates: ['completed'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  states: [
    // Project Structure Group
    createScanState({
      id: 'vision',
      label: 'Vision',
      description: 'Define project vision and goals',
      icon: Eye,
      color: 'cyan',
      group: 'project-structure',
      order: 1,
      eventTitle: 'Vision Scan Completed',
      estimatedTime: '2-3 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: visionScan.executeVisionScan,
        buildDecision: visionScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'contexts',
      label: 'Contexts',
      description: 'Identify and document code contexts',
      icon: Layers,
      color: 'blue',
      group: 'project-structure',
      order: 2,
      eventTitle: 'Contexts Scan Completed',
      estimatedTime: '3-5 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: contextsScan.executeContextsScan,
        buildDecision: contextsScan.buildDecisionData,
      },
    }),

    // Code Analysis Group (adjusted for Python)
    createScanState({
      id: 'structure',
      label: 'Structure',
      description: 'Analyze project structure and architecture',
      icon: Box,
      color: 'blue',
      group: 'code-analysis',
      order: 3,
      eventTitle: 'Structure Scan Completed',
      estimatedTime: '2-4 min',
      scanHandler: {
        execute: structureScan.executeStructureScan,
        buildDecision: structureScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'build',
      label: 'Dependencies',
      description: 'Check requirements.txt and dependencies',
      icon: Hammer,
      color: 'indigo',
      group: 'code-analysis',
      order: 4,
      eventTitle: 'Dependencies Scan Completed',
      estimatedTime: '1-2 min',
      scanHandler: {
        execute: buildScan.executeBuildScan,
        buildDecision: buildScan.buildDecisionData,
      },
    }),
    createScanState({
      id: 'unused',
      label: 'Unused',
      description: 'Find unused code and imports',
      icon: Trash2,
      color: 'red',
      group: 'code-analysis',
      order: 5,
      eventTitle: 'Unused Code Scan Completed',
      estimatedTime: '2-3 min',
      scanHandler: {
        execute: unusedScan.executeUnusedScan,
        buildDecision: unusedScan.buildDecisionData,
      },
    }),

    // Completion state
    createCompletionState(),
  ],

  transitions: createLinearTransitions(['vision', 'contexts', 'structure', 'build', 'unused', 'completed']),
};

/**
 * Get default state machine for a project type
 */
export function getDefaultStateMachine(projectType: string): StateMachineConfig {
  switch (projectType) {
    case 'nextjs':
    case 'react':
      return DEFAULT_NEXTJS_STATE_MACHINE;
    case 'fastapi':
    case 'python':
      return DEFAULT_FASTAPI_STATE_MACHINE;
    default:
      return DEFAULT_NEXTJS_STATE_MACHINE;
  }
}
