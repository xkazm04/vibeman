/**
 * Vibeman Automation Cycle
 * Main automation logic for evaluating and implementing ideas
 */

import { getTaskStatus } from '@/app/Claude/lib/requirementApi';
import {
  evaluateAndSelectIdea,
  getFirstAcceptedIdea,
  implementIdea,
  markIdeaAsImplemented,
} from './vibemanApi';

export type AutomationStatus = 'idle' | 'evaluating' | 'generating' | 'executing' | 'success' | 'error';

export interface AutomationCallbacks {
  onStatusChange: (status: AutomationStatus, message: string) => void;
  onSuccess: () => void;
  onFailure: () => void;
  onIdeaImplemented?: () => void;
}

export interface AutomationConfig {
  projectId: string;
  projectPath: string;
  isRunningRef: React.MutableRefObject<boolean>;
  currentTaskIdRef: React.MutableRefObject<string | null>;
}

/**
 * Main automation cycle
 * Processes ideas in priority order:
 * 1. First, handle all "Accepted" ideas (skip LLM evaluation)
 * 2. Then, evaluate and select from "Pending" ideas
 */
export async function runAutomationCycle(
  config: AutomationConfig,
  callbacks: AutomationCallbacks
): Promise<void> {
  const { projectId, projectPath, isRunningRef, currentTaskIdRef } = config;
  const { onStatusChange, onSuccess, onFailure, onIdeaImplemented } = callbacks;

  if (!isRunningRef.current) {
    console.log('[Vibeman] Automation stopped by user');
    return;
  }

  try {
    // PRIORITY STEP: Check for accepted ideas first
    console.log('[Vibeman] Checking for accepted ideas...');
    onStatusChange('evaluating', 'Checking for accepted ideas...');

    const acceptedResult = await getFirstAcceptedIdea(projectId);

    let selectedIdeaId: string | null = null;
    let selectionReasoning: string = '';

    if (acceptedResult.ideaId) {
      // Found an accepted idea - skip LLM evaluation and implement directly
      console.log('[Vibeman] Found accepted idea, skipping evaluation:', acceptedResult.ideaId);
      selectedIdeaId = acceptedResult.ideaId;
      selectionReasoning = 'Implementing pre-accepted idea (highest priority)';
      onStatusChange('evaluating', selectionReasoning);
    } else {
      // No accepted ideas - proceed with normal LLM evaluation of pending ideas
      console.log('[Vibeman] No accepted ideas found, evaluating pending ideas...');
      onStatusChange('evaluating', 'Analyzing pending ideas...');

      const evaluation = await evaluateAndSelectIdea(projectId, projectPath);

      if (!evaluation.selectedIdeaId) {
        console.log('[Vibeman] No suitable idea found');
        onStatusChange('idle', evaluation.reasoning || 'No suitable ideas to implement');
        return;
      }

      selectedIdeaId = evaluation.selectedIdeaId;
      selectionReasoning = evaluation.reasoning;
    }

    // Common implementation path for both accepted and evaluated ideas
    if (!selectedIdeaId) {
      console.log('[Vibeman] No idea selected');
      onStatusChange('idle', 'No ideas to implement');
      return;
    }

    onStatusChange('evaluating', `Selected: ${selectionReasoning}`);

    // Wait a moment before generating requirement
    await sleep(1000);

    if (!isRunningRef.current) {
      console.log('[Vibeman] Automation stopped during evaluation');
      return;
    }

    // Step 2: Implement the selected idea
    console.log('[Vibeman] Implementing idea:', selectedIdeaId);
    onStatusChange('generating', 'Generating requirement file...');

    const implementation = await implementIdea(projectId, projectPath, selectedIdeaId);

    if (!implementation.success) {
      throw new Error(implementation.error || 'Implementation failed');
    }

    // Step 3: Monitor task execution
    onStatusChange('executing', `Executing: ${implementation.requirementName}`);
    currentTaskIdRef.current = implementation.taskId || null;

    // Poll task status
    const taskSuccess = await monitorTaskExecution(implementation.taskId!, isRunningRef);

    if (taskSuccess) {
      // Step 4: Mark idea as implemented
      console.log('[Vibeman] Task completed successfully, marking as implemented');
      await markIdeaAsImplemented(selectedIdeaId);

      onSuccess();
      onStatusChange('success', 'Implementation successful! Finding next idea...');

      // Notify parent component
      onIdeaImplemented?.();

      // Wait before next cycle
      await sleep(2000);

      // Continue to next idea
      if (isRunningRef.current) {
        await runAutomationCycle(config, callbacks);
      } else {
        onStatusChange('idle', 'Automation stopped');
      }
    } else {
      console.log('[Vibeman] Task failed');
      onFailure();
      onStatusChange('error', 'Implementation failed. Trying next idea...');

      // Wait before next cycle
      await sleep(3000);

      // Continue to next idea despite failure
      if (isRunningRef.current) {
        await runAutomationCycle(config, callbacks);
      } else {
        onStatusChange('idle', 'Automation stopped');
      }
    }
  } catch (error) {
    console.error('[Vibeman] Automation error:', error);
    onFailure();
    onStatusChange('error', error instanceof Error ? error.message : 'Unknown error occurred');
    throw error;
  }
}

/**
 * Monitor task execution until completion
 * Polls every 5 seconds for up to 10 minutes
 */
async function monitorTaskExecution(
  taskId: string,
  isRunningRef: React.MutableRefObject<boolean>
): Promise<boolean> {
  const maxAttempts = 120; // 10 minutes max (120 * 5 seconds)
  let attempts = 0;

  while (attempts < maxAttempts && isRunningRef.current) {
    try {
      const task = await getTaskStatus(taskId);

      if (task.status === 'completed') {
        return true;
      } else if (task.status === 'failed' || task.status === 'session-limit') {
        return false;
      }

      // Still running, wait and poll again
      await sleep(5000); // Poll every 5 seconds
      attempts++;
    } catch (error) {
      console.error('[Vibeman] Error polling task status:', error);
      return false;
    }
  }

  // Timeout or stopped
  return false;
}

/**
 * Sleep helper function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
