/**
 * REFLECT Phase — Conductor v3
 *
 * Single LLM call that replaces Review + Self-Healing.
 * Analyzes execution results, classifies errors, extracts diffs,
 * and determines whether to continue cycling or declare done.
 *
 * Inputs: planned tasks (with results), build validation, config, metrics
 * Outputs: ReflectOutput (status + next tasks if continuing), updated metrics, errors
 */

import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { classifyError } from '../selfHealing/errorClassifier';
import { recordSignal } from '@/lib/brain/brainService';
import type { ErrorClassification } from '../types';
import type {
  V3Task,
  ReflectOutput,
  V3Config,
  V3Metrics,
  WorkspaceContext,
} from './types';
import type { BuildResult } from '../execution/buildValidator';

// ============================================================================
// Input Type
// ============================================================================

export interface ReflectPhaseInput {
  runId: string;
  projectId: string;
  projectPath: string;
  plannedTasks: V3Task[];
  config: V3Config;
  buildResult: BuildResult;
  currentCycle: number;
  currentMetrics: V3Metrics;
  goalTitle: string;
  goalDescription: string;
  workspaceContext?: WorkspaceContext | null;
  abortSignal?: AbortSignal;
}

// ============================================================================
// Main Export
// ============================================================================

export async function executeReflectPhase(input: ReflectPhaseInput): Promise<{
  output: ReflectOutput;
  updatedMetrics: V3Metrics;
  errors: ErrorClassification[];
}> {
  const {
    runId, projectId, projectPath, plannedTasks, config,
    buildResult, currentCycle, currentMetrics, goalTitle,
    goalDescription, abortSignal,
  } = input;

  if (abortSignal?.aborted) {
    return buildFallbackResult(currentMetrics);
  }

  // 1. Compute results summary from planned tasks
  const summary = computeResultsSummary(plannedTasks);

  // 2. Extract git diffs for changed files
  const diffs = extractDiffsForFiles(summary.allFilesChanged, projectPath);

  // 3. Classify errors from failed tasks
  const errors = classifyTaskErrors(plannedTasks, runId);

  // 4. Record brain signals for each task
  recordTaskSignals(plannedTasks, projectId);

  // 5. Build reflection prompt
  const prompt = buildReflectPrompt({
    goalTitle,
    goalDescription,
    tasks: plannedTasks,
    summary,
    buildResult,
    diffs,
    currentCycle,
    maxCycles: config.maxCyclesPerRun,
    currentMetrics,
    workspaceContext: input.workspaceContext || null,
  });

  // 6. Single LLM call
  const model = config.reflectModel;
  let reflectOutput: ReflectOutput;

  try {
    const response = await fetch('http://localhost:3000/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'anthropic', ...(model ? { model } : {}) }),
      signal: abortSignal,
    });

    if (!response.ok) {
      console.error(`[v3:reflect] LLM call failed: ${response.status}`);
      reflectOutput = buildFallbackOutput(summary);
    } else {
      const llmData = await response.json();
      if (!llmData.success || !llmData.response) {
        console.error('[v3:reflect] LLM returned no response');
        reflectOutput = buildFallbackOutput(summary);
      } else {
        reflectOutput = parseReflectResponse(llmData.response);
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return buildFallbackResult(currentMetrics);
    }
    console.error('[v3:reflect] LLM call error:', error);
    reflectOutput = buildFallbackOutput(summary);
  }

  // 7. If continuing, assign UUIDs to next tasks
  if (reflectOutput.status === 'continue' && reflectOutput.nextTasks) {
    reflectOutput.nextTasks = assignTaskIds(reflectOutput.nextTasks);
  }

  // 8. Force 'done' if we've hit max cycles
  if (currentCycle >= config.maxCyclesPerRun && reflectOutput.status === 'continue') {
    reflectOutput.status = 'done';
    reflectOutput.summary += ` (forced done: reached max cycles ${config.maxCyclesPerRun})`;
    reflectOutput.nextTasks = undefined;
  }

  // 9. Update metrics
  const updatedMetrics = updateMetrics(currentMetrics, summary);

  return { output: reflectOutput, updatedMetrics, errors };
}

