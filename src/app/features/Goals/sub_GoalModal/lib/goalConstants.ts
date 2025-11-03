import { CheckCircle, Clock, Circle, XCircle, AlertCircle } from 'lucide-react';
import { Goal } from '../../../../types';

/**
 * Status configuration interface
 */
export interface StatusConfig {
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient?: string;
  textColor?: string;
  glow?: string;
  icon: typeof CheckCircle;
}

/**
 * Helper to create status configuration object
 */
function createStatusConfig(
  text: string,
  baseColor: string,
  icon: typeof CheckCircle,
  options?: { gradient?: string; textColor?: string; glow?: string }
): StatusConfig {
  return {
    text,
    color: `text-${baseColor}-400`,
    bgColor: `bg-${baseColor}-500/20`,
    borderColor: `border-${baseColor}-500/30`,
    icon,
    ...options,
  };
}

/**
 * Status configurations for goal statuses
 * Provides consistent styling across the application
 */
export const STATUS_CONFIGS: Record<Goal['status'], StatusConfig> = {
  done: createStatusConfig('Completed', 'green', CheckCircle, {
    gradient: 'from-emerald-400/20 to-green-500/20',
    textColor: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
  }),
  in_progress: createStatusConfig('In Progress', 'yellow', Clock, {
    gradient: 'from-amber-400/20 to-yellow-500/20',
    textColor: 'text-amber-300',
    glow: 'shadow-amber-500/20',
  }),
  open: createStatusConfig('Open', 'blue', Circle, {
    gradient: 'from-blue-400/20 to-cyan-500/20',
    textColor: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  }),
  undecided: createStatusConfig('Under Review', 'blue', AlertCircle, {
    gradient: 'from-blue-400/20 to-violet-500/20',
    textColor: 'text-blue-300',
    glow: 'shadow-blue-500/20',
  }),
  rejected: createStatusConfig('Archived', 'red', XCircle, {
    gradient: 'from-red-400/20 to-rose-500/20',
    textColor: 'text-red-300',
    glow: 'shadow-red-500/20',
  }),
};

/**
 * Get simplified status info (for backward compatibility)
 * Returns basic status information without extended styling
 */
export const getStatusInfo = (status: Goal['status']) => {
  const config = STATUS_CONFIGS[status];
  if (!config) {
    return createStatusConfig('Unknown', 'gray', Circle);
  }

  return {
    text: config.text,
    color: config.color,
    bgColor: config.bgColor,
    borderColor: config.borderColor,
    icon: config.icon,
  };
};

/**
 * Get status configuration for a given goal status
 * @param status - The goal status
 * @returns Status configuration object
 */
export function getStatusConfig(status: Goal['status']): StatusConfig {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.open;
}

/**
 * Timeline configuration constants
 */
export const TIMELINE_CONSTANTS = {
  MAX_VISIBLE_GOALS: 10,
  GOAL_WIDTH: 80, // Width including spacing
  SCROLL_DURATION: 0.5,
  ANIMATION_DELAY_PER_ITEM: 0.1
} as const;

/**
 * Modal configuration constants
 */
export const MODAL_CONSTANTS = {
  FADE_IN_DELAY: 50,
  TRANSITION_DURATION: 300,
  MAX_WIDTH_DETAIL: 'max-w-6xl',
  MAX_WIDTH_ADD: 'max-w-lg'
} as const;
