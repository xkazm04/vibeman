// View Mode State Types
import type { LucideIcon } from 'lucide-react';
import type { FeedbackItem, KanbanChannel, KanbanPriority, Sentiment } from '../lib/types/feedbackTypes';

// All grouping options (removed company)
export type GroupByField = 'none' | 'channel' | 'priority' | 'sentiment';

export interface SwimlaneConfig {
  groupBy: GroupByField;
  collapsedLanes: Set<string>;
}

export interface SwimlaneData {
  id: string;
  label: string;
  icon?: LucideIcon;
  color: string;
  items: FeedbackItem[];
  count: number;
}

export type ViewMode = 'board' | 'swimlanes';

export const GROUP_BY_LABELS: Record<GroupByField, string> = {
  none: 'None',
  channel: 'Channel',
  priority: 'Priority',
  sentiment: 'Sentiment',
};

export const CHANNEL_COLORS: Record<KanbanChannel, string> = {
  email: 'bg-blue-500',
  x: 'bg-gray-800',
  facebook: 'bg-indigo-500',
  support_chat: 'bg-green-500',
  trustpilot: 'bg-emerald-500',
  app_store: 'bg-purple-500',
  instagram: 'bg-pink-500',
};

export const PRIORITY_SWIM_COLORS: Record<KanbanPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-500',
};

export const SENTIMENT_SWIM_COLORS: Record<Sentiment, string> = {
  angry: 'bg-red-500',
  frustrated: 'bg-orange-500',
  disappointed: 'bg-amber-500',
  neutral: 'bg-gray-500',
  constructive: 'bg-blue-500',
  helpful: 'bg-green-500',
  mocking: 'bg-purple-500',
};

export interface ViewModeState {
  viewMode: ViewMode;
  groupBy: GroupByField;
  activityPanelOpen: boolean;
}

export interface ViewModeContextValue extends ViewModeState {
  setViewMode: (mode: ViewMode) => void;
  setGroupBy: (field: GroupByField) => void;
  setActivityPanelOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
}
