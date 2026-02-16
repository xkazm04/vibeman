/**
 * Cloud Execution Engine
 *
 * Delegates persona execution to the DAC Cloud orchestrator via HTTP API.
 * Polls for output and writes to the same globalThis buffers used by the
 * local execution engine, so existing SSE streaming works unchanged.
 */

import { assemblePrompt } from './promptAssembler';
import { cloudClient } from './cloudClient';
import { personaMessageRepository, personaRepository } from '@/app/db/repositories/persona.repository';
import { deliverMessage } from './messageDelivery';
import type { ExecutionInput, ExecutionResult } from './executionEngine';

const g = globalThis as any;

/** Same buffer used by local engine — SSE route reads from this */
const executionBuffers: Map<string, string[]> =
  (g.__personaExecutionBuffers ??= new Map<string, string[]>());

/** Track cloud execution IDs for cancellation */
const cloudExecutionIds: Map<string, string> =
  (g.__personaCloudExecutionIds ??= new Map<string, string>());

const MAX_BUFFER_LINES = 1000;
const POLL_INTERVAL_MS = 1000;

function appendOutput(executionId: string, line: string) {
  const buffer = executionBuffers.get(executionId);
  if (buffer) {
    buffer.push(line);
    if (buffer.length > MAX_BUFFER_LINES) {
      buffer.splice(0, buffer.length - MAX_BUFFER_LINES);
    }
  }
}

/**
 * Execute a persona task via the cloud orchestrator.
 * Matches the contract of executePersona() from executionEngine.ts.
 */
