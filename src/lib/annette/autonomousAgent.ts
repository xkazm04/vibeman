/**
 * Autonomous Agent Engine
 * Goal-driven execution loop that decomposes objectives into steps,
 * executes them via the tool registry, evaluates outcomes with Brain,
 * and persists progress across sessions.
 *
 * Architecture:
 *   User sets objective → LLM decomposes into steps → execution loop
 *   runs steps sequentially → each step calls tools → results feed
 *   back into LLM for next-step adaptation → notifications report
 *   progress via SSE
 */

import { agentDb } from '@/app/db';
import { executeTool, getToolDefinitions } from './toolRegistry';
import { formatBrainForPrompt } from './brainInjector';
import { generateWithLLM } from '@/lib/llm/llm-manager';
import { emitAgentEvent } from './agentNotificationBridge';
import { logger } from '@/lib/logger';
import type { DbAgentGoal, DbAgentStep } from '@/app/db/models/types';

// ─── Types ───

export interface AgentStartInput {
  projectId: string;
  projectPath?: string;
  objective: string;
}

export interface AgentStatus {
  goal: DbAgentGoal;
  steps: DbAgentStep[];
  isRunning: boolean;
}

interface DecomposedStep {
  title: string;
  description: string;
  toolName?: string;
  toolInput?: string;
}

// ─── In-Memory State ───

const runningGoals = new Map<string, { abortController: AbortController }>();

/**
 * Check if an agent is currently running for a project
 */
export function isAgentRunning(projectId: string): boolean {
  return runningGoals.has(projectId);
}

// ─── Goal Lifecycle ───

/**
 * Start a new autonomous goal execution.
 * Returns the created goal immediately; execution happens asynchronously.
 */
export async function startGoal(input: AgentStartInput): Promise<DbAgentGoal> {
  const { projectId, projectPath, objective } = input;

  // Only one goal can run per project at a time
  if (runningGoals.has(projectId)) {
    throw new Error('An autonomous goal is already running for this project. Pause or cancel it first.');
  }

  // Check for any existing active goals and cancel them
  const existing = agentDb.goals.getActive(projectId);
  if (existing && (existing.status === 'running' || existing.status === 'decomposing')) {
    agentDb.goals.updateStatus(existing.id, 'cancelled');
  }

  const goal = agentDb.goals.create(projectId, objective);

  // Start async execution
  const abortController = new AbortController();
  runningGoals.set(projectId, { abortController });

  // Fire and forget - the execution loop runs in the background
  executeGoalLoop(goal.id, projectId, projectPath, abortController.signal).catch(error => {
    logger.error('[Agent] Goal execution loop crashed', { goalId: goal.id, error });
    try {
      agentDb.goals.updateStatus(goal.id, 'failed', { error_message: String(error) });
    } catch { /* ignore db errors during crash */ }
    runningGoals.delete(projectId);
  });

  return goal;
}

/**
 * Pause a running goal
 */
export function pauseGoal(projectId: string): DbAgentGoal | null {
  const running = runningGoals.get(projectId);
  if (running) {
    running.abortController.abort();
    runningGoals.delete(projectId);
  }

  const goal = agentDb.goals.getActive(projectId);
  if (goal && goal.status === 'running') {
    agentDb.goals.updateStatus(goal.id, 'paused');
    emitAgentEvent(projectId, goal.id, 'paused', `Goal paused: ${goal.objective}`);
    return agentDb.goals.getById(goal.id);
  }
  return goal;
}

/**
 * Resume a paused goal
 */
