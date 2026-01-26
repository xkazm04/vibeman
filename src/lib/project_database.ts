import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database path - store in the database directory
const DB_PATH = path.join(process.cwd(), 'database', 'projects.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database connection
let db: Database.Database | null = null;

function getProjectDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    // Initialize tables
    initializeProjectTables();
  }
  
  return db;
}

/**
 * Attempt to add a column to the projects table if it doesn't exist
 */
function addColumnIfNotExists(columnDef: string): void {
  if (!db) return;
  try {
    db.exec(`ALTER TABLE projects ADD COLUMN ${columnDef};`);
  } catch (error) {
    // Column already exists, ignore error
  }
}

/**
 * Create the projects table schema
 * Note: port is no longer UNIQUE at DB level - uniqueness is enforced per-workspace in validation
 * Note: port is now nullable for projects that don't need a dev server
 */
function createProjectsTable(): void {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      port INTEGER,
      workspace_id TEXT,
      type TEXT DEFAULT 'other',
      related_project_id TEXT,
      git_repository TEXT,
      git_branch TEXT DEFAULT 'main',
      run_script TEXT DEFAULT 'npm run dev',
      allow_multiple_instances INTEGER DEFAULT 0,
      base_port INTEGER,
      instance_of TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (related_project_id) REFERENCES projects(id)
    );
  `);
}

/**
 * Column definitions for backward compatibility
 */
const MIGRATION_COLUMNS = [
  `type TEXT DEFAULT 'other'`,
  `related_project_id TEXT`,
  `git_repository TEXT`,
  `git_branch TEXT DEFAULT 'main'`,
  `run_script TEXT DEFAULT 'npm run dev'`,
  `allow_multiple_instances INTEGER DEFAULT 0`,
  `base_port INTEGER`,
  `instance_of TEXT`,
  `workspace_id TEXT`
] as const;

/**
 * Add any missing columns for backward compatibility
 */
function addMissingColumns(): void {
  MIGRATION_COLUMNS.forEach(columnDef => addColumnIfNotExists(columnDef));
}

/**
 * Index definitions for query optimization
 */
const INDEX_DEFINITIONS = [
  'CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path)',
  'CREATE INDEX IF NOT EXISTS idx_projects_port ON projects(port)',
  'CREATE INDEX IF NOT EXISTS idx_projects_instance_of ON projects(instance_of)'
] as const;

/**
 * Create database indexes
 */
function createIndexes(): void {
  if (!db) return;
  const database = db; // Capture for closure
  INDEX_DEFINITIONS.forEach(indexDef => database.exec(indexDef));
}

/**
 * Default project template
 */
interface DefaultProjectTemplate {
  id: string;
  name: string;
  path: string;
  port: number;
  type: string;
  relatedProjectId: string | null;
  gitRepo: string;
  runScript: string;
}

/**
 * Convert template to database row format
 */
function templateToDbRow(template: DefaultProjectTemplate, now: string): unknown[] {
  return [
    template.id,
    template.name,
    template.path,
    template.port,
    template.type,
    template.relatedProjectId,
    template.gitRepo,
    'main',
    template.runScript,
    0,
    null,
    null,
    now,
    now
  ];
}

/**
 * Seed database with default projects if empty
 */
function seedDefaultProjects(): void {
  if (!db) return;

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM projects');
  const result = countStmt.get() as { count: number };

  if (result.count > 0) return;

  const insertStmt = db.prepare(`
    INSERT INTO projects (
      id, name, path, port, type, related_project_id, git_repository, git_branch, run_script,
      allow_multiple_instances, base_port, instance_of, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const defaultProjects: DefaultProjectTemplate[] = [
    {
      id: 'vibeman-main',
      name: 'Vibeman',
      path: '/workspace/vibeman',
      port: 3000,
      type: 'nextjs',
      relatedProjectId: null,
      gitRepo: 'https://github.com/user/vibeman.git',
      runScript: 'npm run dev'
    },
    {
      id: 'pikselplay-char-ui',
      name: 'PikselPlay Char UI',
      path: '/workspace/pikselplay/char-ui',
      port: 3001,
      type: 'nextjs',
      relatedProjectId: 'pikselplay-char-service',
      gitRepo: 'https://github.com/user/pikselplay.git',
      runScript: 'npm run dev'
    },
    {
      id: 'pikselplay-char-service',
      name: 'PikselPlay Char Service',
      path: '/workspace/pikselplay/char-service',
      port: 8000,
      type: 'fastapi',
      relatedProjectId: 'pikselplay-char-ui',
      gitRepo: 'https://github.com/user/pikselplay.git',
      runScript: 'uvicorn main:app --reload --host 0.0.0.0 --port 8000'
    }
  ];

  defaultProjects.forEach(project => {
    insertStmt.run(...templateToDbRow(project, now));
  });
}

