import { getDatabase } from '../connection';
import { DbConversation, DbMessage, CreateConversationRequest, CreateMessageRequest, ConversationWithMessages } from '../models/conversation.types';
import { getCurrentTimestamp, selectOne, generateId } from './repository.utils';

/**
 * Conversation Repository
 * Handles all database operations for Annette's conversation memory
 */
export const conversationRepository = {
  /**
   * Create a new conversation
   */
  createConversation: (request: CreateConversationRequest): DbConversation => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('conv');

    const stmt = db.prepare(`
      INSERT INTO conversations (id, project_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, request.projectId, request.title || null, now, now);

    return {
      id,
      project_id: request.projectId,
      title: request.title || null,
      created_at: now,
      updated_at: now,
    };
  },

  /**
   * Get conversation by ID
   */
  getConversationById: (conversationId: string): DbConversation | null => {
    const db = getDatabase();
    return selectOne<DbConversation>(db, 'SELECT * FROM conversations WHERE id = ?', conversationId);
  },

  /**
   * Get all conversations for a project
   */
  getConversationsByProject: (projectId: string): DbConversation[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE project_id = ?
      ORDER BY updated_at DESC
    `);
    return stmt.all(projectId) as DbConversation[];
  },

  /**
   * Get the latest conversation for a project
   */
  getLatestConversation: (projectId: string): DbConversation | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM conversations
      WHERE project_id = ?
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    const conversation = stmt.get(projectId) as DbConversation | undefined;
    return conversation || null;
  },

  /**
   * Update conversation timestamp
   */
  updateConversationTimestamp: (conversationId: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, conversationId);
  },

  /**
   * Delete conversation and all its messages
   */
  deleteConversation: (conversationId: string): void => {
    const db = getDatabase();
    // Messages will be deleted automatically due to CASCADE
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?');
    stmt.run(conversationId);
  },

  /**
   * Add message to conversation
   */
  addMessage: (request: CreateMessageRequest): DbMessage => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('msg');

    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, memory_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const metadata = request.metadata ? JSON.stringify(request.metadata) : null;

    stmt.run(
      id,
      request.conversationId,
      request.role,
      request.content,
      request.memoryType || null,
      metadata,
      now
    );

    // Update conversation timestamp
    conversationRepository.updateConversationTimestamp(request.conversationId);

    return {
      id,
      conversation_id: request.conversationId,
      role: request.role,
      content: request.content,
      memory_type: request.memoryType || null,
      metadata,
      created_at: now,
    };
  },

  /**
   * Get all messages for a conversation
   */
  getMessages: (conversationId: string): DbMessage[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(conversationId) as DbMessage[];
  },

  /**
   * Get messages by memory type
   */
  getMessagesByMemoryType: (conversationId: string, memoryType: string): DbMessage[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ? AND memory_type = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(conversationId, memoryType) as DbMessage[];
  },

  /**
   * Get conversation with all messages
   */
  getConversationWithMessages: (conversationId: string): ConversationWithMessages | null => {
    const conversation = conversationRepository.getConversationById(conversationId);
    if (!conversation) return null;

    const messages = conversationRepository.getMessages(conversationId);

    return {
      conversation,
      messages,
    };
  },

  /**
   * Get or create conversation for project
   * Returns existing latest conversation or creates new one
   */
  getOrCreateConversation: (projectId: string): DbConversation => {
    let conversation = conversationRepository.getLatestConversation(projectId);

    if (!conversation) {
      conversation = conversationRepository.createConversation({
        projectId,
        title: 'Annette Session',
      });
    }

    return conversation;
  },

  /**
   * Clear old conversations (keep last N per project)
   */
  clearOldConversations: (projectId: string, keepLast: number = 10): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM conversations
      WHERE id IN (
        SELECT id FROM conversations
        WHERE project_id = ?
        ORDER BY updated_at DESC
        LIMIT -1 OFFSET ?
      )
    `);
    stmt.run(projectId, keepLast);
  },
};
