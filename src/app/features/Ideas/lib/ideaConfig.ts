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
  label: string;
  accent: CategoryAccent;
}

/** Tailwind class sets for category-themed UI elements */
export interface CategoryAccent {
  /** Left-border accent for buffer columns: e.g. 'border-l-blue-500/60' */
  border: string;
  /** Header gradient background: e.g. 'from-blue-500/10 to-transparent' */
  headerBg: string;
  /** Dot indicator: e.g. 'bg-blue-400' */
  dot: string;
  /** Active state classes (selected filter/tab) */
  active: string;
  /** Hover state classes (inactive filter/tab) */
  inactive: string;
  /** Badge background when active */
  badgeBg: string;
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

// ---------------------------------------------------------------------------
// Color accent presets — maps color names to Tailwind class sets
// ---------------------------------------------------------------------------

const COLOR_ACCENTS: Record<string, CategoryAccent> = {
  blue: {
    border: 'border-l-blue-500/60',
    headerBg: 'from-blue-500/10 to-transparent',
    dot: 'bg-blue-400',
    active: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-blue-500/20',
    inactive: 'hover:bg-blue-500/10 hover:border-blue-500/20',
    badgeBg: 'bg-blue-500/30',
  },
  green: {
    border: 'border-l-emerald-500/60',
    headerBg: 'from-emerald-500/10 to-transparent',
    dot: 'bg-emerald-400',
    active: 'bg-green-500/20 text-green-300 border-green-500/40 shadow-green-500/20',
    inactive: 'hover:bg-green-500/10 hover:border-green-500/20',
    badgeBg: 'bg-green-500/30',
  },
  amber: {
    border: 'border-l-amber-500/60',
    headerBg: 'from-amber-500/10 to-transparent',
    dot: 'bg-amber-400',
    active: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-orange-500/20',
    inactive: 'hover:bg-orange-500/10 hover:border-orange-500/20',
    badgeBg: 'bg-orange-500/30',
  },
  pink: {
    border: 'border-l-pink-500/60',
    headerBg: 'from-pink-500/10 to-transparent',
    dot: 'bg-pink-400',
    active: 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-pink-500/20',
    inactive: 'hover:bg-pink-500/10 hover:border-pink-500/20',
    badgeBg: 'bg-pink-500/30',
  },
  purple: {
    border: 'border-l-purple-500/60',
    headerBg: 'from-purple-500/10 to-transparent',
    dot: 'bg-purple-400',
    active: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20',
    inactive: 'hover:bg-purple-500/10 hover:border-purple-500/20',
    badgeBg: 'bg-purple-500/30',
  },
  red: {
    border: 'border-l-red-500/60',
    headerBg: 'from-red-500/10 to-transparent',
    dot: 'bg-red-400',
    active: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20',
    inactive: 'hover:bg-red-500/10 hover:border-red-500/20',
    badgeBg: 'bg-red-500/30',
  },
  gray: {
    border: 'border-l-zinc-500/40',
    headerBg: 'from-zinc-500/8 to-transparent',
    dot: 'bg-zinc-400',
    active: 'bg-gray-500/20 text-gray-300 border-gray-500/40 shadow-gray-500/20',
    inactive: 'hover:bg-gray-500/10 hover:border-gray-500/20',
    badgeBg: 'bg-gray-500/30',
  },
};

/**
 * Category configuration — single source of truth
 * Maps standard idea categories to their visual representation including accent classes.
 */
export const categoryConfig: Record<IdeaCategory, CategoryConfig> = {
  functionality: { emoji: '⚡', icon: Zap, color: 'blue', label: 'Functionality', accent: COLOR_ACCENTS.blue },
  performance: { emoji: '📊', icon: Gauge, color: 'green', label: 'Performance', accent: COLOR_ACCENTS.green },
  maintenance: { emoji: '🔧', icon: Wrench, color: 'amber', label: 'Maintenance', accent: COLOR_ACCENTS.amber },
  ui: { emoji: '🎨', icon: Palette, color: 'pink', label: 'UI/UX', accent: COLOR_ACCENTS.pink },
  code_quality: { emoji: '💻', icon: Code2, color: 'purple', label: 'Code Quality', accent: COLOR_ACCENTS.purple },
  user_benefit: { emoji: '❤️', icon: Heart, color: 'red', label: 'User Benefit', accent: COLOR_ACCENTS.red },
};

const FALLBACK_CONFIG: CategoryConfig = {
  emoji: '💡', icon: Sparkles, color: 'gray', label: 'Other',
  accent: COLOR_ACCENTS.gray,
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
  return FALLBACK_CONFIG;
}

/**
 * Get accent classes for a color name.
 * Used by components that receive a color string rather than a category.
 */
export function getColorAccent(color: string): CategoryAccent {
  return COLOR_ACCENTS[color] || COLOR_ACCENTS.gray;
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
