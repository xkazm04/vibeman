/**
 * Context Formatter
 *
 * Formats recalled memories and knowledge nodes for LLM prompts.
 * Pure formatting logic with no DB or LLM dependencies.
 */

import type { Memory, KnowledgeNode } from './unifiedKnowledgeStore';
import type { RecalledContext } from './contextualRecaller';

/**
 * Format recalled context for inclusion in LLM prompt
 */
export function formatForPrompt(recalled: RecalledContext): string {
  if (recalled.memories.length === 0 && recalled.knowledgeNodes.length === 0) {
    return '';
  }

  const parts: string[] = ['## Contextual Memory\n'];

  if (recalled.memories.length > 0) {
    parts.push('### Relevant Memories');
    for (const memory of recalled.memories) {
      const score = (memory.relevanceScore * 100).toFixed(0);
      const prov = memory.provenance;
      const provenanceHint = prov
        ? ` (source: ${prov.source}, age: ${prov.ageDays}d, accessed: ${memory.accessCount}x${prov.helpfulnessRatio !== null ? `, helpful: ${Math.round(prov.helpfulnessRatio * 100)}%` : ''})`
        : '';
      parts.push(`- [${memory.memoryType}, ${score}% relevant${provenanceHint}] ${memory.content}`);
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
}

/**
 * Generate a summary of recalled context
 */
export async function generateContextSummary(
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
}

/**
 * Estimate token count for recalled context
 */
export function estimateTokens(
  memories: Memory[],
  nodes: KnowledgeNode[],
  summary: string
): number {
  let tokens = 0;
  for (const memory of memories) {
    tokens += (memory.content.length + (memory.summary?.length || 0)) / 4;
  }
  for (const node of nodes) {
    tokens += (node.name.length + (node.description?.length || 0)) / 4;
  }
  tokens += summary.length / 4;
  return Math.round(tokens);
}
