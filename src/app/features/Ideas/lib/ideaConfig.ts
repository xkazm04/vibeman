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

// ---------------------------------------------------------------------------
// ScaleMetric — generic 1-10 metric abstraction
// ---------------------------------------------------------------------------

/** A single entry on a 1-10 scale (e.g. effort=3 → "Small - few days") */
export interface ScaleEntry {
  label: string;
  color: string;
  description: string;
}

/** A fully-configured scale metric. */
export interface ScaleMetric {
  /** Human-readable name (e.g. "Effort") */
  name: string;
  /** If true, lower values are better (green→red). If false, higher is better (red→green). */
  inverse: boolean;
  /** The 10 entries keyed 1-10. */
  entries: Record<number, ScaleEntry>;
  /** Shortcut: get the color class for a value. */
  colorOf: (value: number) => string;
}

// Color bands shared by all scale metrics
const SCALE_COLORS_NORMAL = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-emerald-400'];
const SCALE_COLORS_INVERSE = ['text-emerald-400', 'text-lime-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

/**
 * Helper function to get color based on scale value
 * @param value - Score from 1-10
 * @param inverse - If true, lower is better (green), higher is worse (red). For effort/risk.
 * @returns Tailwind color class
 */
export function getScoreColor(value: number, inverse: boolean = false): string {
  const colors = inverse ? SCALE_COLORS_INVERSE : SCALE_COLORS_NORMAL;
  const idx = Math.min(Math.floor((value - 1) / 2), 4);
  return colors[idx];
}

/**
 * Create a 1-10 scale metric from a list of description pairs.
 *
 * @param name    - Human label ("Effort", "Impact", "Risk")
 * @param inverse - true → low=green/high=red (effort, risk); false → low=red/high=green (impact)
 * @param descriptions - Array of 5 description strings, one per 2-value band:
 *                       [1-2, 3-4, 5-6, 7-8, 9-10]
 */
export function createScaleConfig(
  name: string,
  inverse: boolean,
  descriptions: [string, string, string, string, string],
): ScaleMetric {
  const colors = inverse ? SCALE_COLORS_INVERSE : SCALE_COLORS_NORMAL;
  const entries: Record<number, ScaleEntry> = {};
  for (let i = 1; i <= 10; i++) {
    const band = Math.min(Math.floor((i - 1) / 2), 4);
    entries[i] = {
      label: String(i),
      color: colors[band],
      description: descriptions[band],
    };
  }
  return {
    name,
    inverse,
    entries,
    colorOf: (v) => getScoreColor(v, inverse),
  };
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

/** Effort: inverse (low=green, high=red). Lower is better. */
export const effortScale = createScaleConfig('Effort', true, [
  'Trivial - hours',
  'Small - days',
  'Medium - weeks',
  'Large - 1-2 months',
  'Massive - multi-month',
]);

/** Impact: normal (low=red, high=green). Higher is better. */
export const impactScale = createScaleConfig('Impact', false, [
  'Negligible impact',
  'Minor improvement',
  'Moderate value',
  'High value',
  'Critical/transformational',
]);

/** Risk: inverse (low=green, high=red). Lower is better. */
export const riskScale = createScaleConfig('Risk', true, [
  'Very safe',
  'Low risk',
  'Moderate risk',
  'High risk',
  'Critical risk',
]);

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
