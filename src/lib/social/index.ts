/**
 * Social Library Exports
 * Unified inbox, conversation threading, and customer aggregation
 */

// Types
export type {
  UnifiedCustomer,
  CustomerChannelIdentity,
  ConversationThread,
  ThreadMessage,
  InteractionHistoryEntry,
  ValueScoreFactors,
  CustomerMatch,
  InboxFilters,
  DbUnifiedCustomer,
  DbConversationThread,
  DbThreadMessage,
  GetCustomersRequest,
  GetCustomersResponse,
  GetCustomerDetailRequest,
  GetCustomerDetailResponse,
  GetConversationsRequest,
  GetConversationsResponse,
  AddCustomerNoteRequest,
  AddCustomerTagRequest,
} from './types';

export {
  mapDbToUnifiedCustomer,
  mapDbToConversationThread,
  mapDbToThreadMessage,
} from './types';

// Conversation Threader
export {
  ConversationThreader,
  conversationThreader,
} from './conversationThreader';
export type { ThreadingConfig, ThreadingStrategy } from './conversationThreader';

// Customer Aggregator
export {
  CustomerAggregator,
  customerAggregator,
} from './customerAggregator';
export type { MatchingConfig } from './customerAggregator';
