import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'dependencies.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getDependencyDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');

    // Initialize tables
    initializeDependencyTables();
  }

  return db;
}

function initializeDependencyTables() {
  if (!db) return;

  // Create dependency_scans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dependency_scans (
      id TEXT PRIMARY KEY,
      scan_name TEXT NOT NULL,
      scan_date TEXT NOT NULL,
      project_ids TEXT NOT NULL, -- JSON array of project IDs
      total_dependencies INTEGER DEFAULT 0,
      shared_dependencies INTEGER DEFAULT 0,
      duplicate_code_instances INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create project_dependencies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_dependencies (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      dependency_name TEXT NOT NULL,
      dependency_version TEXT,
      dependency_type TEXT NOT NULL CHECK (dependency_type IN ('npm', 'python', 'shared_module', 'local_import', 'external_library')),
      file_path TEXT, -- File where dependency is used
      usage_count INTEGER DEFAULT 1,
      is_dev_dependency INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES dependency_scans(id) ON DELETE CASCADE
    );
  `);

  // Create shared_dependencies table (dependencies used across multiple projects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_dependencies (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      dependency_name TEXT NOT NULL,
      dependency_type TEXT NOT NULL,
      project_ids TEXT NOT NULL, -- JSON array of project IDs using this dependency
      version_conflicts TEXT, -- JSON object mapping project_id to version
      usage_count INTEGER DEFAULT 0,
      refactoring_opportunity TEXT, -- Description of potential refactoring
      priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES dependency_scans(id) ON DELETE CASCADE
    );
  `);

  // Create code_duplicates table (similar code patterns across projects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS code_duplicates (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      pattern_hash TEXT NOT NULL, -- Hash of the code pattern
      pattern_type TEXT NOT NULL, -- e.g., 'function', 'class', 'utility', 'component'
      code_snippet TEXT NOT NULL,
      similarity_score REAL NOT NULL, -- 0.0 to 1.0
      occurrences TEXT NOT NULL, -- JSON array of {project_id, file_path, line_start, line_end}
      refactoring_suggestion TEXT,
      estimated_savings TEXT, -- e.g., "150 LOC, 3 files"
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES dependency_scans(id) ON DELETE CASCADE
    );
  `);

  // Create dependency_relationships table (how modules are interconnected)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dependency_relationships (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      source_project_id TEXT NOT NULL,
      target_project_id TEXT NOT NULL,
      source_module TEXT NOT NULL,
      target_module TEXT NOT NULL,
      relationship_type TEXT NOT NULL CHECK (relationship_type IN ('imports', 'exports', 'api_call', 'shared_util', 'dependency')),
      strength INTEGER DEFAULT 1, -- Number of connections
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (scan_id) REFERENCES dependency_scans(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_scan_id ON project_dependencies(scan_id);
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_project_id ON project_dependencies(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_dependencies_name ON project_dependencies(dependency_name);
    CREATE INDEX IF NOT EXISTS idx_shared_dependencies_scan_id ON shared_dependencies(scan_id);
    CREATE INDEX IF NOT EXISTS idx_shared_dependencies_name ON shared_dependencies(dependency_name);
    CREATE INDEX IF NOT EXISTS idx_code_duplicates_scan_id ON code_duplicates(scan_id);
    CREATE INDEX IF NOT EXISTS idx_code_duplicates_pattern_hash ON code_duplicates(pattern_hash);
    CREATE INDEX IF NOT EXISTS idx_dependency_relationships_scan_id ON dependency_relationships(scan_id);
    CREATE INDEX IF NOT EXISTS idx_dependency_relationships_source ON dependency_relationships(source_project_id);
    CREATE INDEX IF NOT EXISTS idx_dependency_relationships_target ON dependency_relationships(target_project_id);
  `);

  console.log('Dependency database initialized successfully');
}

// Dependency Scan operations
export interface DbDependencyScan {
  id: string;
  scan_name: string;
  scan_date: string;
  project_ids: string; // JSON string
  total_dependencies: number;
  shared_dependencies: number;
  duplicate_code_instances: number;
  created_at: string;
  updated_at: string;
}

