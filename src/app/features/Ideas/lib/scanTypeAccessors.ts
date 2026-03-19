/**
 * Scan Type Accessors — lookup helpers and derived constants
 *
 * Generic accessor functions for querying AGENT_REGISTRY.
 * All data derives from AGENT_REGISTRY (single source of truth).
 */

import { AGENT_REGISTRY, type ScanType, type AgentDefinition } from './agentRegistry';

/** Get an agent definition by ScanType. */
export function getAgent(scanType: ScanType): AgentDefinition {
  return AGENT_REGISTRY[scanType];
}

/** Get all agent definitions as an array. */
export function getAllAgents(): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY);
}

/** Get all valid scan type values */
export const ALL_SCAN_TYPES: ScanType[] = Object.keys(AGENT_REGISTRY) as ScanType[];

/** Check if a string is a valid scan type */
export function isValidScanType(value: string): value is ScanType {
  return value in AGENT_REGISTRY;
}

/** Abbreviation to ScanType lookup map (for fast lookups) */
export const ABBR_TO_SCAN_TYPE: Record<string, ScanType> = Object.fromEntries(
  Object.values(AGENT_REGISTRY).map(a => [a.abbr, a.id])
);
