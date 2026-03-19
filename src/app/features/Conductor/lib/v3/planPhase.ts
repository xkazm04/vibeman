/**
 * PLAN Phase — Conductor v3
 *
 * Single LLM call that replaces Goal Analyzer + Planner + Scout + Triage.
 * Analyzes the goal against the codebase and produces an ordered task list
 * with dependency graph and complexity ratings.
 *
 * Inputs: goal + refined intent + file tree + Brain warnings + previous reflection
 * Outputs: V3Task[] with dependency graph
 */

import { v4 as uuidv4 } from 'uuid';
import { discoverRelevantFiles } from '../fileDiscovery';
import { getBehavioralContext, formatBehavioralForPrompt } from '@/lib/brain/behavioralContext';
import { getCompactBrainContext } from '@/lib/brain/brainContext';
import type { V3Task, PlanOutput, V3Config } from './types';

// ============================================================================
// Input Type
// ============================================================================

export interface PlanPhaseInput {
  runId: string;
  projectId: string;
  projectPath: string;
  goalTitle: string;
  goalDescription: string;
  targetPaths: string[] | null;
  config: V3Config;
  brainWarnings: string[];
  previousReflection: import('./types').ReflectOutput | null;
  healingContext: string;
  refinedIntent: string | null;
  abortSignal?: AbortSignal;
}

// ============================================================================
// Main Export
// ============================================================================

export async function executePlanPhase(input: PlanPhaseInput): Promise<PlanOutput> {
  const { projectId, projectPath, goalTitle, goalDescription, abortSignal } = input;

  if (abortSignal?.aborted) {
    return buildFallbackOutput(goalTitle, goalDescription);
  }

  // 1. Gather codebase context
  const { files, fileTree } = discoverRelevantFiles(
    projectId,
    projectPath,
    null,
    goalDescription
  );

  // 2. Gather Brain context
  const behavioralCtx = getBehavioralContext(projectId);
  const behavioralSection = formatBehavioralForPrompt(behavioralCtx);
  const brainPhilosophy = getCompactBrainContext(projectPath);

  // 3. Get project domains for context assignment
  const domains = getProjectContexts(projectId);

  // 4. Build prompt
  const prompt = buildPlanPrompt({
    goalTitle,
    goalDescription,
    refinedIntent: input.refinedIntent,
    fileTree,
    fileContents: files.map(f => ({ path: f.path, content: f.content })),
    brainWarnings: input.brainWarnings,
    behavioralSection,
    brainPhilosophy,
    previousReflection: input.previousReflection,
    healingContext: input.healingContext,
    targetPaths: input.targetPaths,
    domains,
  });

  // 5. Single LLM call
  const model = input.config.planModel;
  try {
    const response = await fetch('http://localhost:3000/api/llm/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: 'anthropic', ...(model ? { model } : {}) }),
      signal: abortSignal,
    });

    if (!response.ok) {
      console.error(`[v3:plan] LLM call failed: ${response.status}`);
      return buildFallbackOutput(goalTitle, goalDescription);
    }

    const llmData = await response.json();
    if (!llmData.success || !llmData.response) {
      console.error('[v3:plan] LLM returned no response');
      return buildFallbackOutput(goalTitle, goalDescription);
    }

    return parsePlanResponse(llmData.response, input.brainWarnings);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return buildFallbackOutput(goalTitle, goalDescription);
    }
    console.error('[v3:plan] LLM call error:', error);
    return buildFallbackOutput(goalTitle, goalDescription);
  }
}

// ============================================================================
// Prompt Builder
// ============================================================================

interface PlanPromptInput {
  goalTitle: string;
  goalDescription: string;
  refinedIntent: string | null;
  fileTree: string;
  fileContents: Array<{ path: string; content: string }>;
  brainWarnings: string[];
  behavioralSection: string;
  brainPhilosophy: string;
  previousReflection: import('./types').ReflectOutput | null;
  healingContext: string;
  targetPaths: string[] | null;
  domains: Array<{ id: string; name: string }>;
}