export async function resumeGoal(projectId: string, projectPath?: string): Promise<DbAgentGoal | null> {
  if (runningGoals.has(projectId)) {
    throw new Error('Agent is already running for this project.');
  }

  const goal = agentDb.goals.getActive(projectId);
  if (!goal || goal.status !== 'paused') {
    return null;
  }

  const abortController = new AbortController();
  runningGoals.set(projectId, { abortController });

  agentDb.goals.updateStatus(goal.id, 'running');
  emitAgentEvent(projectId, goal.id, 'resumed', `Goal resumed: ${goal.objective}`);

  executeGoalLoop(goal.id, projectId, projectPath, abortController.signal).catch(error => {
    logger.error('[Agent] Resume loop crashed', { goalId: goal.id, error });
    try {
      agentDb.goals.updateStatus(goal.id, 'failed', { error_message: String(error) });
    } catch { /* ignore */ }
    runningGoals.delete(projectId);
  });

  return agentDb.goals.getById(goal.id);
}

/**
 * Cancel a goal entirely
 */
export function cancelGoal(projectId: string): DbAgentGoal | null {
  const running = runningGoals.get(projectId);
  if (running) {
    running.abortController.abort();
    runningGoals.delete(projectId);
  }

  const goal = agentDb.goals.getActive(projectId);
  if (goal) {
    agentDb.goals.updateStatus(goal.id, 'cancelled');
    emitAgentEvent(projectId, goal.id, 'cancelled', `Goal cancelled: ${goal.objective}`);
    return agentDb.goals.getById(goal.id);
  }
  return null;
}

/**
 * Get current agent status for a project
 */
export function getAgentStatus(projectId: string): AgentStatus | null {
  const goal = agentDb.goals.getActive(projectId);
  if (!goal) {
    // Check for most recent completed/failed/cancelled goal
    const recent = agentDb.goals.getByProject(projectId, 1);
    if (recent.length === 0) return null;
    return {
      goal: recent[0],
      steps: agentDb.steps.getByGoal(recent[0].id),
      isRunning: false,
    };
  }

  return {
    goal,
    steps: agentDb.steps.getByGoal(goal.id),
    isRunning: runningGoals.has(projectId),
  };
}

// ─── Core Execution Loop ───

async function executeGoalLoop(
  goalId: string,
  projectId: string,
  projectPath: string | undefined,
  signal: AbortSignal
): Promise<void> {
  try {
    // Phase 1: Decompose the objective into steps
    agentDb.goals.updateStatus(goalId, 'decomposing', { started_at: new Date().toISOString() });
    const goal = agentDb.goals.getById(goalId)!;
    emitAgentEvent(projectId, goalId, 'decomposing', `Analyzing objective: ${goal.objective}`);

    const steps = await decomposeObjective(goalId, projectId, goal.objective);
    if (signal.aborted) return;

    agentDb.goals.updateStatus(goalId, 'running', {
      total_steps: steps.length,
      strategy: JSON.stringify(steps.map(s => s.title)),
    });
    emitAgentEvent(projectId, goalId, 'running', `Decomposed into ${steps.length} steps. Starting execution.`);

    // Phase 2: Execute steps sequentially
    await executeSteps(goalId, projectId, projectPath, signal);
    if (signal.aborted) return;

    // Phase 3: Summarize results
    const finalGoal = agentDb.goals.getById(goalId)!;
    const allSteps = agentDb.steps.getByGoal(goalId);
    const summary = await generateSummary(finalGoal, allSteps, projectId);

    agentDb.goals.updateStatus(goalId, 'completed', {
      result_summary: summary,
      completed_at: new Date().toISOString(),
    });
    emitAgentEvent(projectId, goalId, 'completed', summary);

  } catch (error) {
    if (signal.aborted) return;
    const errMsg = error instanceof Error ? error.message : String(error);
    agentDb.goals.updateStatus(goalId, 'failed', { error_message: errMsg });
    emitAgentEvent(projectId, goalId, 'failed', `Goal failed: ${errMsg}`);
  } finally {
    runningGoals.delete(projectId);
  }
}

// ─── Goal Decomposition ───

const MAX_STEPS = 12;

