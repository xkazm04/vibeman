/**
 * Migration 135: Brain Insight Evidence Junction Table
 *
 * Normalizes insight evidence from opaque JSON strings in brain_insights.evidence
 * to a relational junction table (brain_insight_evidence) with typed references.
 *
 * Benefits:
 * - Query which insights cite signal X or reflection R without full-table JSON parsing
 * - Single JOIN replaces 3 separate queries (direction, signal, reflection lookups)
 * - Cache invalidation can target specific evidence chains
 * - Evidence relationships become first-class, indexed, and queryable
 *
 * Schema:
 *   brain_insight_evidence (
 *     id INTEGER PRIMARY KEY AUTOINCREMENT,
 *     insight_id TEXT NOT NULL → brain_insights.id,
 *     evidence_type TEXT NOT NULL → 'direction' | 'signal' | 'reflection',
 *     evidence_id TEXT NOT NULL → FK to respective table,
 *     created_at TEXT NOT NULL
 *   )
 *
 * Indexes:
 *   - (insight_id) → fast lookup of all evidence for an insight
 *   - (evidence_type, evidence_id) → fast reverse lookup (find insights citing X)
 *   - (insight_id, evidence_type) → optimize type-specific queries per insight
 */

import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate135BrainInsightEvidenceJunction(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('brainInsightEvidenceJunction', () => {
    const created = createTableIfNotExists(db, 'brain_insight_evidence', `
      CREATE TABLE IF NOT EXISTS brain_insight_evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_id TEXT NOT NULL,
        evidence_type TEXT NOT NULL CHECK(evidence_type IN ('direction', 'signal', 'reflection')),
        evidence_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (insight_id) REFERENCES brain_insights(id) ON DELETE CASCADE
      );

      CREATE INDEX idx_bie_insight ON brain_insight_evidence(insight_id);
      CREATE INDEX idx_bie_evidence ON brain_insight_evidence(evidence_type, evidence_id);
      CREATE INDEX idx_bie_insight_type ON brain_insight_evidence(insight_id, evidence_type);
    `);

    if (created) {
      logger?.info?.('Created brain_insight_evidence junction table with indexes');
      migrateExistingEvidence(db, logger);
    }
  }, logger);
}

/**
 * Migrate existing evidence from brain_insights.evidence (JSON) to junction table.
 * Idempotent — skips insights that already have migrated evidence rows.
 */
function migrateExistingEvidence(db: DbConnection, logger?: MigrationLogger): void {
  try {
    const rows = db.prepare(`
      SELECT id, evidence, created_at
      FROM brain_insights
      WHERE evidence IS NOT NULL AND evidence != '[]'
      ORDER BY created_at ASC
    `).all() as Array<{
      id: string;
      evidence: string;
      created_at: string;
    }>;

    if (rows.length === 0) {
      logger?.info?.('No evidence to migrate');
      return;
    }

    let totalMigrated = 0;
    const insertStmt = db.prepare(`
      INSERT INTO brain_insight_evidence (insight_id, evidence_type, evidence_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const row of rows) {
      // Check if already migrated
      const existing = db.prepare(
        'SELECT COUNT(*) as count FROM brain_insight_evidence WHERE insight_id = ?'
      ).get(row.id) as { count: number };

      if (existing.count > 0) continue;

      try {
        const evidenceRefs = parseEvidence(row.evidence);
        if (evidenceRefs.length === 0) continue;

        // Insert each evidence reference as a junction row
        for (const ref of evidenceRefs) {
          insertStmt.run(row.id, ref.type, ref.id, row.created_at);
          totalMigrated++;
        }
      } catch (err) {
        logger?.error?.(`Failed to migrate evidence for insight ${row.id}: ${err}`);
      }
    }

    if (totalMigrated > 0) {
      logger?.info?.(`Migrated ${totalMigrated} evidence references from JSON to junction table`);
    }
  } catch (err) {
    logger?.error?.(`Failed to migrate existing evidence: ${err}`);
  }
}

/**
 * Parse evidence JSON, handling both legacy string[] and typed EvidenceRef[] formats.
 * Matches parseEvidence from brain-insight.repository.ts
 */
interface EvidenceRef {
  type: 'direction' | 'signal' | 'reflection';
  id: string;
}

function parseEvidence(raw: string): EvidenceRef[] {
  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    // Already typed
    if (typeof item === 'object' && item !== null && 'type' in item && 'id' in item) {
      return item as EvidenceRef;
    }
    // Legacy plain string → classify by prefix
    const id = String(item);
    if (id.startsWith('sig_')) return { type: 'signal' as const, id };
    if (id.startsWith('ref_') || id.startsWith('br_')) return { type: 'reflection' as const, id };
    return { type: 'direction' as const, id };
  });
}
