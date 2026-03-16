/**
 * Report Generator — builds markdown report from a v3 pipeline run
 *
 * Reads metrics, process_log, stages_state, reflection_history, brain_qa
 * from the DB row and renders a structured markdown document.
 */

import type { DbPipelineRun } from '../conductor.repository';
import type { V3Metrics, V3Task, ReflectOutput, V3ProcessLogEntry } from './types';
import type { ProcessLogEntry } from '../types';

interface GoalInfo {
  title: string;
  description: string;
}

/**
 * Decision extracted from pipeline data for the rating UI
 */
export interface PipelineDecision {
  id: string;
  type: 'task' | 'architectural' | 'routing';
  title: string;
  context: string;
  cycle: number;
  outcome?: 'completed' | 'failed' | string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Extract decisions from pipeline data for the rating panel
 */
export function extractDecisions(run: DbPipelineRun, goal: GoalInfo): PipelineDecision[] {
  const decisions: PipelineDecision[] = [];
  let decisionIndex = 0;

  // Parse stages for task data
  const stages = run.stages as Record<string, unknown>;

  // Parse process log for cycle info
  let processLog: (ProcessLogEntry | V3ProcessLogEntry)[] = [];
  try {
    processLog = typeof run.process_log === 'string'
      ? JSON.parse(run.process_log || '[]')
      : [];
  } catch { /* empty */ }

  // Extract task-level decisions from plan phase details
  for (const entry of processLog) {
    if (entry.stage === 'plan' && entry.event === 'completed') {
      // Plan phase completed — tasks were chosen
      const details = (entry as V3ProcessLogEntry & { details?: Record<string, unknown> }).details;
      if (details && Array.isArray(details.tasks)) {
        for (const task of details.tasks as V3Task[]) {
          decisionIndex++;
          decisions.push({
            id: `d${decisionIndex}`,
            type: 'task',
            title: task.title,
            context: `Planned with complexity ${task.complexity}, targeting ${task.targetFiles?.join(', ') || 'unspecified files'}`,
            cycle: entry.cycle ?? 1,
            outcome: task.status,
          });
        }
      }
    }
  }

  // Extract architectural decisions from reflect phase
  // Parse the stages for details containing reflection data
  for (const key of Object.keys(stages)) {
    const stageData = stages[key] as Record<string, unknown> | undefined;
    if (key === 'reflect' && stageData?.details) {
      const details = stageData.details as Record<string, unknown>;
      const reflections = details.reflections as ReflectOutput[] | undefined;
      if (Array.isArray(reflections)) {
        for (const reflection of reflections) {
          decisionIndex++;
          decisions.push({
            id: `d${decisionIndex}`,
            type: 'architectural',
            title: `Reflection decision: ${reflection.status}`,
            context: reflection.summary || 'No summary provided',
            cycle: 0,
            outcome: reflection.status,
          });

          // Lessons learned are also decisions
          if (reflection.lessonsLearned?.length) {
            for (const lesson of reflection.lessonsLearned) {
              decisionIndex++;
              decisions.push({
                id: `d${decisionIndex}`,
                type: 'architectural',
                title: `Lesson: ${lesson.slice(0, 80)}${lesson.length > 80 ? '...' : ''}`,
                context: lesson,
                cycle: 0,
              });
            }
          }
        }
      }
    }

    // Extract routing decisions from dispatch details
    if (key === 'dispatch' && stageData?.details) {
      const details = stageData.details as Record<string, unknown>;
      const tasks = details.tasks as V3Task[] | undefined;
      if (Array.isArray(tasks)) {
        for (const task of tasks) {
          if (task.result) {
            decisionIndex++;
            decisions.push({
              id: `d${decisionIndex}`,
              type: 'routing',
              title: `Routed "${task.title}" to ${task.result.provider}/${task.result.model}`,
              context: `Complexity ${task.complexity}, ${task.result.success ? 'completed' : 'failed'} in ${formatDuration(task.result.durationMs)}`,
              cycle: 0,
              outcome: task.result.success ? 'completed' : 'failed',
            });
          }
        }
      }
    }
  }

  // If no decisions were extracted from details, generate from process log events
  if (decisions.length === 0) {
    for (const entry of processLog) {
      if (entry.event === 'completed' || entry.event === 'failed') {
        decisionIndex++;
        decisions.push({
          id: `d${decisionIndex}`,
          type: 'task',
          title: `${entry.stage}: ${entry.message}`,
          context: `Phase ${entry.stage} ${entry.event}`,
          cycle: entry.cycle ?? 1,
          outcome: entry.event,
        });
      }
    }
  }

  return decisions;
}

/**
 * Generate a full markdown report from a conductor run
 */
export function generateV3Report(run: DbPipelineRun, goal: GoalInfo): string {
  // Parse V3 metrics
  const metrics = run.metrics as unknown as V3Metrics;
  const successRate = (metrics.tasksCompleted + metrics.tasksFailed) > 0
    ? Math.round((metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) * 100)
    : 0;

  // Parse process log
  let processLog: (ProcessLogEntry | V3ProcessLogEntry)[] = [];
  try {
    processLog = typeof run.process_log === 'string'
      ? JSON.parse(run.process_log || '[]')
      : [];
  } catch { /* empty */ }

  // Extract decisions for the decisions table
  const decisions = extractDecisions(run, goal);

  // Parse error classifications
  let errorClassifications: Array<{ errorType: string; count: number; stage: string; message?: string }> = [];
  try {
    const rawRow = run as unknown as Record<string, unknown>;
    if (rawRow.error_classifications) {
      errorClassifications = JSON.parse(rawRow.error_classifications as string);
    }
  } catch { /* empty */ }

  // Build markdown
  const lines: string[] = [];

  // Header
  lines.push('# Conductor Run Report');
  lines.push('');
  lines.push(`**Goal:** ${goal.title}`);
  lines.push(`**Status:** ${run.status} | **Cycles:** ${metrics.totalCycles || run.cycle} | **Duration:** ${formatDuration(metrics.totalDurationMs)}`);
  lines.push(`**Cost:** $${metrics.estimatedCost?.toFixed(4) || '0.0000'} | **Started:** ${run.started_at ? formatDate(run.started_at) : 'N/A'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Tasks planned:** ${metrics.tasksPlanned || 0}`);
  lines.push(`- **Tasks completed:** ${metrics.tasksCompleted || 0} (${successRate}%)`);
  lines.push(`- **Tasks failed:** ${metrics.tasksFailed || 0}`);
  lines.push(`- **LLM calls:** ${metrics.llmCallCount || 0}`);
  lines.push(`- **Healing patches applied:** ${metrics.healingPatchesApplied || 0}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Cycle Details — group process log by cycle
  lines.push('## Cycle Details');
  lines.push('');

  const maxCycle = metrics.totalCycles || run.cycle || 1;
  for (let c = 1; c <= maxCycle; c++) {
    lines.push(`### Cycle ${c}`);
    lines.push('');

    const cycleEntries = processLog.filter((e) => e.cycle === c);
    const planEntries = cycleEntries.filter((e) => e.stage === 'plan');
    const dispatchEntries = cycleEntries.filter((e) => e.stage === 'dispatch');
    const reflectEntries = cycleEntries.filter((e) => e.stage === 'reflect');

    // Plan Phase
    lines.push('#### Plan Phase');
    if (planEntries.length > 0) {
      for (const entry of planEntries) {
        lines.push(`- ${entry.message}`);
      }
    } else {
      lines.push('_No plan data recorded for this cycle._');
    }
    lines.push('');

    // Dispatch Phase
    lines.push('#### Dispatch Phase');
    if (dispatchEntries.length > 0) {
      lines.push('| Event | Status | Message |');
      lines.push('|-------|--------|---------|');
      for (const entry of dispatchEntries) {
        lines.push(`| ${entry.stage} | ${entry.event} | ${entry.message} |`);
      }
    } else {
      lines.push('_No dispatch data recorded for this cycle._');
    }
    lines.push('');

    // Reflect Phase
    lines.push('#### Reflect Phase');
    if (reflectEntries.length > 0) {
      for (const entry of reflectEntries) {
        lines.push(`- **${entry.event}:** ${entry.message}`);
      }
    } else {
      lines.push('_No reflection data recorded for this cycle._');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Decisions & Directions
  lines.push('## Decisions & Directions');
  lines.push('');
  lines.push('These are the major decisions the pipeline made. Rate them to improve future runs.');
  lines.push('');

  if (decisions.length > 0) {
    lines.push('| # | Decision | Context | Outcome |');
    lines.push('|---|----------|---------|---------|');
    for (const d of decisions) {
      lines.push(`| ${d.id.replace('d', '')} | ${d.title} | ${d.context} | ${d.outcome || '-'} |`);
    }
  } else {
    lines.push('_No major decisions recorded for this run._');
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Error Summary
  lines.push('## Error Summary');
  lines.push('');
  if (errorClassifications.length > 0) {
    lines.push('| Error Type | Count | Stage | Message |');
    lines.push('|------------|-------|-------|---------|');
    for (const err of errorClassifications) {
      lines.push(`| ${err.errorType} | ${err.count} | ${err.stage} | ${err.message || '-'} |`);
    }
  } else if (run.status === 'failed') {
    const rawRow = run as unknown as Record<string, unknown>;
    lines.push(`Pipeline failed: ${rawRow.error_message || 'Unknown error'}`);
  } else {
    lines.push('_No errors recorded._');
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Process Log (collapsed)
  lines.push('## Process Log');
  lines.push('');
  lines.push(`<details>`);
  lines.push(`<summary>Full process log (${processLog.length} entries)</summary>`);
  lines.push('');
  if (processLog.length > 0) {
    lines.push('| Time | Phase | Event | Message |');
    lines.push('|------|-------|-------|---------|');
    for (const entry of processLog) {
      const time = entry.timestamp ? formatTimestamp(entry.timestamp) : '-';
      lines.push(`| ${time} | ${entry.stage} | ${entry.event} | ${entry.message} |`);
    }
  } else {
    lines.push('_No process log entries._');
  }
  lines.push('');
  lines.push('</details>');

  return lines.join('\n');
}
