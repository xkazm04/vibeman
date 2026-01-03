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
 * Default onboarding tasks configuration.
 * Represents the complete workflow from project setup to implementation review.
 */
export const ONBOARDING_TASKS: TaskConfig[] = [
  {
    id: 'create-project',
    label: 'Register a project',
    description: 'Connect your codebase to start analyzing',
    location: 'coder'
  },
  {
    id: 'run-blueprint',
    label: 'Run blueprint scan',
    description: 'Analyze project structure and auto-create contexts',
    location: 'blueprint'
  },
  {
    id: 'review-contexts',
    label: 'Review contexts',
    description: 'Organize your code into logical feature groups',
    location: 'contexts'
  },
  {
    id: 'generate-ideas',
    label: 'Generate ideas',
    description: 'AI agents analyze code for improvements',
    location: 'ideas'
  },
  {
    id: 'evaluate-ideas',
    label: 'Evaluate ideas',
    description: 'Swipe to accept or reject suggested improvements',
    location: 'tinder'
  },
  {
    id: 'run-task',
    label: 'Run first task',
    description: 'Execute an accepted idea with Claude Code',
    location: 'tasker'
  },
  {
    id: 'review-impl',
    label: 'Review implementation',
    description: 'Accept or reject AI-generated code changes',
    location: 'manager'
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
