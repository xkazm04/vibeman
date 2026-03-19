/**
 * Agent Registry — single source of truth for all agent definitions
 *
 * Contains types, the AGENT_REGISTRY constant, and the PromptBuilderRegistry
 * for lazy prompt builder registration.
 */

export type ScanType =
  | 'zen_architect'
  | 'bug_hunter'
  | 'perf_optimizer'
  | 'security_protector'
  | 'insight_synth'
  | 'ambiguity_guardian'
  | 'business_visionary'
  | 'ui_perfectionist'
  | 'feature_scout'
  | 'tech_innovator'
  | 'ai_integration_scout'
  | 'delight_designer'
  | 'code_refactor'
  // People's Choice - User First Approach
  | 'user_empathy_champion'
  | 'competitor_analyst'
  // Mastermind - Ambitious Opportunities
  | 'paradigm_shifter'
  | 'moonshot_architect'
  // Gap Coverage
  | 'dev_experience_engineer'
  | 'data_flow_optimizer'
  | 'pragmatic_integrator'
  // Observability & Brand
  | 'observability_scout'
  | 'brand_artist'
  // External Intelligence
  | 'youtube_scout';

export type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export type AgentCategory = 'technical' | 'user' | 'business' | 'mastermind';

/** Prompt builder function signature (registered lazily from prompts/index.ts) */
export type AgentPromptBuilder = (options: {
  projectName: string;
  aiDocsSection: string;
  contextSection: string;
  existingIdeasSection: string;
  codeSection: string;
  hasContext: boolean;
  behavioralSection: string;
  goalsSection: string;
  feedbackSection: string;
}) => string;

/**
 * Unified agent definition combining identity, behavior metadata, and examples.
 * Prompt builders are registered lazily to avoid circular imports.
 */
export interface AgentDefinition {
  /** Unique agent identifier (matches ScanType) */
  id: ScanType;
  /** Human-readable display name */
  label: string;
  /** 2-3 letter abbreviation for filenames */
  abbr: string;
  /** Visual emoji identifier */
  emoji: string;
  /** Tailwind gradient classes for UI styling */
  color: string;
  /** One-line description of what this agent does */
  description: string;
  /** Agent category grouping */
  category: AgentCategory;
  /** Reference to agent prompt file */
  agentFile?: string;
  /** Example outputs showing what this agent produces */
  examples: string[];
  /** Prompt builder (registered lazily via registerPromptBuilder) */
  buildPrompt?: AgentPromptBuilder;
}

// ---------------------------------------------------------------------------
// AGENT_REGISTRY — single source of truth
// ---------------------------------------------------------------------------

/**
 * All agent definitions — SINGLE SOURCE OF TRUTH
 *
 * Combines identity (config), behavior (examples), and prompt builder
 * into one unified registry. Use getAgent() to look up by ScanType.
 */