function buildPlanPrompt(input: PlanPromptInput): string {
  const {
    goalTitle, goalDescription, refinedIntent, fileTree, fileContents,
    brainWarnings, behavioralSection, brainPhilosophy, previousReflection,
    healingContext, targetPaths, domains,
  } = input;

  const sections: string[] = [];

  // Role
  sections.push(`You are a senior development lead planning implementation tasks for an autonomous coding pipeline. Your task list will be executed by AI agents with access to the full codebase.`);

  // Goal
  sections.push(`## Goal\n\n**${goalTitle}**\n\n${goalDescription}`);

  // Refined intent (if user answered questions)
  if (refinedIntent) {
    sections.push(`## Refined Intent\n\nThe user provided additional clarifications:\n\n${refinedIntent}`);
  }

  // Previous cycle reflection (cycle 2+)
  if (previousReflection) {
    sections.push(`## Previous Cycle Results\n\nThe previous cycle produced these results:\n\n**Summary:** ${previousReflection.summary}\n\n**Lessons learned:**\n${previousReflection.lessonsLearned.map(l => `- ${l}`).join('\n')}\n\n**Brain feedback:** ${previousReflection.brainFeedback}\n\nBuild on what worked. Fix what failed. Do NOT repeat tasks that already completed successfully.`);
  }

  // Brain warnings
  if (brainWarnings.length > 0) {
    sections.push(`## Brain Warnings (Active Constraints)\n\nThese patterns have been learned from previous runs. Apply them as constraints:\n\n${brainWarnings.map(w => `- ${w}`).join('\n')}`);
  }

  // Brain philosophy (compact)
  if (brainPhilosophy) {
    sections.push(brainPhilosophy);
  }

  // Behavioral context
  if (behavioralSection) {
    sections.push(behavioralSection);
  }

  // Healing context
  if (healingContext) {
    sections.push(`## Healing Context\n\nPrevious errors and patches to be aware of:\n\n${healingContext}`);
  }

  // Knowledge Base context (architectural patterns & decisions)
  const kbSection = getKBContextForPlan(goalTitle, goalDescription);
  if (kbSection) {
    sections.push(kbSection);
  }

  // Codebase context
  const filesSection = fileContents.length > 0
    ? fileContents.map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
    : 'No specific file contents available.';

  sections.push(`## Codebase Context\n\n### File Tree\n\`\`\`\n${fileTree}\n\`\`\`\n\n### Key Files\n${filesSection}`);

  // Target paths constraint
  if (targetPaths && targetPaths.length > 0) {
    sections.push(`## Target Path Constraint\n\nOnly plan tasks that modify files under these paths:\n${targetPaths.map(p => `- \`${p}\``).join('\n')}`);
  }

  // Available domains
  if (domains.length > 0) {
    sections.push(`## Available Project Domains\n\n${domains.map(d => `- "${d.name}" (${d.id})`).join('\n')}`);
  }

  // Output format
  sections.push(`## Output Format

Generate an ordered task list. Each task should be a self-contained unit of work that an AI coding agent can execute independently.

Respond with ONLY valid JSON (no markdown fences):

{
  "rationale": "Brief explanation of your planning approach",
  "tasks": [
    {
      "title": "Short imperative task title",
      "description": "Detailed description of what to implement. Include specific file paths, function signatures, and expected behavior. The more detail, the better the execution.",
      "targetFiles": ["src/path/to/file.ts"],
      "complexity": 1,
      "dependsOn": []
    },
    {
      "title": "Second task that depends on the first",
      "description": "Detailed description...",
      "targetFiles": ["src/path/to/other.ts"],
      "complexity": 2,
      "dependsOn": ["task_0"]
    }
  ]
}

## Rules

1. **complexity**: 1 = simple (< 50 LOC, single file), 2 = moderate (50-200 LOC, 2-3 files), 3 = complex (200+ LOC, architectural)
2. **dependsOn**: Reference task IDs as "task_0", "task_1", etc. (by array index). Tasks with no dependencies can run in parallel.
3. **targetFiles**: List ALL files the task will create or modify. This is critical for parallel scheduling — tasks touching the same files will be serialized.
4. **Granularity**: Each task should take an AI agent 5-30 minutes. Split large features into smaller tasks. Merge trivial related changes into one task.
5. **Order**: Tasks are ordered by dependency — earlier tasks before later ones.
6. **Max tasks**: Aim for 3-8 tasks per cycle. More than 10 suggests the goal needs splitting.
7. Do NOT include testing-only tasks or documentation-only tasks unless the goal explicitly asks for them.
8. Be specific about implementation details — vague descriptions lead to poor execution.`);

  return sections.join('\n\n');
}

