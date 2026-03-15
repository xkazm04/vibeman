/**
 * Advisor Configuration
 * Defines the 4 LLM advisors for improvement suggestions
 */

import { Sparkles, Zap, Wand2, Rocket } from 'lucide-react';
import { AdvisorConfig, AdvisorType } from './types';

export const ADVISOR_COLOR_MAP: Record<AdvisorType, { button: string; icon: string; text: string }> = {
  improve: {
    button: 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20',
    icon: 'w-4 h-4 text-emerald-400',
    text: 'text-xs text-emerald-400',
  },
  optimize: {
    button: 'bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20',
    icon: 'w-4 h-4 text-amber-400',
    text: 'text-xs text-amber-400',
  },
  refactor: {
    button: 'bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20',
    icon: 'w-4 h-4 text-purple-400',
    text: 'text-xs text-purple-400',
  },
  enhance: {
    button: 'bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20',
    icon: 'w-4 h-4 text-cyan-400',
    text: 'text-xs text-cyan-400',
  },
};

export const ADVISOR_CONFIGS: AdvisorConfig[] = [
  {
    type: 'improve',
    label: 'Improve',
    icon: Sparkles,
    color: 'emerald',
    description: 'Improve code quality and add better error handling',
  },
  {
    type: 'optimize',
    label: 'Optimize',
    icon: Zap,
    color: 'amber',
    description: 'Optimize performance and reduce bundle size',
  },
  {
    type: 'refactor',
    label: 'Refactor',
    icon: Wand2,
    color: 'purple',
    description: 'Refactor to follow best practices and design patterns',
  },
  {
    type: 'enhance',
    label: 'Enhance',
    icon: Rocket,
    color: 'cyan',
    description: 'Enhance with additional features and user experience improvements',
  },
];

export function getAdvisorConfig(type: string): AdvisorConfig | undefined {
  return ADVISOR_CONFIGS.find((config) => config.type === type);
}
