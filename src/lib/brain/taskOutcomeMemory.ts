/**
 * Task-Outcome → CLI Memory producer
 *
 * Every TaskRunner CLI execution ends with rich outcome data (status, files
 * touched, duration, error) that previously died with the in-memory run. This
 * helper distils a finished run into ONE bounded `cli_memory` behavioral signal
 * so the next execution in the same context can be reminded of it — e.g.
 * "last run in this context failed on X". The signal carries a per-category
 * weight, so the standard decay pass ages it out (no unbounded growth).
 *
 * Kept as a small, pure-ish helper (single side effect: recordCliMemory) so the
 * domain subscriber stays thin and the producer is directly unit-testable.
 */

import { signalCollector } from '@/lib/brain/signalCollector';
import type { CliMemorySignalData } from '@/app/db/models/brain.types';
import {
  CLI_MEMORY_MAX_MESSAGE_CHARS,
  CLI_MEMORY_MAX_ERROR_CHARS,
  CLI_MEMORY_MAX_FILES,
} from '@/lib/brain/config';

export interface TaskOutcomeMemoryInput {
  projectId: string;
  requirementName: string;
  success: boolean;
  durationMs?: number | null;
  filesModified?: string[];
  error?: string | null;
  contextId?: string | null;
  contextName?: string | null;
}

/** Collapse whitespace and hard-truncate to `max` chars with an ellipsis. */
function clamp(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Build the bounded cli_memory payload for a finished task. Exported for tests
 * and callers that want the shape without recording.
 */
export function buildTaskOutcomeMemory(input: TaskOutcomeMemoryInput): CliMemorySignalData {
  const { requirementName, success, durationMs, filesModified, error } = input;

  const name = clamp(requirementName || 'task', 80);
  const secs = durationMs && durationMs > 0 ? ` in ${Math.round(durationMs / 1000)}s` : '';
  const fileCount = filesModified?.length ?? 0;
  const filesPart = fileCount > 0 ? `, touched ${fileCount} file${fileCount === 1 ? '' : 's'}` : '';

  let message = `Last run "${name}" ${success ? 'completed' : 'failed'}${secs}${filesPart}.`;
  if (!success && error) {
    message += ` Error: ${clamp(String(error), CLI_MEMORY_MAX_ERROR_CHARS)}`;
  }

  return {
    // Failures are lessons (higher influence); successes are context breadcrumbs.
    category: success ? 'context' : 'lesson',
    message: clamp(message, CLI_MEMORY_MAX_MESSAGE_CHARS),
    source: 'claude_code_cli',
    sessionContext: clamp(requirementName || '', 120) || undefined,
    files: fileCount > 0 ? (filesModified as string[]).slice(0, CLI_MEMORY_MAX_FILES) : undefined,
  };
}

/**
 * Record a bounded cli_memory signal for a finished CLI task. Best-effort:
 * signal recording must never break the execution flow (recordCliMemory already
 * swallows its own errors, but we guard the build step too).
 */
export function recordTaskOutcomeMemory(input: TaskOutcomeMemoryInput): void {
  try {
    const data = buildTaskOutcomeMemory(input);
    signalCollector.recordCliMemory(
      input.projectId,
      data,
      input.contextId || undefined,
      input.contextName || undefined,
    );
  } catch {
    // Producing a memory must never break the main flow.
  }
}