export const dependencyScanDb = {
  // Get all scans
  getAllScans: (): DbDependencyScan[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM dependency_scans
      ORDER BY scan_date DESC
    `);
    return stmt.all() as DbDependencyScan[];
  },

  // Get scan by ID
  getScanById: (id: string): DbDependencyScan | null => {
    const db = getDependencyDatabase();
    const stmt = db.prepare('SELECT * FROM dependency_scans WHERE id = ?');
    return stmt.get(id) as DbDependencyScan | null;
  },

  // Create a new scan
  createScan: (scan: {
    id: string;
    scan_name: string;
    project_ids: string[];
    total_dependencies?: number;
    shared_dependencies?: number;
    duplicate_code_instances?: number;
  }): DbDependencyScan => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO dependency_scans (
        id, scan_name, scan_date, project_ids, total_dependencies,
        shared_dependencies, duplicate_code_instances, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scan.id,
      scan.scan_name,
      now,
      JSON.stringify(scan.project_ids),
      scan.total_dependencies || 0,
      scan.shared_dependencies || 0,
      scan.duplicate_code_instances || 0,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM dependency_scans WHERE id = ?');
    return selectStmt.get(scan.id) as DbDependencyScan;
  },

  // Update scan statistics
  updateScanStats: (id: string, stats: {
    total_dependencies?: number;
    shared_dependencies?: number;
    duplicate_code_instances?: number;
  }): DbDependencyScan | null => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (stats.total_dependencies !== undefined) {
      updateFields.push('total_dependencies = ?');
      values.push(stats.total_dependencies);
    }
    if (stats.shared_dependencies !== undefined) {
      updateFields.push('shared_dependencies = ?');
      values.push(stats.shared_dependencies);
    }
    if (stats.duplicate_code_instances !== undefined) {
      updateFields.push('duplicate_code_instances = ?');
      values.push(stats.duplicate_code_instances);
    }

    if (updateFields.length === 0) {
      const selectStmt = db.prepare('SELECT * FROM dependency_scans WHERE id = ?');
      return selectStmt.get(id) as DbDependencyScan | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE dependency_scans
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM dependency_scans WHERE id = ?');
    return selectStmt.get(id) as DbDependencyScan;
  },

  // Delete a scan
  deleteScan: (id: string): boolean => {
    const db = getDependencyDatabase();
    const stmt = db.prepare('DELETE FROM dependency_scans WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
};

// Project Dependencies operations
export interface DbProjectDependency {
  id: string;
  scan_id: string;
  project_id: string;
  dependency_name: string;
  dependency_version: string | null;
  dependency_type: 'npm' | 'python' | 'shared_module' | 'local_import' | 'external_library';
  file_path: string | null;
  usage_count: number;
  is_dev_dependency: number;
  created_at: string;
}

export const projectDependencyDb = {
  // Get all dependencies for a scan
  getDependenciesByScan: (scanId: string): DbProjectDependency[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM project_dependencies
      WHERE scan_id = ?
      ORDER BY dependency_name ASC
    `);
    return stmt.all(scanId) as DbProjectDependency[];
  },

  // Get dependencies for a specific project in a scan
  getDependenciesByProject: (scanId: string, projectId: string): DbProjectDependency[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM project_dependencies
      WHERE scan_id = ? AND project_id = ?
      ORDER BY dependency_name ASC
    `);
    return stmt.all(scanId, projectId) as DbProjectDependency[];
  },

  // Create a dependency entry
  createDependency: (dep: {
    id: string;
    scan_id: string;
    project_id: string;
    dependency_name: string;
    dependency_version?: string;
    dependency_type: 'npm' | 'python' | 'shared_module' | 'local_import' | 'external_library';
    file_path?: string;
    usage_count?: number;
    is_dev_dependency?: boolean;
  }): DbProjectDependency => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO project_dependencies (
        id, scan_id, project_id, dependency_name, dependency_version,
        dependency_type, file_path, usage_count, is_dev_dependency, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dep.id,
      dep.scan_id,
      dep.project_id,
      dep.dependency_name,
      dep.dependency_version || null,
      dep.dependency_type,
      dep.file_path || null,
      dep.usage_count || 1,
      dep.is_dev_dependency ? 1 : 0,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM project_dependencies WHERE id = ?');
    return selectStmt.get(dep.id) as DbProjectDependency;
  },

  // Batch create dependencies
  createDependencies: (dependencies: Array<{
    id: string;
    scan_id: string;
    project_id: string;
    dependency_name: string;
    dependency_version?: string;
    dependency_type: 'npm' | 'python' | 'shared_module' | 'local_import' | 'external_library';
    file_path?: string;
    usage_count?: number;
    is_dev_dependency?: boolean;
  }>): void => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO project_dependencies (
        id, scan_id, project_id, dependency_name, dependency_version,
        dependency_type, file_path, usage_count, is_dev_dependency, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((deps: typeof dependencies) => {
      for (const dep of deps) {
        stmt.run(
          dep.id,
          dep.scan_id,
          dep.project_id,
          dep.dependency_name,
          dep.dependency_version || null,
          dep.dependency_type,
          dep.file_path || null,
          dep.usage_count || 1,
          dep.is_dev_dependency ? 1 : 0,
          now
        );
      }
    });

    insertMany(dependencies);
  }
};

// Shared Dependencies operations
export interface DbSharedDependency {
  id: string;
  scan_id: string;
  dependency_name: string;
  dependency_type: string;
  project_ids: string; // JSON string
  version_conflicts: string | null; // JSON string
  usage_count: number;
  refactoring_opportunity: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical' | null;
  created_at: string;
  updated_at: string;
}

export const sharedDependencyDb = {
  // Get shared dependencies for a scan
  getSharedDependenciesByScan: (scanId: string): DbSharedDependency[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM shared_dependencies
      WHERE scan_id = ?
      ORDER BY usage_count DESC, priority DESC
    `);
    return stmt.all(scanId) as DbSharedDependency[];
  },

  // Create shared dependency
  createSharedDependency: (dep: {
    id: string;
    scan_id: string;
    dependency_name: string;
    dependency_type: string;
    project_ids: string[];
    version_conflicts?: Record<string, string>;
    usage_count?: number;
    refactoring_opportunity?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): DbSharedDependency => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO shared_dependencies (
        id, scan_id, dependency_name, dependency_type, project_ids,
        version_conflicts, usage_count, refactoring_opportunity, priority, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dep.id,
      dep.scan_id,
      dep.dependency_name,
      dep.dependency_type,
      JSON.stringify(dep.project_ids),
      dep.version_conflicts ? JSON.stringify(dep.version_conflicts) : null,
      dep.usage_count || 0,
      dep.refactoring_opportunity || null,
      dep.priority || null,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM shared_dependencies WHERE id = ?');
    return selectStmt.get(dep.id) as DbSharedDependency;
  },

  // Batch create shared dependencies
  createSharedDependencies: (dependencies: Array<{
    id: string;
    scan_id: string;
    dependency_name: string;
    dependency_type: string;
    project_ids: string[];
    version_conflicts?: Record<string, string>;
    usage_count?: number;
    refactoring_opportunity?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }>): void => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO shared_dependencies (
        id, scan_id, dependency_name, dependency_type, project_ids,
        version_conflicts, usage_count, refactoring_opportunity, priority, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((deps: typeof dependencies) => {
      for (const dep of deps) {
        stmt.run(
          dep.id,
          dep.scan_id,
          dep.dependency_name,
          dep.dependency_type,
          JSON.stringify(dep.project_ids),
          dep.version_conflicts ? JSON.stringify(dep.version_conflicts) : null,
          dep.usage_count || 0,
          dep.refactoring_opportunity || null,
          dep.priority || null,
          now,
          now
        );
      }
    });

    insertMany(dependencies);
  }
};

