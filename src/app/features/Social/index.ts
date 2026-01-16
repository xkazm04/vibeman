// Social feature main exports
export { SocialLayout, default } from './SocialLayout';

// Components - export directly to avoid conflicts
export {
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
} from './components';

// Unified Inbox sub-feature
export {
  UnifiedInbox,
  ConversationThread,
  CustomerProfile,
  HistoryTimeline,
  useUnifiedInbox,
} from './sub_UnifiedInbox';

// Hooks - export specific hooks
export { useSplitView } from './hooks/useSplitView';

// Types - import from specific modules as needed
export type { FeedbackItem, KanbanChannel } from './lib/types/feedbackTypes';
export type { FeedbackAnalysisResult, AIProcessingStatus } from './lib/types/aiTypes';
export type {
  InboxViewMode,
  InboxPanelState,
  UnifiedInboxFilters,
  InboxStats,
} from './sub_UnifiedInbox';

// State providers
export { KanbanStateProviders } from './state/KanbanStateProviders';
