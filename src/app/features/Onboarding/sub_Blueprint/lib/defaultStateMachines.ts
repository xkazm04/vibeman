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
} from 'lucide-react';
import type { StateMachineConfig, TechniqueGroupDefinition } from './stateMachineTypes';
import * as structureScan from './blueprintStructureScan';
import * as photoScan from './blueprintPhotoScan';
import * as visionScan from './blueprintVisionScan';
import * as contextsScan from './blueprintContextsScan';
import * as buildScan from './blueprintBuildScan';
import * as selectorsScan from './blueprintSelectorsScan';
import * as unusedScan from './blueprintUnusedScan';

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
    {
      id: 'vision',
      label: 'Vision',
      description: 'Define project vision and goals',
      icon: Eye,
      color: 'cyan',
      type: 'scan',
      group: 'project-structure',
      enabled: true,
      order: 1,
      eventTitle: 'Vision Scan Completed',
      estimatedTime: '2-3 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: visionScan.executeVisionScan,
        buildDecision: visionScan.buildDecisionData,
      },
    },
    {
      id: 'contexts',
      label: 'Contexts',
      description: 'Identify and document code contexts',
      icon: Layers,
      color: 'blue',
      type: 'scan',
      group: 'project-structure',
      enabled: true,
      order: 2,
      eventTitle: 'Contexts Scan Completed',
      estimatedTime: '3-5 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: contextsScan.executeContextsScan,
        buildDecision: contextsScan.buildDecisionData,
      },
    },

    // Code Analysis Group
    {
      id: 'structure',
      label: 'Structure',
      description: 'Analyze project structure and architecture',
      icon: Box,
      color: 'blue',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 3,
      eventTitle: 'Structure Scan Completed',
      estimatedTime: '2-4 min',
      scanHandler: {
        execute: structureScan.executeStructureScan,
        buildDecision: structureScan.buildDecisionData,
      },
    },
    {
      id: 'build',
      label: 'Build',
      description: 'Check build configuration and dependencies',
      icon: Hammer,
      color: 'indigo',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 4,
      eventTitle: 'Build Scan Completed',
      estimatedTime: '1-2 min',
      scanHandler: {
        execute: buildScan.executeBuildScan,
        buildDecision: buildScan.buildDecisionData,
      },
    },
    {
      id: 'unused',
      label: 'Unused',
      description: 'Find unused code and dependencies',
      icon: Trash2,
      color: 'red',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 5,
      eventTitle: 'Unused Code Scan Completed',
      estimatedTime: '2-3 min',
      scanHandler: {
        execute: unusedScan.executeUnusedScan,
        buildDecision: unusedScan.buildDecisionData,
      },
    },

    // Quality Assurance Group
    {
      id: 'photo',
      label: 'Photo',
      description: 'Visual regression testing setup',
      icon: Camera,
      color: 'pink',
      type: 'scan',
      group: 'quality-assurance',
      enabled: true,
      order: 6,
      eventTitle: 'Photo Scan Completed',
      contextNeeded: true,
      estimatedTime: '3-5 min',
      scanHandler: {
        execute: photoScan.executePhotoScan,
        buildDecision: photoScan.buildDecisionData,
      },
    },
    {
      id: 'selectors',
      label: 'Selectors',
      description: 'Validate test selectors and coverage',
      icon: Target,
      color: 'cyan',
      type: 'scan',
      group: 'quality-assurance',
      enabled: true,
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
    },

    // Automation Group
    {
      id: 'prototype',
      label: 'Prototype',
      description: 'Navigate to prototyping tools',
      icon: Sparkles,
      color: 'green',
      type: 'navigate',
      group: 'automation',
      enabled: false,
      order: 8,
      navigationTarget: 'tasker',
      estimatedTime: '1 min',
    },
    {
      id: 'tasker',
      label: 'Tasker',
      description: 'Navigate to task automation',
      icon: Code,
      color: 'cyan',
      type: 'navigate',
      group: 'automation',
      enabled: false,
      order: 9,
      navigationTarget: 'tasker',
      estimatedTime: '1 min',
    },
    {
      id: 'fix',
      label: 'Fix',
      description: 'Navigate to bug fixing tools',
      icon: Bug,
      color: 'red',
      type: 'navigate',
      group: 'automation',
      enabled: false,
      order: 10,
      navigationTarget: 'tasker',
      estimatedTime: '1 min',
    },

    // Completion state
    {
      id: 'completed',
      label: 'Completed',
      description: 'Onboarding completed successfully',
      icon: Sparkles,
      color: 'green',
      type: 'completion',
      group: 'custom',
      enabled: true,
      order: 99,
    },
  ],

  transitions: [
    // Linear flow through project structure
    { id: 't1', fromState: 'vision', toState: 'contexts', condition: 'always' },
    { id: 't2', fromState: 'contexts', toState: 'structure', condition: 'always' },

    // Linear flow through code analysis
    { id: 't3', fromState: 'structure', toState: 'build', condition: 'always' },
    { id: 't4', fromState: 'build', toState: 'unused', condition: 'always' },

    // Linear flow through quality assurance
    { id: 't5', fromState: 'unused', toState: 'photo', condition: 'always' },
    { id: 't6', fromState: 'photo', toState: 'selectors', condition: 'always' },

    // Optional automation steps
    { id: 't7', fromState: 'selectors', toState: 'prototype', condition: 'always' },
    { id: 't8', fromState: 'prototype', toState: 'tasker', condition: 'always' },
    { id: 't9', fromState: 'tasker', toState: 'fix', condition: 'always' },

    // Completion
    { id: 't10', fromState: 'fix', toState: 'completed', condition: 'always' },
    { id: 't11', fromState: 'selectors', toState: 'completed', condition: 'skip' },
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
    {
      id: 'vision',
      label: 'Vision',
      description: 'Define project vision and goals',
      icon: Eye,
      color: 'cyan',
      type: 'scan',
      group: 'project-structure',
      enabled: true,
      order: 1,
      eventTitle: 'Vision Scan Completed',
      estimatedTime: '2-3 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: visionScan.executeVisionScan,
        buildDecision: visionScan.buildDecisionData,
      },
    },
    {
      id: 'contexts',
      label: 'Contexts',
      description: 'Identify and document code contexts',
      icon: Layers,
      color: 'blue',
      type: 'scan',
      group: 'project-structure',
      enabled: true,
      order: 2,
      eventTitle: 'Contexts Scan Completed',
      estimatedTime: '3-5 min',
      requiredForCompletion: true,
      scanHandler: {
        execute: contextsScan.executeContextsScan,
        buildDecision: contextsScan.buildDecisionData,
      },
    },

    // Code Analysis Group (adjusted for Python)
    {
      id: 'structure',
      label: 'Structure',
      description: 'Analyze project structure and architecture',
      icon: Box,
      color: 'blue',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 3,
      eventTitle: 'Structure Scan Completed',
      estimatedTime: '2-4 min',
      scanHandler: {
        execute: structureScan.executeStructureScan,
        buildDecision: structureScan.buildDecisionData,
      },
    },
    {
      id: 'build',
      label: 'Dependencies',
      description: 'Check requirements.txt and dependencies',
      icon: Hammer,
      color: 'indigo',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 4,
      eventTitle: 'Dependencies Scan Completed',
      estimatedTime: '1-2 min',
      scanHandler: {
        execute: buildScan.executeBuildScan,
        buildDecision: buildScan.buildDecisionData,
      },
    },
    {
      id: 'unused',
      label: 'Unused',
      description: 'Find unused code and imports',
      icon: Trash2,
      color: 'red',
      type: 'scan',
      group: 'code-analysis',
      enabled: true,
      order: 5,
      eventTitle: 'Unused Code Scan Completed',
      estimatedTime: '2-3 min',
      scanHandler: {
        execute: unusedScan.executeUnusedScan,
        buildDecision: unusedScan.buildDecisionData,
      },
    },

    // Completion state
    {
      id: 'completed',
      label: 'Completed',
      description: 'Onboarding completed successfully',
      icon: Sparkles,
      color: 'green',
      type: 'completion',
      group: 'custom',
      enabled: true,
      order: 99,
    },
  ],

  transitions: [
    { id: 't1', fromState: 'vision', toState: 'contexts', condition: 'always' },
    { id: 't2', fromState: 'contexts', toState: 'structure', condition: 'always' },
    { id: 't3', fromState: 'structure', toState: 'build', condition: 'always' },
    { id: 't4', fromState: 'build', toState: 'unused', condition: 'always' },
    { id: 't5', fromState: 'unused', toState: 'completed', condition: 'always' },
  ],
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
