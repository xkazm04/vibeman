/**
 * Vibeman Automation Cycle
 * Main automation logic for evaluating and implementing ideas
 * Now integrated with adaptive learning for self-optimization
 * and automatic refactor scanning after implementations
 */

import { getTaskStatus } from '@/app/Claude/lib/requirementApi';
import {
  evaluateAndSelectIdea,
  getFirstAcceptedIdea,
  implementIdea,
  markIdeaAsImplemented,
  recordExecutionOutcome,
  triggerRefactorScan,
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
  currentIdeaIdRef?: React.MutableRefObject<string | null>;
  executionStartTimeRef?: React.MutableRefObject<number | null>;
  enableRefactorScanning?: boolean; // Enable post-implementation refactor scanning
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
  const {
    projectId,
    projectPath,
    isRunningRef,
    currentTaskIdRef,
    currentIdeaIdRef,
    executionStartTimeRef,
  } = config;
  const { onStatusChange, onSuccess, onFailure, onIdeaImplemented } = callbacks;

  if (!isRunningRef.current) {    return;
  }

  try {
    // PRIORITY STEP: Check for accepted ideas first    onStatusChange('evaluating', 'Checking for accepted ideas...');

    const acceptedResult = await getFirstAcceptedIdea(projectId);

    let selectedIdeaId: string | null = null;
    let selectionReasoning: string = '';

    if (acceptedResult.ideaId) {
      // Found an accepted idea - skip LLM evaluation and implement directly      selectedIdeaId = acceptedResult.ideaId;
      selectionReasoning = 'Implementing pre-accepted idea (highest priority)';
      onStatusChange('evaluating', selectionReasoning);
    } else {
      // No accepted ideas - proceed with normal LLM evaluation of pending ideas      onStatusChange('evaluating', 'Analyzing pending ideas...');

      const evaluation = await evaluateAndSelectIdea(projectId, projectPath);

      if (!evaluation.selectedIdeaId) {        onStatusChange('idle', evaluation.reasoning || 'No suitable ideas to implement');
        return;
      }

      selectedIdeaId = evaluation.selectedIdeaId;
      selectionReasoning = evaluation.reasoning;
    }

    // Common implementation path for both accepted and evaluated ideas
    if (!selectedIdeaId) {      onStatusChange('idle', 'No ideas to implement');
      return;
    }

    onStatusChange('evaluating', `Selected: ${selectionReasoning}`);

    // Track current idea for learning
    if (currentIdeaIdRef) {
      currentIdeaIdRef.current = selectedIdeaId;
    }

    // Wait a moment before generating requirement
    await sleep(1000);

    if (!isRunningRef.current) {      return;
    }

    // Step 2: Implement the selected idea
    // Track execution start time for learning
    if (executionStartTimeRef) {
      executionStartTimeRef.current = Date.now();
    }
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

    // Calculate execution time for learning
    const executionTimeMs = executionStartTimeRef?.current
      ? Date.now() - executionStartTimeRef.current
      : undefined;

    if (taskSuccess) {
      // Step 4: Mark idea as implemented
      await markIdeaAsImplemented(selectedIdeaId);

      // Record successful outcome for adaptive learning
      try {
        await recordExecutionOutcome(selectedIdeaId, {
          success: true,
          executionTimeMs,
        });
      } catch (learningError) {
        // Non-blocking - learning failures shouldn't stop automation
        console.warn('Failed to record execution outcome:', learningError);
      }

      // Step 5: Trigger automatic refactor scan (if enabled)
      if (config.enableRefactorScanning !== false) {
        try {
          onStatusChange('success', 'Running post-implementation refactor scan...');
          const scanResult = await triggerRefactorScan(projectId, projectPath);
          if (scanResult && scanResult.ideasGenerated > 0) {
            console.log(`[AutomationCycle] Refactor scan generated ${scanResult.ideasGenerated} new ideas`);
          }
        } catch (scanError) {
          // Non-blocking - scan failures shouldn't stop automation
          console.warn('Post-implementation refactor scan failed:', scanError);
        }
      }

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
      // Record failed outcome for adaptive learning
      try {
        await recordExecutionOutcome(selectedIdeaId, {
          success: false,
          executionTimeMs,
          errorType: 'execution_failed',
        });
      } catch (learningError) {
        console.warn('Failed to record execution outcome:', learningError);
      }

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
