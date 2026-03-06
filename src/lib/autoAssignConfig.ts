/**
 * Auto-Assign Configuration
 *
 * Types and helpers for reading/writing auto-assign rules.
 * Config is stored as a JSON file on disk (local-only app).
 */

import type { CLIProvider, CLIModel } from '@/lib/claude-terminal/types';

export interface AutoAssignRuleConditions {
  effort: number; // Max effort threshold (e.g. 1 = trivial only)
  risk: number;   // Max risk threshold (e.g. 1 = trivial only)
}

export interface AutoAssignRule {
  enabled: boolean;
  conditions?: AutoAssignRuleConditions; // Only for conditional rules like gemini
  provider: CLIProvider | null;          // null = don't change provider
  model: CLIModel | null;               // null = use provider default
}

export interface AutoAssignConfig {
  geminiRule: AutoAssignRule;
  defaultRule: AutoAssignRule;
  maxTasksPerSession: number;
  consolidateBeforeAssign: boolean;
}

export const DEFAULT_AUTO_ASSIGN_CONFIG: AutoAssignConfig = {
  geminiRule: {
    enabled: true,
    conditions: { effort: 1, risk: 1 },
    provider: 'gemini',
    model: null,
  },
  defaultRule: {
    enabled: true,
    provider: null,
    model: null,
  },
  maxTasksPerSession: 10,
  consolidateBeforeAssign: true,
};

/**
 * Fetch auto-assign config from API
 */
export async function fetchAutoAssignConfig(): Promise<AutoAssignConfig> {
  try {
    const res = await fetch('/api/auto-assign-config');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall through to default
  }
  return DEFAULT_AUTO_ASSIGN_CONFIG;
}

/**
 * Save auto-assign config via API
 */
export async function saveAutoAssignConfig(config: AutoAssignConfig): Promise<boolean> {
  try {
    const res = await fetch('/api/auto-assign-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.ok;
  } catch {
    return false;
  }
}
