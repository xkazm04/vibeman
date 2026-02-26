/**
 * Cross-Context Dependency Graph Engine
 *
 * Maps relationships between contexts using:
 * 1. Explicit cross_refs from context metadata
 * 2. Shared file paths (Jaccard similarity)
 * 3. Shared API surface (endpoint overlap)
 * 4. Shared DB tables
 * 5. Context group relationships (architectural edges)
 *
 * Provides impact cascade analysis for "what-if" simulation
 * before accepting an idea or direction.
 */

import type { DbContext, DbContextGroup, DbContextGroupRelationship, DbIdea, DbDirection } from '@/app/db/models/types';

// ─── Graph Types ───

export interface ContextGraphNode {
  id: string;
  name: string;
  groupId: string | null;
  groupName: string | null;
  groupColor: string;
  category: string | null;
  fileCount: number;
  ideaCount: number;
  directionCount: number;
  implementedCount: number;
  apiRouteCount: number;
  keywords: string[];
}

export interface ContextGraphEdge {
  source: string;
  target: string;
  weight: number;           // 0-1 overall strength
  types: EdgeType[];        // What created this edge
  sharedFiles: number;
  sharedApis: number;
  sharedTables: number;
  crossRefRelation: string | null; // 'depends_on' | 'depended_by' | 'shares_data'
}

export type EdgeType = 'cross_ref' | 'shared_files' | 'shared_api' | 'shared_tables' | 'group_relationship';

export interface ContextGraph {
  nodes: ContextGraphNode[];
  edges: ContextGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgConnections: number;
    mostConnected: string | null;
    isolatedCount: number;
  };
}

// ─── Impact Cascade Types ───

export interface CascadeImpact {
  contextId: string;
  contextName: string;
  depth: number;            // 0 = direct, 1 = one hop, etc.
  impactScore: number;      // 0-1, decays with depth
  edgeWeight: number;       // Weight of the path
  relationship: string;     // How it's connected
  risks: string[];          // Potential risks
}

export interface CascadeAnalysis {
  sourceContextId: string;
  sourceContextName: string;
  directImpacts: CascadeImpact[];
  transitiveImpacts: CascadeImpact[];
  totalAffectedContexts: number;
  maxDepth: number;
  overallRisk: 'low' | 'medium' | 'high';
  summary: string;
}

// ─── Graph Builder ───

/**
 * Build the full cross-context dependency graph for a project.
 */