export const AGENT_REGISTRY: Record<ScanType, AgentDefinition> = {
  // Technical Focus
  zen_architect: {
    id: 'zen_architect',
    label: 'Zen Architect',
    abbr: 'za',
    emoji: '🏗️',
    color: 'bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border-indigo-500/40 text-indigo-300',
    description: 'Simplicity & elegant design patterns',
    category: 'technical',
    agentFile: 'zen_architect.md',
    examples: [
      'Extract SearchBar into reusable component',
      'Simplify nested state management',
      'Apply factory pattern for API clients',
    ],
  },
  bug_hunter: {
    id: 'bug_hunter',
    label: 'Bug Hunter',
    abbr: 'bh',
    emoji: '🐛',
    color: 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/40 text-red-300',
    description: 'Systematic bug detection & fixes',
    category: 'technical',
    agentFile: 'bug_hunter.md',
    examples: [
      'Fix race condition in useEffect',
      'Handle undefined prop in UserCard',
      'Add missing error boundary',
    ],
  },
  perf_optimizer: {
    id: 'perf_optimizer',
    label: 'Performance',
    abbr: 'po',
    emoji: '⚡',
    color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 text-yellow-300',
    description: 'Speed & efficiency improvements',
    category: 'technical',
    agentFile: 'perf_optimizer.md',
    examples: [
      'Memoize expensive calculation in useMemo',
      'Add virtualization to long list',
      'Lazy load below-fold components',
    ],
  },
  security_protector: {
    id: 'security_protector',
    label: 'Security',
    abbr: 'sp',
    emoji: '🔒',
    color: 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/40 text-green-300',
    description: 'Security vulnerabilities & hardening',
    category: 'technical',
    agentFile: 'security_protector.md',
    examples: [
      'Sanitize user input before rendering',
      'Add CSRF token validation',
      'Escape SQL query parameters',
    ],
  },
  insight_synth: {
    id: 'insight_synth',
    label: 'Insight Synth',
    abbr: 'is',
    emoji: '💡',
    color: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-300',
    description: 'Revolutionary connections & insights',
    category: 'technical',
    agentFile: 'insight_synth.md',
    examples: [
      'Combine auth flows into unified system',
      'Create shared validation library',
      'Unify error handling patterns',
    ],
  },
  ambiguity_guardian: {
    id: 'ambiguity_guardian',
    label: 'Ambiguity',
    abbr: 'ag',
    emoji: '🌀',
    color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-500/40 text-cyan-300',
    description: 'Uncertainty navigation & trade-offs',
    category: 'technical',
    agentFile: 'ambiguity_guardian.md',
    examples: [
      'Clarify edge case for empty cart',
      'Document trade-offs in caching strategy',
      'Add explicit null checks',
    ],
  },
  data_flow_optimizer: {
    id: 'data_flow_optimizer',
    label: 'Data Flow',
    abbr: 'df',
    emoji: '🌊',
    color: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-300',
    description: 'Data architecture & state management',
    category: 'technical',
    agentFile: 'data_flow_optimizer.md',
    examples: [
      'Normalize nested API responses',
      'Add optimistic updates',
      'Implement proper cache invalidation',
    ],
  },
  dev_experience_engineer: {
    id: 'dev_experience_engineer',
    label: 'Dev Experience',
    abbr: 'dx',
    emoji: '🛠️',
    color: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/40 text-gray-300',
    description: 'Developer productivity & codebase joy',
    category: 'technical',
    agentFile: 'dev_experience_engineer.md',
    examples: [
      'Add better TypeScript types',
      'Create development CLI tools',
      'Improve test coverage reports',
    ],
  },
  code_refactor: {
    id: 'code_refactor',
    label: 'Code Refactor',
    abbr: 'cr',
    emoji: '🧹',
    color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-500/40 text-emerald-300',
    description: 'Code cleanup, dead code removal & structure',
    category: 'technical',
    agentFile: 'code_refactor.md',
    examples: [
      'Remove dead code in utils.ts',
      'Consolidate duplicate helpers',
      'Simplify complex conditionals',
    ],
  },
  pragmatic_integrator: {
    id: 'pragmatic_integrator',
    label: 'Pragmatic Integrator',
    abbr: 'pi',
    emoji: '🔗',
    color: 'bg-gradient-to-r from-lime-500/20 to-lime-600/20 border-lime-500/40 text-lime-300',
    description: 'E2E usability, simplification & consolidation',
    category: 'technical',
    agentFile: 'pragmatic_integrator.md',
    examples: [
      'Consolidate similar components',
      'Simplify configuration options',
      'Reduce boilerplate in forms',
    ],
  },

  // User Focus
  ui_perfectionist: {
    id: 'ui_perfectionist',
    label: 'UI Perfectionist',
    abbr: 'up',
    emoji: '🎨',
    color: 'bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-pink-500/40 text-pink-300',
    description: 'Extract reusable components & improve design',
    category: 'user',
    agentFile: 'ui_perfectionist.md',
    examples: [
      'Add loading skeleton states',
      'Improve button hover feedback',
      'Align spacing with design system',
    ],
  },
  tech_innovator: {
    id: 'tech_innovator',
    label: 'Tony Stark',
    abbr: 'ts',
    emoji: '⚙️',
    color: 'bg-gradient-to-r from-red-500/20 to-amber-500/20 border-red-500/40 text-red-300',
    description: 'High-risk technology bets that dissolve structural constraints',
    category: 'technical',
    agentFile: 'tech_innovator.md',
    examples: [
      'Dissolve sync bottleneck with local-first data layer',
      'Replace rendering ceiling with compute-at-edge architecture',
      'Eliminate N+1 constraint by moving query logic to data layer',
    ],
  },
  delight_designer: {
    id: 'delight_designer',
    label: 'Delight Designer',
    abbr: 'dd',
    emoji: '✨',
    color: 'bg-gradient-to-r from-rose-500/20 to-rose-600/20 border-rose-500/40 text-rose-300',
    description: 'Moments of user delight & surprise',
    category: 'user',
    agentFile: 'delight_designer.md',
    examples: [
      'Add confetti on achievement',
      'Implement smooth page transitions',
      'Add playful empty state illustrations',
    ],
  },
  user_empathy_champion: {
    id: 'user_empathy_champion',
    label: 'User Empathy',
    abbr: 'ue',
    emoji: '💖',
    color: 'bg-gradient-to-r from-fuchsia-500/20 to-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300',
    description: 'Human-centered design & emotional UX',
    category: 'user',
    agentFile: 'user_empathy_champion.md',
    examples: [
      'Add accessibility improvements',
      'Simplify form validation messages',
      'Improve mobile touch targets',
    ],
  },

  // Business Focus
  competitor_analyst: {
    id: 'competitor_analyst',
    label: 'Competitor',
    abbr: 'ca',
    emoji: '🎯',
    color: 'bg-gradient-to-r from-sky-500/20 to-sky-600/20 border-sky-500/40 text-sky-300',
    description: 'Analyze competitors & improve features',
    category: 'business',
    agentFile: 'competitor_analyst.md',
    examples: [
      'Match competitor quick-add feature',
      'Improve search UX like leading apps',
      'Add drag-drop like competitor X',
    ],
  },
  business_visionary: {
    id: 'business_visionary',
    label: 'Business Visionary',
    abbr: 'bv',
    emoji: '🚀',
    color: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-300',
    description: 'Innovative app ideas & market opportunities',
    category: 'business',
    agentFile: 'business_visionary.md',
    examples: [
      'Add subscription tier comparison',
      'Implement referral program',
      'Create usage analytics dashboard',
    ],
  },
  feature_scout: {
    id: 'feature_scout',
    label: 'Feature Scout',
    abbr: 'fs',
    emoji: '🔍',
    color: 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 border-teal-500/40 text-teal-300',
    description: 'Discover new feature opportunities',
    category: 'business',
    agentFile: 'feature_scout.md',
    examples: [
      'Add keyboard shortcuts',
      'Implement undo/redo functionality',
      'Add export to PDF option',
    ],
  },
  ai_integration_scout: {
    id: 'ai_integration_scout',
    label: 'AI Integration',
    abbr: 'ai',
    emoji: '🤖',
    color: 'bg-gradient-to-r from-violet-500/20 to-violet-600/20 border-violet-500/40 text-violet-300',
    description: 'AI integration opportunities',
    category: 'business',
    agentFile: 'ai_integration_scout.md',
    examples: [
      'Add AI-powered search suggestions',
      'Implement smart categorization',
      'Add content summarization',
    ],
  },

  // Mastermind Focus
  paradigm_shifter: {
    id: 'paradigm_shifter',
    label: 'Paradigm Shifter',
    abbr: 'ps',
    emoji: '🔮',
    color: 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/40 text-amber-300',
    description: 'Revolutionary reimagination of features',
    category: 'mastermind',
    agentFile: 'paradigm_shifter.md',
    examples: [
      'Reimagine navigation as command palette',
      'Convert to real-time collaborative',
      'Add AI-first workflow option',
    ],
  },
  moonshot_architect: {
    id: 'moonshot_architect',
    label: 'Moonshot',
    abbr: 'ma',
    emoji: '🌙',
    color: 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-500/40 text-slate-300',
    description: 'Ambitious 10x opportunities',
    category: 'mastermind',
    agentFile: 'moonshot_architect.md',
    examples: [
      'Design plugin ecosystem',
      'Plan offline-first architecture',
      'Create white-label solution',
    ],
  },

  // Observability & Brand
  observability_scout: {
    id: 'observability_scout',
    label: 'Observability Scout',
    abbr: 'os',
    emoji: '📡',
    color: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-300',
    description: 'Monitoring, logging & debuggability',
    category: 'technical',
    agentFile: 'observability_scout.md',
    examples: [
      'Add structured logging with correlation IDs to pipeline',
      'Create health check endpoint for all services',
      'Instrument silent catch blocks with error tracking',
    ],
  },
  brand_artist: {
    id: 'brand_artist',
    label: 'Brand Artist',
    abbr: 'ba',
    emoji: '🎨',
    color: 'bg-gradient-to-r from-rose-500/20 to-amber-500/20 border-rose-500/40 text-rose-300',
    description: 'Brand identity, visuals & typography',
    category: 'user',
    agentFile: 'brand_artist.md',
    examples: [
      'Design illustrated empty state for task runner',
      'Create custom SVG icon set for navigation',
      'Establish consistent typography scale across dashboard',
    ],
  },

  // External Intelligence
  youtube_scout: {
    id: 'youtube_scout',
    label: 'YouTube Scout',
    abbr: 'yt',
    emoji: '▶️',
    color: 'bg-gradient-to-r from-red-600/20 to-red-800/20 border-red-600/40 text-red-400',
    description: 'Extract backlog ideas from YouTube videos',
    category: 'business',
    agentFile: 'youtube_scout.md',
    examples: [
      'Add feature demonstrated in competitor tutorial',
      'Fix UX pain point highlighted in user feedback video',
      'Implement workflow shown in productivity channel',
    ],
  },
};

