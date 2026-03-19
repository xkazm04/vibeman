/**
 * Scan Types — barrel re-export
 *
 * Re-exports from the three focused modules:
 * - agentRegistry: types, AGENT_REGISTRY, PromptBuilderRegistry
 * - agentUIConfig: display helpers (names, abbrs, examples, categories)
 * - scanTypeAccessors: lookup helpers (getAgent, getAllAgents, validation)
 */

// Types and registry
export type {
  ScanType,
  ScanState,
  AgentCategory,
  AgentPromptBuilder,
  AgentDefinition,
} from './agentRegistry';

export {
  AGENT_REGISTRY,
  PromptBuilderRegistry,
  promptBuilderRegistry,
  registerPromptBuilder,
  registerPromptBuilders,
} from './agentRegistry';

// UI config helpers
export {
  getScanTypeName,
  getScanTypeAbbr,
  getAgentExamples,
  getAgentsByCategory,
} from './agentUIConfig';

// Accessors
export {
  getAgent,
  getAllAgents,
  ALL_SCAN_TYPES,
  isValidScanType,
  ABBR_TO_SCAN_TYPE,
} from './scanTypeAccessors';
