/**
 * Conversation Types
 * Database models for Annette's conversation memory
 */

/**
 * Conversation session in the database
 */
export interface DbConversation {
  id: string;
  project_id: string;
  title: string | null; // Optional conversation title
  created_at: string;
  updated_at: string;
}

/**
 * Individual message in a conversation
 */
export interface DbMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  memory_type: string | null; // Free string for future categorization (e.g., 'user_preference', 'project_fact', 'action')
  metadata: string | null; // JSON string for additional data
  created_at: string;
}

/**
 * Create conversation request
 */
export interface CreateConversationRequest {
  projectId: string;
  title?: string;
}

/**
 * Create message request
 */
export interface CreateMessageRequest {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  memoryType?: string;
  metadata?: Record<string, any>;
}

/**
 * Conversation with messages
 */
export interface ConversationWithMessages {
  conversation: DbConversation;
  messages: DbMessage[];
}
