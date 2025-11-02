/**
 * Getting Started configuration
 */

import { OnboardingTask, ModuleLocation } from './types';

export interface TaskConfig {
  id: string;
  label: string;
  description: string;
  location: ModuleLocation;
}

/**
 * Default onboarding tasks configuration
 */
export const ONBOARDING_TASKS: TaskConfig[] = [
  {
    id: 'create-project',
    label: 'Create a project',
    description: 'Set up your first project to start building',
    location: 'coder'
  },
  {
    id: 'generate-docs',
    label: 'Generate documentation',
    description: 'Use AI to analyze and document your codebase',
    location: 'coder'
  },
  {
    id: 'compose-context',
    label: 'Compose a context',
    description: 'Group related files together for better organization',
    location: 'coder'
  },
  {
    id: 'scan-ideas',
    label: 'Scan for ideas',
    description: 'Let AI specialists discover improvement opportunities',
    location: 'ideas'
  },
  {
    id: 'let-code',
    label: 'Let it Code',
    description: 'Start implementing ideas with AI assistance',
    location: 'tasker'
  },
];

/**
 * Total number of onboarding tasks
 */
export const TOTAL_TASKS = ONBOARDING_TASKS.length;

/**
 * Build onboarding tasks from configuration with completion status
 */
export function buildTasks(
  isStepCompleted: (stepId: string) => boolean
): OnboardingTask[] {
  return ONBOARDING_TASKS.map(config => ({
    ...config,
    completed: isStepCompleted(config.id)
  }));
}
