/**
 * Context Graph Assembler
 *
 * Assembles a full architectural context graph for any AI interaction.
 * Transforms the existing rich metadata (entry_points, db_tables, api_surface,
 * cross_refs, tech_stack) from stored-but-unused into active working memory.
 *
 * Used by the AI orchestrator to inject architectural awareness into:
 * - Scan prompts (refactor, beautify, performance, production)
 * - Direction generation
 * - Context documentation
 * - Any future AI interaction
 */

import {
  contextDb,
  contextGroupDb,
  contextGroupRelationshipDb,
  directionDb,
  groupHealthDb,
} from '@/app/db';
import type { DbContext, DbContextGroup, DbContextGroupRelationship } from '@/app/db/models/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContextNode {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  businessFeature: string | null;
  target: string | null;
  targetFulfillment: string | null;
  fileCount: number;
  implementedTasks: number;
  // Phase 2 metadata — the rich fields that were stored but never used
  entryPoints: Array<{ path: string; type: string }>;
  dbTables: string[];
  apiSurface: Array<{ path: string; methods: string; description: string }>;
  crossRefs: Array<{ contextId: string; relationship: string }>;
  techStack: string[];
  keywords: string[];
}

export interface GroupNode {
  id: string;
  name: string;
  type: string | null; // pages, client, server, external
  contextCount: number;
  contexts: ContextNode[];
}

export interface GroupEdge {
  sourceGroupId: string;
  sourceGroupName: string;
  targetGroupId: string;
  targetGroupName: string;
}

export interface ActiveDirection {
  id: string;
  summary: string;
  status: string;
  contextName: string | null;
  contextGroupId: string | null;
}

export interface RecentScanResult {
  groupId: string;
  groupName: string;
  scanType: string;
  status: string;
  score: number | null;
  completedAt: string | null;
}

export interface ContextGraph {
  /** All groups with their contexts and metadata */
  groups: GroupNode[];
  /** Edges between groups (architectural flow) */
  groupEdges: GroupEdge[];
  /** Pending/accepted directions across the project */
  activeDirections: ActiveDirection[];
  /** Recent scan results for architectural health awareness */
  recentScans: RecentScanResult[];
  /** Summary statistics */
  stats: {
    totalContexts: number;
    totalGroups: number;
    totalEdges: number;
    totalPendingDirections: number;
    totalAcceptedDirections: number;
    contextsWithMetadata: number;
    dbTablesAcrossProject: string[];
    techStackAcrossProject: string[];
  };
}

// ── Safe JSON parser ─────────────────────────────────────────────────────────

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ── Context Node Builder ─────────────────────────────────────────────────────

function buildContextNode(ctx: DbContext): ContextNode {
  const filePaths = safeJsonParse<string[]>(ctx.file_paths, []);
  return {
    id: ctx.id,
    name: ctx.name,
    description: ctx.description,
    category: ctx.category,
    businessFeature: ctx.business_feature,
    target: ctx.target,
    targetFulfillment: ctx.target_fulfillment,
    fileCount: filePaths.length,
    implementedTasks: ctx.implemented_tasks || 0,
    entryPoints: safeJsonParse(ctx.entry_points, []),
    dbTables: safeJsonParse(ctx.db_tables, []),
    apiSurface: safeJsonParse(ctx.api_surface, []),
    crossRefs: safeJsonParse(ctx.cross_refs, []),
    techStack: safeJsonParse(ctx.tech_stack, []),
    keywords: safeJsonParse(ctx.keywords, []),
  };
}

// ── Main Assembler ──────────────────────────────────────────────────────────

/**
 * Assemble the full context graph for a project.
 * This is the primary entry point for architectural awareness.
 */
