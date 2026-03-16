/**
 * @module database
 *
 * Unified database access facade for Vibeman.
 *
 * Re-exports the application database (goals/tasks) and project database
 * through a single import path. Both databases use configurable paths
 * via environment variables:
 *
 *   - `DB_PATH` — main application database (default: `<cwd>/database/goals.db`)
 *   - `PROJECTS_DB_PATH` — project registry database (default: `<cwd>/database/projects.db`)
 *
 * @example
 * ```ts
 * import { getDatabase, closeDatabase, projectDb } from '@/lib/database';
 *
 * // Application database (better-sqlite3 instance)
 * const db = getDatabase();
 * const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
 *
 * // Project registry
 * const projects = projectDb.projects.getAll();
 * ```
 */

/**
 * Application database — goals, ideas, questions, sessions, etc.
 *
 * `getDatabase()` returns a singleton `better-sqlite3` instance.
 * `closeDatabase()` releases the connection and file lock.
 *
 * @see {@link @/app/db/connection} for connection implementation.
 */
export { getDatabase, closeDatabase } from '@/app/db/connection';

/**
 * Project registry database — project CRUD with port/workspace management.
 *
 * @see {@link @/lib/project_database} for the full API surface.
 */
export { projectDb } from '@/lib/project_database';
export type { DbProject } from '@/lib/project_database';
