/**
 * Configuration for Ideas feature
 * Centralized configuration for categories, statuses, effort, and impact
 */

import {
  Zap,
  Gauge,
  Wrench,
  Palette,
  Code2,
  Heart,
  Sparkles,
  TrendingUp,
  type LucideIcon
} from 'lucide-react';
import type { IdeaCategory } from '@/types/ideaCategory';
import { isStandardCategory } from '@/types/ideaCategory';

export interface CategoryConfig {
  emoji: string;
  icon: LucideIcon;
  color: string;
}

export interface StatusConfig {
  bg: string;
  border: string;
  shadow: string;
}

export interface EffortConfig {
  label: string;
  color: string;
  description: string;
}

export interface ImpactConfig {
  label: string;
  color: string;
  description: string;
}

/**
 * Category configuration
 * Maps standard idea categories to their visual representation
 */
export const categoryConfig: Record<IdeaCategory, CategoryConfig> = {
  functionality: { emoji: '⚡', icon: Zap, color: 'blue' },
  performance: { emoji: '📊', icon: Gauge, color: 'green' },
  maintenance: { emoji: '🔧', icon: Wrench, color: 'amber' },
  ui: { emoji: '🎨', icon: Palette, color: 'pink' },
  code_quality: { emoji: '💻', icon: Code2, color: 'purple' },
  user_benefit: { emoji: '❤️', icon: Heart, color: 'red' },
};

/**
 * Get category config with fallback for non-standard categories
 * @param category - Any category string
 * @returns Category configuration (uses default for non-standard categories)
 */
export function getCategoryConfig(category: string): CategoryConfig {
  if (isStandardCategory(category)) {
    return categoryConfig[category];
  }
  // Fallback for custom/non-standard categories
  return { emoji: '💡', icon: Sparkles, color: 'gray' };
}

/**
 * Status configuration
 * Maps idea statuses to their visual styling
 */
export const statusConfig: Record<string, StatusConfig> = {
  pending: { bg: 'bg-gray-700/20', border: 'border-gray-600/40', shadow: 'shadow-gray-500/5' },
  accepted: { bg: 'bg-green-500/10', border: 'border-green-500/30', shadow: 'shadow-green-500/10' },
  rejected: { bg: 'bg-red-500/10', border: 'border-red-500/30', shadow: 'shadow-red-500/10' },
  implemented: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', shadow: 'shadow-amber-500/10' },
};

/**
 * Effort configuration (1-3 scale)
 * 1 = Low effort, 2 = Medium effort, 3 = High effort
 */
export const effortConfig: Record<number, EffortConfig> = {
  1: { label: 'Low', color: 'text-green-400', description: 'Quick fix, 1-2 hours' },
  2: { label: 'Med', color: 'text-yellow-400', description: 'Moderate change, 1-2 days' },
  3: { label: 'High', color: 'text-red-400', description: 'Major change, 1+ weeks' },
};

/**
 * Impact configuration (1-3 scale)
 * 1 = Low impact, 2 = Medium impact, 3 = High impact
 */
export const impactConfig: Record<number, ImpactConfig> = {
  1: { label: 'Low', color: 'text-gray-400', description: 'Nice to have' },
  2: { label: 'Med', color: 'text-blue-400', description: 'Noticeable improvement' },
  3: { label: 'High', color: 'text-purple-400', description: 'Game changer' },
};

/**
 * Effort icon (for visual display)
 */
export const EffortIcon = Sparkles;

/**
 * Impact icon (for visual display)
 */
export const ImpactIcon = TrendingUp;