export function assembleContextGraph(projectId: string): ContextGraph {
  // 1. Fetch all contexts for the project
  const allContexts = contextDb.getContextsByProject(projectId);
  const contextNodes = allContexts.map(buildContextNode);

  // 2. Fetch all groups for the project
  const allGroups = contextGroupDb.getGroupsByProject(projectId);

  // 3. Build group nodes with their contexts
  const groupMap = new Map<string, DbContextGroup>();
  for (const g of allGroups) groupMap.set(g.id, g);

  const groupNodes: GroupNode[] = allGroups.map(group => {
    const groupContexts = contextNodes.filter(c => {
      const dbCtx = allContexts.find(dc => dc.id === c.id);
      return dbCtx?.group_id === group.id;
    });

    return {
      id: group.id,
      name: group.name,
      type: group.type || null,
      contextCount: groupContexts.length,
      contexts: groupContexts,
    };
  });

  // Add ungrouped contexts
  const ungroupedContexts = contextNodes.filter(c => {
    const dbCtx = allContexts.find(dc => dc.id === c.id);
    return !dbCtx?.group_id;
  });
  if (ungroupedContexts.length > 0) {
    groupNodes.push({
      id: '__ungrouped__',
      name: 'Ungrouped',
      type: null,
      contextCount: ungroupedContexts.length,
      contexts: ungroupedContexts,
    });
  }

  // 4. Fetch group relationships (edges)
  const relationships = contextGroupRelationshipDb.getByProject(projectId);
  const groupEdges: GroupEdge[] = relationships.map((rel: DbContextGroupRelationship) => ({
    sourceGroupId: rel.source_group_id,
    sourceGroupName: groupMap.get(rel.source_group_id)?.name || 'Unknown',
    targetGroupId: rel.target_group_id,
    targetGroupName: groupMap.get(rel.target_group_id)?.name || 'Unknown',
  }));

  // 5. Fetch active directions
  let pendingDirections: ActiveDirection[] = [];
  let acceptedDirections: ActiveDirection[] = [];
  try {
    const pending = directionDb.getPendingDirections(projectId);
    pendingDirections = pending.slice(0, 10).map(d => ({
      id: d.id,
      summary: d.summary,
      status: d.status,
      contextName: d.context_name,
      contextGroupId: d.context_group_id,
    }));
    const accepted = directionDb.getAcceptedDirections(projectId);
    acceptedDirections = accepted.slice(0, 10).map(d => ({
      id: d.id,
      summary: d.summary,
      status: d.status,
      contextName: d.context_name,
      contextGroupId: d.context_group_id,
    }));
  } catch {
    // Directions might not exist yet
  }

  // 6. Fetch recent scan results
  let recentScans: RecentScanResult[] = [];
  try {
    const scans = groupHealthDb.getByProject(projectId);
    recentScans = scans
      .filter(s => s.status === 'completed')
      .slice(0, 5)
      .map(s => ({
        groupId: s.group_id,
        groupName: groupMap.get(s.group_id)?.name || 'Unknown',
        scanType: 'scan',
        status: s.status,
        score: s.health_score ?? null,
        completedAt: s.completed_at || null,
      }));
  } catch {
    // Scans might not exist yet
  }

  // 7. Compute aggregate stats
  const allDbTables = new Set<string>();
  const allTechStack = new Set<string>();
  let contextsWithMetadata = 0;

  for (const c of contextNodes) {
    c.dbTables.forEach(t => allDbTables.add(t));
    c.techStack.forEach(t => allTechStack.add(t));
    if (c.entryPoints.length > 0 || c.dbTables.length > 0 || c.apiSurface.length > 0 || c.techStack.length > 0) {
      contextsWithMetadata++;
    }
  }

  return {
    groups: groupNodes,
    groupEdges,
    activeDirections: [...pendingDirections, ...acceptedDirections],
    recentScans,
    stats: {
      totalContexts: contextNodes.length,
      totalGroups: allGroups.length,
      totalEdges: groupEdges.length,
      totalPendingDirections: pendingDirections.length,
      totalAcceptedDirections: acceptedDirections.length,
      contextsWithMetadata,
      dbTablesAcrossProject: Array.from(allDbTables),
      techStackAcrossProject: Array.from(allTechStack),
    },
  };
}

/**
 * Assemble a focused context graph for a specific group.
 * Includes the group's contexts + adjacent groups connected by edges.
 */
