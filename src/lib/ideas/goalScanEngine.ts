/**
 * Goal-Driven Scan Engine
 *
 * Analyzes a goal's title, description, and linked context to automatically
 * select the most relevant scan agents (ScanTypes) and scope the scan
 * to the goal's associated contexts/groups.
 *
 * This inverts the current flow: instead of scanning broadly and hoping
 * ideas match goals, goals now DRIVE the scan configuration.
 */

import type { ScanType, AgentCategory } from '@/app/features/Ideas/lib/scanTypes';

interface GoalInput {
  title: string;
  description?: string | null;
  contextId?: string | null;
}

export interface GoalScanConfig {
  scanTypes: ScanType[];
  contextIds: string[];
  groupIds: string[];
  reasoning: string;
}

// ─── Keyword → Agent Mapping ─────────────────────────────────────

interface KeywordRule {
  keywords: string[];
  agents: ScanType[];
  category: AgentCategory;
}

const KEYWORD_RULES: KeywordRule[] = [
  // Performance-related goals
  {
    keywords: ['performance', 'speed', 'fast', 'slow', 'latency', 'load time', 'page load', 'optimize', 'render', 'fps', 'bundle size', 'lazy'],
    agents: ['perf_optimizer', 'data_flow_optimizer'],
    category: 'technical',
  },
  // Security-related goals
  {
    keywords: ['security', 'secure', 'vulnerability', 'auth', 'authentication', 'authorization', 'xss', 'csrf', 'injection', 'encrypt', 'password'],
    agents: ['security_protector', 'bug_hunter'],
    category: 'technical',
  },
  // UI/UX-related goals
  {
    keywords: ['ui', 'ux', 'design', 'visual', 'responsive', 'mobile', 'accessibility', 'a11y', 'layout', 'theme', 'dark mode', 'animation'],
    agents: ['ui_perfectionist', 'delight_designer', 'user_empathy_champion'],
    category: 'user',
  },
  // Architecture/refactoring goals
  {
    keywords: ['refactor', 'architecture', 'clean', 'simplify', 'modular', 'decouple', 'pattern', 'technical debt', 'debt', 'complex', 'consolidate'],
    agents: ['zen_architect', 'code_refactor', 'pragmatic_integrator'],
    category: 'technical',
  },
  // Bug-related goals
  {
    keywords: ['bug', 'fix', 'error', 'crash', 'broken', 'regression', 'stability', 'reliable'],
    agents: ['bug_hunter', 'ambiguity_guardian'],
    category: 'technical',
  },
  // Feature/growth goals
  {
    keywords: ['feature', 'new', 'add', 'implement', 'build', 'create', 'integrate', 'capability'],
    agents: ['feature_scout', 'business_visionary'],
    category: 'business',
  },
  // AI/automation goals
  {
    keywords: ['ai', 'machine learning', 'ml', 'automat', 'intelligent', 'smart', 'predict', 'recommend'],
    agents: ['ai_integration_scout', 'insight_synth'],
    category: 'business',
  },
  // Tech stack & engineering innovation goals
  {
    keywords: ['stack', 'framework', 'language', 'runtime', 'build', 'compile', 'type system', 'reliability'],
    agents: ['tech_innovator', 'perf_optimizer'],
    category: 'technical',
  },
  // Data/state management goals
  {
    keywords: ['data', 'state', 'cache', 'database', 'query', 'api', 'fetch', 'sync'],
    agents: ['data_flow_optimizer', 'perf_optimizer'],
    category: 'technical',
  },
  // Developer experience goals
  {
    keywords: ['developer', 'dx', 'tooling', 'test', 'type', 'typescript', 'ci', 'cd', 'pipeline', 'lint'],
    agents: ['dev_experience_engineer', 'code_refactor'],
    category: 'technical',
  },
  // Competitive/business goals
  {
    keywords: ['competitor', 'market', 'revenue', 'growth', 'retention', 'churn', 'monetiz', 'pricing'],
    agents: ['competitor_analyst', 'business_visionary'],
    category: 'business',
  },
  // Ambitious/moonshot goals
  {
    keywords: ['10x', 'moonshot', 'revolutionary', 'paradigm', 'transform', 'reimagine', 'disrupt', 'scale'],
    agents: ['moonshot_architect', 'paradigm_shifter'],
    category: 'mastermind',
  },
];

// Default fallback agents per category
const CATEGORY_DEFAULTS: Record<AgentCategory, ScanType[]> = {
  technical: ['zen_architect', 'perf_optimizer', 'bug_hunter'],
  user: ['ui_perfectionist', 'user_empathy_champion'],
  business: ['business_visionary', 'feature_scout'],
  mastermind: ['paradigm_shifter', 'moonshot_architect'],
};

/**
 * Analyze goal text and select the best scan agents.
 * Returns a deduplicated, ranked list of ScanTypes.
 */
function selectAgentsForGoal(goal: GoalInput): { agents: ScanType[]; reasoning: string } {
  const text = `${goal.title} ${goal.description || ''}`.toLowerCase();
  const matched = new Map<ScanType, number>(); // agent → match score
  const matchedRules: string[] = [];

  for (const rule of KEYWORD_RULES) {
    const hitKeywords = rule.keywords.filter(kw => text.includes(kw));
    if (hitKeywords.length > 0) {
      for (const agent of rule.agents) {
        matched.set(agent, (matched.get(agent) || 0) + hitKeywords.length);
      }
      matchedRules.push(`${rule.category}: ${hitKeywords.join(', ')}`);
    }
  }

  // Sort by match score descending, take top 4
  const sorted = [...matched.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([agent]) => agent);

  if (sorted.length === 0) {
    // Fallback: use technical defaults
    return {
      agents: CATEGORY_DEFAULTS.technical,
      reasoning: 'No specific keyword matches — using default technical agents.',
    };
  }

  const agents = sorted.slice(0, 4);
  const reasoning = `Matched keywords: ${matchedRules.join('; ')}. Selected ${agents.length} agents.`;
  return { agents, reasoning };
}

/**
 * Build a complete scan configuration from a goal.
 *
 * - Selects agents based on goal keywords
 * - Scopes to the goal's linked context (if any)
 */
export function buildScanConfigFromGoal(goal: GoalInput): GoalScanConfig {
  const { agents, reasoning } = selectAgentsForGoal(goal);

  const contextIds: string[] = [];
  if (goal.contextId) {
    contextIds.push(goal.contextId);
  }

  return {
    scanTypes: agents,
    contextIds,
    groupIds: [],
    reasoning,
  };
}
