/**
 * Standup Module Constants
 * Configuration options and static values
 */

import {
  Lightbulb,
  Shield,
  Rocket,
  Hammer,
  Sparkles,
  Circle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { IntervalOption, OptionConfig, StatusConfig, GoalStatus } from './types';

// Automation interval options (in minutes)
export const INTERVAL_OPTIONS: IntervalOption[] = [
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 240, label: '4h' },
  { value: 480, label: '8h' },
];

// Autonomy level options
export const AUTONOMY_OPTIONS: OptionConfig[] = [
  {
    value: 'suggest',
    label: 'Suggest',
    icon: Lightbulb,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
  },
  {
    value: 'cautious',
    label: 'Cautious',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
  },
  {
    value: 'autonomous',
    label: 'Auto',
    icon: Rocket,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
  },
];

// Strategy options
export const STRATEGY_OPTIONS: OptionConfig[] = [
  {
    value: 'build',
    label: 'Build',
    icon: Hammer,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/40',
  },
  {
    value: 'polish',
    label: 'Polish',
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
  },
];

// Goal status configurations
export const STATUS_CONFIGS: Record<GoalStatus, StatusConfig> = {
  open: {
    icon: Circle,
    label: 'Open',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
  in_progress: {
    icon: Clock,
    label: 'In Progress',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  done: {
    icon: CheckCircle2,
    label: 'Done',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  rejected: {
    icon: Circle,
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  undecided: {
    icon: Circle,
    label: 'Undecided',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
  },
};

// Category color mappings for goal candidates
export const CATEGORY_COLORS: Record<string, string> = {
  feature: 'text-blue-400 bg-blue-500/20',
  refactor: 'text-purple-400 bg-purple-500/20',
  testing: 'text-green-400 bg-green-500/20',
  docs: 'text-amber-400 bg-amber-500/20',
  performance: 'text-orange-400 bg-orange-500/20',
  security: 'text-red-400 bg-red-500/20',
};

// Default category color
export const DEFAULT_CATEGORY_COLOR = 'text-gray-400 bg-gray-500/20';

// Polling interval for automation status (ms)
export const AUTOMATION_POLL_INTERVAL = 30000;