export function assembleGroupContextGraph(
  projectId: string,
  groupId: string
): {
  group: GroupNode;
  adjacentGroups: GroupNode[];
  edges: GroupEdge[];
  activeDirections: ActiveDirection[];
  crossContextRefs: Array<{ from: string; to: string; relationship: string }>;
} {
  const fullGraph = assembleContextGraph(projectId);

  const group = fullGraph.groups.find(g => g.id === groupId);
  if (!group) {
    return {
      group: { id: groupId, name: 'Unknown', type: null, contextCount: 0, contexts: [] },
      adjacentGroups: [],
      edges: [],
      activeDirections: [],
      crossContextRefs: [],
    };
  }

  // Find adjacent groups (connected by edges)
  const adjacentGroupIds = new Set<string>();
  const relevantEdges = fullGraph.groupEdges.filter(e => {
    if (e.sourceGroupId === groupId) {
      adjacentGroupIds.add(e.targetGroupId);
      return true;
    }
    if (e.targetGroupId === groupId) {
      adjacentGroupIds.add(e.sourceGroupId);
      return true;
    }
    return false;
  });

  const adjacentGroups = fullGraph.groups.filter(g => adjacentGroupIds.has(g.id));

  // Find directions relevant to this group
  const groupDirections = fullGraph.activeDirections.filter(
    d => d.contextGroupId === groupId
  );

  // Build cross-context references from this group's contexts
  const crossContextRefs: Array<{ from: string; to: string; relationship: string }> = [];
  for (const ctx of group.contexts) {
    for (const ref of ctx.crossRefs) {
      crossContextRefs.push({
        from: ctx.name,
        to: ref.contextId,
        relationship: ref.relationship,
      });
    }
  }

  return {
    group,
    adjacentGroups,
    edges: relevantEdges,
    activeDirections: groupDirections,
    crossContextRefs,
  };
}

// ── Prompt Formatting ───────────────────────────────────────────────────────

/**
 * Format a context graph into a compact prompt section.
 * Used by the AI orchestrator to inject into any prompt.
 */
