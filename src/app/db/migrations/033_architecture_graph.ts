/**
 * Migration 033: Living Architecture Evolution Graph
 * Creates tables for architecture graph nodes, edges, drift alerts, and AI suggestions
 */

import { getConnection } from '../drivers';
import { createTableIfNotExists, addColumnsIfNotExist, type MigrationLogger } from './migration.utils';

const migrationLogger: MigrationLogger = {
  info: (message: string) => {
    if (process.env.NODE_ENV !== 'test') {
      // Silent in production
    }
  },
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Migration Error] ${message}`, error);
    }
  },
  success: (message: string) => {
    if (process.env.NODE_ENV !== 'test') {
      // Silent in production
    }
  }
};

export function migrateArchitectureGraphTables() {
  const db = getConnection();

  try {
    // Architecture Nodes table
    createTableIfNotExists(db, 'architecture_nodes', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      node_type TEXT NOT NULL DEFAULT 'module',
      layer TEXT,
      context_group_id TEXT,
      complexity_score INTEGER DEFAULT 0,
      stability_score INTEGER DEFAULT 50,
      coupling_score INTEGER DEFAULT 0,
      cohesion_score INTEGER DEFAULT 50,
      loc INTEGER DEFAULT 0,
      incoming_count INTEGER DEFAULT 0,
      outgoing_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_modified TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, path)
    `, migrationLogger);

    // Architecture Edges table
    createTableIfNotExists(db, 'architecture_edges', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      weight TEXT NOT NULL DEFAULT 'required',
      import_count INTEGER DEFAULT 1,
      import_types TEXT DEFAULT '[]',
      is_circular INTEGER DEFAULT 0,
      strength INTEGER DEFAULT 50,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, source_node_id, target_node_id),
      FOREIGN KEY (source_node_id) REFERENCES architecture_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES architecture_nodes(id) ON DELETE CASCADE
    `, migrationLogger);

    // Architecture Drift Alerts table
    createTableIfNotExists(db, 'architecture_drifts', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      node_id TEXT,
      edge_id TEXT,
      drift_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      detected_pattern TEXT,
      ideal_pattern TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (node_id) REFERENCES architecture_nodes(id) ON DELETE SET NULL,
      FOREIGN KEY (edge_id) REFERENCES architecture_edges(id) ON DELETE SET NULL
    `, migrationLogger);

    // Architecture AI Suggestions table
    createTableIfNotExists(db, 'architecture_suggestions', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_id TEXT,
      suggestion_type TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reasoning TEXT,
      affected_nodes TEXT DEFAULT '[]',
      affected_edges TEXT DEFAULT '[]',
      predicted_effort INTEGER,
      predicted_impact INTEGER,
      predicted_risk INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      user_feedback TEXT,
      implemented_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE SET NULL
    `, migrationLogger);

    // Architecture Ideals/Rules table
    createTableIfNotExists(db, 'architecture_ideals', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      rule_type TEXT NOT NULL DEFAULT 'custom',
      rule_config TEXT NOT NULL DEFAULT '{}',
      example_compliant TEXT,
      example_violation TEXT,
      enabled INTEGER DEFAULT 1,
      severity TEXT NOT NULL DEFAULT 'warning',
      violations_count INTEGER DEFAULT 0,
      last_checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    `, migrationLogger);

    // Architecture Snapshots table
    createTableIfNotExists(db, 'architecture_snapshots', `
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      snapshot_type TEXT NOT NULL DEFAULT 'manual',
      name TEXT NOT NULL,
      description TEXT,
      nodes_count INTEGER DEFAULT 0,
      edges_count INTEGER DEFAULT 0,
      circular_count INTEGER DEFAULT 0,
      avg_complexity REAL DEFAULT 0,
      avg_coupling REAL DEFAULT 0,
      graph_data TEXT NOT NULL DEFAULT '{}',
      git_commit TEXT,
      created_at TEXT NOT NULL
    `, migrationLogger);

    // Create indexes for performance
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_nodes_project ON architecture_nodes(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_nodes_layer ON architecture_nodes(project_id, layer)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_nodes_type ON architecture_nodes(project_id, node_type)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_edges_project ON architecture_edges(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_edges_source ON architecture_edges(source_node_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_edges_target ON architecture_edges(target_node_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_edges_circular ON architecture_edges(project_id, is_circular)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_drifts_project ON architecture_drifts(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_drifts_status ON architecture_drifts(project_id, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_suggestions_project ON architecture_suggestions(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_suggestions_status ON architecture_suggestions(project_id, status)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_ideals_project ON architecture_ideals(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_arch_snapshots_project ON architecture_snapshots(project_id)`);
    } catch (indexError) {
      // Indexes may already exist, continue silently
    }

    migrationLogger.success('Architecture graph tables created successfully');
  } catch (error) {
    migrationLogger.error('Error creating architecture graph tables', error);
    throw error;
  }
}
