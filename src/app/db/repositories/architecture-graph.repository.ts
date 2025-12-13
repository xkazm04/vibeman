/**
 * Architecture Graph Repository
 * Database operations for Living Architecture Evolution Graph
 */

import { getDatabase } from '../connection';
import {
  DbArchitectureNode,
  DbArchitectureEdge,
  DbArchitectureDrift,
  DbArchitectureSuggestion,
  DbArchitectureIdeal,
  DbArchitectureSnapshot,
  ArchitectureNodeType,
  DependencyWeight,
  DriftSeverity,
  RefactoringActionType,
} from '../models/architecture-graph.types';

// =====================================================
// Architecture Nodes Repository
// =====================================================

function getNodeById(id: string): DbArchitectureNode | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_nodes WHERE id = ?');
  return stmt.get(id) as DbArchitectureNode | null;
}

export const architectureNodeRepository = {
  /**
   * Get all nodes for a project
   */
  getByProject: (projectId: string): DbArchitectureNode[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(projectId) as DbArchitectureNode[];
  },

  /**
   * Get nodes by layer
   */
  getByLayer: (projectId: string, layer: string): DbArchitectureNode[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ? AND layer = ?
      ORDER BY name ASC
    `);
    return stmt.all(projectId, layer) as DbArchitectureNode[];
  },

  /**
   * Get nodes by type
   */
  getByType: (projectId: string, nodeType: ArchitectureNodeType): DbArchitectureNode[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ? AND node_type = ?
      ORDER BY name ASC
    `);
    return stmt.all(projectId, nodeType) as DbArchitectureNode[];
  },

  /**
   * Get node by path
   */
  getByPath: (projectId: string, path: string): DbArchitectureNode | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ? AND path = ?
    `);
    return stmt.get(projectId, path) as DbArchitectureNode | null;
  },

  /**
   * Get active nodes only
   */
  getActiveNodes: (projectId: string): DbArchitectureNode[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ? AND is_active = 1
      ORDER BY name ASC
    `);
    return stmt.all(projectId) as DbArchitectureNode[];
  },

  /**
   * Get high-coupling nodes (coupling_score > threshold)
   */
  getHighCouplingNodes: (projectId: string, threshold: number = 70): DbArchitectureNode[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_nodes
      WHERE project_id = ? AND coupling_score > ? AND is_active = 1
      ORDER BY coupling_score DESC
    `);
    return stmt.all(projectId, threshold) as DbArchitectureNode[];
  },

  /**
   * Create a new node
   */
  create: (node: {
    id: string;
    project_id: string;
    path: string;
    name: string;
    node_type?: ArchitectureNodeType;
    layer?: string | null;
    context_group_id?: string | null;
    complexity_score?: number;
    stability_score?: number;
    coupling_score?: number;
    cohesion_score?: number;
    loc?: number;
  }): DbArchitectureNode => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_nodes (
        id, project_id, path, name, node_type, layer, context_group_id,
        complexity_score, stability_score, coupling_score, cohesion_score, loc,
        incoming_count, outgoing_count, is_active, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?)
    `);

    stmt.run(
      node.id,
      node.project_id,
      node.path,
      node.name,
      node.node_type || 'module',
      node.layer || null,
      node.context_group_id || null,
      node.complexity_score || 0,
      node.stability_score || 50,
      node.coupling_score || 0,
      node.cohesion_score || 50,
      node.loc || 0,
      now,
      now
    );

    return getNodeById(node.id)!;
  },

  /**
   * Upsert node (create or update)
   */
  upsert: (node: {
    id: string;
    project_id: string;
    path: string;
    name: string;
    node_type?: ArchitectureNodeType;
    layer?: string | null;
    context_group_id?: string | null;
    complexity_score?: number;
    stability_score?: number;
    coupling_score?: number;
    cohesion_score?: number;
    loc?: number;
    last_modified?: string | null;
  }): DbArchitectureNode => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_nodes (
        id, project_id, path, name, node_type, layer, context_group_id,
        complexity_score, stability_score, coupling_score, cohesion_score, loc,
        incoming_count, outgoing_count, is_active, last_modified, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, ?, ?)
      ON CONFLICT(project_id, path) DO UPDATE SET
        name = excluded.name,
        node_type = excluded.node_type,
        layer = excluded.layer,
        context_group_id = excluded.context_group_id,
        complexity_score = excluded.complexity_score,
        stability_score = excluded.stability_score,
        coupling_score = excluded.coupling_score,
        cohesion_score = excluded.cohesion_score,
        loc = excluded.loc,
        is_active = 1,
        last_modified = excluded.last_modified,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      node.id,
      node.project_id,
      node.path,
      node.name,
      node.node_type || 'module',
      node.layer || null,
      node.context_group_id || null,
      node.complexity_score || 0,
      node.stability_score || 50,
      node.coupling_score || 0,
      node.cohesion_score || 50,
      node.loc || 0,
      node.last_modified || null,
      now,
      now
    );

    return architectureNodeRepository.getByPath(node.project_id, node.path)!;
  },

  /**
   * Update node metrics
   */
  updateMetrics: (
    id: string,
    metrics: {
      complexity_score?: number;
      stability_score?: number;
      coupling_score?: number;
      cohesion_score?: number;
      loc?: number;
      incoming_count?: number;
      outgoing_count?: number;
    }
  ): DbArchitectureNode | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: Array<string | number> = [];

    if (metrics.complexity_score !== undefined) {
      updateFields.push('complexity_score = ?');
      values.push(metrics.complexity_score);
    }
    if (metrics.stability_score !== undefined) {
      updateFields.push('stability_score = ?');
      values.push(metrics.stability_score);
    }
    if (metrics.coupling_score !== undefined) {
      updateFields.push('coupling_score = ?');
      values.push(metrics.coupling_score);
    }
    if (metrics.cohesion_score !== undefined) {
      updateFields.push('cohesion_score = ?');
      values.push(metrics.cohesion_score);
    }
    if (metrics.loc !== undefined) {
      updateFields.push('loc = ?');
      values.push(metrics.loc);
    }
    if (metrics.incoming_count !== undefined) {
      updateFields.push('incoming_count = ?');
      values.push(metrics.incoming_count);
    }
    if (metrics.outgoing_count !== undefined) {
      updateFields.push('outgoing_count = ?');
      values.push(metrics.outgoing_count);
    }

    if (updateFields.length === 0) return getNodeById(id);

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE architecture_nodes
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return getNodeById(id);
  },

  /**
   * Mark nodes as inactive
   */
  markInactive: (projectId: string, paths: string[]): number => {
    if (paths.length === 0) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();
    const placeholders = paths.map(() => '?').join(', ');

    const stmt = db.prepare(`
      UPDATE architecture_nodes
      SET is_active = 0, updated_at = ?
      WHERE project_id = ? AND path IN (${placeholders})
    `);

    const result = stmt.run(now, projectId, ...paths);
    return result.changes;
  },

  /**
   * Delete node
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_nodes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all nodes for a project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_nodes WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get node statistics
   */
  getStats: (projectId: string): {
    totalNodes: number;
    activeNodes: number;
    byLayer: Record<string, number>;
    byType: Record<string, number>;
    avgComplexity: number;
    avgCoupling: number;
  } => {
    const db = getDatabase();

    const countStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        AVG(complexity_score) as avgComplexity,
        AVG(coupling_score) as avgCoupling
      FROM architecture_nodes
      WHERE project_id = ?
    `);
    const counts = countStmt.get(projectId) as {
      total: number;
      active: number;
      avgComplexity: number;
      avgCoupling: number;
    };

    const layerStmt = db.prepare(`
      SELECT layer, COUNT(*) as count
      FROM architecture_nodes
      WHERE project_id = ? AND is_active = 1 AND layer IS NOT NULL
      GROUP BY layer
    `);
    const layers = layerStmt.all(projectId) as Array<{ layer: string; count: number }>;

    const typeStmt = db.prepare(`
      SELECT node_type, COUNT(*) as count
      FROM architecture_nodes
      WHERE project_id = ? AND is_active = 1
      GROUP BY node_type
    `);
    const types = typeStmt.all(projectId) as Array<{ node_type: string; count: number }>;

    return {
      totalNodes: counts.total || 0,
      activeNodes: counts.active || 0,
      byLayer: Object.fromEntries(layers.map(l => [l.layer, l.count])),
      byType: Object.fromEntries(types.map(t => [t.node_type, t.count])),
      avgComplexity: Math.round(counts.avgComplexity || 0),
      avgCoupling: Math.round(counts.avgCoupling || 0),
    };
  },
};

// =====================================================
// Architecture Edges Repository
// =====================================================

function getEdgeById(id: string): DbArchitectureEdge | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_edges WHERE id = ?');
  return stmt.get(id) as DbArchitectureEdge | null;
}

export const architectureEdgeRepository = {
  /**
   * Get all edges for a project
   */
  getByProject: (projectId: string): DbArchitectureEdge[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_edges
      WHERE project_id = ?
    `);
    return stmt.all(projectId) as DbArchitectureEdge[];
  },

  /**
   * Get edges from a source node
   */
  getOutgoing: (nodeId: string): DbArchitectureEdge[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_edges
      WHERE source_node_id = ?
    `);
    return stmt.all(nodeId) as DbArchitectureEdge[];
  },

  /**
   * Get edges to a target node
   */
  getIncoming: (nodeId: string): DbArchitectureEdge[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_edges
      WHERE target_node_id = ?
    `);
    return stmt.all(nodeId) as DbArchitectureEdge[];
  },

  /**
   * Get circular dependencies
   */
  getCircularEdges: (projectId: string): DbArchitectureEdge[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_edges
      WHERE project_id = ? AND is_circular = 1
    `);
    return stmt.all(projectId) as DbArchitectureEdge[];
  },

  /**
   * Get edge between two nodes
   */
  getEdgeBetween: (sourceId: string, targetId: string): DbArchitectureEdge | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_edges
      WHERE source_node_id = ? AND target_node_id = ?
    `);
    return stmt.get(sourceId, targetId) as DbArchitectureEdge | null;
  },

  /**
   * Create a new edge
   */
  create: (edge: {
    id: string;
    project_id: string;
    source_node_id: string;
    target_node_id: string;
    weight?: DependencyWeight;
    import_count?: number;
    import_types?: string;
    is_circular?: boolean;
    strength?: number;
  }): DbArchitectureEdge => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_edges (
        id, project_id, source_node_id, target_node_id, weight,
        import_count, import_types, is_circular, strength, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      edge.id,
      edge.project_id,
      edge.source_node_id,
      edge.target_node_id,
      edge.weight || 'required',
      edge.import_count || 1,
      edge.import_types || '[]',
      edge.is_circular ? 1 : 0,
      edge.strength || 50,
      now,
      now
    );

    return getEdgeById(edge.id)!;
  },

  /**
   * Upsert edge
   */
  upsert: (edge: {
    id: string;
    project_id: string;
    source_node_id: string;
    target_node_id: string;
    weight?: DependencyWeight;
    import_count?: number;
    import_types?: string;
    is_circular?: boolean;
    strength?: number;
  }): DbArchitectureEdge => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_edges (
        id, project_id, source_node_id, target_node_id, weight,
        import_count, import_types, is_circular, strength, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(project_id, source_node_id, target_node_id) DO UPDATE SET
        weight = excluded.weight,
        import_count = excluded.import_count,
        import_types = excluded.import_types,
        is_circular = excluded.is_circular,
        strength = excluded.strength,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      edge.id,
      edge.project_id,
      edge.source_node_id,
      edge.target_node_id,
      edge.weight || 'required',
      edge.import_count || 1,
      edge.import_types || '[]',
      edge.is_circular ? 1 : 0,
      edge.strength || 50,
      now,
      now
    );

    const existing = architectureEdgeRepository.getEdgeBetween(edge.source_node_id, edge.target_node_id);
    return existing || getEdgeById(edge.id)!;
  },

  /**
   * Mark edges as circular
   */
  markCircular: (edgeIds: string[]): number => {
    if (edgeIds.length === 0) return 0;

    const db = getDatabase();
    const now = new Date().toISOString();
    const placeholders = edgeIds.map(() => '?').join(', ');

    const stmt = db.prepare(`
      UPDATE architecture_edges
      SET is_circular = 1, weight = 'circular', updated_at = ?
      WHERE id IN (${placeholders})
    `);

    const result = stmt.run(now, ...edgeIds);
    return result.changes;
  },

  /**
   * Delete edge
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_edges WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all edges for a project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_edges WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Get edge statistics
   */
  getStats: (projectId: string): {
    totalEdges: number;
    circularCount: number;
    byWeight: Record<string, number>;
    avgStrength: number;
  } => {
    const db = getDatabase();

    const countStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_circular = 1 THEN 1 ELSE 0 END) as circular,
        AVG(strength) as avgStrength
      FROM architecture_edges
      WHERE project_id = ?
    `);
    const counts = countStmt.get(projectId) as {
      total: number;
      circular: number;
      avgStrength: number;
    };

    const weightStmt = db.prepare(`
      SELECT weight, COUNT(*) as count
      FROM architecture_edges
      WHERE project_id = ?
      GROUP BY weight
    `);
    const weights = weightStmt.all(projectId) as Array<{ weight: string; count: number }>;

    return {
      totalEdges: counts.total || 0,
      circularCount: counts.circular || 0,
      byWeight: Object.fromEntries(weights.map(w => [w.weight, w.count])),
      avgStrength: Math.round(counts.avgStrength || 0),
    };
  },
};

// =====================================================
// Architecture Drifts Repository
// =====================================================

function getDriftById(id: string): DbArchitectureDrift | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_drifts WHERE id = ?');
  return stmt.get(id) as DbArchitectureDrift | null;
}

export const architectureDriftRepository = {
  /**
   * Get all drifts for a project
   */
  getByProject: (projectId: string): DbArchitectureDrift[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_drifts
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbArchitectureDrift[];
  },

  /**
   * Get active drifts
   */
  getActive: (projectId: string): DbArchitectureDrift[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_drifts
      WHERE project_id = ? AND status = 'active'
      ORDER BY
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        created_at DESC
    `);
    return stmt.all(projectId) as DbArchitectureDrift[];
  },

  /**
   * Get drifts by severity
   */
  getBySeverity: (projectId: string, severity: DriftSeverity): DbArchitectureDrift[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_drifts
      WHERE project_id = ? AND severity = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId, severity) as DbArchitectureDrift[];
  },

  /**
   * Create a new drift alert
   */
  create: (drift: {
    id: string;
    project_id: string;
    node_id?: string | null;
    edge_id?: string | null;
    drift_type: string;
    severity?: DriftSeverity;
    title: string;
    description: string;
    detected_pattern?: string | null;
    ideal_pattern?: string | null;
  }): DbArchitectureDrift => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_drifts (
        id, project_id, node_id, edge_id, drift_type, severity,
        title, description, detected_pattern, ideal_pattern,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `);

    stmt.run(
      drift.id,
      drift.project_id,
      drift.node_id || null,
      drift.edge_id || null,
      drift.drift_type,
      drift.severity || 'warning',
      drift.title,
      drift.description,
      drift.detected_pattern || null,
      drift.ideal_pattern || null,
      now,
      now
    );

    return getDriftById(drift.id)!;
  },

  /**
   * Update drift status
   */
  updateStatus: (
    id: string,
    status: 'active' | 'acknowledged' | 'resolved' | 'ignored'
  ): DbArchitectureDrift | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE architecture_drifts
      SET status = ?, resolved_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      status,
      status === 'resolved' ? now : null,
      now,
      id
    );

    return getDriftById(id);
  },

  /**
   * Delete drift
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_drifts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get drift counts by status
   */
  getCounts: (projectId: string): Record<string, number> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM architecture_drifts
      WHERE project_id = ?
      GROUP BY status
    `);
    const results = stmt.all(projectId) as Array<{ status: string; count: number }>;
    return Object.fromEntries(results.map(r => [r.status, r.count]));
  },
};

