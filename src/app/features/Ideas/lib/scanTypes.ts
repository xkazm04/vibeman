/**
 * Scan type enums and interfaces
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
  | 'onboarding_optimizer'
  | 'ai_integration_scout'
  | 'delight_designer'
  | 'refactor_analysis'
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
  | 'pragmatic_integrator';

export type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export interface QueueItem {
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount: number;
  error?: string;
}

export interface ContextQueueItem {
  contextId: string | null;
  contextName: string;
  scanType: ScanType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ideaCount: number;
  error?: string;
}

/**
 * Centralized Scan Type Configuration
 * Single source of truth for all scan type metadata
 */
export interface ScanTypeConfig {
  value: ScanType;
  label: string;
  abbr: string; // 2-3 letter abbreviation for filenames (e.g., 'za' for zen_architect)
  emoji: string;
  color: string;
  description: string;
  category: 'technical' | 'user' | 'business' | 'mastermind';
  agentFile?: string;
}

/**
 * All scan type configurations - SINGLE SOURCE OF TRUTH
 * Use this constant across the entire application
 */
export const SCAN_TYPE_CONFIGS: ScanTypeConfig[] = [
  // Technical Focus
  {
    value: 'zen_architect',
    label: 'Zen Architect',
    abbr: 'za',
    emoji: '🏗️',
    color: 'bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border-indigo-500/40 text-indigo-300',
    description: 'Simplicity & elegant design patterns',
    category: 'technical',
    agentFile: 'zen_architect.md'
  },
  {
    value: 'bug_hunter',
    label: 'Bug Hunter',
    abbr: 'bh',
    emoji: '🐛',
    color: 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/40 text-red-300',
    description: 'Systematic bug detection & fixes',
    category: 'technical',
    agentFile: 'bug_hunter.md'
  },
  {
    value: 'perf_optimizer',
    label: 'Performance',
    abbr: 'po',
    emoji: '⚡',
    color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 text-yellow-300',
    description: 'Speed & efficiency improvements',
    category: 'technical',
    agentFile: 'perf_optimizer.md'
  },
  {
    value: 'security_protector',
    label: 'Security',
    abbr: 'sp',
    emoji: '🔒',
    color: 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/40 text-green-300',
    description: 'Security vulnerabilities & hardening',
    category: 'technical',
    agentFile: 'security_protector.md'
  },
  {
    value: 'insight_synth',
    label: 'Insight Synth',
    abbr: 'is',
    emoji: '💡',
    color: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-300',
    description: 'Revolutionary connections & insights',
    category: 'technical',
    agentFile: 'insight_synth.md'
  },
  {
    value: 'ambiguity_guardian',
    label: 'Ambiguity',
    abbr: 'ag',
    emoji: '🌀',
    color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-500/40 text-cyan-300',
    description: 'Uncertainty navigation & trade-offs',
    category: 'technical',
    agentFile: 'ambiguity_guardian.md'
  },
  {
    value: 'data_flow_optimizer',
    label: 'Data Flow',
    abbr: 'df',
    emoji: '🌊',
    color: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-300',
    description: 'Data architecture & state management',
    category: 'technical',
    agentFile: 'data_flow_optimizer.md'
  },
  {
    value: 'dev_experience_engineer',
    label: 'Dev Experience',
    abbr: 'dx',
    emoji: '🛠️',
    color: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-500/40 text-gray-300',
    description: 'Developer productivity & codebase joy',
    category: 'technical',
    agentFile: 'dev_experience_engineer.md'
  },
  {
    value: 'code_refactor',
    label: 'Code Refactor',
    abbr: 'cr',
    emoji: '🧹',
    color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border-emerald-500/40 text-emerald-300',
    description: 'Code cleanup, dead code removal & structure',
    category: 'technical',
    agentFile: 'code_refactor.md'
  },
  {
    value: 'pragmatic_integrator',
    label: 'Pragmatic Integrator',
    abbr: 'pi',
    emoji: '🔗',
    color: 'bg-gradient-to-r from-lime-500/20 to-lime-600/20 border-lime-500/40 text-lime-300',
    description: 'E2E usability, simplification & consolidation',
    category: 'technical',
    agentFile: 'pragmatic_integrator.md'
  },

  // User Focus
  {
    value: 'ui_perfectionist',
    label: 'UI Perfectionist',
    abbr: 'up',
    emoji: '🎨',
    color: 'bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-pink-500/40 text-pink-300',
    description: 'Extract reusable components & improve design',
    category: 'user',
    agentFile: 'ui_perfectionist.md'
  },
  {
    value: 'onboarding_optimizer',
    label: 'Onboarding',
    abbr: 'oo',
    emoji: '👋',
    color: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-300',
    description: 'Improve user onboarding experience',
    category: 'user',
    agentFile: 'onboarding_optimizer.md'
  },
  {
    value: 'delight_designer',
    label: 'Delight Designer',
    abbr: 'dd',
    emoji: '✨',
    color: 'bg-gradient-to-r from-rose-500/20 to-rose-600/20 border-rose-500/40 text-rose-300',
    description: 'Moments of user delight & surprise',
    category: 'user',
    agentFile: 'delight_designer.md'
  },
  {
    value: 'user_empathy_champion',
    label: 'User Empathy',
    abbr: 'ue',
    emoji: '💖',
    color: 'bg-gradient-to-r from-fuchsia-500/20 to-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300',
    description: 'Human-centered design & emotional UX',
    category: 'user',
    agentFile: 'user_empathy_champion.md'
  },
  {
    value: 'competitor_analyst',
    label: 'Competitor',
    abbr: 'ca',
    emoji: '🎯',
    color: 'bg-gradient-to-r from-sky-500/20 to-sky-600/20 border-sky-500/40 text-sky-300',
    description: 'Analyze competitors & improve features',
    category: 'business',
    agentFile: 'competitor_analyst.md'
  },

  // Business Focus
  {
    value: 'business_visionary',
    label: 'Business Visionary',
    abbr: 'bv',
    emoji: '🚀',
    color: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-300',
    description: 'Innovative app ideas & market opportunities',
    category: 'business',
    agentFile: 'business_visionary.md'
  },
  {
    value: 'feature_scout',
    label: 'Feature Scout',
    abbr: 'fs',
    emoji: '🔍',
    color: 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 border-teal-500/40 text-teal-300',
    description: 'Discover new feature opportunities',
    category: 'business',
    agentFile: 'feature_scout.md'
  },
  {
    value: 'ai_integration_scout',
    label: 'AI Integration',
    abbr: 'ai',
    emoji: '🤖',
    color: 'bg-gradient-to-r from-violet-500/20 to-violet-600/20 border-violet-500/40 text-violet-300',
    description: 'AI integration opportunities',
    category: 'business',
    agentFile: 'ai_integration_scout.md'
  },

  // Mastermind Focus
  {
    value: 'paradigm_shifter',
    label: 'Paradigm Shifter',
    abbr: 'ps',
    emoji: '🔮',
    color: 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/40 text-amber-300',
    description: 'Revolutionary reimagination of features',
    category: 'mastermind',
    agentFile: 'paradigm_shifter.md'
  },
  {
    value: 'moonshot_architect',
    label: 'Moonshot',
    abbr: 'ma',
    emoji: '🌙',
    color: 'bg-gradient-to-r from-slate-500/20 to-slate-600/20 border-slate-500/40 text-slate-300',
    description: 'Ambitious 10x opportunities',
    category: 'mastermind',
    agentFile: 'moonshot_architect.md'
  }
];

