// Filter Types for Kanban Board
import type { KanbanChannel, KanbanPriority, KanbanStatus, Sentiment } from './feedbackTypes';
import type { SLAStatus } from './slaTypes';

export type FilterField = 'channel' | 'priority' | 'sentiment' | 'status' | 'sla' | 'dateRange';

export type DateRangePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
  preset: DateRangePreset;
}

export interface FilterState {
  search: string;
  channels: KanbanChannel[];
  priorities: KanbanPriority[];
  sentiments: Sentiment[];
  statuses: KanbanStatus[];
  slaStatuses: SLAStatus[];
  dateRange: DateRange;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Partial<FilterState>;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  channels: [],
  priorities: [],
  sentiments: [],
  statuses: [],
  slaStatuses: [],
  dateRange: { from: null, to: null, preset: 'all' },
};

export const CHANNEL_LABELS: Record<KanbanChannel, string> = {
  email: 'Email',
  x: 'X',
  facebook: 'Facebook',
  support_chat: 'Support Chat',
  trustpilot: 'Trustpilot',
  app_store: 'App Store',
  instagram: 'Instagram',
};

export const PRIORITY_LABELS: Record<KanbanPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  angry: 'Angry',
  frustrated: 'Frustrated',
  disappointed: 'Disappointed',
  neutral: 'Neutral',
  constructive: 'Constructive',
  helpful: 'Helpful',
  mocking: 'Mocking',
};

export const SLA_LABELS: Record<SLAStatus, string> = {
  ok: 'On Track',
  warning: 'Warning',
  critical: 'Critical',
  overdue: 'Overdue',
};
