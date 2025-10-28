/**
 * Scan Type Configuration
 * Defines all available scan types and their visual properties
 */

export type ScanType =
  | 'overall'
  | 'zen_architect'
  | 'bug_hunter'
  | 'perf_optimizer'
  | 'security_protector'
  | 'insight_synth'
  | 'ambiguity_guardian'
  | 'business_visionary'
  | 'ui_perfectionist';

export interface ScanTypeOption {
  value: ScanType;
  label: string;
  emoji: string;
  color: string;
  description: string;
  agentFile?: string; // Optional: Reference to agent markdown file
}

export const SCAN_TYPES: ScanTypeOption[] = [
  {
    value: 'overall',
    label: 'Overall',
    emoji: '🔍',
    color: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-300',
    description: 'Multi-dimensional comprehensive analysis'
  },
  {
    value: 'zen_architect',
    label: 'Zen Architect',
    emoji: '🏗️',
    color: 'bg-gradient-to-r from-indigo-500/20 to-indigo-600/20 border-indigo-500/40 text-indigo-300',
    description: 'Simplicity & elegant design patterns',
    agentFile: 'zen_architect.md'
  },
  {
    value: 'bug_hunter',
    label: 'Bug Hunter',
    emoji: '🐛',
    color: 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/40 text-red-300',
    description: 'Systematic bug detection & fixes',
    agentFile: 'bug_hunter.md'
  },
  {
    value: 'perf_optimizer',
    label: 'Performance',
    emoji: '⚡',
    color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 text-yellow-300',
    description: 'Speed & efficiency improvements',
    agentFile: 'perf_optimizer.md'
  },
  {
    value: 'security_protector',
    label: 'Security',
    emoji: '🔒',
    color: 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/40 text-green-300',
    description: 'Security vulnerabilities & hardening',
    agentFile: 'security_proector.md'
  },
  {
    value: 'insight_synth',
    label: 'Insight Synth',
    emoji: '💡',
    color: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-300',
    description: 'Revolutionary connections & insights',
    agentFile: 'insight_synth.md'
  },
  {
    value: 'ambiguity_guardian',
    label: 'Ambiguity',
    emoji: '🌀',
    color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-500/40 text-cyan-300',
    description: 'Uncertainty navigation & trade-offs',
    agentFile: 'ambiguity_guardian.md'
  },
  {
    value: 'business_visionary',
    label: 'Business Visionary',
    emoji: '🚀',
    color: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-300',
    description: 'Innovative app ideas & market opportunities',
    agentFile: 'business_visionary.md'
  },
  {
    value: 'ui_perfectionist',
    label: 'UI Perfectionist',
    emoji: '🎨',
    color: 'bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-pink-500/40 text-pink-300',
    description: 'Extract reusable components & improve design',
    agentFile: 'ui_perfectionist.md'
  }
];

/**
 * Get scan type configuration by value
 */
export function getScanTypeConfig(scanType: ScanType): ScanTypeOption | undefined {
  return SCAN_TYPES.find(t => t.value === scanType);
}
