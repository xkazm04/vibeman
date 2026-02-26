/**
 * Annette Knowledge Graph
 * Builds and maintains a knowledge graph of project entities and relationships
 */

import { annetteDb } from '@/app/db';
import type {
  DbAnnetteKnowledgeNode,
  DbAnnetteKnowledgeEdge,
  KnowledgeNodeType,
} from '@/app/db/models/annette.types';
import { generateWithLLM } from '@/lib/llm';

export interface KnowledgeNode {
  id: string;
  projectId: string;
  nodeType: KnowledgeNodeType;
  name: string;
  description: string | null;
  properties: Record<string, unknown> | null;
  mentionCount: number;
  importanceScore: number;
  lastMentionedAt: string;
  createdAt: string;
}

export interface KnowledgeEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  properties: Record<string, unknown> | null;
  evidenceCount: number;
  lastObservedAt: string;
}

export interface ExtractedEntity {
  name: string;
  type: KnowledgeNodeType;
  description?: string;
  properties?: Record<string, unknown>;
}

export interface ExtractedRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  weight?: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  /** True if extraction failed (LLM error, parse error, etc.) vs. simply finding nothing */
  error: boolean;
}

const VALID_NODE_TYPES = new Set<string>([
  'entity', 'concept', 'file', 'function', 'component',
  'api', 'decision', 'person', 'technology',
]);

/** Sanitize user text before interpolating into an LLM prompt */
function sanitizeForPrompt(text: string): string {
  // Truncate excessively long inputs
  const maxLen = 10000;
  const truncated = text.length > maxLen ? text.slice(0, maxLen) + '\n[...truncated]' : text;
  // Wrap in delimiters so the LLM treats it as data, not instructions
  return truncated;
}

/** Validate and filter extracted entities to match expected schema */
function validateEntities(raw: unknown): ExtractedEntity[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((e): e is ExtractedEntity =>
    e != null &&
    typeof e === 'object' &&
    typeof e.name === 'string' &&
    e.name.length > 0 &&
    typeof e.type === 'string' &&
    VALID_NODE_TYPES.has(e.type)
  ).map(e => ({
    name: e.name,
    type: e.type as KnowledgeNodeType,
    description: typeof e.description === 'string' ? e.description : undefined,
    properties: e.properties && typeof e.properties === 'object' && !Array.isArray(e.properties)
      ? e.properties as Record<string, unknown>
      : undefined,
  }));
}

/** Validate and filter extracted relationships to match expected schema */
function validateRelationships(raw: unknown): ExtractedRelationship[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ExtractedRelationship =>
    r != null &&
    typeof r === 'object' &&
    typeof r.sourceEntity === 'string' &&
    r.sourceEntity.length > 0 &&
    typeof r.targetEntity === 'string' &&
    r.targetEntity.length > 0 &&
    typeof r.relationshipType === 'string' &&
    r.relationshipType.length > 0
  ).map(r => ({
    sourceEntity: r.sourceEntity,
    targetEntity: r.targetEntity,
    relationshipType: r.relationshipType,
    weight: typeof r.weight === 'number' && r.weight >= 0 && r.weight <= 1 ? r.weight : undefined,
  }));
}

function dbNodeToKnowledgeNode(db: DbAnnetteKnowledgeNode): KnowledgeNode {
  return {
    id: db.id,
    projectId: db.project_id,
    nodeType: db.node_type,
    name: db.name,
    description: db.description,
    properties: db.properties ? JSON.parse(db.properties) : null,
    mentionCount: db.mention_count,
    importanceScore: db.importance_score,
    lastMentionedAt: db.last_mentioned_at,
    createdAt: db.created_at,
  };
}

function dbEdgeToKnowledgeEdge(db: DbAnnetteKnowledgeEdge): KnowledgeEdge {
  return {
    id: db.id,
    projectId: db.project_id,
    sourceNodeId: db.source_node_id,
    targetNodeId: db.target_node_id,
    relationshipType: db.relationship_type,
    weight: db.weight,
    properties: db.properties ? JSON.parse(db.properties) : null,
    evidenceCount: db.evidence_count,
    lastObservedAt: db.last_observed_at,
  };
}