export function buildContextGraph(
  contexts: DbContext[],
  groups: DbContextGroup[],
  groupRelationships: DbContextGroupRelationship[],
  ideas: DbIdea[],
  directions: DbDirection[]
): ContextGraph {
  if (contexts.length === 0) {
    return { nodes: [], edges: [], stats: { totalNodes: 0, totalEdges: 0, avgConnections: 0, mostConnected: null, isolatedCount: 0 } };
  }

  const groupMap = new Map(groups.map(g => [g.id, g]));

  // Count ideas/directions per context
  const ideaCountMap = new Map<string, number>();
  const dirCountMap = new Map<string, number>();
  const implCountMap = new Map<string, number>();

  for (const idea of ideas) {
    if (idea.context_id) {
      ideaCountMap.set(idea.context_id, (ideaCountMap.get(idea.context_id) || 0) + 1);
      if (idea.status === 'implemented') {
        implCountMap.set(idea.context_id, (implCountMap.get(idea.context_id) || 0) + 1);
      }
    }
  }
  for (const dir of directions) {
    if (dir.context_id) {
      dirCountMap.set(dir.context_id, (dirCountMap.get(dir.context_id) || 0) + 1);
    }
  }

  // Build nodes
  const nodes: ContextGraphNode[] = contexts.map(ctx => {
    const group = ctx.group_id ? groupMap.get(ctx.group_id) : null;
    const filePaths = safeJsonParse<string[]>(ctx.file_paths, []);
    const apiRoutes = safeJsonParse<string[]>(ctx.api_routes, []);
    const keywords = safeJsonParse<string[]>(ctx.keywords, []);

    return {
      id: ctx.id,
      name: ctx.name,
      groupId: ctx.group_id,
      groupName: group?.name || null,
      groupColor: group?.color || '#6b7280',
      category: ctx.category,
      fileCount: filePaths.length,
      ideaCount: ideaCountMap.get(ctx.id) || 0,
      directionCount: dirCountMap.get(ctx.id) || 0,
      implementedCount: implCountMap.get(ctx.id) || 0,
      apiRouteCount: apiRoutes.length,
      keywords,
    };
  });

  // Build edges from multiple sources
  const edgeMap = new Map<string, ContextGraphEdge>();

  function getEdgeKey(a: string, b: string): string {
    return a < b ? `${a}::${b}` : `${b}::${a}`;
  }

  function getOrCreateEdge(sourceId: string, targetId: string): ContextGraphEdge {
    const key = getEdgeKey(sourceId, targetId);
    let edge = edgeMap.get(key);
    if (!edge) {
      edge = {
        source: sourceId,
        target: targetId,
        weight: 0,
        types: [],
        sharedFiles: 0,
        sharedApis: 0,
        sharedTables: 0,
        crossRefRelation: null,
      };
      edgeMap.set(key, edge);
    }
    return edge;
  }

  // Source 1: Explicit cross_refs
  for (const ctx of contexts) {
    const crossRefs = safeJsonParse<Array<{ contextId: string; relationship: string }>>(ctx.cross_refs, []);
    for (const ref of crossRefs) {
      if (contexts.some(c => c.id === ref.contextId)) {
        const edge = getOrCreateEdge(ctx.id, ref.contextId);
        if (!edge.types.includes('cross_ref')) edge.types.push('cross_ref');
        edge.crossRefRelation = ref.relationship;
        edge.weight = Math.max(edge.weight, 0.8); // Strong signal
      }
    }
  }

  // Source 2: Shared file paths (Jaccard similarity)
  const contextFiles = contexts.map(ctx => ({
    id: ctx.id,
    files: new Set(safeJsonParse<string[]>(ctx.file_paths, []).map(f => normalizePath(f))),
  }));

  for (let i = 0; i < contextFiles.length; i++) {
    for (let j = i + 1; j < contextFiles.length; j++) {
      const a = contextFiles[i];
      const b = contextFiles[j];
      if (a.files.size === 0 || b.files.size === 0) continue;

      const intersection = new Set([...a.files].filter(f => b.files.has(f)));
      if (intersection.size === 0) continue;

      // Also count shared directories (parent paths)
      const aDirs = new Set([...a.files].map(f => f.split('/').slice(0, -1).join('/')).filter(Boolean));
      const bDirs = new Set([...b.files].map(f => f.split('/').slice(0, -1).join('/')).filter(Boolean));
      const sharedDirs = new Set([...aDirs].filter(d => bDirs.has(d)));

      const fileOverlap = intersection.size;
      const union = new Set([...a.files, ...b.files]);
      const jaccard = intersection.size / union.size;

      if (jaccard > 0.02 || fileOverlap >= 2 || sharedDirs.size >= 2) {
        const edge = getOrCreateEdge(a.id, b.id);
        if (!edge.types.includes('shared_files')) edge.types.push('shared_files');
        edge.sharedFiles = fileOverlap;
        edge.weight = Math.max(edge.weight, Math.min(0.9, jaccard * 3 + sharedDirs.size * 0.05));
      }
    }
  }

  // Source 3: Shared API surface
  const contextApis = contexts.map(ctx => ({
    id: ctx.id,
    apis: new Set(safeJsonParse<Array<{ path: string }>>(ctx.api_surface, []).map(a => a.path)),
  }));

  for (let i = 0; i < contextApis.length; i++) {
    for (let j = i + 1; j < contextApis.length; j++) {
      const a = contextApis[i];
      const b = contextApis[j];
      if (a.apis.size === 0 || b.apis.size === 0) continue;

      const shared = [...a.apis].filter(api => b.apis.has(api));
      if (shared.length > 0) {
        const edge = getOrCreateEdge(a.id, b.id);
        if (!edge.types.includes('shared_api')) edge.types.push('shared_api');
        edge.sharedApis = shared.length;
        edge.weight = Math.max(edge.weight, Math.min(0.85, shared.length * 0.15));
      }
    }
  }

  // Source 4: Shared DB tables
  const contextTables = contexts.map(ctx => ({
    id: ctx.id,
    tables: new Set(safeJsonParse<string[]>(ctx.db_tables, [])),
  }));

  for (let i = 0; i < contextTables.length; i++) {
    for (let j = i + 1; j < contextTables.length; j++) {
      const a = contextTables[i];
      const b = contextTables[j];
      if (a.tables.size === 0 || b.tables.size === 0) continue;

      const shared = [...a.tables].filter(t => b.tables.has(t));
      if (shared.length > 0) {
        const edge = getOrCreateEdge(a.id, b.id);
        if (!edge.types.includes('shared_tables')) edge.types.push('shared_tables');
        edge.sharedTables = shared.length;
        edge.weight = Math.max(edge.weight, Math.min(0.7, shared.length * 0.2));
      }
    }
  }

  // Source 5: Context group relationships (architectural)
  for (const rel of groupRelationships) {
    const sourceContexts = contexts.filter(c => c.group_id === rel.source_group_id);
    const targetContexts = contexts.filter(c => c.group_id === rel.target_group_id);

    for (const src of sourceContexts) {
      for (const tgt of targetContexts) {
        const edge = getOrCreateEdge(src.id, tgt.id);
        if (!edge.types.includes('group_relationship')) edge.types.push('group_relationship');
        edge.weight = Math.max(edge.weight, 0.3); // Weaker architectural signal
      }
    }
  }

  const edges = [...edgeMap.values()].filter(e => e.weight > 0);

  // Compute stats
  const connectionCount = new Map<string, number>();
  for (const edge of edges) {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) || 0) + 1);
    connectionCount.set(edge.target, (connectionCount.get(edge.target) || 0) + 1);
  }

  let mostConnected: string | null = null;
  let maxConns = 0;
  for (const [id, count] of connectionCount) {
    if (count > maxConns) { maxConns = count; mostConnected = id; }
  }

  const isolatedCount = nodes.filter(n => !connectionCount.has(n.id)).length;
  const avgConnections = edges.length > 0
    ? [...connectionCount.values()].reduce((a, b) => a + b, 0) / connectionCount.size
    : 0;

  return {
    nodes,
    edges,
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgConnections: Math.round(avgConnections * 10) / 10,
      mostConnected,
      isolatedCount,
    },
  };
}

