/**
 * Balancing Engine
 *
 * Central decision-making module for the Conductor pipeline.
 * Determines scan types, model routing, and quota management.
 */

import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import type { CLIProvider } from '@/lib/claude-terminal/types';
import type {
  BalancingConfig,
  PipelineMetrics,
  ModelRoutingRule,
} from './types';

// ============================================================================
// Scan Type Selection
// ============================================================================

const ALL_SCAN_TYPES: ScanType[] = [
  'zen_architect', 'bug_hunter', 'perf_optimizer', 'security_protector',
  'insight_synth', 'ambiguity_guardian', 'business_visionary',
  'ui_perfectionist', 'feature_scout', 'tech_innovator',
  'ai_integration_scout', 'delight_designer', 'code_refactor',
  'user_empathy_champion', 'competitor_analyst', 'paradigm_shifter',
  'moonshot_architect', 'dev_experience_engineer', 'data_flow_optimizer',
  'pragmatic_integrator',
];

let rotateIndex = 0;

/**
 * Select scan types based on strategy and brain context.
 */
export function selectScanTypes(
  config: BalancingConfig,
  brainContext?: { topSignals?: Array<{ scanType?: string; weight?: number }> }
): ScanType[] {
  const configTypes = Array.isArray(config.scanTypes) ? config.scanTypes : [];
  const pool = configTypes.length > 0 ? configTypes : ALL_SCAN_TYPES;

  switch (config.scanStrategy) {
    case 'rotate': {
      // Round-robin through configured types
      const selected = pool[rotateIndex % pool.length];
      rotateIndex++;
      return [selected];
    }

    case 'weighted': {
      // Weight by brain signals — scan types with higher recent success get priority
      if (brainContext?.topSignals && brainContext.topSignals.length > 0) {
        const signalTypes = brainContext.topSignals
          .filter((s): s is typeof s & { scanType: string } => !!s.scanType)
          .map((s) => s.scanType as ScanType)
          .filter((t) => pool.includes(t));

        if (signalTypes.length > 0) {
          return signalTypes.slice(0, 3);
        }
      }
      // Fallback to first 2 from pool
      return pool.slice(0, 2);
    }

    case 'brain-driven': {
      // Let brain determine focus area based on behavioral patterns
      if (brainContext?.topSignals && brainContext.topSignals.length > 0) {
        const weighted = brainContext.topSignals
          .filter((s): s is typeof s & { scanType: string; weight: number } =>
            !!s.scanType && typeof s.weight === 'number'
          )
          .sort((a, b) => b.weight - a.weight)
          .map((s) => s.scanType as ScanType)
          .filter((t) => pool.includes(t));

        if (weighted.length > 0) {
          return weighted.slice(0, 3);
        }
      }
      // Fallback: pick a mix of technical + user-facing
      return pool.slice(0, 3);
    }

    default:
      return pool.slice(0, 2);
  }
}

// ============================================================================
// Scan Pair Selection (scanType + context)
// ============================================================================

export interface ScanPair {
  scanType: ScanType;
  contextId: string | null;
  contextName: string | null;
}

interface ContextInfo {
  id: string;
  name: string;
  category?: string;
}

interface BrainContext {
  topSignals?: Array<{ scanType?: string; contextId?: string; weight?: number }>;
}

/**
 * Build (scanType, context) pairs for the scout stage.
 * Each pair is one CLI execution.
 */
export function selectScanPairs(
  config: BalancingConfig,
  contexts: ContextInfo[],
  brainContext?: BrainContext
): ScanPair[] {
  const scanTypes = selectScanTypes(config, brainContext);
  const selectedContexts = selectContexts(config, contexts, brainContext);

  const pairs: ScanPair[] = [];

  for (const scanType of scanTypes) {
    if (selectedContexts.length === 0) {
      // No contexts — full project scan
      pairs.push({ scanType, contextId: null, contextName: null });
    } else {
      for (const ctx of selectedContexts) {
        pairs.push({ scanType, contextId: ctx.id, contextName: ctx.name });
      }
    }
  }

  return pairs;
}

