import { describe, it, expect, afterEach } from 'vitest';
import { buildTaskOutcomeMemory, recordTaskOutcomeMemory } from './taskOutcomeMemory';
import { assembleTaskContext } from './taskContextAssembler';
import { buildExecutionPrompt } from '@/app/Claude/sub_ClaudeCodeManager/executionPrompt';
import { behavioralSignalRepository } from '@/app/db/repositories/behavioral-signal.repository';
import { getHotWritesDatabase } from '@/app/db/hot-writes';
import { SignalType } from '@/types/signals';
import { CLI_MEMORY_MAX_MESSAGE_CHARS } from './config';

/**
 * Direction 1 — "The fleet remembers".
 * A finished CLI task must emit ONE bounded cli_memory signal, and the assembler
 * must read recent cli_memory back into the execution prompt so the next run in a
 * context is reminded of prior outcomes.
 */
describe('task-outcome cli_memory (the fleet remembers)', () => {
  const projectId = `test-proj-clim-${Date.now()}`;
  const contextId = `ctx-clim-${Date.now()}`;

  afterEach(() => {
    try {
      getHotWritesDatabase().prepare('DELETE FROM behavioral_signals WHERE project_id = ?').run(projectId);
    } catch {
      // ignore cleanup errors
    }
  });

  it('builds a bounded memory payload for a failed run including the error', () => {
    const data = buildTaskOutcomeMemory({
      projectId,
      requirementName: 'Add export button',
      success: false,
      durationMs: 12000,
      filesModified: ['src/a.ts', 'src/b.ts'],
      error: 'TypeError: cannot read property foo of undefined',
    });
    expect(data.category).toBe('lesson'); // failures are lessons (higher weight)
    expect(data.source).toBe('claude_code_cli');
    expect(data.message).toContain('failed');
    expect(data.message).toContain('Error:');
    expect(data.message.length).toBeLessThanOrEqual(CLI_MEMORY_MAX_MESSAGE_CHARS);
    expect(data.files).toEqual(['src/a.ts', 'src/b.ts']);
  });

  it('hard-caps a pathological message and file list', () => {
    const data = buildTaskOutcomeMemory({
      projectId,
      requirementName: 'x'.repeat(500),
      success: false,
      durationMs: 1000,
      filesModified: Array.from({ length: 50 }, (_, i) => `src/f${i}.ts`),
      error: 'y'.repeat(2000),
    });
    expect(data.message.length).toBeLessThanOrEqual(CLI_MEMORY_MAX_MESSAGE_CHARS);
    expect(data.files!.length).toBeLessThanOrEqual(5);
  });

  it('records a bounded cli_memory signal for a completed task (weight > 0 so decay applies)', () => {
    recordTaskOutcomeMemory({
      projectId,
      requirementName: 'Wire dashboard',
      success: true,
      durationMs: 30000,
      filesModified: ['src/dash.tsx'],
      contextId,
    });

    const signals = behavioralSignalRepository.getByProject(projectId, {
      signalType: SignalType.CLI_MEMORY,
      contextId,
    });
    expect(signals.length).toBe(1);
    expect(signals[0].weight).toBeGreaterThan(0);
    const parsed = JSON.parse(signals[0].data!);
    expect(parsed.message).toContain('completed');
    expect(signals[0].context_id).toBe(contextId);
  });

  it('assembleTaskContext injects recent cli_memory for the task context', () => {
    recordTaskOutcomeMemory({
      projectId,
      requirementName: 'Fix auth redirect loop',
      success: false,
      durationMs: 5000,
      error: 'redirect loop detected on /login',
      contextId,
    });

    const section = assembleTaskContext({
      projectId,
      requirementContent: 'Please continue work on the auth flow',
      contextId,
    });
    expect(section).toContain('Recent CLI Run History');
    expect(section).toContain('Fix auth redirect loop');
    expect(section).toContain('failed');
  });

  it('injected cli_memory provably reaches the execution prompt', () => {
    recordTaskOutcomeMemory({
      projectId,
      requirementName: 'Refactor payment webhook',
      success: false,
      durationMs: 8000,
      error: 'signature mismatch',
      contextId,
    });

    const { prompt } = buildExecutionPrompt({
      projectId,
      requirementContent: 'Continue the payment webhook work',
      contextId,
      projectPath: '/tmp/test-proj',
    });
    expect(prompt).toContain('Recent CLI Run History');
    expect(prompt).toContain('Refactor payment webhook');
  });

  it('caps the number of injected memory entries', () => {
    for (let i = 0; i < 12; i++) {
      recordTaskOutcomeMemory({
        projectId,
        requirementName: `Run number ${i} unique task`,
        success: i % 2 === 0,
        durationMs: 1000 + i,
        contextId,
      });
    }
    const section = assembleTaskContext({
      projectId,
      requirementContent: 'more work',
      contextId,
    });
    const lines = section.split('\n').filter(l => l.startsWith('- Run number'));
    expect(lines.length).toBeLessThanOrEqual(5);
  });
});
