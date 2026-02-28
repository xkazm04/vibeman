/**
 * Migration 066: Cleanup Stale Context File Paths
 *
 * Removes non-existent file paths from context definitions.
 * This fixes issues where contexts reference files that have been
 * deleted or moved, causing scan failures or incomplete analysis.
 *
 * Known stale paths to remove:
 * - src/app/api/ideas/vibeman/route.ts (deleted)
 * - src/stores/context/ideaSlice.ts (deleted)
 */
import { getConnection } from '../drivers';
import * as fs from 'fs';
import * as path from 'path';

interface ContextRow {
  id: string;
  project_id: string;
  name: string;
  file_paths: string; // JSON string
}

/**
 * Check if a file exists at the given path
 */
function fileExists(projectPath: string, filePath: string): boolean {
  try {
    // File paths in context are relative to project root
    const absolutePath = path.join(projectPath, filePath);
    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
}

/**
 * Get project path from project_id
 * Returns null if project not found (contexts may reference deleted projects)
 */
function getProjectPath(db: ReturnType<typeof getConnection>, projectId: string): string | null {
  try {
    const stmt = db.prepare('SELECT path FROM projects WHERE id = ?');
    const result = stmt.get(projectId) as { path: string } | undefined;
    return result?.path ?? null;
  } catch {
    return null;
  }
}

export function migrate066CleanupStaleContextPaths() {
  const db = getConnection();

  try {
    // Get all contexts with file_paths
    const stmt = db.prepare(`
      SELECT id, project_id, name, file_paths
      FROM contexts
      WHERE file_paths IS NOT NULL AND file_paths != '[]'
    `);
    const contexts = stmt.all() as unknown as ContextRow[];

    let updatedCount = 0;
    let removedPathsCount = 0;

    for (const context of contexts) {
      try {
        const filePaths: string[] = JSON.parse(context.file_paths);
        if (!Array.isArray(filePaths) || filePaths.length === 0) continue;

        // Get project path to check if files exist
        const projectPath = getProjectPath(db, context.project_id);

        // Filter out non-existent paths
        const validPaths = filePaths.filter(filePath => {
          // If we can't determine project path, keep the path (be conservative)
          if (!projectPath) return true;

          const exists = fileExists(projectPath, filePath);
          if (!exists) {
            console.log(`  [066] Removing stale path from "${context.name}": ${filePath}`);
            removedPathsCount++;
          }
          return exists;
        });

        // Update context if any paths were removed
        if (validPaths.length < filePaths.length) {
          const updateStmt = db.prepare(`
            UPDATE contexts
            SET file_paths = ?, updated_at = ?
            WHERE id = ?
          `);
          updateStmt.run(JSON.stringify(validPaths), new Date().toISOString(), context.id);
          updatedCount++;
        }
      } catch (parseError) {
        // Skip contexts with invalid JSON in file_paths
        console.warn(`  [066] Skipping context ${context.id} - invalid file_paths JSON`);
      }
    }

    if (updatedCount > 0) {
      console.log(`  [066] Updated ${updatedCount} contexts, removed ${removedPathsCount} stale paths`);
    }
  } catch (error) {
    // Migration failures should not crash the app
    console.warn('[066] Context cleanup migration failed:', error);
  }
}
