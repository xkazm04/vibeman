/**
 * Unified Inbox Local Types
 * UI state and component-specific types
 */

import type { KanbanChannel, KanbanPriority, Sentiment } from '../../lib/types/feedbackTypes';
import type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry } from '@/lib/social';

// Re-export for convenience
export type { UnifiedCustomer, ConversationThread, InteractionHistoryEntry };

/**
 * Inbox view modes
 */
export type InboxViewMode = 'conversations' | 'customers';

/**
 * Inbox panel states
 */
export type InboxPanelState = 'list' | 'detail' | 'customer-profile';

/**
 * Selected conversation state
 */
export interface SelectedConversation {
  thread: ConversationThread;
  customer: UnifiedCustomer | null;
}

/**
 * Filter state for unified inbox
 */
export interface UnifiedInboxFilters {
  channels: KanbanChannel[];
  status: ('open' | 'resolved' | 'pending')[];
  priority: KanbanPriority[];
  search: string;
  minValueScore: number | null;
}

export const DEFAULT_INBOX_FILTERS: UnifiedInboxFilters = {
  channels: [],
  status: [],
  priority: [],
  search: '',
  minValueScore: null,
};

/**
 * Inbox statistics
 */
export interface InboxStats {
  totalConversations: number;
  openConversations: number;
  resolvedConversations: number;
  pendingConversations: number;
  totalCustomers: number;
  highValueCustomers: number;
  averageResponseTime?: number;
}

/**
 * Customer value tier based on score
 */
export type CustomerValueTier = 'platinum' | 'gold' | 'silver' | 'bronze';

export function getCustomerValueTier(score: number): CustomerValueTier {
  if (score >= 80) return 'platinum';
  if (score >= 60) return 'gold';
  if (score >= 40) return 'silver';
  return 'bronze';
}

export const VALUE_TIER_COLORS: Record<CustomerValueTier, string> = {
  platinum: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  silver: 'text-gray-300 bg-gray-500/10 border-gray-500/30',
  bronze: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

export const VALUE_TIER_LABELS: Record<CustomerValueTier, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
};

/**
 * Sentiment display colors
 */
export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  angry: 'text-red-400',
  frustrated: 'text-orange-400',
  disappointed: 'text-yellow-400',
  mocking: 'text-purple-400',
  neutral: 'text-gray-400',
  constructive: 'text-blue-400',
  helpful: 'text-green-400',
};

export const SENTIMENT_BG_COLORS: Record<Sentiment, string> = {
  angry: 'bg-red-500/10',
  frustrated: 'bg-orange-500/10',
  disappointed: 'bg-yellow-500/10',
  mocking: 'bg-purple-500/10',
  neutral: 'bg-gray-500/10',
  constructive: 'bg-blue-500/10',
  helpful: 'bg-green-500/10',
};
