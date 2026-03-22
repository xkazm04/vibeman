/**
 * Unified stage color theme for the Conductor pipeline.
 *
 * Single source of truth for all stage-related colors across
 * StageCard, ProcessLog, PipelineFlowViz, and RunSidebar.
 * Uses full static Tailwind class strings (no dynamic interpolation).
 *
 * Theme-aware: stage tints shift to harmonize with the active app theme
 * (Phantom Frequency = purple, Midnight Pulse = cyan, Shadow Nexus = rose).
 */

import type { AnyPipelineStage, PipelineStatus } from './types';
import type { AppTheme } from '@/stores/themeStore';

export interface StageColorTheme {
  text: string;
  bg: string;
  border: string;
  glow: string;
  badge: string;
  progressBar: string;
}

/**
 * Gradient hex pairs for the StageLoadingSpinner per theme.
 * [trailStart, trailEnd]
 */
export const SPINNER_GRADIENT: Record<AppTheme, [string, string]> = {
  midnight: ['#22d3ee', '#3b82f6'],  // cyan-400 -> blue-500
  phantom:  ['#a78bfa', '#d946ef'],  // violet-400 -> fuchsia-500
  shadow:   ['#fb7185', '#f97316'],  // rose-400 -> orange-500
};

/**
 * Per-theme stage color palettes.
 *
 * Each stage gets a distinct tint within the theme's color family so stages
 * remain visually distinguishable while the overall palette shifts with theme.
 */
const THEMED_STAGE_COLORS: Record<AppTheme, Record<string, StageColorTheme>> = {
  // ── Midnight Pulse (cyan base) ─────────────────────────────────
  midnight: {
    scout: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/40',
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      progressBar: 'bg-cyan-400',
    },
    triage: {
      text: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      glow: 'shadow-sky-500/40',
      badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      progressBar: 'bg-sky-400',
    },
    batch: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/40',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      progressBar: 'bg-blue-400',
    },
    execute: {
      text: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/30',
      glow: 'shadow-teal-500/40',
      badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      progressBar: 'bg-teal-400',
    },
    review: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-500/40',
      badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      progressBar: 'bg-indigo-400',
    },
    plan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/40',
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      progressBar: 'bg-cyan-400',
    },
    dispatch: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/40',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      progressBar: 'bg-blue-400',
    },
    reflect: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-500/40',
      badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      progressBar: 'bg-indigo-400',
    },
  },

  // ── Phantom Frequency (purple base) ────────────────────────────
  phantom: {
    scout: {
      text: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      glow: 'shadow-violet-500/40',
      badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      progressBar: 'bg-violet-400',
    },
    triage: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      glow: 'shadow-purple-500/40',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      progressBar: 'bg-purple-400',
    },
    batch: {
      text: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/30',
      glow: 'shadow-fuchsia-500/40',
      badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      progressBar: 'bg-fuchsia-400',
    },
    execute: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      glow: 'shadow-indigo-500/40',
      badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      progressBar: 'bg-indigo-400',
    },
    review: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      glow: 'shadow-pink-500/40',
      badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      progressBar: 'bg-pink-400',
    },
    plan: {
      text: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/30',
      glow: 'shadow-violet-500/40',
      badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      progressBar: 'bg-violet-400',
    },
    dispatch: {
      text: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/30',
      glow: 'shadow-fuchsia-500/40',
      badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      progressBar: 'bg-fuchsia-400',
    },
    reflect: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      glow: 'shadow-pink-500/40',
      badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      progressBar: 'bg-pink-400',
    },
  },

  // ── Shadow Nexus (rose base) ───────────────────────────────────
  shadow: {
    scout: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      glow: 'shadow-rose-500/40',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      progressBar: 'bg-rose-400',
    },
    triage: {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      glow: 'shadow-red-500/40',
      badge: 'bg-red-500/20 text-red-400 border-red-500/30',
      progressBar: 'bg-red-400',
    },
    batch: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      glow: 'shadow-pink-500/40',
      badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      progressBar: 'bg-pink-400',
    },
    execute: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      glow: 'shadow-orange-500/40',
      badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      progressBar: 'bg-orange-400',
    },
    review: {
      text: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/30',
      glow: 'shadow-fuchsia-500/40',
      badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      progressBar: 'bg-fuchsia-400',
    },
    plan: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      glow: 'shadow-rose-500/40',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      progressBar: 'bg-rose-400',
    },
    dispatch: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      glow: 'shadow-pink-500/40',
      badge: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      progressBar: 'bg-pink-400',
    },
    reflect: {
      text: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/30',
      glow: 'shadow-fuchsia-500/40',
      badge: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      progressBar: 'bg-fuchsia-400',
    },
  },
};

