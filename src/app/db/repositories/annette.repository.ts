/**
 * Annette 2.0 Repository
 * Session management, message persistence, memory topics, preferences, and audio cache
 */

import { getConnection } from '../drivers';
import { v4 as uuidv4 } from 'uuid';
import type {
  DbAnnetteSession,
  DbAnnetteMessage,
  DbAnnetteMemoryTopic,
  DbAnnetteUserPreference,
  DbAnnetteAudioCache,
} from '../models/annette.types';

// ─── Session Operations ───

export const annetteSessionRepository = {
  create(projectId: string, title?: string): DbAnnetteSession {
    const db = getConnection();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO annette_sessions (id, project_id, title, status, message_count, total_tokens_used, last_activity_at, created_at)
      VALUES (?, ?, ?, 'active', 0, 0, ?, ?)
    `).run(id, projectId, title || null, now, now);

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteSession | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_sessions WHERE id = ?').get(id) as DbAnnetteSession | null;
  },

  getByProject(projectId: string, limit = 20): DbAnnetteSession[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_sessions
      WHERE project_id = ?
      ORDER BY last_activity_at DESC
      LIMIT ?
    `).all(projectId, limit) as DbAnnetteSession[];
  },

  getActiveSession(projectId: string): DbAnnetteSession | null {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_sessions
      WHERE project_id = ? AND status = 'active'
      ORDER BY last_activity_at DESC
      LIMIT 1
    `).get(projectId) as DbAnnetteSession | null;
  },

  updateActivity(id: string, tokensUsed: number): void {
    const db = getConnection();
    db.prepare(`
      UPDATE annette_sessions
      SET message_count = message_count + 1,
          total_tokens_used = total_tokens_used + ?,
          last_activity_at = datetime('now')
      WHERE id = ?
    `).run(tokensUsed, id);
  },

  updateSummary(id: string, summary: string): void {
    const db = getConnection();
    db.prepare(`
      UPDATE annette_sessions SET summary = ? WHERE id = ?
    `).run(summary, id);
  },

  archive(id: string): void {
    const db = getConnection();
    db.prepare(`
      UPDATE annette_sessions SET status = 'archived' WHERE id = ?
    `).run(id);
  },

  delete(id: string): boolean {
    const db = getConnection();
    const result = db.prepare('DELETE FROM annette_sessions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ─── Message Operations ───

export const annetteMessageRepository = {
  create(input: {
    sessionId: string;
    role: 'user' | 'assistant' | 'tool_result';
    content: string;
    toolCalls?: string;
    toolName?: string;
    tokensInput?: number;
    tokensOutput?: number;
  }): DbAnnetteMessage {
    const db = getConnection();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO annette_messages (id, session_id, role, content, tool_calls, tool_name, tokens_input, tokens_output, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      id,
      input.sessionId,
      input.role,
      input.content,
      input.toolCalls || null,
      input.toolName || null,
      input.tokensInput || 0,
      input.tokensOutput || 0
    );

    return db.prepare('SELECT * FROM annette_messages WHERE id = ?').get(id) as DbAnnetteMessage;
  },

  getBySession(sessionId: string, limit = 50): DbAnnetteMessage[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `).all(sessionId, limit) as DbAnnetteMessage[];
  },

  getRecentBySession(sessionId: string, limit = 20): DbAnnetteMessage[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM (
        SELECT * FROM annette_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      ) sub ORDER BY created_at ASC
    `).all(sessionId, limit) as DbAnnetteMessage[];
  },

  countBySession(sessionId: string): number {
    const db = getConnection();
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM annette_messages WHERE session_id = ?'
    ).get(sessionId) as { count: number };
    return result.count;
  },

  deleteBySession(sessionId: string): number {
    const db = getConnection();
    const result = db.prepare('DELETE FROM annette_messages WHERE session_id = ?').run(sessionId);
    return result.changes;
  },
};

// ─── Memory Topic Operations (Layer 3) ───

export const annetteMemoryTopicRepository = {
  upsert(projectId: string, topic: string, summary: string): DbAnnetteMemoryTopic {
    const db = getConnection();
    const existing = db.prepare(`
      SELECT * FROM annette_memory_topics
      WHERE project_id = ? AND topic = ?
    `).get(projectId, topic) as DbAnnetteMemoryTopic | null;

    if (existing) {
      db.prepare(`
        UPDATE annette_memory_topics
        SET summary = ?,
            mention_count = mention_count + 1,
            relevance_score = MIN(relevance_score + 0.1, 2.0),
            last_mentioned_at = datetime('now')
        WHERE id = ?
      `).run(summary, existing.id);
      return this.getById(existing.id)!;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO annette_memory_topics (id, project_id, topic, summary, relevance_score, mention_count, last_mentioned_at, created_at)
      VALUES (?, ?, ?, ?, 1.0, 1, ?, ?)
    `).run(id, projectId, topic, summary, now, now);

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteMemoryTopic | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_memory_topics WHERE id = ?').get(id) as DbAnnetteMemoryTopic | null;
  },

  getByProject(projectId: string, limit = 10): DbAnnetteMemoryTopic[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_memory_topics
      WHERE project_id = ?
      ORDER BY relevance_score DESC, last_mentioned_at DESC
      LIMIT ?
    `).all(projectId, limit) as DbAnnetteMemoryTopic[];
  },

  decayRelevance(projectId: string, factor = 0.95): number {
    const db = getConnection();
    const result = db.prepare(`
      UPDATE annette_memory_topics
      SET relevance_score = relevance_score * ?
      WHERE project_id = ? AND relevance_score > 0.1
    `).run(factor, projectId);
    return result.changes;
  },

  pruneStale(projectId: string, minScore = 0.1): number {
    const db = getConnection();
    const result = db.prepare(`
      DELETE FROM annette_memory_topics
      WHERE project_id = ? AND relevance_score < ?
    `).run(projectId, minScore);
    return result.changes;
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_memory_topics WHERE id = ?').run(id).changes > 0;
  },
};

// ─── User Preference Operations (Layer 5) ───

export const annettePreferenceRepository = {
  upsert(projectId: string, category: string, key: string, value: string): DbAnnetteUserPreference {
    const db = getConnection();
    const existing = db.prepare(`
      SELECT * FROM annette_user_preferences
      WHERE project_id = ? AND category = ? AND preference_key = ?
    `).get(projectId, category, key) as DbAnnetteUserPreference | null;

    if (existing) {
      db.prepare(`
        UPDATE annette_user_preferences
        SET preference_value = ?,
            confidence = MIN(confidence + 0.1, 1.0),
            observed_count = observed_count + 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(value, existing.id);
      return this.getById(existing.id)!;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO annette_user_preferences (id, project_id, category, preference_key, preference_value, confidence, observed_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0.5, 1, ?, ?)
    `).run(id, projectId, category, key, value, now, now);

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteUserPreference | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_user_preferences WHERE id = ?').get(id) as DbAnnetteUserPreference | null;
  },

  getByProject(projectId: string): DbAnnetteUserPreference[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_user_preferences
      WHERE project_id = ?
      ORDER BY confidence DESC, observed_count DESC
    `).all(projectId) as DbAnnetteUserPreference[];
  },

  getByCategory(projectId: string, category: string): DbAnnetteUserPreference[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_user_preferences
      WHERE project_id = ? AND category = ?
      ORDER BY confidence DESC
    `).all(projectId, category) as DbAnnetteUserPreference[];
  },

  getHighConfidence(projectId: string, minConfidence = 0.7): DbAnnetteUserPreference[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_user_preferences
      WHERE project_id = ? AND confidence >= ?
      ORDER BY confidence DESC
    `).all(projectId, minConfidence) as DbAnnetteUserPreference[];
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_user_preferences WHERE id = ?').run(id).changes > 0;
  },
};