export function formatContextGraphForPrompt(graph: ContextGraph): string {
  const lines: string[] = [];

  lines.push('## Architectural Context (Project-Wide Awareness)');
  lines.push('');
  lines.push('> This section provides full architectural awareness. Use this to understand');
  lines.push('> how the code you are working on fits into the broader system.');
  lines.push('');

  // Stats overview
  lines.push(`**Project Structure**: ${graph.stats.totalContexts} contexts across ${graph.stats.totalGroups} groups, ${graph.stats.totalEdges} inter-group connections`);
  if (graph.stats.dbTablesAcrossProject.length > 0) {
    lines.push(`**Database Tables**: ${graph.stats.dbTablesAcrossProject.join(', ')}`);
  }
  if (graph.stats.techStackAcrossProject.length > 0) {
    lines.push(`**Tech Stack**: ${graph.stats.techStackAcrossProject.join(', ')}`);
  }
  lines.push('');

  // Groups with contexts
  lines.push('### Architecture Map');
  lines.push('');
  for (const group of graph.groups) {
    const layerTag = group.type ? ` [${group.type}]` : '';
    lines.push(`#### ${group.name}${layerTag} (${group.contextCount} contexts)`);

    for (const ctx of group.contexts) {
      const tags: string[] = [];
      if (ctx.category) tags.push(ctx.category);
      if (ctx.businessFeature) tags.push(ctx.businessFeature);
      const tagStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';

      lines.push(`- **${ctx.name}**${tagStr}: ${ctx.fileCount} files`);

      if (ctx.description) {
        lines.push(`  ${ctx.description.slice(0, 120)}${ctx.description.length > 120 ? '...' : ''}`);
      }
      if (ctx.dbTables.length > 0) {
        lines.push(`  DB: ${ctx.dbTables.join(', ')}`);
      }
      if (ctx.apiSurface.length > 0) {
        const apis = ctx.apiSurface.slice(0, 5).map(a => `${a.methods} ${a.path}`).join('; ');
        lines.push(`  API: ${apis}`);
      }
      if (ctx.entryPoints.length > 0) {
        const entries = ctx.entryPoints.slice(0, 3).map(e => `${e.type}:${e.path}`).join(', ');
        lines.push(`  Entry: ${entries}`);
      }
      if (ctx.target) {
        lines.push(`  Target: ${ctx.target}${ctx.targetFulfillment ? ` (${ctx.targetFulfillment})` : ''}`);
      }
    }
    lines.push('');
  }

  // Group connections (architectural flow)
  if (graph.groupEdges.length > 0) {
    lines.push('### Architectural Flow (Group Connections)');
    for (const edge of graph.groupEdges) {
      lines.push(`- ${edge.sourceGroupName} -> ${edge.targetGroupName}`);
    }
    lines.push('');
  }

  // Active directions (what's being worked on / planned)
  if (graph.activeDirections.length > 0) {
    const pending = graph.activeDirections.filter(d => d.status === 'pending');
    const accepted = graph.activeDirections.filter(d => d.status === 'accepted');

    if (pending.length > 0) {
      lines.push('### Pending Directions (awaiting decision)');
      for (const d of pending.slice(0, 5)) {
        lines.push(`- ${d.summary}${d.contextName ? ` [${d.contextName}]` : ''}`);
      }
      lines.push('');
    }
    if (accepted.length > 0) {
      lines.push('### In-Progress Work (accepted directions)');
      for (const d of accepted.slice(0, 5)) {
        lines.push(`- ${d.summary}${d.contextName ? ` [${d.contextName}]` : ''}`);
      }
      lines.push('');
    }
  }

  // Recent scan health
  if (graph.recentScans.length > 0) {
    lines.push('### Recent Health Scans');
    for (const s of graph.recentScans) {
      const score = s.score !== null ? ` (score: ${s.score}/100)` : '';
      lines.push(`- ${s.groupName}: ${s.scanType}${score} — ${s.status}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format a focused group context graph for scan prompts.
 * More compact than the full graph — includes only the target group
 * and its immediate neighbors.
 */
export function formatGroupContextForPrompt(
  groupGraph: ReturnType<typeof assembleGroupContextGraph>
): string {
  const lines: string[] = [];
  const { group, adjacentGroups, edges, activeDirections, crossContextRefs } = groupGraph;

  lines.push('## Architectural Context (Group-Scoped)');
  lines.push('');

  // Target group details
  const layerTag = group.type ? ` [${group.type} layer]` : '';
  lines.push(`**Target Group**: ${group.name}${layerTag}`);
  lines.push('');

  for (const ctx of group.contexts) {
    const parts: string[] = [`**${ctx.name}**`];
    if (ctx.businessFeature) parts.push(`(${ctx.businessFeature})`);
    parts.push(`— ${ctx.fileCount} files`);
    lines.push(parts.join(' '));

    if (ctx.description) {
      lines.push(`  ${ctx.description.slice(0, 150)}${ctx.description.length > 150 ? '...' : ''}`);
    }
    if (ctx.dbTables.length > 0) lines.push(`  DB tables: ${ctx.dbTables.join(', ')}`);
    if (ctx.apiSurface.length > 0) {
      const apis = ctx.apiSurface.slice(0, 4).map(a => `${a.methods} ${a.path}`).join('; ');
      lines.push(`  API surface: ${apis}`);
    }
    if (ctx.techStack.length > 0) lines.push(`  Tech: ${ctx.techStack.join(', ')}`);
    if (ctx.entryPoints.length > 0) {
      const entries = ctx.entryPoints.slice(0, 3).map(e => `${e.type}:${e.path}`).join(', ');
      lines.push(`  Entry points: ${entries}`);
    }
  }
  lines.push('');

  // Adjacent groups (architectural neighbors)
  if (adjacentGroups.length > 0) {
    lines.push('**Connected Groups** (adjacent in architecture):');
    for (const adj of adjacentGroups) {
      const adjLayer = adj.type ? ` [${adj.type}]` : '';
      const ctxNames = adj.contexts.slice(0, 4).map(c => c.name).join(', ');
      lines.push(`- ${adj.name}${adjLayer}: ${ctxNames}${adj.contexts.length > 4 ? '...' : ''}`);

      // Show shared DB tables between this group and adjacent group
      const adjDbTables = adj.contexts.flatMap(c => c.dbTables);
      const groupDbTables = group.contexts.flatMap(c => c.dbTables);
      const shared = adjDbTables.filter(t => groupDbTables.includes(t));
      if (shared.length > 0) {
        lines.push(`  Shared DB tables: ${[...new Set(shared)].join(', ')}`);
      }
    }
    lines.push('');
  }

  // Cross-context references
  if (crossContextRefs.length > 0) {
    lines.push('**Cross-Context Dependencies**:');
    for (const ref of crossContextRefs.slice(0, 8)) {
      lines.push(`- ${ref.from} ${ref.relationship.replace('_', ' ')} ${ref.to}`);
    }
    lines.push('');
  }

  // Active directions for this group
  if (activeDirections.length > 0) {
    lines.push('**Active Directions for this group**:');
    for (const d of activeDirections.slice(0, 5)) {
      lines.push(`- [${d.status}] ${d.summary}`);
    }
    lines.push('');
  }

  // Architectural flow
  if (edges.length > 0) {
    lines.push('**Architectural Flow**:');
    for (const e of edges) {
      lines.push(`- ${e.sourceGroupName} -> ${e.targetGroupName}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