async function decomposeObjective(
  goalId: string,
  projectId: string,
  objective: string
): Promise<DbAgentStep[]> {
  const brainContext = formatBrainForPrompt(projectId);
  const toolDefs = getToolDefinitions();
  const toolList = toolDefs.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const prompt = `You are an autonomous development agent. Decompose the following objective into concrete, sequential execution steps.

## Objective
${objective}

## Available Tools
${toolList}

## Project Brain Context
${brainContext || 'No brain data available yet.'}

## Instructions
1. Analyze the objective and break it into 3-${MAX_STEPS} sequential steps
2. Each step should use one of the available tools
3. Order matters: later steps may depend on earlier results
4. Be specific: include exact tool names and what inputs to provide
5. Include a final review/verification step when appropriate

Return a JSON array of steps:
\`\`\`json
[
  { "title": "Brief step title", "description": "What this step does and why", "toolName": "exact_tool_name" },
  ...
]
\`\`\`

Return ONLY the JSON array, no other text.`;

  const result = await generateWithLLM(prompt, {
    systemPrompt: 'You are a goal decomposition engine. Return valid JSON arrays only.',
    temperature: 0.3,
    maxTokens: 2000,
  });

  if (!result.success || !result.response) {
    throw new Error('Failed to decompose objective: LLM returned no response');
  }

  // Parse the JSON from the response
  const jsonMatch = result.response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse decomposition: no JSON array found in response');
  }

  let parsed: DecomposedStep[];
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse decomposition: invalid JSON');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Decomposition returned empty steps');
  }

  // Limit steps
  const limited = parsed.slice(0, MAX_STEPS);

  // Persist steps to DB
  return agentDb.steps.createBatch(
    goalId,
    limited.map(s => ({
      title: s.title || 'Untitled step',
      description: s.description || '',
      toolName: s.toolName,
      toolInput: s.toolInput,
    }))
  );
}

// ─── Step Execution ───

const MAX_STEP_RETRIES = 1;
const STEP_DELAY_MS = 2000; // Breathing room between steps

async function executeSteps(
  goalId: string,
  projectId: string,
  projectPath: string | undefined,
  signal: AbortSignal
): Promise<void> {
  while (!signal.aborted) {
    const nextStep = agentDb.steps.getNextPending(goalId);
    if (!nextStep) break; // All steps done

    agentDb.goals.updateStatus(goalId, 'running', { current_step_id: nextStep.id });
    agentDb.steps.updateStatus(nextStep.id, 'running');

    emitAgentEvent(
      projectId,
      goalId,
      'step_started',
      `Step ${nextStep.order_index + 1}: ${nextStep.title}`
    );

    let success = false;
    let retries = 0;

    while (retries <= MAX_STEP_RETRIES && !success && !signal.aborted) {
      try {
        const result = await executeStep(nextStep, projectId, projectPath, goalId);
        agentDb.steps.updateStatus(nextStep.id, 'completed', {
          result: result.content,
          tokens_used: result.tokensUsed || 0,
        });
        agentDb.goals.incrementCompleted(goalId);
        success = true;

        emitAgentEvent(
          projectId,
          goalId,
          'step_completed',
          `Completed: ${nextStep.title}`
        );
      } catch (error) {
        retries++;
        const errMsg = error instanceof Error ? error.message : String(error);

        if (retries > MAX_STEP_RETRIES) {
          agentDb.steps.updateStatus(nextStep.id, 'failed', { error_message: errMsg });
          agentDb.goals.incrementFailed(goalId);

          emitAgentEvent(
            projectId,
            goalId,
            'step_failed',
            `Step failed: ${nextStep.title} - ${errMsg}`
          );

          // Decide whether to continue or abort based on failure count
          const goal = agentDb.goals.getById(goalId);
          if (goal && goal.failed_steps >= 3) {
            throw new Error(`Too many failures (${goal.failed_steps}). Aborting goal.`);
          }
        }
      }
    }

    // Delay between steps to avoid rate limits
    if (!signal.aborted) {
      await sleep(STEP_DELAY_MS);
    }
  }
}

