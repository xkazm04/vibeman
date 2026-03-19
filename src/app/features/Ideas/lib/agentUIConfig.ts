/**
 * Agent UI Configuration — colors, emojis, labels for rendering
 *
 * Extracts visual/display properties from AGENT_REGISTRY for UI components.
 * All data derives from AGENT_REGISTRY (single source of truth).
 */

import { AGENT_REGISTRY, type ScanType, type AgentCategory, type AgentDefinition } from './agentRegistry';

/** Get display name for a scan type */
export function getScanTypeName(scanType: ScanType): string {
  return AGENT_REGISTRY[scanType]?.label ?? scanType;
}

/** Get abbreviation for a scan type */
export function getScanTypeAbbr(scanType: ScanType): string {
  return AGENT_REGISTRY[scanType]?.abbr ?? scanType.slice(0, 2);
}

/** Get example outputs for a scan type */
export function getAgentExamples(scanType: ScanType): string[] {
  return AGENT_REGISTRY[scanType]?.examples ?? [];
}

/** Get all agent definitions grouped by category for UI rendering */
export function getAgentsByCategory(category: AgentCategory): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY).filter(a => a.category === category);
}
