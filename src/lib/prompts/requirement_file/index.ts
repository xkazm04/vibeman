/**
 * Requirement File Utilities
 * Exports requirement building and wrapping functions
 *
 * Two wrapper modes available:
 * - Full (wrapRequirementForExecution): ~1780 tokens, includes curl commands for CLI execution
 * - Compact (wrapRequirementForMCP): ~115 tokens, references MCP tools for DualBatchPanel execution
 */

// Full wrapper (for CLI execution - Directions via CompactTerminal)
export { wrapRequirementForExecution, wrapRequirementWithMetadata } from './executionWrapper';
export type { ExecutionWrapperConfig, WrapResult } from './executionWrapper';

// Compact wrapper (for MCP execution - Ideas via DualBatchPanel)
export { wrapRequirementForMCP, wrapRequirementForMCPWithMetadata } from './compactWrapper';
export type { CompactWrapperConfig, CompactWrapResult } from './compactWrapper';

/**
 * Wrapper mode for requirement generation
 * - 'mcp': Compact wrapper with MCP tool references (default for Ideas)
 * - 'full': Full wrapper with curl commands (for CLI/Directions)
 */
export type WrapperMode = 'mcp' | 'full';