// Code Duplicates operations
export interface DbCodeDuplicate {
  id: string;
  scan_id: string;
  pattern_hash: string;
  pattern_type: string;
  code_snippet: string;
  similarity_score: number;
  occurrences: string; // JSON string
  refactoring_suggestion: string | null;
  estimated_savings: string | null;
  created_at: string;
}

export const codeDuplicateDb = {
  // Get duplicates for a scan
  getDuplicatesByScan: (scanId: string): DbCodeDuplicate[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM code_duplicates
      WHERE scan_id = ?
      ORDER BY similarity_score DESC
    `);
    return stmt.all(scanId) as DbCodeDuplicate[];
  },

  // Create code duplicate entry
  createDuplicate: (dup: {
    id: string;
    scan_id: string;
    pattern_hash: string;
    pattern_type: string;
    code_snippet: string;
    similarity_score: number;
    occurrences: Array<{
      project_id: string;
      file_path: string;
      line_start: number;
      line_end: number;
    }>;
    refactoring_suggestion?: string;
    estimated_savings?: string;
  }): DbCodeDuplicate => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO code_duplicates (
        id, scan_id, pattern_hash, pattern_type, code_snippet, similarity_score,
        occurrences, refactoring_suggestion, estimated_savings, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dup.id,
      dup.scan_id,
      dup.pattern_hash,
      dup.pattern_type,
      dup.code_snippet,
      dup.similarity_score,
      JSON.stringify(dup.occurrences),
      dup.refactoring_suggestion || null,
      dup.estimated_savings || null,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM code_duplicates WHERE id = ?');
    return selectStmt.get(dup.id) as DbCodeDuplicate;
  },

  // Batch create duplicates
  createDuplicates: (duplicates: Array<{
    id: string;
    scan_id: string;
    pattern_hash: string;
    pattern_type: string;
    code_snippet: string;
    similarity_score: number;
    occurrences: Array<{
      project_id: string;
      file_path: string;
      line_start: number;
      line_end: number;
    }>;
    refactoring_suggestion?: string;
    estimated_savings?: string;
  }>): void => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO code_duplicates (
        id, scan_id, pattern_hash, pattern_type, code_snippet, similarity_score,
        occurrences, refactoring_suggestion, estimated_savings, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((dups: typeof duplicates) => {
      for (const dup of dups) {
        stmt.run(
          dup.id,
          dup.scan_id,
          dup.pattern_hash,
          dup.pattern_type,
          dup.code_snippet,
          dup.similarity_score,
          JSON.stringify(dup.occurrences),
          dup.refactoring_suggestion || null,
          dup.estimated_savings || null,
          now
        );
      }
    });

    insertMany(duplicates);
  }
};

// Dependency Relationships operations
export interface DbDependencyRelationship {
  id: string;
  scan_id: string;
  source_project_id: string;
  target_project_id: string;
  source_module: string;
  target_module: string;
  relationship_type: 'imports' | 'exports' | 'api_call' | 'shared_util' | 'dependency';
  strength: number;
  created_at: string;
}

export const dependencyRelationshipDb = {
  // Get relationships for a scan
  getRelationshipsByScan: (scanId: string): DbDependencyRelationship[] => {
    const db = getDependencyDatabase();
    const stmt = db.prepare(`
      SELECT * FROM dependency_relationships
      WHERE scan_id = ?
      ORDER BY strength DESC
    `);
    return stmt.all(scanId) as DbDependencyRelationship[];
  },

  // Create relationship
  createRelationship: (rel: {
    id: string;
    scan_id: string;
    source_project_id: string;
    target_project_id: string;
    source_module: string;
    target_module: string;
    relationship_type: 'imports' | 'exports' | 'api_call' | 'shared_util' | 'dependency';
    strength?: number;
  }): DbDependencyRelationship => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO dependency_relationships (
        id, scan_id, source_project_id, target_project_id, source_module,
        target_module, relationship_type, strength, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      rel.id,
      rel.scan_id,
      rel.source_project_id,
      rel.target_project_id,
      rel.source_module,
      rel.target_module,
      rel.relationship_type,
      rel.strength || 1,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM dependency_relationships WHERE id = ?');
    return selectStmt.get(rel.id) as DbDependencyRelationship;
  },

  // Batch create relationships
  createRelationships: (relationships: Array<{
    id: string;
    scan_id: string;
    source_project_id: string;
    target_project_id: string;
    source_module: string;
    target_module: string;
    relationship_type: 'imports' | 'exports' | 'api_call' | 'shared_util' | 'dependency';
    strength?: number;
  }>): void => {
    const db = getDependencyDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO dependency_relationships (
        id, scan_id, source_project_id, target_project_id, source_module,
        target_module, relationship_type, strength, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((rels: typeof relationships) => {
      for (const rel of rels) {
        stmt.run(
          rel.id,
          rel.scan_id,
          rel.source_project_id,
          rel.target_project_id,
          rel.source_module,
          rel.target_module,
          rel.relationship_type,
          rel.strength || 1,
          now
        );
      }
    });

    insertMany(relationships);
  }
};

// Close database connection
export const closeDependencyDatabase = () => {
  if (db) {
    db.close();
    db = null;
  }
};

// Cleanup on process exit
process.on('exit', () => {
  closeDependencyDatabase();
});

process.on('SIGINT', () => {
  closeDependencyDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDependencyDatabase();
  process.exit(0);
});