/**
 * Initialize all database tables and schemas
 */
function initializeProjectTables() {
  if (!db) return;

  createProjectsTable();
  addMissingColumns();
  createIndexes();
  seedDefaultProjects();
}

/**
 * Helper function to add a field to update query
 */
function addUpdateField(
  fieldName: string,
  value: string | number | boolean | undefined,
  updateFields: string[],
  values: (string | number)[],
  transform?: (val: string | number | boolean) => string | number
): void {
  if (value !== undefined) {
    updateFields.push(`${fieldName} = ?`);
    values.push(transform ? transform(value) : value as string | number);
  }
}

/**
 * Helper function to build dynamic update query
 */
function buildUpdateQuery(updates: {
  name?: string;
  path?: string;
  port?: number | null;
  workspace_id?: string | null;
  type?: string;
  related_project_id?: string;
  git_repository?: string;
  git_branch?: string;
  run_script?: string;
  allow_multiple_instances?: boolean;
  base_port?: number;
}): { updateFields: string[]; values: (string | number | null)[] } {
  const updateFields: string[] = [];
  const values: (string | number | null)[] = [];

  addUpdateField('name', updates.name, updateFields, values);
  addUpdateField('path', updates.path, updateFields, values);
  // Handle port specially to allow null
  if (updates.port !== undefined) {
    updateFields.push('port = ?');
    values.push(updates.port);
  }
  addUpdateField('workspace_id', updates.workspace_id, updateFields, values);
  addUpdateField('type', updates.type, updateFields, values);
  addUpdateField('related_project_id', updates.related_project_id, updateFields, values);
  addUpdateField('git_repository', updates.git_repository, updateFields, values);
  addUpdateField('git_branch', updates.git_branch, updateFields, values);
  addUpdateField('run_script', updates.run_script, updateFields, values);
  addUpdateField('allow_multiple_instances', updates.allow_multiple_instances, updateFields, values, (val) => val ? 1 : 0);
  addUpdateField('base_port', updates.base_port, updateFields, values);

  return { updateFields, values };
}

/**
 * Helper function to check field availability
 */
function checkFieldAvailability(
  field: string,
  value: string | number,
  excludeProjectId?: string
): boolean {
  const db = getProjectDatabase();
  let stmt;
  let result;

  if (excludeProjectId) {
    stmt = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE ${field} = ? AND id != ?`);
    result = stmt.get(value, excludeProjectId) as { count: number };
  } else {
    stmt = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE ${field} = ?`);
    result = stmt.get(value) as { count: number };
  }

  return result.count === 0;
}

// Project database operations
export interface DbProject {
  id: string;
  name: string;
  path: string;
  port: number | null;
  workspace_id: string | null;
  type: string;
  related_project_id: string | null;
  git_repository: string | null;
  git_branch: string;
  run_script: string;
  allow_multiple_instances: number; // SQLite boolean (0/1)
  base_port: number | null;
  instance_of: string | null;
  created_at: string;
  updated_at: string;
}