/**
 * Collect and deduplicate edges connecting a set of nodes.
 * @param nodeIds - Set of node IDs to collect edges for
 * @param getEdgesFn - Function to retrieve edges for a single node
 * @param mode - 'any' keeps edges where either endpoint is in nodeIds,
 *               'both' keeps only edges where both endpoints are in nodeIds
 */
export function buildEdgeMap(
  nodeIds: Set<string>,
  getEdgesFn: (nodeId: string) => KnowledgeEdge[],
  mode: 'any' | 'both' = 'any',
): KnowledgeEdge[] {
  const edgeMap = new Map<string, KnowledgeEdge>();
  for (const nodeId of nodeIds) {
    const edges = getEdgesFn(nodeId);
    for (const edge of edges) {
      if (edgeMap.has(edge.id)) continue;
      const inSource = nodeIds.has(edge.sourceNodeId);
      const inTarget = nodeIds.has(edge.targetNodeId);
      if (mode === 'both' ? (inSource && inTarget) : (inSource || inTarget)) {
        edgeMap.set(edge.id, edge);
      }
    }
  }
  return Array.from(edgeMap.values());
}

export const knowledgeGraph = {
  /**
   * Add or update a knowledge node
   */
  upsertNode(input: {
    projectId: string;
    nodeType: KnowledgeNodeType;
    name: string;
    description?: string;
    properties?: Record<string, unknown>;
  }): KnowledgeNode {
    const dbNode = annetteDb.knowledgeNodes.upsert(input);
    return dbNodeToKnowledgeNode(dbNode);
  },

  /**
   * Add or update a relationship edge
   */
  upsertEdge(input: {
    projectId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    weight?: number;
    properties?: Record<string, unknown>;
  }): KnowledgeEdge {
    const dbEdge = annetteDb.knowledgeEdges.upsert(input);
    return dbEdgeToKnowledgeEdge(dbEdge);
  },

  /**
   * Get a node by ID
   */
  getNode(id: string): KnowledgeNode | null {
    const dbNode = annetteDb.knowledgeNodes.getById(id);
    return dbNode ? dbNodeToKnowledgeNode(dbNode) : null;
  },

  /**
   * Get a node by name
   */
  getNodeByName(projectId: string, name: string): KnowledgeNode | null {
    const dbNode = annetteDb.knowledgeNodes.getByName(projectId, name);
    return dbNode ? dbNodeToKnowledgeNode(dbNode) : null;
  },

  /**
   * Get all nodes for a project
   */
  getNodes(projectId: string, options?: {
    limit?: number;
    type?: KnowledgeNodeType;
    minImportance?: number;
  }): KnowledgeNode[] {
    const dbNodes = annetteDb.knowledgeNodes.getByProject(projectId, options);
    return dbNodes.map(dbNodeToKnowledgeNode);
  },

  /**
   * Search nodes by name or description
   */
  searchNodes(projectId: string, query: string, limit = 20): KnowledgeNode[] {
    const dbNodes = annetteDb.knowledgeNodes.search(projectId, query, limit);
    return dbNodes.map(dbNodeToKnowledgeNode);
  },

  /**
   * Get related nodes
   */
  getRelatedNodes(nodeId: string, limit = 20): KnowledgeNode[] {
    const dbNodes = annetteDb.knowledgeNodes.getRelated(nodeId, limit);
    return dbNodes.map(dbNodeToKnowledgeNode);
  },

  /**
   * Get edges for a node
   */
  getEdges(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): KnowledgeEdge[] {
    const dbEdges = annetteDb.knowledgeEdges.getByNode(nodeId, direction);
    return dbEdges.map(dbEdgeToKnowledgeEdge);
  },

  /**
   * Get all edges for a project
   */
  getAllEdges(projectId: string, options?: {
    limit?: number;
    relationshipType?: string;
    minWeight?: number;
  }): KnowledgeEdge[] {
    const dbEdges = annetteDb.knowledgeEdges.getByProject(projectId, options);
    return dbEdges.map(dbEdgeToKnowledgeEdge);
  },

  /**
   * Delete a node
   */
  deleteNode(id: string): boolean {
    return annetteDb.knowledgeNodes.delete(id);
  },

  /**
   * Delete an edge
   */
  deleteEdge(id: string): boolean {
    return annetteDb.knowledgeEdges.delete(id);
  },

  /**
   * Get the full graph for visualization
   */
  getGraph(projectId: string, options?: {
    nodeLimit?: number;
    edgeLimit?: number;
    minImportance?: number;
  }): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    const nodes = this.getNodes(projectId, {
      limit: options?.nodeLimit ?? 100,
      minImportance: options?.minImportance,
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const allEdges = this.getAllEdges(projectId, {
      limit: options?.edgeLimit ?? 500,
    });

    // Filter edges to only include those connecting visible nodes
    const edges = allEdges.filter(
      e => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)
    );

    return { nodes, edges };
  },

  /**
   * Extract entities and relationships from text using LLM
   */
  async extractFromText(
    projectId: string,
    text: string
  ): Promise<ExtractionResult> {
    const sanitizedText = sanitizeForPrompt(text);

    const prompt = `Analyze the user-provided text below (delimited by triple backticks) and extract entities and relationships for a knowledge graph.

\`\`\`
${sanitizedText}
\`\`\`

Entity types to look for:
- entity: Named entities (projects, products, services)
- concept: Abstract concepts or patterns
- file: File paths or file names
- function: Function or method names
- component: UI components or modules
- api: API endpoints or routes
- decision: Decisions or choices made
- person: People mentioned
- technology: Technologies, frameworks, libraries

For each entity, provide:
- name: The entity name
- type: One of the types above
- description: Brief description (optional)

For relationships, provide:
- sourceEntity: Name of source entity
- targetEntity: Name of target entity
- relationshipType: Type of relationship (e.g., "uses", "depends_on", "implements", "contains", "related_to")
- weight: Strength of relationship (0.1-1.0)

Respond in JSON format:
{
  "entities": [
    { "name": "UserAuth", "type": "component", "description": "Handles user authentication" }
  ],
  "relationships": [
    { "sourceEntity": "UserAuth", "targetEntity": "JWT", "relationshipType": "uses", "weight": 0.9 }
  ]
}

Only extract meaningful entities and relationships. If none found, return empty arrays.`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.2,
        maxTokens: 1500,
      });

      if (!response.success || !response.response) {
        console.warn('[knowledgeGraph] LLM extraction returned no response');
        return { entities: [], relationships: [], error: true };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.response);
      } catch (parseError) {
        console.error('[knowledgeGraph] Failed to parse LLM response as JSON:', parseError, 'Raw:', response.response.slice(0, 500));
        return { entities: [], relationships: [], error: true };
      }

      if (parsed == null || typeof parsed !== 'object') {
        console.warn('[knowledgeGraph] LLM response parsed to non-object:', typeof parsed);
        return { entities: [], relationships: [], error: true };
      }

      const obj = parsed as Record<string, unknown>;
      return {
        entities: validateEntities(obj.entities),
        relationships: validateRelationships(obj.relationships),
        error: false,
      };
    } catch (error) {
      console.error('[knowledgeGraph] Failed to extract entities:', error);
      return { entities: [], relationships: [], error: true };
    }
  },

  /**
   * Build knowledge graph from extracted entities and relationships
   */
  async buildFromText(
    projectId: string,
    text: string
  ): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }> {
    const { entities, relationships } = await this.extractFromText(projectId, text);

    const nodes: KnowledgeNode[] = [];
    const nodeMap = new Map<string, KnowledgeNode>();

    // Create nodes for entities
    for (const entity of entities) {
      const node = this.upsertNode({
        projectId,
        nodeType: entity.type,
        name: entity.name,
        description: entity.description,
        properties: entity.properties,
      });
      nodes.push(node);
      nodeMap.set(entity.name, node);
    }

    const edges: KnowledgeEdge[] = [];

    // Create edges for relationships
    for (const rel of relationships) {
      const sourceNode = nodeMap.get(rel.sourceEntity) ||
        this.getNodeByName(projectId, rel.sourceEntity);
      const targetNode = nodeMap.get(rel.targetEntity) ||
        this.getNodeByName(projectId, rel.targetEntity);

      if (sourceNode && targetNode) {
        const edge = this.upsertEdge({
          projectId,
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          relationshipType: rel.relationshipType,
          weight: rel.weight,
        });
        edges.push(edge);
      }
    }

    return { nodes, edges };
  },

  /**
   * Query the knowledge graph with a natural language question
   */
  async query(
    projectId: string,
    question: string
  ): Promise<{ answer: string; relevantNodes: KnowledgeNode[]; relevantEdges: KnowledgeEdge[] }> {
    // First, search for relevant nodes
    const relevantNodes = this.searchNodes(projectId, question, 10);

    if (relevantNodes.length === 0) {
      return {
        answer: 'No relevant information found in the knowledge graph.',
        relevantNodes: [],
        relevantEdges: [],
      };
    }

    // Get edges connecting these nodes
    const nodeIds = new Set(relevantNodes.map(n => n.id));
    const relevantEdges = buildEdgeMap(
      nodeIds,
      (id) => this.getEdges(id, 'both'),
      'any',
    );

    // Build context for LLM
    const nodesContext = relevantNodes
      .map(n => `- ${n.name} (${n.nodeType}): ${n.description || 'No description'}`)
      .join('\n');

    const edgesContext = relevantEdges
      .map(e => {
        const source = relevantNodes.find(n => n.id === e.sourceNodeId);
        const target = relevantNodes.find(n => n.id === e.targetNodeId);
        return `- ${source?.name || '?'} --[${e.relationshipType}]--> ${target?.name || '?'}`;
      })
      .join('\n');

    const prompt = `Based on this knowledge graph context, answer the question.

Entities:
${nodesContext}

Relationships:
${edgesContext}

Question: ${question}

Provide a clear, concise answer based only on the information in the knowledge graph. If the information is insufficient, say so.`;

    try {
      const response = await generateWithLLM(prompt, {
        provider: 'gemini',
        temperature: 0.3,
        maxTokens: 500,
      });

      return {
        answer: response.success && response.response
          ? response.response
          : 'Unable to generate an answer.',
        relevantNodes,
        relevantEdges,
      };
    } catch (error) {
      console.error('Failed to query knowledge graph:', error);
      return {
        answer: 'Error querying the knowledge graph.',
        relevantNodes,
        relevantEdges,
      };
    }
  },

  /**
   * Get statistics about the knowledge graph
   */
  getStats(projectId: string): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<KnowledgeNodeType, number>;
    topEntities: Array<{ name: string; type: KnowledgeNodeType; importance: number }>;
  } {
    const nodes = this.getNodes(projectId, { limit: 1000 });
    const edges = this.getAllEdges(projectId, { limit: 5000 });

    const nodesByType: Record<KnowledgeNodeType, number> = {
      entity: 0,
      concept: 0,
      file: 0,
      function: 0,
      component: 0,
      api: 0,
      decision: 0,
      person: 0,
      technology: 0,
    };

    for (const node of nodes) {
      nodesByType[node.nodeType]++;
    }

    const topEntities = nodes
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 10)
      .map(n => ({
        name: n.name,
        type: n.nodeType,
        importance: n.importanceScore,
      }));

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType,
      topEntities,
    };
  },
};