// ─── Audio Cache Operations ───

export const annetteAudioCacheRepository = {
  upsert(input: {
    cacheKey: string;
    textContent: string;
    filePath: string;
    fileSizeBytes: number;
    voiceId?: string;
    durationMs?: number;
  }): DbAnnetteAudioCache {
    const db = getConnection();
    const existing = db.prepare(
      'SELECT * FROM annette_audio_cache WHERE cache_key = ?'
    ).get(input.cacheKey) as DbAnnetteAudioCache | null;

    if (existing) {
      db.prepare(`
        UPDATE annette_audio_cache
        SET last_accessed_at = datetime('now'),
            access_count = access_count + 1
        WHERE id = ?
      `).run(existing.id);
      return this.getById(existing.id)!;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO annette_audio_cache (id, cache_key, text_content, file_path, file_size_bytes, voice_id, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, input.cacheKey, input.textContent, input.filePath, input.fileSizeBytes, input.voiceId || null, input.durationMs || null);

    return this.getById(id)!;
  },

  getById(id: string): DbAnnetteAudioCache | null {
    const db = getConnection();
    return db.prepare('SELECT * FROM annette_audio_cache WHERE id = ?').get(id) as DbAnnetteAudioCache | null;
  },

  getByKey(cacheKey: string): DbAnnetteAudioCache | null {
    const db = getConnection();
    const entry = db.prepare(
      'SELECT * FROM annette_audio_cache WHERE cache_key = ?'
    ).get(cacheKey) as DbAnnetteAudioCache | null;

    if (entry) {
      // Update LRU access
      db.prepare(`
        UPDATE annette_audio_cache
        SET last_accessed_at = datetime('now'),
            access_count = access_count + 1
        WHERE id = ?
      `).run(entry.id);
    }

    return entry;
  },

  getTotalSize(): number {
    const db = getConnection();
    const result = db.prepare(
      'SELECT COALESCE(SUM(file_size_bytes), 0) as total FROM annette_audio_cache'
    ).get() as { total: number };
    return result.total;
  },

  getLruEntries(limit = 10): DbAnnetteAudioCache[] {
    const db = getConnection();
    return db.prepare(`
      SELECT * FROM annette_audio_cache
      ORDER BY last_accessed_at ASC
      LIMIT ?
    `).all(limit) as DbAnnetteAudioCache[];
  },

  delete(id: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_audio_cache WHERE id = ?').run(id).changes > 0;
  },

  deleteByKey(cacheKey: string): boolean {
    const db = getConnection();
    return db.prepare('DELETE FROM annette_audio_cache WHERE cache_key = ?').run(cacheKey).changes > 0;
  },
};