// ─── Impact Cascade Analysis ───

const DECAY_FACTOR = 0.6; // Impact decays per depth level
const MAX_CASCADE_DEPTH = 3;

/**
 * Analyze the cascade impact of a change to a specific context.
 * Traverses the dependency graph via BFS with decaying impact scores.
 */
export function analyzeCascade(
  graph: ContextGraph,
  sourceContextId: string,
  changeType: 'idea' | 'direction' | 'implementation' = 'idea'
): CascadeAnalysis {
  const sourceNode = graph.nodes.find(n => n.id === sourceContextId);
  if (!sourceNode) {
    return {
      sourceContextId,
      sourceContextName: 'Unknown',
      directImpacts: [],
      transitiveImpacts: [],
      totalAffectedContexts: 0,
      maxDepth: 0,
      overallRisk: 'low',
      summary: 'Context not found in graph.',
    };
  }

  // Build adjacency list
  const adjacency = new Map<string, Array<{ targetId: string; edge: ContextGraphEdge }>>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
    adjacency.get(edge.source)!.push({ targetId: edge.target, edge });
    adjacency.get(edge.target)!.push({ targetId: edge.source, edge });
  }

  // BFS with depth-decaying impact
  const visited = new Set<string>([sourceContextId]);
  const queue: Array<{ id: string; depth: number; parentWeight: number }> = [];
  const impacts: CascadeImpact[] = [];

  const neighbors = adjacency.get(sourceContextId) || [];
  for (const { targetId, edge } of neighbors) {
    queue.push({ id: targetId, depth: 1, parentWeight: edge.weight });
  }

  while (queue.length > 0) {
    const { id, depth, parentWeight } = queue.shift()!;
    if (visited.has(id) || depth > MAX_CASCADE_DEPTH) continue;
    visited.add(id);

    const node = graph.nodes.find(n => n.id === id);
    if (!node) continue;

    const impactScore = parentWeight * Math.pow(DECAY_FACTOR, depth - 1);
    if (impactScore < 0.05) continue; // Below threshold

    const edge = graph.edges.find(e =>
      (e.source === sourceContextId && e.target === id) ||
      (e.target === sourceContextId && e.source === id) ||
      (e.source === id || e.target === id)
    );

    const risks = computeRisks(node, edge, changeType);

    impacts.push({
      contextId: id,
      contextName: node.name,
      depth,
      impactScore: Math.round(impactScore * 100) / 100,
      edgeWeight: parentWeight,
      relationship: edge?.types.join(', ') || 'indirect',
      risks,
    });

    // Continue BFS if significant enough
    if (depth < MAX_CASCADE_DEPTH && impactScore > 0.1) {
      const nextNeighbors = adjacency.get(id) || [];
      for (const { targetId, edge: nextEdge } of nextNeighbors) {
        if (!visited.has(targetId)) {
          queue.push({ id: targetId, depth: depth + 1, parentWeight: nextEdge.weight * DECAY_FACTOR });
        }
      }
    }
  }

  // Sort by impact score
  impacts.sort((a, b) => b.impactScore - a.impactScore);

  const directImpacts = impacts.filter(i => i.depth === 1);
  const transitiveImpacts = impacts.filter(i => i.depth > 1);
  const maxDepth = impacts.length > 0 ? Math.max(...impacts.map(i => i.depth)) : 0;

  // Risk assessment
  const highRiskCount = impacts.filter(i => i.impactScore > 0.5).length;
  const overallRisk: 'low' | 'medium' | 'high' =
    highRiskCount >= 3 ? 'high' :
    highRiskCount >= 1 || impacts.length >= 5 ? 'medium' : 'low';

  const summary = impacts.length === 0
    ? `${sourceNode.name} is isolated - no downstream dependencies detected.`
    : `Changes to ${sourceNode.name} may affect ${impacts.length} context(s) across ${maxDepth} depth level(s). ` +
      `${directImpacts.length} direct and ${transitiveImpacts.length} transitive dependencies. ` +
      `Overall risk: ${overallRisk}.`;

  return {
    sourceContextId,
    sourceContextName: sourceNode.name,
    directImpacts,
    transitiveImpacts,
    totalAffectedContexts: impacts.length,
    maxDepth,
    overallRisk,
    summary,
  };
}

// ─── Helpers ───

function computeRisks(
  node: ContextGraphNode,
  edge: ContextGraphEdge | undefined,
  changeType: string
): string[] {
  const risks: string[] = [];

  if (edge?.types.includes('shared_files') && edge.sharedFiles > 5) {
    risks.push(`High file overlap (${edge.sharedFiles} shared files)`);
  }
  if (edge?.types.includes('shared_api')) {
    risks.push(`API surface overlap (${edge.sharedApis} shared endpoints)`);
  }
  if (edge?.types.includes('shared_tables')) {
    risks.push(`Shared database tables (${edge.sharedTables} tables)`);
  }
  if (edge?.crossRefRelation === 'depends_on') {
    risks.push('Direct dependency - changes may break this context');
  }
  if (node.implementedCount > 3 && changeType === 'idea') {
    risks.push(`Active context (${node.implementedCount} implementations) - test carefully`);
  }

  return risks;
}

function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}
