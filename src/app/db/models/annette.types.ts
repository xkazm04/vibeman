/**
 * Annette 2.0 Database Types
 * Conversation AI with deep memory system
 */

export interface DbAnnetteSession {
  id: string;
  project_id: string;
  title: string | null;
  status: 'active' | 'archived';
  message_count: number;
  total_tokens_used: number;
  summary: string | null;
  last_activity_at: string;
  created_at: string;
}

export interface DbAnnetteMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool_result';
  content: string;
  tool_calls: string | null; // JSON array of tool calls
  tool_name: string | null;
  tokens_input: number;
  tokens_output: number;
  created_at: string;
}

export interface DbAnnetteMemoryTopic {
  id: string;
  project_id: string;
  topic: string;
  summary: string;
  relevance_score: number;
  mention_count: number;
  last_mentioned_at: string;
  created_at: string;
}

export interface DbAnnetteUserPreference {
  id: string;
  project_id: string;
  category: string;
  preference_key: string;
  preference_value: string;
  confidence: number;
  observed_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbAnnetteAudioCache {
  id: string;
  cache_key: string;
  text_content: string;
  file_path: string;
  file_size_bytes: number;
  voice_id: string | null;
  duration_ms: number | null;
  last_accessed_at: string;
  access_count: number;
  created_at: string;
}
