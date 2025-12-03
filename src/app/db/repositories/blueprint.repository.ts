/**
 * Blueprint Repository
 * Database operations for blueprint configurations, executions, and components
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { selectOne, selectAll, getCurrentTimestamp } from './repository.utils';
import type {
  DbBlueprintConfig,
  DbBlueprintExecution,
  DbBlueprintComponent,
  BlueprintConfigData,
  NodeExecutionResult,
} from '../models/types';

// ============================================================================
// Blueprint Config Operations
// ============================================================================

export function createBlueprintConfig(
  data: Omit<DbBlueprintConfig, 'id' | 'created_at' | 'updated_at'>
): DbBlueprintConfig {
  const db = getDatabase();
  const id = uuidv4();
  const now = getCurrentTimestamp();

  const stmt = db.prepare(`
    INSERT INTO blueprint_configs (id, project_id, name, description, is_template, config, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, data.project_id, data.name, data.description, data.is_template, data.config, now, now);

  return getBlueprintConfigById(id)!;
}

export function getBlueprintConfigById(id: string): DbBlueprintConfig | null {
  const db = getDatabase();
  return selectOne<DbBlueprintConfig>(db, 'SELECT * FROM blueprint_configs WHERE id = ?', id);
}

export function getBlueprintConfigsByProject(projectId: string): DbBlueprintConfig[] {
  const db = getDatabase();
  return selectAll<DbBlueprintConfig>(
    db,
    'SELECT * FROM blueprint_configs WHERE project_id = ? OR (is_template = 1 AND project_id IS NULL) ORDER BY name',
    projectId
  );
}

export function getTemplateBlueprintConfigs(): DbBlueprintConfig[] {
  const db = getDatabase();
  return selectAll<DbBlueprintConfig>(
    db,
    'SELECT * FROM blueprint_configs WHERE is_template = 1 ORDER BY name'
  );
}

export function updateBlueprintConfig(
  id: string,
  data: Partial<Pick<DbBlueprintConfig, 'name' | 'description' | 'config' | 'is_template'>>
): DbBlueprintConfig | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    values.push(data.description);
  }
  if (data.config !== undefined) {
    updates.push('config = ?');
    values.push(data.config);
  }
  if (data.is_template !== undefined) {
    updates.push('is_template = ?');
    values.push(data.is_template);
  }

  if (updates.length === 0) {
    return getBlueprintConfigById(id);
  }

  updates.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(id);

  const stmt = db.prepare(`UPDATE blueprint_configs SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getBlueprintConfigById(id);
}

export function deleteBlueprintConfig(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM blueprint_configs WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Helper to parse config JSON
export function parseBlueprintConfigData(config: string): BlueprintConfigData {
  try {
    return JSON.parse(config) as BlueprintConfigData;
  } catch {
    return { nodes: [], edges: [] };
  }
}

// ============================================================================
// Blueprint Execution Operations
// ============================================================================

export function createBlueprintExecution(
  data: Pick<DbBlueprintExecution, 'blueprint_id' | 'project_id'>
): DbBlueprintExecution {
  const db = getDatabase();
  const id = uuidv4();
  const now = getCurrentTimestamp();

  const stmt = db.prepare(`
    INSERT INTO blueprint_executions (id, blueprint_id, project_id, status, progress, created_at, updated_at)
    VALUES (?, ?, ?, 'pending', 0, ?, ?)
  `);
  stmt.run(id, data.blueprint_id, data.project_id, now, now);

  return getBlueprintExecutionById(id)!;
}

export function getBlueprintExecutionById(id: string): DbBlueprintExecution | null {
  const db = getDatabase();
  return selectOne<DbBlueprintExecution>(db, 'SELECT * FROM blueprint_executions WHERE id = ?', id);
}

export function getBlueprintExecutionsByProject(projectId: string, limit = 50): DbBlueprintExecution[] {
  const db = getDatabase();
  return selectAll<DbBlueprintExecution>(
    db,
    'SELECT * FROM blueprint_executions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
    projectId,
    limit
  );
}

export function updateBlueprintExecutionProgress(
  id: string,
  progress: number,
  currentNodeId?: string | null,
  nodeResults?: Record<string, NodeExecutionResult>
): DbBlueprintExecution | null {
  const db = getDatabase();
  const updates: string[] = ['progress = ?', 'updated_at = ?'];
  const values: (string | number | null)[] = [progress, getCurrentTimestamp()];

  if (currentNodeId !== undefined) {
    updates.push('current_node_id = ?');
    values.push(currentNodeId);
  }

  if (nodeResults !== undefined) {
    updates.push('node_results = ?');
    values.push(JSON.stringify(nodeResults));
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE blueprint_executions SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getBlueprintExecutionById(id);
}

export function updateBlueprintExecutionStatus(
  id: string,
  status: DbBlueprintExecution['status'],
  errorMessage?: string
): DbBlueprintExecution | null {
  const db = getDatabase();
  const now = getCurrentTimestamp();
  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const values: (string | null)[] = [status, now];

  if (status === 'running') {
    updates.push('started_at = ?');
    values.push(now);
  }

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.push('completed_at = ?');
    values.push(now);
  }

  if (errorMessage !== undefined) {
    updates.push('error_message = ?');
    values.push(errorMessage);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE blueprint_executions SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getBlueprintExecutionById(id);
}

export function deleteBlueprintExecution(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM blueprint_executions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Helper to parse node results
export function parseNodeResults(nodeResults: string | null): Record<string, NodeExecutionResult> {
  if (!nodeResults) return {};
  try {
    return JSON.parse(nodeResults) as Record<string, NodeExecutionResult>;
  } catch {
    return {};
  }
}

// ============================================================================
// Blueprint Component Registry Operations
// ============================================================================

export function registerBlueprintComponent(
  data: Omit<DbBlueprintComponent, 'id' | 'created_at' | 'updated_at'>
): DbBlueprintComponent {
  const db = getDatabase();
  const id = uuidv4();
  const now = getCurrentTimestamp();

  const stmt = db.prepare(`
    INSERT INTO blueprint_components (
      id, component_id, type, name, description, category, tags, icon, color,
      config_schema, default_config, input_types, output_types, supported_project_types,
      is_custom, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id, data.component_id, data.type, data.name, data.description,
    data.category, data.tags, data.icon, data.color,
    data.config_schema, data.default_config, data.input_types, data.output_types,
    data.supported_project_types, data.is_custom, now, now
  );

  return getBlueprintComponentById(id)!;
}

export function getBlueprintComponentById(id: string): DbBlueprintComponent | null {
  const db = getDatabase();
  return selectOne<DbBlueprintComponent>(db, 'SELECT * FROM blueprint_components WHERE id = ?', id);
}

export function getBlueprintComponentByComponentId(componentId: string): DbBlueprintComponent | null {
  const db = getDatabase();
  return selectOne<DbBlueprintComponent>(db, 'SELECT * FROM blueprint_components WHERE component_id = ?', componentId);
}

export function getAllBlueprintComponents(): DbBlueprintComponent[] {
  const db = getDatabase();
  return selectAll<DbBlueprintComponent>(db, 'SELECT * FROM blueprint_components ORDER BY type, name');
}

export function getBlueprintComponentsByType(type: DbBlueprintComponent['type']): DbBlueprintComponent[] {
  const db = getDatabase();
  return selectAll<DbBlueprintComponent>(db, 'SELECT * FROM blueprint_components WHERE type = ? ORDER BY name', type);
}

export function getCustomBlueprintComponents(): DbBlueprintComponent[] {
  const db = getDatabase();
  return selectAll<DbBlueprintComponent>(db, 'SELECT * FROM blueprint_components WHERE is_custom = 1 ORDER BY type, name');
}

export function updateBlueprintComponent(
  componentId: string,
  data: Partial<Omit<DbBlueprintComponent, 'id' | 'component_id' | 'created_at' | 'updated_at'>>
): DbBlueprintComponent | null {
  const db = getDatabase();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  const fields: (keyof typeof data)[] = [
    'type', 'name', 'description', 'category', 'tags', 'icon', 'color',
    'config_schema', 'default_config', 'input_types', 'output_types',
    'supported_project_types', 'is_custom'
  ];

  for (const field of fields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(data[field] as string | number | null);
    }
  }

  if (updates.length === 0) {
    return getBlueprintComponentByComponentId(componentId);
  }

  updates.push('updated_at = ?');
  values.push(getCurrentTimestamp());
  values.push(componentId);

  const stmt = db.prepare(`UPDATE blueprint_components SET ${updates.join(', ')} WHERE component_id = ?`);
  stmt.run(...values);
  return getBlueprintComponentByComponentId(componentId);
}

export function deleteBlueprintComponent(componentId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM blueprint_components WHERE component_id = ?');
  const result = stmt.run(componentId);
  return result.changes > 0;
}
