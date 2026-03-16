/**
 * Stage Contract Type Tests (FOUND-02)
 *
 * Validates that the StageIO discriminated union enforces per-stage
 * type safety at compile time.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  StageInput,
  StageOutput,
  StageFn,
  GoalInput,
  PipelineContext,
  ScoutInput,
  ScoutResult,
  TriageInput,
  TriageResult,
  BatchInput,
  BatchDescriptor,
  ExecuteInput,
  ExecutionResult,
  ReviewInput,
  ReviewDecision,
  PipelineRun,
  PipelineStatus,
} from '@/app/features/Conductor/lib/types';

describe('Stage Contract Types (FOUND-02)', () => {
  it('StageInput type resolves correctly per stage', () => {
    expectTypeOf<StageInput<'scout'>>().toEqualTypeOf<ScoutInput>();
    expectTypeOf<StageInput<'triage'>>().toEqualTypeOf<TriageInput>();
    expectTypeOf<StageInput<'batch'>>().toEqualTypeOf<BatchInput>();
    expectTypeOf<StageInput<'execute'>>().toEqualTypeOf<ExecuteInput>();
    expectTypeOf<StageInput<'review'>>().toEqualTypeOf<ReviewInput>();
  });

  it('StageOutput type resolves correctly per stage', () => {
    expectTypeOf<StageOutput<'scout'>>().toEqualTypeOf<ScoutResult>();
    expectTypeOf<StageOutput<'triage'>>().toEqualTypeOf<TriageResult>();
    expectTypeOf<StageOutput<'batch'>>().toEqualTypeOf<BatchDescriptor>();
    expectTypeOf<StageOutput<'execute'>>().toEqualTypeOf<ExecutionResult[]>();
    expectTypeOf<StageOutput<'review'>>().toEqualTypeOf<ReviewDecision>();
  });

  it('StageFn enforces input/output contract', () => {
    // A valid scout function should accept ScoutInput and return ScoutResult
    type ValidScoutFn = StageFn<'scout'>;
    expectTypeOf<ValidScoutFn>().toBeFunction();
    expectTypeOf<ValidScoutFn>().parameter(0).toEqualTypeOf<PipelineContext>();
    expectTypeOf<ValidScoutFn>().parameter(1).toEqualTypeOf<ScoutInput>();

    // @ts-expect-error - ScoutInput should not be assignable to TriageInput
    const _wrongInput: StageInput<'triage'> = {} as StageInput<'scout'>;
  });

  it('GoalInput has all required constraint fields', () => {
    expectTypeOf<GoalInput>().toHaveProperty('title');
    expectTypeOf<GoalInput>().toHaveProperty('description');
    expectTypeOf<GoalInput>().toHaveProperty('targetPaths');
    expectTypeOf<GoalInput>().toHaveProperty('excludedPaths');
    expectTypeOf<GoalInput>().toHaveProperty('maxSessions');
    expectTypeOf<GoalInput>().toHaveProperty('priority');
    expectTypeOf<GoalInput>().toHaveProperty('checkpointConfig');
    expectTypeOf<GoalInput>().toHaveProperty('useBrain');
  });

  it('PipelineRun has goalId field', () => {
    expectTypeOf<PipelineRun>().toHaveProperty('goalId');
    expectTypeOf<PipelineRun['goalId']>().toBeString();
  });

  it('PipelineStatus includes queued value', () => {
    const queued: PipelineStatus = 'queued';
    expect(queued).toBe('queued');
  });

  it('PipelineContext has required fields', () => {
    expectTypeOf<PipelineContext>().toHaveProperty('runId');
    expectTypeOf<PipelineContext>().toHaveProperty('projectId');
    expectTypeOf<PipelineContext>().toHaveProperty('goalId');
    expectTypeOf<PipelineContext>().toHaveProperty('config');
  });
});
