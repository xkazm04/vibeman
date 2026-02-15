import {
  Clock,
  Play,
  Search,
  Sparkles,
  Scale,
  CheckCircle,
  XCircle,
  Pause,
  type LucideIcon,
} from 'lucide-react';
import type { AutomationPhase } from '@/app/db/models/standup.types';

export interface PhaseConfigEntry {
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind text color class */
  textColor: string;
  /** Tailwind bg color class (10% opacity for badges) */
  bgColor: string;
  /** Tailwind border color class */
  borderColor: string;
  /** Whether to apply a pulse animation */
  pulse: boolean;
  /** Tailwind class for the icon when animated (e.g. animate-spin) */
  iconAnimation?: string;
}

/**
 * Phase-specific colors, icons, and animations for automation sessions.
 * Import and use in any component rendering session state.
 *
 * Usage:
 *   import { phaseConfig } from '@/app/features/DailyStandup/lib/phaseConfig';
 *   const config = phaseConfig[session.phase];
 *   <config.icon className={`w-4 h-4 ${config.textColor}`} />
 */
export const phaseConfig: Record<AutomationPhase, PhaseConfigEntry> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    pulse: false,
  },
  running: {
    label: 'Running',
    icon: Play,
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    pulse: true,
    iconAnimation: 'animate-pulse',
  },
  exploring: {
    label: 'Exploring',
    icon: Search,
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    pulse: true,
    iconAnimation: 'animate-pulse',
  },
  generating: {
    label: 'Generating',
    icon: Sparkles,
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    pulse: true,
    iconAnimation: 'animate-pulse',
  },
  evaluating: {
    label: 'Evaluating',
    icon: Scale,
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    pulse: true,
    iconAnimation: 'animate-pulse',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle,
    textColor: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    pulse: false,
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    pulse: false,
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    pulse: false,
  },
};

/**
 * Helper to get combined className for a phase badge.
 * Returns: "bg-xxx/10 border-xxx/30 text-xxx"
 */
export function getPhaseBadgeClass(phase: AutomationPhase): string {
  const config = phaseConfig[phase];
  return `${config.bgColor} ${config.borderColor} ${config.textColor}`;
}
