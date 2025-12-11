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
  Clock,
  AlertTriangle,
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

export interface RiskConfig {
  label: string;
  color: string;
  description: string;
}

/**
 * Helper function to get color based on scale value
 * @param value - Score from 1-10
 * @param inverse - If true, lower is better (green), higher is worse (red). For effort/risk.
 * @returns Tailwind color class
 */
export function getScoreColor(value: number, inverse: boolean = false): string {
  // For inverse (effort/risk): 1-2 green, 3-4 lime, 5-6 yellow, 7-8 orange, 9-10 red
  // For normal (impact): 1-2 red, 3-4 orange, 5-6 yellow, 7-8 lime, 9-10 green

  if (inverse) {
    if (value <= 2) return 'text-emerald-400';
    if (value <= 4) return 'text-lime-400';
    if (value <= 6) return 'text-yellow-400';
    if (value <= 8) return 'text-orange-400';
    return 'text-red-400';
  } else {
    if (value <= 2) return 'text-red-400';
    if (value <= 4) return 'text-orange-400';
    if (value <= 6) return 'text-yellow-400';
    if (value <= 8) return 'text-lime-400';
    return 'text-emerald-400';
  }
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
 * Effort configuration (1-10 scale)
 * Lower is better (less effort required)
 */
export const effortConfig: Record<number, EffortConfig> = {
  1: { label: '1', color: 'text-emerald-400', description: 'Trivial - few hours' },
  2: { label: '2', color: 'text-emerald-400', description: 'Trivial - < 1 day' },
  3: { label: '3', color: 'text-lime-400', description: 'Small - few days' },
  4: { label: '4', color: 'text-lime-400', description: 'Small - < 1 week' },
  5: { label: '5', color: 'text-yellow-400', description: 'Medium - 1-2 weeks' },
  6: { label: '6', color: 'text-yellow-400', description: 'Medium - 2-3 weeks' },
  7: { label: '7', color: 'text-orange-400', description: 'Large - 1 month' },
  8: { label: '8', color: 'text-orange-400', description: 'Large - 1-2 months' },
  9: { label: '9', color: 'text-red-400', description: 'Massive - multi-month' },
  10: { label: '10', color: 'text-red-400', description: 'Massive - dedicated team' },
};

/**
 * Impact configuration (1-10 scale)
 * Higher is better (more business value)
 */
export const impactConfig: Record<number, ImpactConfig> = {
  1: { label: '1', color: 'text-red-400', description: 'Negligible impact' },
  2: { label: '2', color: 'text-red-400', description: 'Negligible impact' },
  3: { label: '3', color: 'text-orange-400', description: 'Minor improvement' },
  4: { label: '4', color: 'text-orange-400', description: 'Minor improvement' },
  5: { label: '5', color: 'text-yellow-400', description: 'Moderate value' },
  6: { label: '6', color: 'text-yellow-400', description: 'Moderate value' },
  7: { label: '7', color: 'text-lime-400', description: 'High value' },
  8: { label: '8', color: 'text-lime-400', description: 'High value' },
  9: { label: '9', color: 'text-emerald-400', description: 'Critical value' },
  10: { label: '10', color: 'text-emerald-400', description: 'Critical/transformational' },
};

/**
 * Risk configuration (1-10 scale)
 * Lower is better (safer to implement)
 */
export const riskConfig: Record<number, RiskConfig> = {
  1: { label: '1', color: 'text-emerald-400', description: 'Very safe' },
  2: { label: '2', color: 'text-emerald-400', description: 'Very safe' },
  3: { label: '3', color: 'text-lime-400', description: 'Low risk' },
  4: { label: '4', color: 'text-lime-400', description: 'Low risk' },
  5: { label: '5', color: 'text-yellow-400', description: 'Moderate risk' },
  6: { label: '6', color: 'text-yellow-400', description: 'Moderate risk' },
  7: { label: '7', color: 'text-orange-400', description: 'High risk' },
  8: { label: '8', color: 'text-orange-400', description: 'High risk' },
  9: { label: '9', color: 'text-red-400', description: 'Critical risk' },
  10: { label: '10', color: 'text-red-400', description: 'Critical risk' },
};

/**
 * Effort icon (for visual display)
 */
export const EffortIcon = Clock;

/**
 * Impact icon (for visual display)
 */
export const ImpactIcon = TrendingUp;

/**
 * Risk icon (for visual display)
 */
export const RiskIcon = AlertTriangle;
