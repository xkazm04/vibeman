/**
 * Annette Contextual Recaller
 *
 * Retrieves relevant memories and knowledge based on conversation context.
 * Queries the unified knowledge store instead of merging from two separate systems.
 *
 * This file orchestrates the recall pipeline and re-exports
 * focused modules for backward compatibility:
 * - contextExtractor.ts  – LLM-based signal extraction
 * - contextFormatter.ts  – prompt formatting and token estimation
 * - memoryMaintenance.ts – decay, pruning, learning
 */

import { annetteDb } from '@/app/db/composites/annette.db';
import { contextRepository } from '@/app/db/repositories/context.repository';
import type { DbAnnetteMemory, DbAnnetteKnowledgeNode } from '@/app/db/models/annette.types';
import {
  unifiedKnowledgeStore,
  buildEdgeMap,
  type Memory,
  type KnowledgeNode,
  type KnowledgeEdge,
} from './unifiedKnowledgeStore';
import { safeParseJson } from '@/lib/json-utils';

// Import from extracted modules
import { extractContextSignals } from './contextExtractor';
import {
  formatForPrompt,
  generateContextSummary,
  estimateTokens,
} from './contextFormatter';
import {
  learnFromConversation,
  performMaintenance,
} from './memoryMaintenance';

export interface RecallContext {
  projectId: string;
  currentMessage?: string;
  recentMessages?: Array<{ role: string; content: string }>;
  sessionId?: string;
  maxMemories?: number;
  maxNodes?: number;
  minRelevanceScore?: number;
}

export interface RecalledContext {
  memories: Array<Memory & { relevanceScore: number }>;
  knowledgeNodes: Array<KnowledgeNode & { relevanceScore: number }>;
  knowledgeEdges: KnowledgeEdge[];
  summary: string;
  tokenEstimate: number;
}

export interface ConversationContext {
  topics: string[];
  entities: string[];
  questions: string[];
  intents: string[];
}