export const projectDb = {
  // Get all projects
  getAllProjects: (): DbProject[] => {
    const db = getProjectDatabase();
    const stmt = db.prepare(`
      SELECT * FROM projects 
      ORDER BY created_at DESC
    `);
    return stmt.all() as DbProject[];
  },

  // Get project by ID
  getProject: (id: string): DbProject | null => {
    const db = getProjectDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as DbProject | null;
  },

  // Get project by path
  getProjectByPath: (path: string): DbProject | null => {
    const db = getProjectDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE path = ?');
    return stmt.get(path) as DbProject | null;
  },

  // Get project by port
  getProjectByPort: (port: number): DbProject | null => {
    const db = getProjectDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE port = ?');
    return stmt.get(port) as DbProject | null;
  },

  // Create a new project
  createProject: (project: {
    id: string;
    name: string;
    path: string;
    port?: number | null;
    workspace_id?: string | null;
    type?: string;
    related_project_id?: string;
    git_repository?: string;
    git_branch?: string;
    run_script?: string;
    allow_multiple_instances?: boolean;
    base_port?: number;
    instance_of?: string;
  }): DbProject => {
    const db = getProjectDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO projects (
        id, name, path, port, workspace_id, type, related_project_id, git_repository, git_branch, run_script,
        allow_multiple_instances, base_port, instance_of, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.name,
      project.path,
      project.port ?? null,
      project.workspace_id || null,
      project.type || 'other',
      project.related_project_id || null,
      project.git_repository || null,
      project.git_branch || 'main',
      project.run_script || 'npm run dev',
      project.allow_multiple_instances ? 1 : 0,
      project.base_port || null,
      project.instance_of || null,
      now,
      now
    );

    // Return the created project
    const selectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return selectStmt.get(project.id) as DbProject;
  },

  // Update a project
  updateProject: (id: string, updates: {
    name?: string;
    path?: string;
    port?: number | null;
    workspace_id?: string | null;
    type?: string;
    related_project_id?: string;
    git_repository?: string;
    git_branch?: string;
    run_script?: string;
    allow_multiple_instances?: boolean;
    base_port?: number;
  }): DbProject | null => {
    const db = getProjectDatabase();
    const now = new Date().toISOString();

    // Build dynamic update query using helper
    const { updateFields, values } = buildUpdateQuery(updates);

    if (updateFields.length === 0) {
      // No updates to make
      const selectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
      return selectStmt.get(id) as DbProject | null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null; // Project not found
    }

    // Return the updated project
    const selectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return selectStmt.get(id) as DbProject;
  },

  // Delete a project
  deleteProject: (id: string): boolean => {
    const db = getProjectDatabase();
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get project instances (projects that are instances of a base project)
  getProjectInstances: (baseProjectId: string): DbProject[] => {
    const db = getProjectDatabase();
    const stmt = db.prepare(`
      SELECT * FROM projects 
      WHERE instance_of = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(baseProjectId) as DbProject[];
  },

  // Check if port is available
  isPortAvailable: (port: number, excludeProjectId?: string): boolean => {
    return checkFieldAvailability('port', port, excludeProjectId);
  },

  // Check if path is available
  isPathAvailable: (path: string, excludeProjectId?: string): boolean => {
    return checkFieldAvailability('path', path, excludeProjectId);
  },

  // Get next available port starting from a base port
  getNextAvailablePort: (basePort: number): number => {
    const db = getProjectDatabase();
    const stmt = db.prepare('SELECT port FROM projects ORDER BY port ASC');
    const usedPorts = new Set((stmt.all() as { port: number }[]).map(p => p.port));
    
    let port = basePort;
    while (usedPorts.has(port)) {
      port++;
    }
    
    return port;
  },

  // Get all used ports
  getUsedPorts: (): number[] => {
    const db = getProjectDatabase();
    const stmt = db.prepare('SELECT port FROM projects WHERE port IS NOT NULL ORDER BY port ASC');
    return (stmt.all() as { port: number }[]).map(p => p.port);
  },

  // Get projects by workspace
  getProjectsByWorkspace: (workspaceId: string | null): DbProject[] => {
    const db = getProjectDatabase();
    const stmt = workspaceId
      ? db.prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC')
      : db.prepare('SELECT * FROM projects WHERE workspace_id IS NULL ORDER BY created_at DESC');
    return (workspaceId ? stmt.all(workspaceId) : stmt.all()) as DbProject[];
  },

  // Check if port is available within a workspace (null workspace = check all unassigned projects)
  isPortAvailableInWorkspace: (port: number, workspaceId: string | null, excludeProjectId?: string): boolean => {
    const db = getProjectDatabase();
    let stmt;
    let result;

    if (workspaceId) {
      if (excludeProjectId) {
        stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE port = ? AND workspace_id = ? AND id != ?');
        result = stmt.get(port, workspaceId, excludeProjectId) as { count: number };
      } else {
        stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE port = ? AND workspace_id = ?');
        result = stmt.get(port, workspaceId) as { count: number };
      }
    } else {
      // For unassigned projects, check globally (backward compatible)
      if (excludeProjectId) {
        stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE port = ? AND id != ?');
        result = stmt.get(port, excludeProjectId) as { count: number };
      } else {
        stmt = db.prepare('SELECT COUNT(*) as count FROM projects WHERE port = ?');
        result = stmt.get(port) as { count: number };
      }
    }

    return result.count === 0;
  },

  // Get next available port within a workspace
  getNextAvailablePortInWorkspace: (basePort: number, workspaceId: string | null): number => {
    const db = getProjectDatabase();
    const stmt = workspaceId
      ? db.prepare('SELECT port FROM projects WHERE workspace_id = ? AND port IS NOT NULL ORDER BY port ASC')
      : db.prepare('SELECT port FROM projects WHERE port IS NOT NULL ORDER BY port ASC');

    const rows = workspaceId ? stmt.all(workspaceId) : stmt.all();
    const usedPorts = new Set((rows as { port: number }[]).map(p => p.port));

    let port = basePort;
    while (usedPorts.has(port)) {
      port++;
    }

    return port;
  },

  // Update project's workspace assignment
  setProjectWorkspace: (projectId: string, workspaceId: string | null): boolean => {
    const db = getProjectDatabase();
    const now = new Date().toISOString();
    const stmt = db.prepare('UPDATE projects SET workspace_id = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(workspaceId, now, projectId);
    return result.changes > 0;
  },

  // Close database connection (for cleanup)
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Cleanup on process exit
process.on('exit', () => {
  projectDb.close();
});

process.on('SIGINT', () => {
  projectDb.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  projectDb.close();
  process.exit(0);
});