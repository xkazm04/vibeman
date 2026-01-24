/**
 * Annette Memory Manager
 * 5-Layer deep memory system that scales with brain data
 *
 * Layer 1: Immediate Context (~2000 tokens) - Recent messages from current session
 * Layer 2: Session Summary (~500 tokens) - Compressed summary of older session messages
 * Layer 3: Cross-Session Topics (~300 tokens) - Recurring themes across sessions
 * Layer 4: Brain Knowledge (~500 tokens) - Behavioral context from Brain system
 * Layer 5: Long-Term Preferences (~200 tokens) - Learned user communication preferences
 *
 * Total budget: ~3500 tokens of memory context per turn
 */

import { annetteDb } from '@/app/db';
import { formatBrainForPrompt } from './brainInjector';
import { ConversationMessage } from './orchestrator';
import { logger } from '@/lib/logger';

export interface MemoryContext {
  /** Layer 1: Recent messages for the API */
  recentMessages: ConversationMessage[];
  /** Layer 2: Summary of older messages in current session */
  sessionSummary: string;
  /** Layer 3: Cross-session recurring topics */
  relevantTopics: string;
  /** Layer 4: Brain behavioral context (injected via system prompt) */
  brainContext: string;
  /** Layer 5: Learned user preferences */
  userPreferences: string;
}

const MAX_RECENT_MESSAGES = 20;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get or create an active session for the project
 */
export function getOrCreateSession(projectId: string): string {
  const existing = annetteDb.sessions.getActiveSession(projectId);

  if (existing) {
    const lastActivity = new Date(existing.last_activity_at).getTime();
    const now = Date.now();
    if (now - lastActivity < SESSION_TIMEOUT_MS) {
      return existing.id;
    }
    // Session timed out - archive it
    annetteDb.sessions.archive(existing.id);
  }

  // Create new session
  const session = annetteDb.sessions.create(projectId);
  return session.id;
}

/**
 * Build the full memory context for a conversation turn
 * Assembles all 5 layers to inject into the orchestrator
 */
export function buildMemoryContext(projectId: string, sessionId: string): MemoryContext {
  // Layer 1: Recent messages from current session
  const recentMessages = getRecentMessages(sessionId);

  // Layer 2: Session summary (if there are older messages)
  const sessionSummary = getSessionSummary(sessionId);

  // Layer 3: Cross-session topics
  const relevantTopics = getRelevantTopics(projectId);

  // Layer 4: Brain behavioral context
  const brainContext = formatBrainForPrompt(projectId);

  // Layer 5: User preferences
  const userPreferences = getUserPreferences(projectId);

  return {
    recentMessages,
    sessionSummary,
    relevantTopics,
    brainContext,
    userPreferences,
  };
}

/**
 * Persist a user message to the session
 */
export function persistUserMessage(sessionId: string, content: string): void {
  try {
    annetteDb.messages.create({
      sessionId,
      role: 'user',
      content,
    });
  } catch (error) {
    logger.error('Failed to persist user message', { sessionId, error });
  }
}

/**
 * Persist an assistant response to the session
 */
export function persistAssistantMessage(
  sessionId: string,
  content: string,
  toolCalls?: Array<{ name: string; input: Record<string, unknown> }>,
  tokensInput = 0,
  tokensOutput = 0
): void {
  try {
    annetteDb.messages.create({
      sessionId,
      role: 'assistant',
      content,
      toolCalls: toolCalls ? JSON.stringify(toolCalls) : undefined,
      tokensInput,
      tokensOutput,
    });

    // Update session activity
    annetteDb.sessions.updateActivity(sessionId, tokensInput + tokensOutput);
  } catch (error) {
    logger.error('Failed to persist assistant message', { sessionId, error });
  }
}

/**
 * Extract and update memory topics from a conversation turn
 * Call after each completed orchestration to learn recurring themes
 */
export function updateMemoryFromTurn(
  projectId: string,
  userMessage: string,
  toolsUsed: Array<{ name: string }>
): void {
  try {
    // Track tool usage patterns as topics
    for (const tool of toolsUsed) {
      const category = getToolCategory(tool.name);
      if (category) {
        annetteDb.topics.upsert(
          projectId,
          `${category}_usage`,
          `User frequently uses ${category} tools (latest: ${tool.name})`
        );
      }
    }

    // Decay old topic relevance periodically
    annetteDb.topics.decayRelevance(projectId, 0.98);
  } catch (error) {
    logger.error('Failed to update memory from turn', { projectId, error });
  }
}

/**
 * Learn a user preference from observed behavior
 */
export function learnPreference(
  projectId: string,
  category: string,
  key: string,
  value: string
): void {
  try {
    annetteDb.preferences.upsert(projectId, category, key, value);
  } catch (error) {
    logger.error('Failed to learn preference', { projectId, category, key, error });
  }
}

// ─── Internal Helpers ───

function getRecentMessages(sessionId: string): ConversationMessage[] {
  try {
    const messages = annetteDb.messages.getRecentBySession(sessionId, MAX_RECENT_MESSAGES);
    return messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        toolCalls: m.tool_calls ? JSON.parse(m.tool_calls) : undefined,
      }));
  } catch {
    return [];
  }
}

function getSessionSummary(sessionId: string): string {
  try {
    const session = annetteDb.sessions.getById(sessionId);
    return session?.summary || '';
  } catch {
    return '';
  }
}

function getRelevantTopics(projectId: string): string {
  try {
    const topics = annetteDb.topics.getByProject(projectId, 5);
    if (topics.length === 0) return '';

    return topics
      .map(t => `- ${t.topic}: ${t.summary}`)
      .join('\n');
  } catch {
    return '';
  }
}

function getUserPreferences(projectId: string): string {
  try {
    const prefs = annetteDb.preferences.getHighConfidence(projectId, 0.6);
    if (prefs.length === 0) return '';

    return prefs
      .slice(0, 5)
      .map(p => `- [${p.category}] ${p.preference_key}: ${p.preference_value}`)
      .join('\n');
  } catch {
    return '';
  }
}

function getToolCategory(toolName: string): string | null {
  if (toolName.includes('brain') || toolName.includes('behavioral') ||
      toolName.includes('outcome') || toolName.includes('reflection') ||
      toolName.includes('signal') || toolName.includes('insight')) {
    return 'brain';
  }
  if (toolName.includes('direction')) return 'directions';
  if (toolName.includes('idea')) return 'ideas';
  if (toolName.includes('goal')) return 'goals';
  if (toolName.includes('context')) return 'contexts';
  if (toolName.includes('queue') || toolName.includes('execution') ||
      toolName.includes('implementation') || toolName.includes('requirement')) {
    return 'tasks';
  }
  if (toolName.includes('project')) return 'projects';
  if (toolName.includes('standup') || toolName.includes('automation')) return 'standup';
  return null;
}
