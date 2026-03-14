/**
 * Discovered Template Repository
 * Handles all database operations for discovered and user-created templates
 */

import { getDatabase } from '../connection';
import { DbDiscoveredTemplate, TemplateSource } from '../models/types';
import { generateId, getCurrentTimestamp, withTableCheck } from './repository.utils';
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
  getBySourcePath: (sourcePath: string): DbDiscoveredTemplate[] => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE source_project_path = ?
      ORDER BY template_name
    `);
    return stmt.all(sourcePath) as DbDiscoveredTemplate[];
  }),

  /**
   * Get template by template_id (across all sources)
   */
  getByTemplateId: (templateId: string): DbDiscoveredTemplate | null => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE template_id = ?
      LIMIT 1
    `);
    const result = stmt.get(templateId) as DbDiscoveredTemplate | undefined;
    return result || null;
  }),

  /**
   * Get template by primary key id
   */
  getById: (id: string): DbDiscoveredTemplate | null => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM discovered_templates WHERE id = ?');
    const result = stmt.get(id) as DbDiscoveredTemplate | undefined;
    return result || null;
  }),

  /**
   * Get all discovered templates
   */
  getAll: (): DbDiscoveredTemplate[] => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      ORDER BY source_project_path, template_name
    `);
    return stmt.all() as DbDiscoveredTemplate[];
  }),

  /**
   * Get templates by source type (scanned or manual)
   */
  getBySource: (source: TemplateSource): DbDiscoveredTemplate[] => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM discovered_templates
      WHERE source = ?
      ORDER BY template_name
    `);
    return stmt.all(source) as DbDiscoveredTemplate[];
  }),

  /**
   * Upsert template with change detection
   * Returns the template and action taken (created | updated | unchanged)
   */
  upsert: (
    template: Omit<DbDiscoveredTemplate, 'id' | 'discovered_at' | 'updated_at' | 'status' | 'parse_error'>
  ): { template: DbDiscoveredTemplate; action: 'created' | 'updated' | 'unchanged' } => withTableCheck('template discovery', () => {
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
      // Template exists - check if content or category changed
      const contentChanged = existing.content_hash !== contentHash;
      const categoryChanged = existing.category !== template.category;

      if (!contentChanged && !categoryChanged) {
        // Content unchanged, but reset status to active if it was stale/error
        if (existing.status !== 'active' || existing.parse_error) {
          const resetStmt = db.prepare(`
            UPDATE discovered_templates
            SET status = 'active', parse_error = NULL, updated_at = ?
            WHERE id = ?
          `);
          resetStmt.run(now, existing.id);
        }
        return { template: existing, action: 'unchanged' };
      }

      // Something changed - update
      const updateStmt = db.prepare(`
        UPDATE discovered_templates
        SET file_path = ?,
            template_name = ?,
            description = ?,
            category = ?,
            config_json = ?,
            content_hash = ?,
            status = 'active',
            parse_error = NULL,
            updated_at = ?
        WHERE id = ?
      `);

      updateStmt.run(
        template.file_path,
        template.template_name,
        template.description,
        template.category,
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
        template_name, description, category, config_json, content_hash,
        source, discovered_at, updated_at, status, parse_error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL)
    `);

    insertStmt.run(
      id,
      template.source_project_path,
      template.file_path,
      template.template_id,
      template.template_name,
      template.description,
      template.category,
      template.config_json,
      contentHash,
      template.source || 'scanned',
      now,
      now
    );

    const created = discoveredTemplateRepository.getById(id)!;
    return { template: created, action: 'created' };
  }),

  /**
   * Batch upsert with aggregated results
   */
  upsertMany: (
    templates: Array<Omit<DbDiscoveredTemplate, 'id' | 'discovered_at' | 'updated_at' | 'status' | 'parse_error'>>
  ): { created: number; updated: number; unchanged: number } => withTableCheck('template discovery', () => {
    const results = { created: 0, updated: 0, unchanged: 0 };

    for (const template of templates) {
      const { action } = discoveredTemplateRepository.upsert(template);
      results[action]++;
    }

    return results;
  }),

  /**
   * Delete template by primary key id
   */
  delete: (id: string): boolean => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM discovered_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }),

  /**
   * Delete all templates for a source project path
   */
  deleteBySourcePath: (sourcePath: string): number => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM discovered_templates WHERE source_project_path = ?');
    const result = stmt.run(sourcePath);
    return result.changes;
  }),

  /**
   * Mark stale templates not in current template IDs list
   * Sets status to 'stale' instead of deleting, preserving history.
   * Safety guard: returns 0 if currentTemplateIds is empty (prevents mass marking on total parse failure).
   */
  markStale: (sourcePath: string, currentTemplateIds: string[]): number => withTableCheck('template discovery', () => {
    const db = getDatabase();

    if (currentTemplateIds.length === 0) {
      // Safety guard: do NOT mark all as stale on total parse failure
      return 0;
    }

    const now = getCurrentTimestamp();
    const placeholders = currentTemplateIds.map(() => '?').join(', ');
    const stmt = db.prepare(`
      UPDATE discovered_templates
      SET status = 'stale',
          updated_at = ?
      WHERE source_project_path = ?
        AND template_id NOT IN (${placeholders})
        AND status != 'stale'
    `);

    const result = stmt.run(now, sourcePath, ...currentTemplateIds);
    return result.changes;
  }),

  /**
   * Mark a specific template as having a parse error
   */
  markError: (sourcePath: string, templateId: string, errorMessage: string): void => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE discovered_templates
      SET status = 'error',
          parse_error = ?,
          updated_at = ?
      WHERE source_project_path = ? AND template_id = ?
    `);
    stmt.run(errorMessage, now, sourcePath, templateId);
  }),

  /**
   * Clear error state on a specific template, resetting to active
   */
  clearError: (sourcePath: string, templateId: string): void => withTableCheck('template discovery', () => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE discovered_templates
      SET status = 'active',
          parse_error = NULL,
          updated_at = ?
      WHERE source_project_path = ? AND template_id = ?
    `);
    stmt.run(now, sourcePath, templateId);
  }),

  /**
   * @deprecated Use markStale() instead. deleteStale destructively removes templates;
   * markStale preserves them with status='stale' for recovery.
   *
   * Delete stale templates not in current template IDs list
   * Useful after re-scanning a project to remove templates that no longer exist
   */
  deleteStale: (sourcePath: string, currentTemplateIds: string[]): number => withTableCheck('template discovery', () => {
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
  }),
};
