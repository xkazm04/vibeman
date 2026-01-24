import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import { DbContextApiRoute } from '../models/types';

/**
 * Create input type for context API routes
 */
export interface CreateContextApiRoute {
  context_id: string;
  api_path: string;
  http_methods?: string;
  layer?: 'pages' | 'client' | 'server' | 'external';
}

/**
 * Context API Route Repository
 * Maps API endpoints to contexts for X-Ray visualization and observability
 */
export const contextApiRouteRepository = {
  /**
   * Create a new API route mapping
   */
  create: (data: CreateContextApiRoute): DbContextApiRoute => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO context_api_routes (id, context_id, api_path, http_methods, layer, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.context_id,
      data.api_path,
      data.http_methods || 'GET',
      data.layer || 'server',
      now
    );

    const selectStmt = db.prepare('SELECT * FROM context_api_routes WHERE id = ?');
    return selectStmt.get(id) as DbContextApiRoute;
  },

  /**
   * Get API route mapping by ID
   */
  getById: (id: string): DbContextApiRoute | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes WHERE id = ?');
    return (stmt.get(id) as DbContextApiRoute) || null;
  },

  /**
   * Find API route mapping by path
   */
  findByPath: (apiPath: string): DbContextApiRoute | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes WHERE api_path = ?');
    return (stmt.get(apiPath) as DbContextApiRoute) || null;
  },

  /**
   * Find API route mapping with context details
   */
  findByPathWithContext: (apiPath: string): (DbContextApiRoute & {
    context_name: string | null;
    context_group_id: string | null;
  }) | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        car.*,
        c.name as context_name,
        c.group_id as context_group_id
      FROM context_api_routes car
      LEFT JOIN contexts c ON car.context_id = c.id
      WHERE car.api_path = ?
    `);
    return (stmt.get(apiPath) as (DbContextApiRoute & {
      context_name: string | null;
      context_group_id: string | null;
    })) || null;
  },

  /**
   * Get all API route mappings for a context
   */
  getByContextId: (contextId: string): DbContextApiRoute[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes WHERE context_id = ? ORDER BY api_path');
    return stmt.all(contextId) as DbContextApiRoute[];
  },

  /**
   * Get all API route mappings for a layer
   */
  getByLayer: (layer: 'pages' | 'client' | 'server' | 'external'): DbContextApiRoute[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes WHERE layer = ? ORDER BY api_path');
    return stmt.all(layer) as DbContextApiRoute[];
  },

  /**
   * Get all API route mappings
   */
  getAll: (): DbContextApiRoute[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes ORDER BY api_path');
    return stmt.all() as DbContextApiRoute[];
  },

  /**
   * Update an API route mapping
   */
  update: (id: string, data: Partial<CreateContextApiRoute>): DbContextApiRoute | null => {
    const db = getDatabase();

    const updates: string[] = [];
    const params: (string | null)[] = [];

    if (data.context_id !== undefined) {
      updates.push('context_id = ?');
      params.push(data.context_id);
    }
    if (data.api_path !== undefined) {
      updates.push('api_path = ?');
      params.push(data.api_path);
    }
    if (data.http_methods !== undefined) {
      updates.push('http_methods = ?');
      params.push(data.http_methods);
    }
    if (data.layer !== undefined) {
      updates.push('layer = ?');
      params.push(data.layer);
    }

    if (updates.length === 0) {
      return contextApiRouteRepository.getById(id);
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE context_api_routes
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...params);

    return contextApiRouteRepository.getById(id);
  },

  /**
   * Delete an API route mapping
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_api_routes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all API route mappings for a context
   */
  deleteByContextId: (contextId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM context_api_routes WHERE context_id = ?');
    const result = stmt.run(contextId);
    return result.changes;
  },

  /**
   * Upsert an API route mapping (create or update)
   */
  upsert: (data: CreateContextApiRoute): DbContextApiRoute => {
    const db = getDatabase();

    // Check if mapping already exists
    const existingStmt = db.prepare('SELECT * FROM context_api_routes WHERE context_id = ? AND api_path = ?');
    const existing = existingStmt.get(data.context_id, data.api_path) as DbContextApiRoute | undefined;

    if (existing) {
      return contextApiRouteRepository.update(existing.id, data) || existing;
    }

    return contextApiRouteRepository.create(data);
  },

  /**
   * Bulk create API route mappings
   */
  bulkCreate: (routes: CreateContextApiRoute[]): DbContextApiRoute[] => {
    const db = getDatabase();
    const results: DbContextApiRoute[] = [];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO context_api_routes (id, context_id, api_path, http_methods, layer, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    for (const route of routes) {
      const id = uuidv4();
      insertStmt.run(
        id,
        route.context_id,
        route.api_path,
        route.http_methods || 'GET',
        route.layer || 'server',
        now
      );

      const created = contextApiRouteRepository.getById(id);
      if (created) {
        results.push(created);
      }
    }

    return results;
  },

  /**
   * Get API routes grouped by context
   */
  getGroupedByContext: (): Map<string, DbContextApiRoute[]> => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM context_api_routes ORDER BY context_id, api_path');
    const routes = stmt.all() as DbContextApiRoute[];

    const grouped = new Map<string, DbContextApiRoute[]>();
    for (const route of routes) {
      const existing = grouped.get(route.context_id) || [];
      existing.push(route);
      grouped.set(route.context_id, existing);
    }

    return grouped;
  },

  /**
   * Count routes by layer
   */
  countByLayer: (): Record<string, number> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT layer, COUNT(*) as count
      FROM context_api_routes
      GROUP BY layer
    `);
    const results = stmt.all() as Array<{ layer: string; count: number }>;

    const counts: Record<string, number> = {};
    for (const row of results) {
      counts[row.layer] = row.count;
    }
    return counts;
  }
};