// =====================================================
// Architecture Suggestions Repository
// =====================================================

function getSuggestionById(id: string): DbArchitectureSuggestion | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_suggestions WHERE id = ?');
  return stmt.get(id) as DbArchitectureSuggestion | null;
}

export const architectureSuggestionRepository = {
  /**
   * Get all suggestions for a project
   */
  getByProject: (projectId: string): DbArchitectureSuggestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_suggestions
      WHERE project_id = ?
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        created_at DESC
    `);
    return stmt.all(projectId) as DbArchitectureSuggestion[];
  },

  /**
   * Get pending suggestions
   */
  getPending: (projectId: string): DbArchitectureSuggestion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_suggestions
      WHERE project_id = ? AND status = 'pending'
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        created_at DESC
    `);
    return stmt.all(projectId) as DbArchitectureSuggestion[];
  },

  /**
   * Create a new suggestion
   */
  create: (suggestion: {
    id: string;
    project_id: string;
    scan_id?: string | null;
    suggestion_type: RefactoringActionType;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    reasoning?: string | null;
    affected_nodes?: string[];
    affected_edges?: string[];
    predicted_effort?: number | null;
    predicted_impact?: number | null;
    predicted_risk?: number | null;
  }): DbArchitectureSuggestion => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_suggestions (
        id, project_id, scan_id, suggestion_type, priority,
        title, description, reasoning, affected_nodes, affected_edges,
        predicted_effort, predicted_impact, predicted_risk,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `);

    stmt.run(
      suggestion.id,
      suggestion.project_id,
      suggestion.scan_id || null,
      suggestion.suggestion_type,
      suggestion.priority || 'medium',
      suggestion.title,
      suggestion.description,
      suggestion.reasoning || null,
      JSON.stringify(suggestion.affected_nodes || []),
      JSON.stringify(suggestion.affected_edges || []),
      suggestion.predicted_effort || null,
      suggestion.predicted_impact || null,
      suggestion.predicted_risk || null,
      now,
      now
    );

    return getSuggestionById(suggestion.id)!;
  },

  /**
   * Update suggestion status
   */
  updateStatus: (
    id: string,
    status: 'pending' | 'accepted' | 'rejected' | 'implemented',
    feedback?: string
  ): DbArchitectureSuggestion | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE architecture_suggestions
      SET status = ?, user_feedback = ?, implemented_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      status,
      feedback || null,
      status === 'implemented' ? now : null,
      now,
      id
    );

    return getSuggestionById(id);
  },

  /**
   * Delete suggestion
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_suggestions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// =====================================================
// Architecture Ideals Repository
// =====================================================

function getIdealById(id: string): DbArchitectureIdeal | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_ideals WHERE id = ?');
  return stmt.get(id) as DbArchitectureIdeal | null;
}

export const architectureIdealRepository = {
  /**
   * Get all ideals for a project
   */
  getByProject: (projectId: string): DbArchitectureIdeal[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_ideals
      WHERE project_id = ?
      ORDER BY name ASC
    `);
    return stmt.all(projectId) as DbArchitectureIdeal[];
  },

  /**
   * Get enabled ideals
   */
  getEnabled: (projectId: string): DbArchitectureIdeal[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_ideals
      WHERE project_id = ? AND enabled = 1
      ORDER BY name ASC
    `);
    return stmt.all(projectId) as DbArchitectureIdeal[];
  },

  /**
   * Create a new ideal
   */
  create: (ideal: {
    id: string;
    project_id: string;
    name: string;
    description: string;
    rule_type?: 'layer_rule' | 'dependency_rule' | 'naming_rule' | 'structure_rule' | 'custom';
    rule_config: Record<string, unknown>;
    example_compliant?: string | null;
    example_violation?: string | null;
    severity?: DriftSeverity;
  }): DbArchitectureIdeal => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_ideals (
        id, project_id, name, description, rule_type, rule_config,
        example_compliant, example_violation, enabled, severity,
        violations_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?)
    `);

    stmt.run(
      ideal.id,
      ideal.project_id,
      ideal.name,
      ideal.description,
      ideal.rule_type || 'custom',
      JSON.stringify(ideal.rule_config),
      ideal.example_compliant || null,
      ideal.example_violation || null,
      ideal.severity || 'warning',
      now,
      now
    );

    return getIdealById(ideal.id)!;
  },

  /**
   * Update ideal
   */
  update: (id: string, updates: Partial<{
    name: string;
    description: string;
    rule_config: Record<string, unknown>;
    enabled: boolean;
    severity: DriftSeverity;
  }>): DbArchitectureIdeal | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: Array<string | number> = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.rule_config !== undefined) {
      updateFields.push('rule_config = ?');
      values.push(JSON.stringify(updates.rule_config));
    }
    if (updates.enabled !== undefined) {
      updateFields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.severity !== undefined) {
      updateFields.push('severity = ?');
      values.push(updates.severity);
    }

    if (updateFields.length === 0) return getIdealById(id);

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE architecture_ideals
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return getIdealById(id);
  },

  /**
   * Increment violations count
   */
  incrementViolations: (id: string): void => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE architecture_ideals
      SET violations_count = violations_count + 1, last_checked_at = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, now, id);
  },

  /**
   * Delete ideal
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_ideals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// =====================================================
// Architecture Snapshots Repository
// =====================================================

function getSnapshotById(id: string): DbArchitectureSnapshot | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM architecture_snapshots WHERE id = ?');
  return stmt.get(id) as DbArchitectureSnapshot | null;
}

export const architectureSnapshotRepository = {
  /**
   * Get all snapshots for a project
   */
  getByProject: (projectId: string): DbArchitectureSnapshot[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_snapshots
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(projectId) as DbArchitectureSnapshot[];
  },

  /**
   * Get latest snapshot
   */
  getLatest: (projectId: string): DbArchitectureSnapshot | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM architecture_snapshots
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return stmt.get(projectId) as DbArchitectureSnapshot | null;
  },

  /**
   * Create a new snapshot
   */
  create: (snapshot: {
    id: string;
    project_id: string;
    snapshot_type?: 'manual' | 'scheduled' | 'before_refactor' | 'milestone';
    name: string;
    description?: string | null;
    nodes_count: number;
    edges_count: number;
    circular_count: number;
    avg_complexity: number;
    avg_coupling: number;
    graph_data: Record<string, unknown>;
    git_commit?: string | null;
  }): DbArchitectureSnapshot => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO architecture_snapshots (
        id, project_id, snapshot_type, name, description,
        nodes_count, edges_count, circular_count, avg_complexity, avg_coupling,
        graph_data, git_commit, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      snapshot.id,
      snapshot.project_id,
      snapshot.snapshot_type || 'manual',
      snapshot.name,
      snapshot.description || null,
      snapshot.nodes_count,
      snapshot.edges_count,
      snapshot.circular_count,
      snapshot.avg_complexity,
      snapshot.avg_coupling,
      JSON.stringify(snapshot.graph_data),
      snapshot.git_commit || null,
      now
    );

    return getSnapshotById(snapshot.id)!;
  },

  /**
   * Delete snapshot
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM architecture_snapshots WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Compare two snapshots
   */
  compare: (snapshotId1: string, snapshotId2: string): {
    snapshot1: DbArchitectureSnapshot | null;
    snapshot2: DbArchitectureSnapshot | null;
    diff: {
      nodesDiff: number;
      edgesDiff: number;
      circularDiff: number;
      complexityDiff: number;
      couplingDiff: number;
    } | null;
  } => {
    const snapshot1 = getSnapshotById(snapshotId1);
    const snapshot2 = getSnapshotById(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      return { snapshot1, snapshot2, diff: null };
    }

    return {
      snapshot1,
      snapshot2,
      diff: {
        nodesDiff: snapshot2.nodes_count - snapshot1.nodes_count,
        edgesDiff: snapshot2.edges_count - snapshot1.edges_count,
        circularDiff: snapshot2.circular_count - snapshot1.circular_count,
        complexityDiff: snapshot2.avg_complexity - snapshot1.avg_complexity,
        couplingDiff: snapshot2.avg_coupling - snapshot1.avg_coupling,
      },
    };
  },
};