// ============================================================================
// Response Parser
// ============================================================================

function parsePlanResponse(responseText: string, brainWarnings: string[]): PlanOutput {
  try {
    // Strip code fences if present
    let cleaned = responseText;
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) cleaned = fenceMatch[1];

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[v3:plan] No JSON object found in LLM response');
      return { tasks: [], rationale: 'Failed to parse plan response', brainWarningsApplied: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const rationale = String(parsed.rationale || 'No rationale provided');
    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];

    const tasks: V3Task[] = rawTasks
      .filter((t: Record<string, unknown>) => t && typeof t.title === 'string')
      .map((t: Record<string, unknown>, index: number) => {
        const id = `task_${index}`;
        return {
          id,
          title: String(t.title),
          description: String(t.description || ''),
          targetFiles: Array.isArray(t.targetFiles) ? t.targetFiles.map(String) : [],
          complexity: validateComplexity(t.complexity),
          dependsOn: parseDependsOn(t.dependsOn, index),
          status: 'pending' as const,
        };
      });

    // Assign stable UUIDs (keep task_N as logical IDs, add UUID for DB)
    for (const task of tasks) {
      task.id = uuidv4();
    }

    // Remap dependsOn from task_N references to actual UUIDs
    const indexToId = new Map<number, string>();
    tasks.forEach((t, i) => indexToId.set(i, t.id));

    for (const task of tasks) {
      task.dependsOn = (task.dependsOn as unknown as number[])
        .map(depIdx => indexToId.get(depIdx))
        .filter((id): id is string => id !== undefined);
    }

    return {
      tasks,
      rationale,
      brainWarningsApplied: brainWarnings,
    };
  } catch (error) {
    console.error('[v3:plan] Failed to parse plan response:', error);
    return { tasks: [], rationale: 'Parse error', brainWarningsApplied: [] };
  }
}

// ============================================================================
// Validation Helpers
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
    .filter(idx => idx >= 0 && idx < currentIndex); // Only allow earlier tasks
}

function buildFallbackOutput(goalTitle: string, goalDescription: string): PlanOutput {
  return {
    tasks: [{
      id: uuidv4(),
      title: goalTitle,
      description: goalDescription,
      targetFiles: [],
      complexity: 2,
      dependsOn: [],
      status: 'pending',
    }],
    rationale: 'Fallback: LLM plan failed, using goal as single task',
    brainWarningsApplied: [],
  };
}

// ============================================================================
// Context Helpers (dynamic import to avoid circular deps)
// ============================================================================

function getKBContextForPlan(goalTitle: string, goalDescription: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { knowledgeBaseService } = require('@/lib/knowledge-base/knowledgeBaseService');
    const entries = knowledgeBaseService.getRelevantForTask({
      taskTitle: goalTitle,
      taskDescription: goalDescription,
      limit: 10,
    });
    if (entries.length === 0) return '';
    return knowledgeBaseService.formatKBForPrompt(entries);
  } catch (err) {
    console.warn('[v3:plan] KB context retrieval failed:', err);
    return '';
  }
}

function getProjectContexts(projectId: string): Array<{ id: string; name: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { contextDb } = require('@/app/db');
    const contexts = contextDb.getContextsByProjectId(projectId);
    if (!Array.isArray(contexts)) return [];
    return contexts.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}