async function executeStep(
  step: DbAgentStep,
  projectId: string,
  projectPath: string | undefined,
  goalId: string
): Promise<{ content: string; tokensUsed: number }> {
  // If the step has a pre-determined tool, use it directly
  if (step.tool_name) {
    const toolInput = step.tool_input ? JSON.parse(step.tool_input) : {};
    const result = await executeTool(
      { id: step.id, name: step.tool_name, input: toolInput },
      projectId,
      projectPath
    );

    if (result.is_error) {
      throw new Error(`Tool ${step.tool_name} failed: ${result.content}`);
    }

    return { content: result.content, tokensUsed: 0 };
  }

  // Otherwise, use LLM to figure out the right tool call
  const brainContext = formatBrainForPrompt(projectId);
  const priorSteps = agentDb.steps.getByGoal(goalId)
    .filter(s => s.status === 'completed' && s.result)
    .map(s => `- ${s.title}: ${(s.result || '').substring(0, 200)}`)
    .join('\n');

  const toolDefs = getToolDefinitions();
  const toolList = toolDefs.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const prompt = `You are executing step ${step.order_index + 1} of an autonomous goal.

## Step to Execute
Title: ${step.title}
Description: ${step.description}

## Prior Step Results
${priorSteps || 'No prior steps completed yet.'}

## Available Tools
${toolList}

## Brain Context
${brainContext || 'No brain data.'}

Choose exactly ONE tool to execute this step. Return a JSON object:
\`\`\`json
{ "toolName": "exact_tool_name", "toolInput": { ... } }
\`\`\`

Return ONLY the JSON object, no other text.`;

  const result = await generateWithLLM(prompt, {
    systemPrompt: 'You are an autonomous agent step executor. Return valid JSON only.',
    temperature: 0.2,
    maxTokens: 1000,
  });

  const tokensUsed = (result.usage?.prompt_tokens || 0) + (result.usage?.completion_tokens || 0);

  if (!result.success || !result.response) {
    throw new Error('LLM failed to determine tool for step');
  }

  const jsonMatch = result.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in LLM response');
  }

  let toolCall: { toolName: string; toolInput: Record<string, unknown> };
  try {
    toolCall = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON from LLM step planner');
  }

  if (!toolCall.toolName) {
    throw new Error('LLM returned no toolName');
  }

  const toolResult = await executeTool(
    { id: step.id, name: toolCall.toolName, input: toolCall.toolInput || {} },
    projectId,
    projectPath
  );

  if (toolResult.is_error) {
    throw new Error(`Tool ${toolCall.toolName} failed: ${toolResult.content}`);
  }

  return { content: toolResult.content, tokensUsed };
}

// ─── Summary Generation ───

async function generateSummary(
  goal: DbAgentGoal,
  steps: DbAgentStep[],
  projectId: string
): Promise<string> {
  const completedSteps = steps.filter(s => s.status === 'completed');
  const failedSteps = steps.filter(s => s.status === 'failed');

  const stepSummary = steps.map(s => {
    const status = s.status === 'completed' ? 'done' : s.status === 'failed' ? 'FAILED' : s.status;
    const resultSnippet = s.result ? s.result.substring(0, 150) : '';
    return `${s.order_index + 1}. [${status}] ${s.title}${resultSnippet ? ': ' + resultSnippet : ''}`;
  }).join('\n');

  const prompt = `Summarize the results of this autonomous goal execution in 2-3 sentences.

Objective: ${goal.objective}
Steps completed: ${completedSteps.length}/${steps.length}
Steps failed: ${failedSteps.length}

Step details:
${stepSummary}

Write a concise, informative summary of what was accomplished and any notable outcomes.`;

  try {
    const result = await generateWithLLM(prompt, {
      systemPrompt: 'Write concise summaries. No markdown formatting.',
      temperature: 0.3,
      maxTokens: 300,
    });
    return result.response || `Completed ${completedSteps.length}/${steps.length} steps.`;
  } catch {
    return `Completed ${completedSteps.length}/${steps.length} steps with ${failedSteps.length} failures.`;
  }
}

// ─── Utility ───

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
