export { UnifiedInbox, ConversationThread, CustomerProfile, HistoryTimeline } from './components';
export { useUnifiedInbox } from './hooks';
export type {
  InboxViewMode,
  InboxPanelState,
  UnifiedInboxFilters,
  InboxStats,
  SelectedConversation,
  CustomerValueTier,
} from './lib/types';
export {
  DEFAULT_INBOX_FILTERS,
  getCustomerValueTier,
  VALUE_TIER_COLORS,
  VALUE_TIER_LABELS,
  SENTIMENT_COLORS,
  SENTIMENT_BG_COLORS,
} from './lib/types';
