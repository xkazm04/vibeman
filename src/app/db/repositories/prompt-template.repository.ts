/**
 * Prompt Template Repository
 * Handles all database operations for reusable prompt templates
 */

import { getDatabase } from '../connection';
import { DbPromptTemplate, PromptTemplateCategory } from '../models/types';
import { generateId, getCurrentTimestamp } from './repository.utils';

/**
 * Prompt Template Repository
 * Manages prompt template CRUD operations
 */
export const promptTemplateRepository = {
  /**
   * Get all templates for a project
   */
  getByProject: (projectId: string): DbPromptTemplate[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM prompt_templates
      WHERE project_id = ?
      ORDER BY category, name
    `);
    return stmt.all(projectId) as DbPromptTemplate[];
  },

  /**
   * Get templates by category for a project
   */
  getByCategory: (projectId: string, category: PromptTemplateCategory): DbPromptTemplate[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM prompt_templates
      WHERE project_id = ? AND category = ?
      ORDER BY name
    `);
    return stmt.all(projectId, category) as DbPromptTemplate[];
  },

  /**
   * Get template by ID
   */
  getById: (id: string): DbPromptTemplate | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM prompt_templates WHERE id = ?');
    const result = stmt.get(id) as DbPromptTemplate | undefined;
    return result || null;
  },

  /**
   * Get template by name for a project
   */
  getByName: (projectId: string, name: string): DbPromptTemplate | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM prompt_templates
      WHERE project_id = ? AND name = ?
    `);
    const result = stmt.get(projectId, name) as DbPromptTemplate | undefined;
    return result || null;
  },

  /**
   * Create a new template
   */
  create: (
    template: Omit<DbPromptTemplate, 'id' | 'created_at' | 'updated_at'>
  ): DbPromptTemplate => {
    const db = getDatabase();
    const id = generateId('tmpl');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO prompt_templates (
        id, project_id, name, description, category,
        template_content, variables, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      template.project_id,
      template.name,
      template.description,
      template.category,
      template.template_content,
      template.variables,
      now,
      now
    );

    return promptTemplateRepository.getById(id)!;
  },

  /**
   * Update a template
   */
  update: (
    id: string,
    updates: Partial<Omit<DbPromptTemplate, 'id' | 'project_id' | 'created_at'>>
  ): DbPromptTemplate | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | null)[] = [now];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.template_content !== undefined) {
      updateFields.push('template_content = ?');
      values.push(updates.template_content);
    }
    if (updates.variables !== undefined) {
      updateFields.push('variables = ?');
      values.push(updates.variables);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE prompt_templates
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);

    return promptTemplateRepository.getById(id);
  },

  /**
   * Delete a template
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM prompt_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all templates for a project
   */
  deleteByProject: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM prompt_templates WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  /**
   * Check if template name exists in project
   */
  nameExists: (projectId: string, name: string, excludeId?: string): boolean => {
    const db = getDatabase();
    if (excludeId) {
      const stmt = db.prepare(`
        SELECT 1 FROM prompt_templates
        WHERE project_id = ? AND name = ? AND id != ?
        LIMIT 1
      `);
      return !!stmt.get(projectId, name, excludeId);
    }
    const stmt = db.prepare(`
      SELECT 1 FROM prompt_templates
      WHERE project_id = ? AND name = ?
      LIMIT 1
    `);
    return !!stmt.get(projectId, name);
  },
};
