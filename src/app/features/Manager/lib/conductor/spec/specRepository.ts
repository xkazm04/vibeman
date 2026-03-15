/**
 * Spec Repository — DB access layer for conductor_specs table
 *
 * Provides CRUD operations for spec metadata persistence.
 * Uses getDatabase() synchronous API matching conductorRepository patterns.
 */

import { getDatabase } from '@/app/db/connection';
import type { AffectedFiles, SpecComplexity, SpecMetadata } from '../types';

// ============================================================================
// Types
// ============================================================================

/** Raw DB row shape for conductor_specs */
interface SpecRow {
  id: string;
  run_id: string;
  backlog_item_id: string;
  sequence_number: number;
  title: string;
  slug: string;
  affected_files: string;
  complexity: string;
  status: string;
  created_at: string;
}

// ============================================================================
// Helpers
// ============================================================================

function parseSpecRow(row: SpecRow): SpecMetadata {
  let affectedFiles: AffectedFiles;
  try {
    affectedFiles = JSON.parse(row.affected_files);
  } catch {
    affectedFiles = { create: [], modify: [], delete: [] };
  }

  return {
    id: row.id,
    runId: row.run_id,
    backlogItemId: row.backlog_item_id,
    sequenceNumber: row.sequence_number,
    title: row.title,
    slug: row.slug,
    affectedFiles,
    complexity: row.complexity as SpecComplexity,
    status: row.status as SpecMetadata['status'],
    createdAt: row.created_at,
  };
}

// ============================================================================
// Repository
// ============================================================================

export const specRepository = {
  /**
   * Insert a new spec and return the persisted metadata.
   */
  createSpec(params: {
    id: string;
    runId: string;
    backlogItemId: string;
    sequenceNumber: number;
    title: string;
    slug: string;
    affectedFiles: AffectedFiles;
    complexity: SpecComplexity;
  }): SpecMetadata {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO conductor_specs
        (id, run_id, backlog_item_id, sequence_number, title, slug, affected_files, complexity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.id,
      params.runId,
      params.backlogItemId,
      params.sequenceNumber,
      params.title,
      params.slug,
      JSON.stringify(params.affectedFiles),
      params.complexity,
    );

    return this.getSpecById(params.id)!;
  },

  /**
   * Get all specs for a run, ordered by sequence_number ASC.
   */
  getSpecsByRunId(runId: string): SpecMetadata[] {
    const db = getDatabase();
    const rows = db.prepare(
      'SELECT * FROM conductor_specs WHERE run_id = ? ORDER BY sequence_number ASC'
    ).all(runId) as SpecRow[];

    return rows.map(parseSpecRow);
  },

  /**
   * Get a single spec by ID.
   */
  getSpecById(specId: string): SpecMetadata | null {
    const db = getDatabase();
    const row = db.prepare(
      'SELECT * FROM conductor_specs WHERE id = ?'
    ).get(specId) as SpecRow | undefined;

    if (!row) return null;
    return parseSpecRow(row);
  },

  /**
   * Update the status of a spec.
   */
  updateSpecStatus(specId: string, status: 'pending' | 'executing' | 'completed' | 'failed'): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE conductor_specs SET status = ? WHERE id = ?'
    ).run(status, specId);
  },

  /**
   * Delete all specs for a run (cleanup after completion).
   */
  deleteSpecsByRunId(runId: string): void {
    const db = getDatabase();
    db.prepare(
      'DELETE FROM conductor_specs WHERE run_id = ?'
    ).run(runId);
  },

  /**
   * Record the on-disk file path for a spec (set after the file is written).
   */
  updateFilePath(specId: string, filePath: string): void {
    const db = getDatabase();
    db.prepare(
      'UPDATE conductor_specs SET file_path = ? WHERE id = ?'
    ).run(filePath, specId);
  },

  /**
   * Return distinct run IDs that have spec rows AND whose parent run is in a
   * terminal state (completed / failed / interrupted) with completed_at older
   * than `ttlHours` ago.  Used by the purge flow.
   */
  getTerminalRunIdsOlderThan(ttlHours: number): string[] {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - ttlHours * 60 * 60 * 1000).toISOString();
    const rows = db.prepare(`
      SELECT DISTINCT cs.run_id
      FROM conductor_specs cs
      JOIN conductor_runs cr ON cr.id = cs.run_id
      WHERE cr.status IN ('completed', 'failed', 'interrupted')
        AND cr.completed_at < ?
    `).all(cutoff) as Array<{ run_id: string }>;
    return rows.map((r) => r.run_id);
  },
};