export async function executePersonaCloud(input: ExecutionInput): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Initialize output buffer (same as local engine)
  executionBuffers.set(input.executionId, []);

  appendOutput(input.executionId, `[CLOUD] Starting cloud execution for ${input.persona.name}...`);

  try {
    // Resolve credentials for prompt assembly
    // In cloud mode, we can't write temp credential files (worker is remote).
    // For now, pass empty credential paths — tool scripts requiring credentials
    // won't work in cloud mode until credential forwarding is implemented in Phase 3.
    const credentialFilePaths = new Map<string, string>();

    // Assemble prompt (same as local engine)
    const prompt = assemblePrompt({
      persona: input.persona,
      tools: input.tools,
      inputData: input.inputData,
      credentialFilePaths,
      lastExecution: input.lastExecution,
      triggerContext: input.triggerContext,
    });

    appendOutput(input.executionId, `[CLOUD] Prompt assembled (${prompt.length} chars), submitting to orchestrator...`);

    // Submit to orchestrator
    const { executionId: cloudExecId } = await cloudClient.submitExecution(
      prompt,
      input.persona.id,
      input.persona.timeout_ms || 300_000,
    );

    // Track cloud execution ID for cancellation
    cloudExecutionIds.set(input.executionId, cloudExecId);

    appendOutput(input.executionId, `[CLOUD] Execution queued (cloud ID: ${cloudExecId})`);

    // Poll for output
    let offset = 0;
    let assistantText = '';

    while (true) {
      await sleep(POLL_INTERVAL_MS);

      let exec;
      try {
        exec = await cloudClient.getExecution(cloudExecId, offset);
      } catch (err) {
        appendOutput(input.executionId, `[CLOUD] Poll error: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }

      // Append new output lines to buffer
      if (exec.output.length > 0) {
        for (const line of exec.output) {
          appendOutput(input.executionId, line);

          // Mid-stream persona protocol detection (same as local engine)
          try {
            const trimmed = line.trim();
            if (trimmed.startsWith('{"user_message":')) {
              handleUserMessage(trimmed, input);
            } else if (trimmed.startsWith('{"persona_action":')) {
              handlePersonaAction(trimmed, input);
            } else if (trimmed.startsWith('{"emit_event":')) {
              handleEmitEvent(trimmed, input);
            }
          } catch { /* event parsing not critical */ }

          assistantText += line + '\n';
        }
        offset += exec.output.length;
      }

      // Check for terminal status
      if (exec.status === 'completed' || exec.status === 'failed' || exec.status === 'cancelled') {
        const durationMs = exec.durationMs || (Date.now() - startTime);
        const success = exec.status === 'completed';

        appendOutput(input.executionId, `[CLOUD] Execution ${exec.status} (${durationMs}ms)`);

        // Parse manual reviews from accumulated text (same as local engine)
        parseManualReviewsFromCloud(assistantText, input.executionId, input.persona.id);

        // Publish execution_completed event (same as local engine)
        publishCompletionEvent(input, success, durationMs);

        // Clean up cloud tracking
        cloudExecutionIds.delete(input.executionId);

        return {
          success,
          output: success ? (assistantText || 'Execution completed') : undefined,
          error: success ? undefined : `Cloud execution ${exec.status}`,
          claudeSessionId: exec.sessionId,
          durationMs,
        };
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    appendOutput(input.executionId, `[CLOUD] Error: ${msg}`);
    cloudExecutionIds.delete(input.executionId);

    return {
      success: false,
      error: `Cloud execution error: ${msg}`,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Cancel a cloud execution.
 */
export function cancelCloudExecution(executionId: string): boolean {
  const cloudExecId = cloudExecutionIds.get(executionId);
  if (cloudExecId) {
    cloudClient.cancelExecution(cloudExecId).catch(() => {});
    cloudExecutionIds.delete(executionId);
    return true;
  }
  return false;
}

// --- Persona protocol handlers (mirrored from executionEngine.ts) ---

function handleUserMessage(trimmed: string, input: ExecutionInput) {
  const msgData = JSON.parse(trimmed);
  if (msgData.user_message && typeof msgData.user_message === 'object') {
    const msg = msgData.user_message;
    const created = personaMessageRepository.create({
      persona_id: input.persona.id,
      execution_id: input.executionId,
      title: msg.title || undefined,
      content: msg.content || 'No content',
      content_type: msg.content_type || 'text',
      priority: ['low', 'normal', 'high'].includes(msg.priority) ? msg.priority : 'normal',
    });
    deliverMessage(created.id, input.persona.id).catch(() => {});
  }
}

function handlePersonaAction(trimmed: string, input: ExecutionInput) {
  const actionData = JSON.parse(trimmed);
  if (actionData.persona_action?.target) {
    const targetName = actionData.persona_action.target;
    const allPersonas = personaRepository.getAll();
    const targetPersona = allPersonas.find((p: any) => p.name === targetName);
    if (targetPersona) {
      const { personaEventBus } = require('./eventBus');
      const parentEvt = (input.inputData as Record<string, unknown> | undefined)?._event as
        | { _meta?: { depth?: number } } | undefined;
      const curDepth = (parentEvt?._meta?.depth as number) ?? 0;
      personaEventBus.publish({
        event_type: 'persona_action' as const,
        source_type: 'persona' as const,
        source_id: input.persona.id,
        target_persona_id: targetPersona.id,
        project_id: input.persona.project_id,
        payload: {
          ...actionData.persona_action,
          _meta: { depth: curDepth + 1, source_persona_id: input.persona.id },
        },
      });
    }
  }
}

function handleEmitEvent(trimmed: string, input: ExecutionInput) {
  const eventData = JSON.parse(trimmed);
  if (eventData.emit_event) {
    const { personaEventBus } = require('./eventBus');
    const parentEvt = (input.inputData as Record<string, unknown> | undefined)?._event as
      | { _meta?: { depth?: number } } | undefined;
    const curDepth = (parentEvt?._meta?.depth as number) ?? 0;
    personaEventBus.publish({
      event_type: 'custom' as const,
      source_type: 'persona' as const,
      source_id: input.persona.id,
      target_persona_id: null,
      project_id: input.persona.project_id,
      payload: {
        ...eventData.emit_event,
        _meta: { depth: curDepth + 1, source_persona_id: input.persona.id },
      },
    });
  }
}

function parseManualReviewsFromCloud(text: string, executionId: string, personaId: string) {
  if (!text) return;
  const regex = /\{"manual_review"\s*:\s*\{[^}]*\}\}/g;
  const matches = text.match(regex);
  if (!matches) return;

  const { manualReviewRepository } = require('@/app/db/repositories/persona.repository');
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      if (parsed.manual_review) {
        manualReviewRepository.create({
          persona_id: personaId,
          execution_id: executionId,
          title: parsed.manual_review.title || 'Manual Review',
          description: parsed.manual_review.description || '',
          severity: parsed.manual_review.severity || 'medium',
          suggested_actions: JSON.stringify(parsed.manual_review.suggested_actions || []),
        });
      }
    } catch { /* ignore parse errors */ }
  }
}

function publishCompletionEvent(input: ExecutionInput, success: boolean, durationMs: number) {
  try {
    const { personaEventBus } = require('./eventBus');
    const parentMeta = (input.inputData as Record<string, unknown> | undefined)?._event as
      | { _meta?: { depth?: number } } | undefined;
    const newDepth = ((parentMeta?._meta?.depth as number) ?? 0) + 1;
    personaEventBus.publish({
      event_type: 'execution_completed' as const,
      source_type: 'execution' as const,
      source_id: input.executionId,
      target_persona_id: input.persona.id,
      project_id: input.persona.project_id,
      payload: {
        status: success ? 'completed' : 'failed',
        duration_ms: durationMs,
        _meta: { depth: newDepth, source_persona_id: input.persona.id },
      },
    });
  } catch { /* event bus not critical */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