// ── Connector arrow colors (PipelineFlowViz) ──────────────────────
export interface ConnectorTheme {
  activeLine: string;
  activeArrow: string;
  completedLine: string;
  completedArrow: string;
  inactiveLine: string;
  inactiveArrow: string;
  pulseHex: [string, string];
}

export const CONNECTOR_THEME: Record<AppTheme, ConnectorTheme> = {
  midnight: {
    activeLine: 'bg-cyan-500/60',
    activeArrow: 'border-l-cyan-500/60',
    completedLine: 'bg-emerald-500/60',
    completedArrow: 'border-l-emerald-500/60',
    inactiveLine: 'bg-gray-700/40',
    inactiveArrow: 'border-l-gray-700/40',
    pulseHex: ['#22d3ee', '#a855f7'],
  },
  phantom: {
    activeLine: 'bg-violet-500/60',
    activeArrow: 'border-l-violet-500/60',
    completedLine: 'bg-emerald-500/60',
    completedArrow: 'border-l-emerald-500/60',
    inactiveLine: 'bg-gray-700/40',
    inactiveArrow: 'border-l-gray-700/40',
    pulseHex: ['#a78bfa', '#d946ef'],
  },
  shadow: {
    activeLine: 'bg-rose-500/60',
    activeArrow: 'border-l-rose-500/60',
    completedLine: 'bg-emerald-500/60',
    completedArrow: 'border-l-emerald-500/60',
    inactiveLine: 'bg-gray-700/40',
    inactiveArrow: 'border-l-gray-700/40',
    pulseHex: ['#fb7185', '#f97316'],
  },
};

// ── Pipeline status colors (RunSidebar, RunHistoryTimeline) ───────
export interface PipelineStatusColors {
  iconClass: string;
  labelClass: string;
  selectedBg: string;
  selectedBorder: string;
}

export const PIPELINE_STATUS_COLORS: Record<PipelineStatus, PipelineStatusColors> = {
  running: {
    iconClass: 'text-cyan-400',
    labelClass: 'text-cyan-400',
    selectedBg: 'bg-cyan-500/15',
    selectedBorder: 'border-cyan-500/40',
  },
  paused: {
    iconClass: 'text-amber-400',
    labelClass: 'text-amber-400',
    selectedBg: 'bg-amber-500/15',
    selectedBorder: 'border-amber-500/40',
  },
  stopping: {
    iconClass: 'text-red-400',
    labelClass: 'text-red-400',
    selectedBg: 'bg-red-500/15',
    selectedBorder: 'border-red-500/40',
  },
  queued: {
    iconClass: 'text-indigo-400',
    labelClass: 'text-indigo-400',
    selectedBg: 'bg-indigo-500/15',
    selectedBorder: 'border-indigo-500/40',
  },
  completed: {
    iconClass: 'text-emerald-400',
    labelClass: 'text-emerald-400',
    selectedBg: 'bg-emerald-500/15',
    selectedBorder: 'border-emerald-500/40',
  },
  failed: {
    iconClass: 'text-red-400',
    labelClass: 'text-red-400',
    selectedBg: 'bg-red-500/15',
    selectedBorder: 'border-red-500/40',
  },
  interrupted: {
    iconClass: 'text-amber-400',
    labelClass: 'text-amber-400',
    selectedBg: 'bg-amber-500/15',
    selectedBorder: 'border-amber-500/40',
  },
  idle: {
    iconClass: 'text-gray-400',
    labelClass: 'text-gray-400',
    selectedBg: 'bg-gray-500/15',
    selectedBorder: 'border-gray-500/40',
  },
};

const DEFAULT_THEME: AppTheme = 'midnight';

export function getStageTheme(stage: string, appTheme?: AppTheme): StageColorTheme {
  const theme = appTheme ?? DEFAULT_THEME;
  const palette = THEMED_STAGE_COLORS[theme];
  return palette[stage] || palette.execute;
}

export function getConnectorTheme(appTheme?: AppTheme): ConnectorTheme {
  return CONNECTOR_THEME[appTheme ?? DEFAULT_THEME];
}
