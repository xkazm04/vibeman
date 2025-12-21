// Default SLA Configurations
import type { KanbanChannel, KanbanPriority } from '../types/feedbackTypes';
import type { SLAThresholds } from '../types/slaTypes';

// SLA thresholds in minutes by priority
const PRIORITY_SLA: Record<KanbanPriority, SLAThresholds> = {
  critical: { warning: 30, critical: 60, overdue: 120 },      // 30m / 1h / 2h
  high: { warning: 120, critical: 240, overdue: 480 },        // 2h / 4h / 8h
  medium: { warning: 480, critical: 1440, overdue: 2880 },    // 8h / 24h / 48h
  low: { warning: 1440, critical: 2880, overdue: 4320 },      // 24h / 48h / 72h
};

// Channel multipliers (some channels require faster response)
const CHANNEL_MULTIPLIERS: Record<KanbanChannel, number> = {
  x: 0.5,              // Social media needs faster response
  facebook: 0.5,
  instagram: 0.5,
  support_chat: 0.75,  // Live chat expectations
  email: 1.0,          // Standard response time
  trustpilot: 1.0,
  app_store: 1.25,     // App store reviews can take longer
};

export function getSLAThresholds(
  channel: KanbanChannel,
  priority: KanbanPriority
): SLAThresholds {
  const baseSLA = PRIORITY_SLA[priority];
  const multiplier = CHANNEL_MULTIPLIERS[channel];

  return {
    warning: Math.round(baseSLA.warning * multiplier),
    critical: Math.round(baseSLA.critical * multiplier),
    overdue: Math.round(baseSLA.overdue * multiplier),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.round((minutes % 1440) / 60);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

export const SLA_STATUS_COLORS = {
  ok: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  critical: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  overdue: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
} as const;
