/**
 * Annette Memory Store
 * Handles persistent storage and retrieval of conversation memories
 */

import { annetteDb } from '@/app/db';
import type { DbAnnetteMemory, AnnetteMemoryType } from '@/app/db/models/annette.types';
import { generateWithLLM } from '@/lib/llm';

export interface MemoryCreateInput {
  projectId: string;
  sessionId?: string;
  memoryType: AnnetteMemoryType;
  content: string;
  summary?: string;
  embedding?: number[];
  importanceScore?: number;
  sourceMessageIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemorySearchOptions {
  projectId: string;
  query?: string;
  type?: AnnetteMemoryType;
  limit?: number;
  minImportance?: number;
  includeConsolidated?: boolean;
}

export interface Memory {
  id: string;
  projectId: string;
  sessionId: string | null;
  memoryType: AnnetteMemoryType;
  content: string;
  summary: string | null;
  importanceScore: number;
  decayFactor: number;
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

function dbToMemory(db: DbAnnetteMemory): Memory {
  return {
    id: db.id,
    projectId: db.project_id,
    sessionId: db.session_id,
    memoryType: db.memory_type,
    content: db.content,
    summary: db.summary,
    importanceScore: db.importance_score,
    decayFactor: db.decay_factor,
    accessCount: db.access_count,
    lastAccessedAt: db.last_accessed_at,
    createdAt: db.created_at,
    metadata: db.metadata ? JSON.parse(db.metadata) : null,
  };
}

export const memoryStore = {
  /**
   * Store a new memory
   */
  create(input: MemoryCreateInput): Memory {
    const dbMemory = annetteDb.memories.create(input);
    return dbToMemory(dbMemory);
  },

  /**
   * Get a memory by ID
   */
  getById(id: string): Memory | null {
    const dbMemory = annetteDb.memories.getById(id);
    if (!dbMemory) return null;
    annetteDb.memories.markAccessed(id);
    return dbToMemory(dbMemory);
  },

  /**
   * Get memories for a project
   */
  getByProject(options: MemorySearchOptions): Memory[] {
    const dbMemories = annetteDb.memories.getByProject(options.projectId, {
      limit: options.limit,
      type: options.type,
      minImportance: options.minImportance,
      includeConsolidated: options.includeConsolidated,
    });
    return dbMemories.map(dbToMemory);
  },

  /**
   * Update memory importance
   */
  updateImportance(id: string, importance: number): void {
    annetteDb.memories.updateImportance(id, importance);
  },

  /**
   * Apply decay to all memories (called periodically)
   */
  applyDecay(projectId: string, decayRate = 0.99): number {
    return annetteDb.memories.applyDecay(projectId, decayRate);
  },

  /**
   * Delete a memory
   */
  delete(id: string): boolean {
    return annetteDb.memories.delete(id);
  },

  /**
   * Prune old, low-relevance memories
   */
  pruneOld(projectId: string, minDecayFactor = 0.01): number {
    return annetteDb.memories.pruneOld(projectId, minDecayFactor);
  },

  /**
   * Extract memories from conversation messages
   * Uses LLM to identify key information worth remembering
   */
  async extractFromConversation(
    projectId: string,
    sessionId: string,
    messages: Array<{ role: string; content: string; id?: string }>
  ): Promise<Memory[]> {
    if (messages.length === 0) return [];

    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Analyze this conversation and extract key memories worth remembering for future conversations.

Conversation:
${conversationText}

Extract memories in the following categories:
- fact: Concrete facts about the project, codebase, or domain
- decision: Decisions made during the conversation
- preference: User preferences or patterns noticed
- insight: Important insights or realizations
- event: Notable events or milestones mentioned

For each memory, provide:
1. Type (one of the categories above)
2. Content (the memory itself, 1-3 sentences)
3. Importance (0.1-1.0, where 1.0 is critical information)

Respond in JSON format:
{
  "memories": [
    { "type": "fact", "content": "...", "importance": 0.8 },
    { "type": "decision", "content": "...", "importance": 0.9 }
  ]
}

Only extract truly important information worth remembering. If nothing important, return empty array.`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.3,
        maxTokens: 1000,
      });

      if (!response.success || !response.response) {
        return [];
      }

      const parsed = JSON.parse(response.response);
      const memories: Memory[] = [];
      const messageIds = messages.map(m => m.id).filter(Boolean) as string[];

      for (const mem of parsed.memories || []) {
        if (mem.type && mem.content) {
          const created = this.create({
            projectId,
            sessionId,
            memoryType: mem.type as AnnetteMemoryType,
            content: mem.content,
            importanceScore: mem.importance || 0.5,
            sourceMessageIds: messageIds.length > 0 ? messageIds : undefined,
          });
          memories.push(created);
        }
      }

      return memories;
    } catch (error) {
      console.error('Failed to extract memories:', error);
      return [];
    }
  },

  /**
   * Consolidate multiple memories into a summary
   */
  async consolidateMemories(
    projectId: string,
    memoryIds: string[]
  ): Promise<Memory | null> {
    if (memoryIds.length < 2) return null;

    const memories = memoryIds
      .map(id => this.getById(id))
      .filter((m): m is Memory => m !== null);

    if (memories.length < 2) return null;

    const memoryText = memories
      .map(m => `[${m.memoryType}] ${m.content}`)
      .join('\n');

    const prompt = `Consolidate these related memories into a single, comprehensive summary:

Memories:
${memoryText}

Create a consolidated memory that:
1. Preserves all important information
2. Removes redundancy
3. Is clear and concise
4. Maintains context

Respond in JSON format:
{
  "summary": "...",
  "type": "insight",
  "importance": 0.8
}`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.3,
        maxTokens: 500,
      });

      if (!response.success || !response.response) {
        return null;
      }

      const parsed = JSON.parse(response.response);
      const consolidated = this.create({
        projectId,
        memoryType: parsed.type || 'insight',
        content: parsed.summary,
        importanceScore: parsed.importance || 0.7,
        sourceMessageIds: memoryIds,
        metadata: { consolidatedFrom: memoryIds },
      });

      // Mark original memories as consolidated
      annetteDb.memories.markConsolidated(memoryIds, consolidated.id);

      // Record consolidation
      const tokensBefore = memories.reduce((sum, m) => sum + m.content.length / 4, 0);
      const tokensAfter = parsed.summary.length / 4;
      annetteDb.consolidations.create({
        projectId,
        sourceMemoryIds: memoryIds,
        resultMemoryId: consolidated.id,
        consolidationType: 'summarize',
        tokensBefore: Math.round(tokensBefore),
        tokensAfter: Math.round(tokensAfter),
      });

      return consolidated;
    } catch (error) {
      console.error('Failed to consolidate memories:', error);
      return null;
    }
  },

  /**
   * Get consolidation statistics
   */
  getConsolidationStats(projectId: string) {
    return annetteDb.consolidations.getTokenSavings(projectId);
  },
};