/**
 * Get all valid scan type values
 */
export const ALL_SCAN_TYPES: ScanType[] = SCAN_TYPE_CONFIGS.map(c => c.value);

/**
 * Get scan type configuration by value
 */
export function getScanTypeConfig(scanType: ScanType): ScanTypeConfig | undefined {
  return SCAN_TYPE_CONFIGS.find(t => t.value === scanType);
}

/**
 * Get display name for a scan type
 */
export function getScanTypeName(scanType: ScanType): string {
  return getScanTypeConfig(scanType)?.label ?? scanType;
}

/**
 * Get scan types by category
 */
export function getScanTypesByCategory(category: ScanTypeConfig['category']): ScanTypeConfig[] {
  return SCAN_TYPE_CONFIGS.filter(t => t.category === category);
}

/**
 * Check if a string is a valid scan type
 */
export function isValidScanType(value: string): value is ScanType {
  return ALL_SCAN_TYPES.includes(value as ScanType);
}

/**
 * Alias mapping for backward-compatible scan type values
 */
export const SCAN_TYPE_ALIAS: Record<string, ScanType> = {
  refactor_analysis: 'code_refactor',
};

/**
 * Resolve arbitrary input to a canonical ScanType, applying aliases first
 */
export function resolveScanType(value: string): ScanType | null {
  const candidate = (SCAN_TYPE_ALIAS[value] ?? value) as ScanType;
  return isValidScanType(candidate) ? candidate : null;
}

/**
 * Get abbreviation for a scan type
 */
export function getScanTypeAbbr(scanType: ScanType): string {
  return getScanTypeConfig(scanType)?.abbr ?? scanType.slice(0, 2);
}

/**
 * Get scan type by abbreviation
 */
export function getScanTypeByAbbr(abbr: string): ScanType | undefined {
  const config = SCAN_TYPE_CONFIGS.find(c => c.abbr === abbr);
  return config?.value;
}

/**
 * Abbreviation to ScanType lookup map (for fast lookups)
 */
export const ABBR_TO_SCAN_TYPE: Record<string, ScanType> = Object.fromEntries(
  SCAN_TYPE_CONFIGS.map(c => [c.abbr, c.value])
);
