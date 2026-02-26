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

// ─── Memory System Types ───

export type AnnetteMemoryType = 'conversation' | 'decision' | 'fact' | 'preference' | 'event' | 'insight';

export interface DbAnnetteMemory {
  id: string;
  project_id: string;
  session_id: string | null;
  memory_type: AnnetteMemoryType;
  content: string;
  summary: string | null;
  embedding: string | null; // JSON array of floats
  importance_score: number;
  decay_factor: number;
  access_count: number;
  last_accessed_at: string | null;
  consolidated_into: string | null;
  source_message_ids: string | null; // JSON array of message IDs
  metadata: string | null; // JSON object
  created_at: string;
  updated_at: string;
}

export type KnowledgeNodeType =
  | 'entity'
  | 'concept'
  | 'file'
  | 'function'
  | 'component'
  | 'api'
  | 'decision'
  | 'person'
  | 'technology';

export interface DbAnnetteKnowledgeNode {
  id: string;
  project_id: string;
  node_type: KnowledgeNodeType;
  name: string;
  description: string | null;
  properties: string | null; // JSON object
  embedding: string | null; // JSON array of floats
  mention_count: number;
  importance_score: number;
  last_mentioned_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnnetteKnowledgeEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  weight: number;
  properties: string | null; // JSON object
  evidence_count: number;
  last_observed_at: string;
  created_at: string;
}

// ─── Rapport Model Types ───

export interface DbAnnetteRapport {
  id: string;
  project_id: string;
  /** Tone axis: 0.0 = very formal, 1.0 = very casual */
  tone_formal_casual: number;
  /** Depth axis: 0.0 = expert (terse), 1.0 = teaching (verbose) */
  depth_expert_teaching: number;
  /** Initiative axis: 0.0 = reactive only, 1.0 = highly proactive */
  initiative_reactive_proactive: number;
  /** Humor axis: 0.0 = strictly professional, 1.0 = playful/witty */
  humor_level: number;
  /** Current detected emotional state */
  detected_mood: 'neutral' | 'focused' | 'frustrated' | 'exploratory' | 'rushed';
  /** Frustration score: 0.0 = calm, 1.0 = very frustrated */
  frustration_score: number;
  /** Total conversation turns analyzed */
  total_turns_analyzed: number;
  /** Expertise areas (JSON array of strings) */
  expertise_areas: string;
  /** Work rhythm pattern (JSON: { peakHours, avgSessionLength, preferredSessionTime }) */
  work_rhythm: string;
  /** Emotional pattern history (JSON array of { mood, timestamp, trigger }) */
  emotional_history: string;
  /** Communication style signals (JSON: { avgMessageLength, usesEmoji, usesCodeBlocks, questionFrequency }) */
  communication_signals: string;
  created_at: string;
  updated_at: string;
}

export type ConsolidationType = 'merge' | 'summarize' | 'compress' | 'archive';

export interface DbAnnetteMemoryConsolidation {
  id: string;
  project_id: string;
  source_memory_ids: string; // JSON array of memory IDs
  result_memory_id: string;
  consolidation_type: ConsolidationType;
  tokens_before: number | null;
  tokens_after: number | null;
  created_at: string;
}
