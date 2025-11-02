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


export const getStatusInfo = (status: Goal['status']) => {
  switch (status) {
    case 'done':
      return {
        text: 'Completed',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        icon: CheckCircle
      };
    case 'in_progress':
      return {
        text: 'In Progress',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500/30',
        icon: Clock
      };
    case 'open':
      return {
        text: 'Open',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        icon: Circle
      };
    case 'undecided':
      return {
        text: 'Undecided',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
        icon: Circle
      };
    case 'rejected':
      return {
        text: 'Rejected',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: Circle
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
        icon: Circle
      };
  }
};

/**
 * Status configurations for goal statuses
 * Provides consistent styling across the application
 */
export const STATUS_CONFIGS: Record<Goal['status'], StatusConfig> = {
  done: {
    text: 'Completed',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    gradient: 'from-emerald-400/20 to-green-500/20',
    textColor: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
    icon: CheckCircle
  },
  in_progress: {
    text: 'In Progress',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    gradient: 'from-amber-400/20 to-yellow-500/20',
    textColor: 'text-amber-300',
    glow: 'shadow-amber-500/20',
    icon: Clock
  },
  open: {
    text: 'Open',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400/20 to-cyan-500/20',
    textColor: 'text-blue-300',
    glow: 'shadow-blue-500/20',
    icon: Circle
  },
  undecided: {
    text: 'Under Review',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    gradient: 'from-blue-400/20 to-violet-500/20',
    textColor: 'text-blue-300',
    glow: 'shadow-blue-500/20',
    icon: AlertCircle
  },
  rejected: {
    text: 'Archived',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    gradient: 'from-red-400/20 to-rose-500/20',
    textColor: 'text-red-300',
    glow: 'shadow-red-500/20',
    icon: XCircle
  }
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
