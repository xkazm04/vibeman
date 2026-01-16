/**
 * Unified Inbox Types
 * Types for customer aggregation, conversation threading, and unified inbox
 */

import type { FeedbackItem, KanbanChannel, Sentiment } from '@/app/features/Social/lib/types/feedbackTypes';

/**
 * Unified customer profile aggregated across all channels
 */
export interface UnifiedCustomer {
  id: string;
  primaryEmail: string | null;
  primaryHandle: string | null;
  displayName: string;
  channels: CustomerChannelIdentity[];
  valueScore: number;
  totalInteractions: number;
  firstInteractionAt: string;
  lastInteractionAt: string;
  averageSentiment: Sentiment | null;
  tags: string[];
  notes: string[];
  isVerified: boolean;
  followers: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer identity on a specific channel
 */
export interface CustomerChannelIdentity {
  channel: KanbanChannel;
  handle: string | null;
  email: string | null;
  name: string;
  profileUrl?: string;
  verified?: boolean;
  followers?: number;
}

/**
 * Threaded conversation grouping messages across channels
 */
export interface ConversationThread {
  id: string;
  customerId: string;
  subject: string | null;
  messages: ThreadMessage[];
  channels: KanbanChannel[];
  status: 'open' | 'resolved' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'critical';
  lastActivityAt: string;
  createdAt: string;
  resolvedAt: string | null;
  assignedTo: string | null;
  tags: string[];
}

/**
 * Single message in a conversation thread
 */
export interface ThreadMessage {
  id: string;
  feedbackItemId: string;
  channel: KanbanChannel;
  role: 'customer' | 'agent';
  content: string;
  timestamp: string;
  sentiment?: Sentiment;
  metadata?: Record<string, unknown>;
}

/**
 * Customer interaction history entry
 */
export interface InteractionHistoryEntry {
  id: string;
  type: 'feedback' | 'response' | 'ticket_created' | 'ticket_resolved' | 'note_added' | 'tag_added';
  timestamp: string;
  channel: KanbanChannel | null;
  summary: string;
  details?: Record<string, unknown>;
  relatedItemId?: string;
}

/**
 * Value scoring factors for customer importance
 */
export interface ValueScoreFactors {
  interactionFrequency: number; // 0-25 points
  channelDiversity: number; // 0-15 points
  engagement: number; // 0-20 points (likes, retweets, etc)
  sentiment: number; // 0-20 points (positive = higher)
  longevity: number; // 0-10 points (time as customer)
  influence: number; // 0-10 points (followers, verification)
}

/**
 * Database model for unified customer
 */
export interface DbUnifiedCustomer {
  id: string;
  project_id: string;
  primary_email: string | null;
  primary_handle: string | null;
  display_name: string;
  channels_json: string;
  value_score: number;
  total_interactions: number;
  first_interaction_at: string;
  last_interaction_at: string;
  average_sentiment: string | null;
  tags_json: string;
  notes_json: string;
  is_verified: number;
  followers: number;
  created_at: string;
  updated_at: string;
}

/**
 * Database model for conversation thread
 */
export interface DbConversationThread {
  id: string;
  project_id: string;
  customer_id: string;
  subject: string | null;
  channels_json: string;
  status: string;
  priority: string;
  last_activity_at: string;
  created_at: string;
  resolved_at: string | null;
  assigned_to: string | null;
  tags_json: string;
}

/**
 * Database model for thread message
 */
export interface DbThreadMessage {
  id: string;
  thread_id: string;
  feedback_item_id: string;
  channel: string;
  role: string;
  content: string;
  timestamp: string;
  sentiment: string | null;
  metadata_json: string | null;
}

/**
 * Customer matching result
 */
export interface CustomerMatch {
  customer: UnifiedCustomer | null;
  confidence: number; // 0-1
  matchedBy: 'email' | 'handle' | 'name' | 'none';
}

/**
 * Inbox filter options
 */
export interface InboxFilters {
  channels: KanbanChannel[];
  status: ('open' | 'resolved' | 'pending')[];
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  assignedTo: string | null;
  search: string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  minValueScore: number | null;
}

/**
 * API request/response types
 */
export interface GetCustomersRequest {
  projectId: string;
  limit?: number;
  offset?: number;
  search?: string;
  minValueScore?: number;
}

export interface GetCustomersResponse {
  customers: UnifiedCustomer[];
  total: number;
}

export interface GetCustomerDetailRequest {
  customerId: string;
  projectId: string;
}

export interface GetCustomerDetailResponse {
  customer: UnifiedCustomer;
  threads: ConversationThread[];
  history: InteractionHistoryEntry[];
}

export interface GetConversationsRequest {
  projectId: string;
  customerId?: string;
  filters?: Partial<InboxFilters>;
  limit?: number;
  offset?: number;
}

export interface GetConversationsResponse {
  conversations: ConversationThread[];
  total: number;
}

export interface AddCustomerNoteRequest {
  customerId: string;
  projectId: string;
  note: string;
}

export interface AddCustomerTagRequest {
  customerId: string;
  projectId: string;
  tag: string;
}

/**
 * Map DB row to UnifiedCustomer
 */
export function mapDbToUnifiedCustomer(row: DbUnifiedCustomer): UnifiedCustomer {
  return {
    id: row.id,
    primaryEmail: row.primary_email,
    primaryHandle: row.primary_handle,
    displayName: row.display_name,
    channels: JSON.parse(row.channels_json),
    valueScore: row.value_score,
    totalInteractions: row.total_interactions,
    firstInteractionAt: row.first_interaction_at,
    lastInteractionAt: row.last_interaction_at,
    averageSentiment: row.average_sentiment as Sentiment | null,
    tags: JSON.parse(row.tags_json),
    notes: JSON.parse(row.notes_json),
    isVerified: row.is_verified === 1,
    followers: row.followers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Map DB row to ConversationThread
 */
export function mapDbToConversationThread(row: DbConversationThread): Omit<ConversationThread, 'messages'> {
  return {
    id: row.id,
    customerId: row.customer_id,
    subject: row.subject,
    channels: JSON.parse(row.channels_json),
    status: row.status as ConversationThread['status'],
    priority: row.priority as ConversationThread['priority'],
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags_json),
  };
}

/**
 * Map DB row to ThreadMessage
 */
export function mapDbToThreadMessage(row: DbThreadMessage): ThreadMessage {
  return {
    id: row.id,
    feedbackItemId: row.feedback_item_id,
    channel: row.channel as KanbanChannel,
    role: row.role as 'customer' | 'agent',
    content: row.content,
    timestamp: row.timestamp,
    sentiment: row.sentiment as Sentiment | undefined,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
  };
}