// ============================================================================
// Results Summary
// ============================================================================

interface ResultsSummary {
  completed: number;
  failed: number;
  total: number;
  errorMessages: string[];
  allFilesChanged: string[];
}

function computeResultsSummary(tasks: V3Task[]): ResultsSummary {
  let completed = 0;
  let failed = 0;
  const errorMessages: string[] = [];
  const filesSet = new Set<string>();

  for (const task of tasks) {
    if (task.result?.success) {
      completed++;
      for (const f of task.result.filesChanged) {
        filesSet.add(f);
      }
    } else if (task.result && !task.result.success) {
      failed++;
      if (task.result.error) {
        errorMessages.push(`[${task.title}]: ${task.result.error}`);
      }
    } else if (task.status === 'failed') {
      failed++;
    }
  }

  return {
    completed,
    failed,
    total: tasks.length,
    errorMessages,
    allFilesChanged: Array.from(filesSet),
  };
}

// ============================================================================
// Diff Extraction (lightweight, avoids SpecMetadata dependency)
// ============================================================================

function extractDiffsForFiles(files: string[], projectPath: string): string {
  if (files.length === 0) return 'No file changes to diff.';

  const MAX_DIFF_LINES = 500;
  const diffs: string[] = [];

  for (const file of files) {
    try {
      const diff = execSync(`git diff HEAD -- "${file}"`, {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!diff.trim()) continue;

      const lines = diff.split('\n');
      if (lines.length > MAX_DIFF_LINES) {
        diffs.push(`### ${file} (truncated to ${MAX_DIFF_LINES} lines)\n${lines.slice(0, MAX_DIFF_LINES).join('\n')}\n... (${lines.length - MAX_DIFF_LINES} more lines)`);
      } else {
        diffs.push(`### ${file}\n${diff}`);
      }
    } catch {
      // File may be new (untracked) or binary — skip diff
      diffs.push(`### ${file}\n(new or binary file — no diff available)`);
    }
  }

  return diffs.length > 0 ? diffs.join('\n\n') : 'No diffs captured.';
}

// ============================================================================
// Error Classification
// ============================================================================

function classifyTaskErrors(tasks: V3Task[], runId: string): ErrorClassification[] {
  const errors: ErrorClassification[] = [];

  for (const task of tasks) {
    if (task.result && !task.result.success && task.result.error) {
      const classification = classifyError(
        task.result.error,
        'execute',
        runId,
        task.id
      );
      errors.push(classification);
    }
  }

  return errors;
}

// ============================================================================
// Brain Signal Recording
// ============================================================================

function recordTaskSignals(tasks: V3Task[], projectId: string): void {
  for (const task of tasks) {
    if (!task.result) continue;

    try {
      recordSignal({
        projectId,
        signalType: 'implementation',
        data: {
          requirementId: task.id,
          requirementName: task.title,
          filesCreated: [],
          filesModified: task.result.filesChanged || [],
          filesDeleted: [],
          success: task.result.success,
          executionTimeMs: task.result.durationMs || 0,
        },
      });
    } catch (err) {
      console.warn(`[v3:reflect] Failed to record brain signal for task ${task.id}:`, err);
    }
  }
}

// ============================================================================
// Prompt Builder
// ============================================================================

interface ReflectPromptInput {
  goalTitle: string;
  goalDescription: string;
  tasks: V3Task[];
  summary: ResultsSummary;
  buildResult: BuildResult;
  diffs: string;
  currentCycle: number;
  maxCycles: number;
  currentMetrics: V3Metrics;
  workspaceContext: WorkspaceContext | null;
}

function buildReflectPrompt(input: ReflectPromptInput): string {
  const {
    goalTitle, goalDescription, tasks, summary,
    buildResult, diffs, currentCycle, maxCycles, currentMetrics,
  } = input;

  const sections: string[] = [];

  // Role
  sections.push('You are a senior code reviewer reflecting on the results of an autonomous development cycle. Analyze what happened and decide what to do next.');

  // Goal context
  sections.push(`## Goal\n\n**${goalTitle}**\n\n${goalDescription}`);

  // Cycle context
  sections.push(`## Cycle Info\n\n- Current cycle: ${currentCycle} of ${maxCycles}\n- Tasks completed so far (all cycles): ${currentMetrics.tasksCompleted}\n- Tasks failed so far (all cycles): ${currentMetrics.tasksFailed}\n- LLM calls so far: ${currentMetrics.llmCallCount}`);

  // Task results
  const taskLines = tasks.map((t, i) => {
    const status = t.result?.success ? 'SUCCESS' : 'FAILED';
    const error = t.result?.error ? ` — Error: ${t.result.error.slice(0, 200)}` : '';
    const files = t.result?.filesChanged?.join(', ') || 'none';
    return `${i + 1}. [${status}] **${t.title}** — Files: ${files}${error}`;
  }).join('\n');

  sections.push(`## Task Results (This Cycle)\n\n${summary.completed}/${summary.total} succeeded, ${summary.failed} failed.\n\n${taskLines}`);

  // Build validation
  if (buildResult.skipped) {
    sections.push(`## Build Validation\n\nSkipped: ${buildResult.reason}`);
  } else if (buildResult.passed) {
    sections.push(`## Build Validation\n\nPASSED (${buildResult.durationMs}ms)`);
  } else {
    const errorSnippet = buildResult.errorOutput
      ? buildResult.errorOutput.slice(0, 1500)
      : 'No error output captured';
    sections.push(`## Build Validation\n\nFAILED (${buildResult.durationMs}ms)\n\n\`\`\`\n${errorSnippet}\n\`\`\``);
  }

  // File diffs
  sections.push(`## File Diffs\n\n${diffs}`);

  // Workspace context for cross-project correlation
  if (input.workspaceContext) {
    const { formatWorkspaceContextForPrompt } = require('./brainAdvisor');
    const wsSection = formatWorkspaceContextForPrompt(input.workspaceContext);
    if (wsSection) {
      sections.push(wsSection);
      sections.push(`**Reflection guidance:** Assess whether any completed tasks created cross-project impacts. Note if API contracts, shared types, or integration boundaries were modified in ways that require changes in sibling projects.`);
    }
  }

  // Output format
  sections.push(`## Instructions

Analyze the cycle results above and respond with ONLY valid JSON (no markdown fences):

{
  "status": "done" | "continue" | "needs_input",
  "summary": "What happened in this cycle — be specific about successes and failures",
  "brainFeedback": "What the Brain should learn from this cycle (patterns, gotchas, project conventions discovered)",
  "lessonsLearned": ["Lesson 1", "Lesson 2"],
  "nextTasks": []
}

## Decision Rules

1. **"done"** — All tasks succeeded AND build passes (or was skipped). The goal is achieved. Set nextTasks to [].
2. **"continue"** — Some tasks failed OR build failed, but fixable. Populate nextTasks with follow-up work. Only include tasks that address failures or incomplete work — do NOT repeat successful tasks.
3. **"needs_input"** — Blocked by something that requires human input (missing API key, ambiguous requirement, architectural decision). Set nextTasks to [].
4. If this is cycle ${currentCycle} of ${maxCycles} (last cycle), prefer "done" even if imperfect — summarize what was accomplished.

## nextTasks Format (only when status is "continue")

{
  "title": "Short imperative task title",
  "description": "Detailed description of what to implement",
  "targetFiles": ["src/path/to/file.ts"],
  "complexity": 1,
  "dependsOn": []
}

Use "task_0", "task_1" references for dependsOn (by array index). Complexity: 1 = simple, 2 = moderate, 3 = complex.`);

  return sections.join('\n\n');
}

// ============================================================================
// Response Parser
// ============================================================================

function parseReflectResponse(responseText: string): ReflectOutput {
  try {
    // Strip code fences if present
    let cleaned = responseText;
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1];

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[v3:reflect] No JSON object found in LLM response');
      return { status: 'done', summary: 'Failed to parse reflection response', brainFeedback: '', lessonsLearned: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const status = validateStatus(parsed.status);
    const summary = String(parsed.summary || 'No summary provided');
    const brainFeedback = String(parsed.brainFeedback || '');
    const lessonsLearned = Array.isArray(parsed.lessonsLearned)
      ? parsed.lessonsLearned.map(String)
      : [];

    let nextTasks: V3Task[] | undefined;
    if (status === 'continue' && Array.isArray(parsed.nextTasks)) {
      nextTasks = parseNextTasks(parsed.nextTasks);
    }

    return { status, summary, brainFeedback, lessonsLearned, nextTasks };
  } catch (error) {
    console.error('[v3:reflect] Failed to parse reflection response:', error);
    return { status: 'done', summary: 'Parse error in reflection', brainFeedback: '', lessonsLearned: [] };
  }
}

function validateStatus(value: unknown): 'done' | 'continue' | 'needs_input' {
  if (value === 'continue') return 'continue';
  if (value === 'needs_input') return 'needs_input';
  return 'done';
}

function parseNextTasks(rawTasks: unknown[]): V3Task[] {
  // Parse with numeric dependsOn indices, then assignTaskIds remaps to UUIDs
  return rawTasks
    .filter((t): t is Record<string, unknown> => t !== null && typeof t === 'object')
    .filter(t => typeof t.title === 'string')
    .map((t, index) => ({
      id: `task_${index}`,
      title: String(t.title),
      description: String(t.description || ''),
      targetFiles: Array.isArray(t.targetFiles) ? t.targetFiles.map(String) : [],
      complexity: validateComplexity(t.complexity),
      dependsOn: parseDependsOn(t.dependsOn, index) as unknown as string[],
      status: 'pending' as const,
    }));
}

// ============================================================================
// Task ID Assignment
// ============================================================================

function assignTaskIds(tasks: V3Task[]): V3Task[] {
  // Build index-to-UUID map
  const indexToId = new Map<number, string>();
  const result = tasks.map((task, i) => {
    const uuid = uuidv4();
    indexToId.set(i, uuid);
    return { ...task, id: uuid };
  });

  // Remap dependsOn from task_N references to UUIDs
  for (const task of result) {
    task.dependsOn = (task.dependsOn as unknown as number[])
      .map(depIdx => indexToId.get(depIdx))
      .filter((id): id is string => id !== undefined);
  }

  return result;
}

// ============================================================================
// Metrics Update
// ============================================================================

function updateMetrics(current: V3Metrics, summary: ResultsSummary): V3Metrics {
  return {
    ...current,
    tasksCompleted: current.tasksCompleted + summary.completed,
    tasksFailed: current.tasksFailed + summary.failed,
    llmCallCount: current.llmCallCount + 1,
  };
}

// ============================================================================
// Fallback Builders
// ============================================================================

function buildFallbackOutput(summary: ResultsSummary): ReflectOutput {
  return {
    status: 'done',
    summary: `Reflection LLM failed. Cycle results: ${summary.completed}/${summary.total} tasks completed, ${summary.failed} failed.`,
    brainFeedback: 'Reflection phase encountered an LLM error — no feedback available.',
    lessonsLearned: [],
  };
}

function buildFallbackResult(metrics: V3Metrics): {
  output: ReflectOutput;
  updatedMetrics: V3Metrics;
  errors: ErrorClassification[];
} {
  return {
    output: {
      status: 'done',
      summary: 'Reflection aborted.',
      brainFeedback: '',
      lessonsLearned: [],
    },
    updatedMetrics: metrics,
    errors: [],
  };
}

// ============================================================================
// Validation Helpers (mirrored from planPhase.ts)
// ============================================================================

function validateComplexity(value: unknown): 1 | 2 | 3 {
  const num = Number(value);
  if (num <= 1) return 1;
  if (num >= 3) return 3;
  return 2;
}

function parseDependsOn(value: unknown, currentIndex: number): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(dep => {
      if (typeof dep === 'number') return dep;
      if (typeof dep === 'string') {
        const match = dep.match(/task_(\d+)/);
        return match ? parseInt(match[1], 10) : -1;
      }
      return -1;
    })
    .filter(idx => idx >= 0 && idx < currentIndex);
}
