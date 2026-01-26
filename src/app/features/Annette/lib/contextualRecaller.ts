/**
 * Annette Contextual Recaller
 * Automatically retrieves relevant memories based on conversation context
 */

import { annetteDb } from '@/app/db';
import type { DbAnnetteMemory, DbAnnetteKnowledgeNode } from '@/app/db/models/annette.types';
import { memoryStore, Memory } from './memoryStore';
import { knowledgeGraph, KnowledgeNode, KnowledgeEdge } from './knowledgeGraph';
import { semanticIndexer } from './semanticIndexer';
import { generateWithLLM } from '@/lib/llm';

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
  async extractContextSignals(message: string): Promise<ConversationContext> {
    const prompt = `Analyze this message and extract context signals for memory retrieval.

Message: ${message}

Extract:
1. Topics: Main topics being discussed
2. Entities: Named entities (files, functions, components, technologies, etc.)
3. Questions: Questions being asked (if any)
4. Intents: User intents (asking, explaining, debugging, planning, etc.)

Respond in JSON format:
{
  "topics": ["topic1", "topic2"],
  "entities": ["entity1", "entity2"],
  "questions": ["question1"],
  "intents": ["intent1", "intent2"]
}`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.2,
        maxTokens: 500,
      });

      if (!response.success || !response.response) {
        return { topics: [], entities: [], questions: [], intents: [] };
      }

      return JSON.parse(response.response);
    } catch (error) {
      console.error('Failed to extract context signals:', error);
      return { topics: [], entities: [], questions: [], intents: [] };
    }
  },

  /**
   * Recall relevant memories and knowledge based on conversation context
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

    // Build search query from current message and recent context
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

    // Extract context signals for better targeting
    const signals = await this.extractContextSignals(searchQuery);

    // Find similar memories semantically
    const similarMemories = await semanticIndexer.findSimilarMemories(
      projectId,
      searchQuery,
      maxMemories * 2,
      minRelevanceScore
    );

    // Find similar knowledge nodes
    const similarNodes = await semanticIndexer.findSimilarNodes(
      projectId,
      searchQuery,
      maxNodes * 2,
      minRelevanceScore
    );

    // Also search for entities mentioned in the message
    const entityNodes: Array<{ item: DbAnnetteKnowledgeNode; similarity: number }> = [];
    for (const entity of signals.entities) {
      const found = knowledgeGraph.searchNodes(projectId, entity, 3);
      for (const node of found) {
        const dbNode = annetteDb.knowledgeNodes.getById(node.id);
        if (dbNode) {
          entityNodes.push({ item: dbNode, similarity: 0.8 }); // High relevance for exact matches
        }
      }
    }

    // Combine and deduplicate nodes
    const nodeMap = new Map<string, { item: DbAnnetteKnowledgeNode; similarity: number }>();
    for (const result of [...similarNodes, ...entityNodes]) {
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
    const memories = similarMemories
      .slice(0, maxMemories)
      .map(result => {
        const memory = memoryStore.getById(result.item.id);
        if (!memory) return null;
        return { ...memory, relevanceScore: result.similarity };
      })
      .filter((m): m is Memory & { relevanceScore: number } => m !== null);

    const nodesArray = Array.from(nodeMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxNodes);

    const knowledgeNodes = nodesArray.map(result => {
      const node = knowledgeGraph.getNode(result.item.id);
      if (!node) return null;
      return { ...node, relevanceScore: result.similarity };
    }).filter((n): n is KnowledgeNode & { relevanceScore: number } => n !== null);

    // Get edges connecting recalled nodes
    const nodeIds = new Set(knowledgeNodes.map(n => n.id));
    const knowledgeEdges: KnowledgeEdge[] = [];
    for (const node of knowledgeNodes) {
      const edges = knowledgeGraph.getEdges(node.id, 'both');
      for (const edge of edges) {
        if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
          if (!knowledgeEdges.some(e => e.id === edge.id)) {
            knowledgeEdges.push(edge);
          }
        }
      }
    }

    // Generate summary
    const summary = await this.generateContextSummary(
      memories,
      knowledgeNodes,
      relevantTopics.map(t => ({ topic: t.topic, summary: t.summary }))
    );

    // Estimate tokens
    const tokenEstimate = this.estimateTokens(memories, knowledgeNodes, summary);

    return {
      memories,
      knowledgeNodes,
      knowledgeEdges,
      summary,
      tokenEstimate,
    };
  },

  /**
   * Generate a summary of recalled context
   */
  async generateContextSummary(
    memories: Memory[],
    nodes: KnowledgeNode[],
    topics: Array<{ topic: string; summary: string }>
  ): Promise<string> {
    if (memories.length === 0 && nodes.length === 0 && topics.length === 0) {
      return '';
    }

    const parts: string[] = [];

    if (memories.length > 0) {
      parts.push('Relevant memories:');
      for (const memory of memories.slice(0, 3)) {
        parts.push(`- [${memory.memoryType}] ${memory.summary || memory.content.slice(0, 100)}`);
      }
    }

    if (nodes.length > 0) {
      parts.push('\nKnown entities:');
      for (const node of nodes.slice(0, 3)) {
        parts.push(`- ${node.name} (${node.nodeType}): ${node.description || 'No description'}`);
      }
    }

    if (topics.length > 0) {
      parts.push('\nActive topics:');
      for (const topic of topics.slice(0, 3)) {
        parts.push(`- ${topic.topic}: ${topic.summary.slice(0, 50)}...`);
      }
    }

    return parts.join('\n');
  },

  /**
   * Estimate token count for recalled context
   */
  estimateTokens(
    memories: Memory[],
    nodes: KnowledgeNode[],
    summary: string
  ): number {
    let tokens = 0;

    // Rough estimate: 1 token per 4 characters
    for (const memory of memories) {
      tokens += (memory.content.length + (memory.summary?.length || 0)) / 4;
    }

    for (const node of nodes) {
      tokens += (node.name.length + (node.description?.length || 0)) / 4;
    }

    tokens += summary.length / 4;

    return Math.round(tokens);
  },

  /**
   * Format recalled context for inclusion in LLM prompt
   */
  formatForPrompt(recalled: RecalledContext): string {
    if (recalled.memories.length === 0 && recalled.knowledgeNodes.length === 0) {
      return '';
    }

    const parts: string[] = ['## Contextual Memory\n'];

    if (recalled.memories.length > 0) {
      parts.push('### Relevant Memories');
      for (const memory of recalled.memories) {
        const score = (memory.relevanceScore * 100).toFixed(0);
        parts.push(`- [${memory.memoryType}, ${score}% relevant] ${memory.content}`);
      }
      parts.push('');
    }

    if (recalled.knowledgeNodes.length > 0) {
      parts.push('### Known Entities');
      for (const node of recalled.knowledgeNodes) {
        const desc = node.description ? `: ${node.description}` : '';
        parts.push(`- **${node.name}** (${node.nodeType})${desc}`);
      }
      parts.push('');
    }

    if (recalled.knowledgeEdges.length > 0) {
      parts.push('### Relationships');
      for (const edge of recalled.knowledgeEdges.slice(0, 5)) {
        const sourceNode = recalled.knowledgeNodes.find(n => n.id === edge.sourceNodeId);
        const targetNode = recalled.knowledgeNodes.find(n => n.id === edge.targetNodeId);
        if (sourceNode && targetNode) {
          parts.push(`- ${sourceNode.name} --[${edge.relationshipType}]--> ${targetNode.name}`);
        }
      }
    }

    return parts.join('\n');
  },

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
   * Learn from conversation by extracting and storing memories
   */
  async learnFromConversation(
    projectId: string,
    sessionId: string,
    messages: Array<{ role: string; content: string; id?: string }>
  ): Promise<{
    memoriesCreated: number;
    nodesCreated: number;
    edgesCreated: number;
  }> {
    // Extract memories
    const memories = await memoryStore.extractFromConversation(projectId, sessionId, messages);

    // Build conversation text for entity extraction
    const conversationText = messages.map(m => m.content).join('\n');

    // Extract and build knowledge graph
    const { nodes, edges } = await knowledgeGraph.buildFromText(projectId, conversationText);

    // Index new memories
    for (const memory of memories) {
      await semanticIndexer.indexMemory(memory.id);
    }

    // Index new nodes
    for (const node of nodes) {
      await semanticIndexer.indexKnowledgeNode(node.id);
    }

    return {
      memoriesCreated: memories.length,
      nodesCreated: nodes.length,
      edgesCreated: edges.length,
    };
  },

  /**
   * Perform periodic maintenance on memories
   */
  async performMaintenance(projectId: string): Promise<{
    decayedCount: number;
    prunedCount: number;
    consolidatedCount: number;
    indexedCount: number;
  }> {
    // Apply decay to memories
    const decayedCount = memoryStore.applyDecay(projectId, 0.99);

    // Prune very old memories
    const prunedCount = memoryStore.pruneOld(projectId, 0.01);

    // Find clusters of similar memories for consolidation
    const clusters = await semanticIndexer.clusterMemories(projectId, 0.8);
    let consolidatedCount = 0;

    for (const cluster of clusters) {
      if (cluster.length >= 3) {
        const memoryIds = cluster.map(m => m.id);
        const consolidated = await memoryStore.consolidateMemories(projectId, memoryIds);
        if (consolidated) {
          consolidatedCount += memoryIds.length;
        }
      }
    }

    // Index any unindexed items
    const indexedMemories = await semanticIndexer.indexAllMemories(projectId);
    const indexedNodes = await semanticIndexer.indexAllKnowledgeNodes(projectId);

    return {
      decayedCount,
      prunedCount,
      consolidatedCount,
      indexedCount: indexedMemories + indexedNodes,
    };
  },
};
