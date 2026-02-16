/**
 * Migration 106: Cleanup Phantom Context File Paths
 *
 * Re-runs file path validation on all contexts to remove references
 * to files that no longer exist on disk. Migration 066 did this once,
 * but phantom paths were introduced after it ran (e.g. Manager/GoalHub/
 * and Manager/Standup/ files that were planned but never created).
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

function fileExists(projectPath: string, filePath: string): boolean {
  try {
    const absolutePath = path.join(projectPath, filePath);
    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
}

function getProjectPath(db: ReturnType<typeof getConnection>, projectId: string): string | null {
  try {
    const stmt = db.prepare('SELECT path FROM projects WHERE id = ?');
    const result = stmt.get(projectId) as { path: string } | undefined;
    return result?.path ?? null;
  } catch {
    return null;
  }
}

export function migrate106CleanupPhantomContextPaths() {
  const db = getConnection();

  try {
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

        const projectPath = getProjectPath(db, context.project_id);

        const validPaths = filePaths.filter(filePath => {
          if (!projectPath) return true;

          const exists = fileExists(projectPath, filePath);
          if (!exists) {
            console.log(`  [106] Removing phantom path from "${context.name}": ${filePath}`);
            removedPathsCount++;
          }
          return exists;
        });

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
        console.warn(`  [106] Skipping context ${context.id} - invalid file_paths JSON`);
      }
    }

    if (updatedCount > 0) {
      console.log(`  [106] Updated ${updatedCount} contexts, removed ${removedPathsCount} phantom paths`);
    }
  } catch (error) {
    console.warn('[106] Phantom context path cleanup failed:', error);
  }
}