export const contextualRecaller = {
  /**
   * Extract context signals from a message
   */
  extractContextSignals,

  /**
   * Recall relevant memories and knowledge based on conversation context.
   * Uses a single unified search instead of querying two stores and merging.
   */
  async recall(context: RecallContext): Promise<RecalledContext> {
    const {
      projectId,
      currentMessage,
      recentMessages = [],
      maxMemories = 5,
      maxNodes = 5,
      minRelevanceScore = 0.3,
    } = context;

    const searchQuery = currentMessage || recentMessages.map(m => m.content).join(' ');

    if (!searchQuery.trim()) {
      return {
        memories: [],
        knowledgeNodes: [],
        knowledgeEdges: [],
        summary: '',
        tokenEstimate: 0,
      };
    }

    // Run LLM extraction and unified semantic search in parallel
    const totalLimit = (maxMemories + maxNodes) * 2;
    const [signals, unifiedResults] = await Promise.all([
      this.extractContextSignals(searchQuery),
      unifiedKnowledgeStore.findSimilar(projectId, searchQuery, totalLimit, minRelevanceScore),
    ]);

    // Context keyword matches
    const contextMatches = this.findContextsByKeywords(projectId, signals);

    // Also search for entity name matches in the graph
    const entityNodes: Array<{ item: DbAnnetteKnowledgeNode; similarity: number }> = [];
    for (const entity of signals.entities) {
      const found = unifiedKnowledgeStore.searchNodes(projectId, entity, 3);
      for (const node of found) {
        const dbNode = annetteDb.knowledgeNodes.getById(node.id);
        if (dbNode) {
          entityNodes.push({ item: dbNode, similarity: 0.8 });
        }
      }
    }

    // Split unified results into memories and nodes
    const memoryResults = unifiedResults
      .filter(r => r.source === 'memory')
      .map(r => ({ item: r.item as DbAnnetteMemory, similarity: r.similarity }));

    const nodeResults = unifiedResults
      .filter(r => r.source === 'knowledge')
      .map(r => ({ item: r.item as DbAnnetteKnowledgeNode, similarity: r.similarity }));

    // Deduplicate nodes (entity matches + semantic matches)
    const nodeMap = new Map<string, { item: DbAnnetteKnowledgeNode; similarity: number }>();
    for (const result of [...nodeResults, ...entityNodes]) {
      const existing = nodeMap.get(result.item.id);
      if (!existing || result.similarity > existing.similarity) {
        nodeMap.set(result.item.id, result);
      }
    }

    // Get memory topics for additional context
    const topics = annetteDb.topics.getByProject(projectId, 10);
    const relevantTopics = topics.filter(t =>
      signals.topics.some(signal =>
        t.topic.toLowerCase().includes(signal.toLowerCase()) ||
        signal.toLowerCase().includes(t.topic.toLowerCase())
      )
    );

    // Convert to output format
    const memories = memoryResults
      .slice(0, maxMemories)
      .map(result => {
        const memory = unifiedKnowledgeStore.getMemory(result.item.id);
        if (!memory) return null;
        return { ...memory, relevanceScore: result.similarity };
      })
      .filter((m): m is Memory & { relevanceScore: number } => m !== null);

    const nodesArray = Array.from(nodeMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxNodes);

    const knowledgeNodes = nodesArray.map(result => {
      const node = unifiedKnowledgeStore.getNode(result.item.id);
      if (!node) return null;
      return { ...node, relevanceScore: result.similarity };
    }).filter((n): n is KnowledgeNode & { relevanceScore: number } => n !== null);

    // Get edges connecting recalled nodes
    const nodeIds = new Set(knowledgeNodes.map(n => n.id));
    const knowledgeEdges = buildEdgeMap(
      nodeIds,
      (id) => unifiedKnowledgeStore.getEdges(id, 'both'),
      'both',
    );

    // Generate summary
    const summary = await this.generateContextSummary(
      memories,
      knowledgeNodes,
      relevantTopics.map(t => ({ topic: t.topic, summary: t.summary }))
    );

    // Enrich summary with keyword-matched context entry points
    let enrichedSummary = summary;
    if (contextMatches.length > 0) {
      const contextLines = contextMatches.slice(0, 3).map(m => {
        const epStr = m.entryPoints.length > 0
          ? ` (start: ${m.entryPoints[0].path})`
          : '';
        return `- **${m.name}**${epStr}: ${m.keywords.slice(0, 3).join(', ')}`;
      });
      enrichedSummary = (summary ? summary + '\n\n' : '') +
        'Matched contexts:\n' + contextLines.join('\n');
    }

    const tokenEstimate = this.estimateTokens(memories, knowledgeNodes, enrichedSummary);

    return {
      memories,
      knowledgeNodes,
      knowledgeEdges,
      summary: enrichedSummary,
      tokenEstimate,
    };
  },

  /**
   * Generate a summary of recalled context
   */
  generateContextSummary,

  /**
   * Estimate token count for recalled context
   */
  estimateTokens,

  /**
   * Fast keyword-based context lookup
   */
  findContextsByKeywords(
    projectId: string,
    signals: ConversationContext
  ): Array<{ id: string; name: string; keywords: string[]; entryPoints: Array<{ path: string; type: string }>; apiSurface: Array<{ path: string; methods: string }> }> {
    try {
      const allContexts = contextRepository.getContextsByProject(projectId);
      const queryTerms = [...signals.topics, ...signals.entities].map(t => t.toLowerCase());

      if (queryTerms.length === 0) return [];

      const matches: Array<{ id: string; name: string; keywords: string[]; entryPoints: Array<{ path: string; type: string }>; apiSurface: Array<{ path: string; methods: string }>; score: number }> = [];

      for (const ctx of allContexts) {
        let keywords: string[] = [];
        let entryPoints: Array<{ path: string; type: string }> = [];
        let apiSurface: Array<{ path: string; methods: string }> = [];
        keywords = safeParseJson(ctx.keywords, []);
        entryPoints = safeParseJson(ctx.entry_points, []);
        apiSurface = safeParseJson(ctx.api_surface, []);

        if (keywords.length === 0) continue;

        let score = 0;
        for (const term of queryTerms) {
          for (const kw of keywords) {
            if (kw.toLowerCase().includes(term) || term.includes(kw.toLowerCase())) {
              score += 1;
            }
          }
        }

        if (score > 0) {
          matches.push({ id: ctx.id, name: ctx.name, keywords, entryPoints, apiSurface, score });
        }
      }

      return matches.sort((a, b) => b.score - a.score).slice(0, 5);
    } catch {
      return [];
    }
  },

  /**
   * Format recalled context for inclusion in LLM prompt
   */
  formatForPrompt,

  /**
   * Auto-recall and inject context into messages
   */
  async augmentMessages(
    projectId: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<{
    systemContext: string;
    recalled: RecalledContext;
  }> {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const recentMessages = messages.slice(-5);

    const recalled = await this.recall({
      projectId,
      currentMessage: lastUserMessage?.content,
      recentMessages,
      maxMemories: 5,
      maxNodes: 5,
    });

    const systemContext = this.formatForPrompt(recalled);
    return { systemContext, recalled };
  },

  /**
   * Learn from conversation by extracting memories and building knowledge graph
   */
  learnFromConversation,

  /**
   * Perform periodic maintenance on memories
   */
  performMaintenance,
};
