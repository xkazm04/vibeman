/**
 * Advisor Configuration
 * Defines the 4 LLM advisors for improvement suggestions
 */

import { Sparkles, Zap, Wand2, Rocket } from 'lucide-react';
import { AdvisorConfig } from './types';

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
