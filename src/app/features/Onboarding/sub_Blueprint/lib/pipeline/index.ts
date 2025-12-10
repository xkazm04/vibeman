/**
 * Pipeline Module
 * Exports reusable pipeline utilities for Claude Code integration
 */

export { executePipeline, executeFireAndForget, createRequirementOnly } from './claudeCodePipeline';
export type { PipelineConfig, PipelineResult, PipelineContext, PipelineStep } from './types';
