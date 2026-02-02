/**
 * Discovered Template Repository
 * Handles all database operations for discovered templates from external projects
 */

import { getDatabase } from '../connection';
import { DbDiscoveredTemplate } from '../models/types';
import { generateId, getCurrentTimestamp } from './repository.utils';
import crypto from 'crypto';

/**
 * Calculate SHA-256 hash for change detection
 */
function calculateContentHash(configJson: string): string {
  return crypto.createHash('sha256').update(configJson).digest('hex');
}

/**
 * Discovered Template Repository
 * Manages discovered template CRUD operations with upsert and change detection
 */
export const discoveredTemplateRepository = {
  /**
   * Get all templates for a source project path
   */
  getBySourcePath: (sourcePath: string): DbDiscoveredTemplate[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE source_project_path = ?
      ORDER BY template_name
    `);
    return stmt.all(sourcePath) as DbDiscoveredTemplate[];
  },

  /**
   * Get template by template_id (across all sources)
   */
  getByTemplateId: (templateId: string): DbDiscoveredTemplate | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE template_id = ?
      LIMIT 1
    `);
    const result = stmt.get(templateId) as DbDiscoveredTemplate | undefined;
    return result || null;
  },

  /**
   * Get template by primary key id
   */
  getById: (id: string): DbDiscoveredTemplate | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM discovered_templates WHERE id = ?');
    const result = stmt.get(id) as DbDiscoveredTemplate | undefined;
    return result || null;
  },

  /**
   * Get all discovered templates
   */
  getAll: (): DbDiscoveredTemplate[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      ORDER BY source_project_path, template_name
    `);
    return stmt.all() as DbDiscoveredTemplate[];
  },

  /**
   * Upsert template with change detection
   * Returns the template and action taken (created | updated | unchanged)
   */
  upsert: (
    template: Omit<DbDiscoveredTemplate, 'id' | 'discovered_at' | 'updated_at'>
  ): { template: DbDiscoveredTemplate; action: 'created' | 'updated' | 'unchanged' } => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const contentHash = calculateContentHash(template.config_json);

    // Check if template exists by unique constraint (source_project_path, template_id)
    const existingStmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE source_project_path = ? AND template_id = ?
    `);
    const existing = existingStmt.get(
      template.source_project_path,
      template.template_id
    ) as DbDiscoveredTemplate | undefined;

    if (existing) {
      // Template exists - check content hash
      if (existing.content_hash === contentHash) {
        // Unchanged
        return { template: existing, action: 'unchanged' };
      }

      // Content changed - update
      const updateStmt = db.prepare(`
        UPDATE discovered_templates
        SET file_path = ?,
            template_name = ?,
            description = ?,
            config_json = ?,
            content_hash = ?,
            updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        template.file_path,
        template.template_name,
        template.description,
        template.config_json,
        contentHash,
        now,
        existing.id
      );

      const updated = discoveredTemplateRepository.getById(existing.id)!;
      return { template: updated, action: 'updated' };
    }

    // Template doesn't exist - create
    const id = generateId('dtmpl');
    const insertStmt = db.prepare(`
      INSERT INTO discovered_templates (
        id, source_project_path, file_path, template_id,
        template_name, description, config_json, content_hash,
        discovered_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      template.source_project_path,
      template.file_path,
      template.template_id,
      template.template_name,
      template.description,
      template.config_json,
      contentHash,
      now,
      now
    );

    const created = discoveredTemplateRepository.getById(id)!;
    return { template: created, action: 'created' };
  },

  /**
   * Batch upsert with aggregated results
   */
  upsertMany: (
    templates: Array<Omit<DbDiscoveredTemplate, 'id' | 'discovered_at' | 'updated_at'>>
  ): { created: number; updated: number; unchanged: number } => {
    const results = { created: 0, updated: 0, unchanged: 0 };

    for (const template of templates) {
      const { action } = discoveredTemplateRepository.upsert(template);
      results[action]++;
    }

    return results;
  },

  /**
   * Delete template by primary key id
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM discovered_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all templates for a source project path
   */
  deleteBySourcePath: (sourcePath: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM discovered_templates WHERE source_project_path = ?');
    const result = stmt.run(sourcePath);
    return result.changes;
  },

  /**
   * Delete stale templates not in current template IDs list
   * Useful after re-scanning a project to remove templates that no longer exist
   */
  deleteStale: (sourcePath: string, currentTemplateIds: string[]): number => {
    const db = getDatabase();

    if (currentTemplateIds.length === 0) {
      // If no current templates, delete all for this source
      return discoveredTemplateRepository.deleteBySourcePath(sourcePath);
    }

    // Build placeholders for IN clause
    const placeholders = currentTemplateIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      DELETE FROM discovered_templates
      WHERE source_project_path = ?
        AND template_id NOT IN (${placeholders})
    `);

    const result = stmt.run(sourcePath, ...currentTemplateIds);
    return result.changes;
  },
};