// ---------------------------------------------------------------------------
// Prompt builder registration (lazy, avoids circular imports)
// ---------------------------------------------------------------------------

/**
 * Registry class for prompt builders with init-time validation.
 * Validates that all agent types have registered builders and logs
 * a clear error for any missing ones rather than failing silently.
 */
export class PromptBuilderRegistry {
  register(scanType: ScanType, builder: AgentPromptBuilder): void {
    const agent = AGENT_REGISTRY[scanType];
    if (agent) {
      agent.buildPrompt = builder;
    }
  }

  registerAll(builders: Partial<Record<ScanType, AgentPromptBuilder>>): void {
    for (const [scanType, builder] of Object.entries(builders)) {
      if (builder) {
        this.register(scanType as ScanType, builder);
      }
    }
    this.validateAll();
  }

  validateAll(): void {
    const missing = (Object.keys(AGENT_REGISTRY) as ScanType[]).filter(
      scanType => !AGENT_REGISTRY[scanType].buildPrompt
    );
    if (missing.length > 0) {
      throw new Error(
        `[PromptBuilderRegistry] Missing prompt builders for ${missing.length} agent(s): ${missing.join(', ')}`
      );
    }
  }

  get(scanType: ScanType): AgentPromptBuilder | undefined {
    return AGENT_REGISTRY[scanType]?.buildPrompt;
  }
}

export const promptBuilderRegistry = new PromptBuilderRegistry();

/**
 * Register a prompt builder for an agent. Called from prompts/index.ts
 * to avoid circular imports between scanTypes and prompt files.
 */
export function registerPromptBuilder(scanType: ScanType, builder: AgentPromptBuilder): void {
  promptBuilderRegistry.register(scanType, builder);
}

/**
 * Batch-register prompt builders for multiple agents at once.
 * Validates that all agent types have builders after registration.
 */
export function registerPromptBuilders(builders: Partial<Record<ScanType, AgentPromptBuilder>>): void {
  promptBuilderRegistry.registerAll(builders);
}
