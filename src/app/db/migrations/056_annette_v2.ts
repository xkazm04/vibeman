/**
 * Migration 056: Annette 2.0 - Conversational AI with Deep Memory
 * Creates tables for:
 * - annette_sessions: Conversation sessions per project
 * - annette_messages: Individual messages with tool calls
 * - annette_memory_topics: Cross-session topic summaries (Layer 3)
 * - annette_user_preferences: Long-term learned preferences (Layer 5)
 * - annette_audio_cache: Metadata for locally cached TTS audio
 */

import Database from 'better-sqlite3';

function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name=?
  `).get(tableName) as { name: string } | undefined;
  return !!result;
}

export function migrate056AnnetteV2(db: Database.Database): void {
  // 1. Conversation sessions
  if (!tableExists(db, 'annette_sessions')) {
    db.exec(`
      CREATE TABLE annette_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        message_count INTEGER DEFAULT 0,
        total_tokens_used INTEGER DEFAULT 0,
        summary TEXT,
        last_activity_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_annette_sessions_project
        ON annette_sessions(project_id);
      CREATE INDEX idx_annette_sessions_status
        ON annette_sessions(status);
      CREATE INDEX idx_annette_sessions_activity
        ON annette_sessions(last_activity_at DESC);
    `);
    console.log('[Migration 056] Created annette_sessions table');
  }

  // 2. Individual messages
  if (!tableExists(db, 'annette_messages')) {
    db.exec(`
      CREATE TABLE annette_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool_result')),
        content TEXT NOT NULL,
        tool_calls TEXT,
        tool_name TEXT,
        tokens_input INTEGER DEFAULT 0,
        tokens_output INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (session_id) REFERENCES annette_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_annette_messages_session
        ON annette_messages(session_id);
      CREATE INDEX idx_annette_messages_created
        ON annette_messages(created_at);
    `);
    console.log('[Migration 056] Created annette_messages table');
  }

  // 3. Cross-session topic memory (Layer 3: ~300 tokens)
  if (!tableExists(db, 'annette_memory_topics')) {
    db.exec(`
      CREATE TABLE annette_memory_topics (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        summary TEXT NOT NULL,
        relevance_score REAL DEFAULT 1.0,
        mention_count INTEGER DEFAULT 1,
        last_mentioned_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_annette_topics_project
        ON annette_memory_topics(project_id);
      CREATE INDEX idx_annette_topics_relevance
        ON annette_memory_topics(relevance_score DESC);
    `);
    console.log('[Migration 056] Created annette_memory_topics table');
  }

  // 4. Long-term user preferences (Layer 5: ~200 tokens)
  if (!tableExists(db, 'annette_user_preferences')) {
    db.exec(`
      CREATE TABLE annette_user_preferences (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        observed_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(project_id, category, preference_key)
      );

      CREATE INDEX idx_annette_prefs_project
        ON annette_user_preferences(project_id);
      CREATE INDEX idx_annette_prefs_category
        ON annette_user_preferences(category);
    `);
    console.log('[Migration 056] Created annette_user_preferences table');
  }

  // 5. Audio cache metadata
  if (!tableExists(db, 'annette_audio_cache')) {
    db.exec(`
      CREATE TABLE annette_audio_cache (
        id TEXT PRIMARY KEY,
        cache_key TEXT NOT NULL UNIQUE,
        text_content TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        voice_id TEXT,
        duration_ms INTEGER,
        last_accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
        access_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_annette_audio_cache_key
        ON annette_audio_cache(cache_key);
      CREATE INDEX idx_annette_audio_lru
        ON annette_audio_cache(last_accessed_at ASC);
    `);
    console.log('[Migration 056] Created annette_audio_cache table');
  }

  console.log('[Migration 056] Annette 2.0 tables migration complete');
}