/**
 * Select contexts based on context strategy.
 */
function selectContexts(
  config: BalancingConfig,
  contexts: ContextInfo[],
  brainContext?: BrainContext
): ContextInfo[] {
  if (contexts.length === 0) return [];

  switch (config.contextStrategy) {
    case 'all':
      return contexts;

    case 'selected': {
      const ids = Array.isArray(config.contextIds) ? config.contextIds : [];
      if (ids.length > 0) {
        return contexts.filter((c) => ids.includes(c.id));
      }
      return contexts;
    }

    case 'brain-driven': {
      if (brainContext?.topSignals && brainContext.topSignals.length > 0) {
        const signalContextIds = brainContext.topSignals
          .filter((s) => !!s.contextId)
          .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
          .map((s) => s.contextId!);

        if (signalContextIds.length > 0) {
          const matched = contexts.filter((c) => signalContextIds.includes(c.id));
          if (matched.length > 0) return matched.slice(0, 5);
        }
      }
      // Fallback: first 3 contexts
      return contexts.slice(0, 3);
    }

    default:
      return contexts;
  }
}

// ============================================================================
// Model Routing
// ============================================================================

interface IdeaForRouting {
  effort?: number;
  category?: string;
}

/**
 * Determine which provider/model to use for a specific task.
 */
export function routeModel(
  idea: IdeaForRouting,
  config: BalancingConfig
): { provider: CLIProvider; model: string } {
  const rules = config.modelRouting;

  for (const rule of rules) {
    if (matchesRoutingRule(rule, idea)) {
      return { provider: rule.provider, model: rule.model };
    }
  }

  // Fallback to default execution provider
  return {
    provider: config.executionProvider,
    model: config.executionModel || 'sonnet',
  };
}

function matchesRoutingRule(rule: ModelRoutingRule, idea: IdeaForRouting): boolean {
  const effort = idea.effort ?? 5;
  switch (rule.condition) {
    case 'complexity_1':
      return effort <= 3;
    case 'complexity_2':
      return effort >= 4 && effort <= 6;
    case 'complexity_3':
      return effort >= 7;
    case 'default':
      return true;
    default:
      return false;
  }
}

// ============================================================================
// Quota Management
// ============================================================================

interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if the current pipeline run is within budget constraints.
 */
export function checkQuota(
  config: BalancingConfig,
  currentMetrics: PipelineMetrics
): QuotaCheckResult {
  if (!config.quotaLimits.enabled) {
    return { allowed: true };
  }

  // Check cycle limit
  if (config.maxCyclesPerRun > 0) {
    // Cycle limit is checked by the orchestrator directly
  }

  // Check token budget (rough estimate: 1000 tokens per task)
  const estimatedTokens = (currentMetrics.tasksCreated + currentMetrics.ideasGenerated) * 1000;
  if (estimatedTokens > config.quotaLimits.maxTokensPerRun) {
    return {
      allowed: false,
      reason: `Token budget exceeded: ~${estimatedTokens} / ${config.quotaLimits.maxTokensPerRun}`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// Cost Estimation
// ============================================================================

const MODEL_COST_PER_1K_TOKENS: Record<string, number> = {
  opus: 0.015,
  sonnet: 0.003,
  haiku: 0.00025,
  'gemini-3.1-pro-preview': 0.002,
  'gpt-5.3-codex': 0.01,
  default: 0.003,
};

/**
 * Estimate cost for a set of tasks based on model assignments.
 */
export function estimateCost(
  taskCount: number,
  model: string,
  avgTokensPerTask: number = 5000
): number {
  const costPer1k = MODEL_COST_PER_1K_TOKENS[model] ?? MODEL_COST_PER_1K_TOKENS.default;
  return taskCount * (avgTokensPerTask / 1000) * costPer1k;
}
