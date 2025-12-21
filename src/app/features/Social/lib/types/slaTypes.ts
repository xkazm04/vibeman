// SLA Types for Kanban Board
import type { KanbanChannel, KanbanPriority } from './feedbackTypes';

export type SLAStatus = 'ok' | 'warning' | 'critical' | 'overdue';

export interface SLAConfig {
  channel: KanbanChannel;
  priority: KanbanPriority;
  warningMinutes: number;
  criticalMinutes: number;
  overdueMinutes: number;
}

export interface SLAInfo {
  status: SLAStatus;
  ageMinutes: number;
  remainingMinutes: number | null;
  formattedAge: string;
  formattedRemaining: string;
  percentComplete: number;
}

export interface SLAThresholds {
  warning: number;
  critical: number;
  overdue: number;
}
