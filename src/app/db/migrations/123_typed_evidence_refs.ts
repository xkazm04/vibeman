/**
 * Migration 123: Typed Evidence Refs
 *
 * Converts existing evidence arrays from plain string IDs (e.g. ["dir_abc", "sig_xyz"])
 * to typed objects (e.g. [{ type: "direction", id: "dir_abc" }, { type: "signal", id: "sig_xyz" }]).
 *
 * Classification is based on ID prefix:
 *   dir_ → direction
 *   sig_ → signal
 *   ref_ / br_  → reflection
 *   anything else → direction (legacy default)
 */

import { getConnection } from '../drivers';
import type { MigrationLogger } from './migration.utils';
import { safeMigration } from './migration.utils';

interface EvidenceRef {
  type: 'direction' | 'signal' | 'reflection';
  id: string;
}

function classifyId(id: string): EvidenceRef {
  if (typeof id !== 'string') return { type: 'direction', id: String(id) };
  if (id.startsWith('sig_')) return { type: 'signal', id };
  if (id.startsWith('ref_') || id.startsWith('br_')) return { type: 'reflection', id };
  // direction IDs (dir_*) and any legacy/unknown IDs default to direction
  return { type: 'direction', id };
}

export function migrate123TypedEvidenceRefs(db: ReturnType<typeof getConnection>, logger: MigrationLogger) {
  safeMigration('123_typed_evidence_refs', () => {
    // Read all insights with non-empty evidence
    const rows = db.prepare(
      `SELECT id, evidence FROM brain_insights WHERE evidence IS NOT NULL AND evidence != '[]'`
    ).all() as Array<{ id: string; evidence: string }>;

    if (rows.length === 0) {
      logger.info('No evidence rows to migrate');
      return;
    }

    const update = db.prepare('UPDATE brain_insights SET evidence = ? WHERE id = ?');
    let migrated = 0;

    for (const row of rows) {
      let parsed: unknown[];
      try {
        parsed = JSON.parse(row.evidence);
      } catch {
        continue;
      }

      if (!Array.isArray(parsed) || parsed.length === 0) continue;

      // Skip if already migrated (first element is an object with a 'type' field)
      if (typeof parsed[0] === 'object' && parsed[0] !== null && 'type' in parsed[0]) continue;

      const typed: EvidenceRef[] = parsed.map((item) => classifyId(String(item)));
      update.run(JSON.stringify(typed), row.id);
      migrated++;
    }

    logger.info(`Migrated ${migrated} insight evidence arrays to typed refs`);
  });
}
