/**
 * Cross-Project Pattern Synthesis
 *
 * Promotes insights that recur across 2+ projects into global patterns.
 * Uses the canonical_id system from InsightDeduplicator to match insights
 * across project boundaries without fragile title matching.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '@/app/db/connection';

// ============================================================================
// Types
// ============================================================================

export interface CrossProjectPattern {
  id: string;
  patternType: 'insight_promotion' | 'architecture_drift' | 'template';
  title: string;
  description: string;
  sourceProjectIds: string[];
  confidence: number;
  occurrenceCount: number;
  evidence: EvidenceRef[];
  status: 'active' | 'superseded' | 'dismissed';
  promotedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface EvidenceRef {
  insightId?: string;
  projectId: string;
  type: string;
  summary: string;
}

interface RecurringInsightGroup {
  canonicalId: string;
  insightType: string;
  title: string;
  description: string;
  projectIds: string[];
  avgConfidence: number;
  insights: Array<{
    id: string;
    project_id: string;
    confidence: number;
    title: string;
  }>;
}

// ============================================================================
// Pattern Promotion
// ============================================================================

/**
 * Find insights that appear in 2+ projects (matched by canonical_id)
 * and promote them to global cross-project patterns.
 */
export function promoteRecurringInsights(minOccurrences: number = 2): CrossProjectPattern[] {
  const db = getDatabase();
  const recurring = findRecurringInsights(db, minOccurrences);
  const promoted: CrossProjectPattern[] = [];

  for (const group of recurring) {
    const existing = findExistingPattern(db, group.canonicalId);

    if (existing) {
      // Update existing pattern with new evidence
      updatePattern(db, existing.id, group);
    } else {
      // Create new global pattern
      const pattern = createPattern(db, group);
      promoted.push(pattern);
    }
  }

  return promoted;
}

/**
 * Query global patterns with optional filters.
 */
export function getGlobalPatterns(options?: {
  type?: string;
  minConfidence?: number;
  status?: string;
  limit?: number;
}): CrossProjectPattern[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.type) {
    conditions.push('pattern_type = ?');
    params.push(options.type);
  }
  if (options?.minConfidence !== undefined) {
    conditions.push('confidence >= ?');
    params.push(options.minConfidence);
  }
  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  } else {
    conditions.push("status = 'active'");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options?.limit || 50;

  const rows = db.prepare(`
    SELECT * FROM cross_project_patterns
    ${where}
    ORDER BY confidence DESC, occurrence_count DESC
    LIMIT ?
  `).all(...params, limit) as DbCrossProjectPattern[];

  return rows.map(parsePattern);
}

/**
 * Dismiss a pattern (user doesn't find it valuable).
 */
export function dismissPattern(patternId: string): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE cross_project_patterns
    SET status = 'dismissed', updated_at = datetime('now')
    WHERE id = ?
  `).run(patternId);
}

// ============================================================================
// Internal Helpers
// ============================================================================

function findRecurringInsights(
  db: ReturnType<typeof getDatabase>,
  minOccurrences: number
): RecurringInsightGroup[] {
  // Group insights by canonical_id across all projects
  // Only consider non-pruned insights with confidence >= 0.5
  const rows = db.prepare(`
    SELECT
      canonical_id,
      type,
      GROUP_CONCAT(DISTINCT project_id) as project_ids,
      COUNT(DISTINCT project_id) as project_count,
      AVG(confidence) as avg_confidence,
      MIN(title) as title,
      MIN(description) as description
    FROM brain_insights
    WHERE canonical_id IS NOT NULL
      AND auto_pruned = 0
      AND confidence >= 0.5
    GROUP BY canonical_id
    HAVING COUNT(DISTINCT project_id) >= ?
    ORDER BY avg_confidence DESC
    LIMIT 100
  `).all(minOccurrences) as Array<{
    canonical_id: string;
    type: string;
    project_ids: string;
    project_count: number;
    avg_confidence: number;
    title: string;
    description: string;
  }>;

  return rows.map(row => {
    const projectIds = row.project_ids.split(',');

    // Get individual insight references for evidence
    const insights = db.prepare(`
      SELECT id, project_id, confidence, title
      FROM brain_insights
      WHERE canonical_id = ?
        AND auto_pruned = 0
      ORDER BY confidence DESC
      LIMIT 10
    `).all(row.canonical_id) as Array<{
      id: string;
      project_id: string;
      confidence: number;
      title: string;
    }>;

    return {
      canonicalId: row.canonical_id,
      insightType: row.type,
      title: row.title,
      description: row.description,
      projectIds,
      avgConfidence: row.avg_confidence,
      insights,
    };
  });
}

function findExistingPattern(
  db: ReturnType<typeof getDatabase>,
  canonicalId: string
): DbCrossProjectPattern | null {
  return db.prepare(`
    SELECT * FROM cross_project_patterns
    WHERE json_extract(metadata, '$.canonical_id') = ?
      AND status = 'active'
    LIMIT 1
  `).get(canonicalId) as DbCrossProjectPattern | null;
}

function createPattern(
  db: ReturnType<typeof getDatabase>,
  group: RecurringInsightGroup
): CrossProjectPattern {
  const id = uuidv4();
  const now = new Date().toISOString();

  const evidence: EvidenceRef[] = group.insights.map(ins => ({
    insightId: ins.id,
    projectId: ins.project_id,
    type: group.insightType,
    summary: ins.title,
  }));

  const metadata = {
    canonical_id: group.canonicalId,
    insight_type: group.insightType,
  };

  db.prepare(`
    INSERT INTO cross_project_patterns (
      id, pattern_type, title, description, source_project_ids,
      confidence, occurrence_count, evidence, metadata,
      status, promoted_at, last_seen_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    'insight_promotion',
    group.title,
    group.description,
    JSON.stringify(group.projectIds),
    Math.min(group.avgConfidence * 1.1, 1.0), // slight boost for cross-project validation
    group.projectIds.length,
    JSON.stringify(evidence),
    JSON.stringify(metadata),
    'active',
    now,
    now,
    now,
    now,
  );

  return {
    id,
    patternType: 'insight_promotion',
    title: group.title,
    description: group.description,
    sourceProjectIds: group.projectIds,
    confidence: Math.min(group.avgConfidence * 1.1, 1.0),
    occurrenceCount: group.projectIds.length,
    evidence,
    status: 'active',
    promotedAt: now,
    lastSeenAt: now,
    createdAt: now,
  };
}

function updatePattern(
  db: ReturnType<typeof getDatabase>,
  patternId: string,
  group: RecurringInsightGroup
): void {
  const now = new Date().toISOString();

  const newEvidence: EvidenceRef[] = group.insights.map(ins => ({
    insightId: ins.id,
    projectId: ins.project_id,
    type: group.insightType,
    summary: ins.title,
  }));

  db.prepare(`
    UPDATE cross_project_patterns
    SET
      source_project_ids = ?,
      confidence = ?,
      occurrence_count = ?,
      evidence = ?,
      last_seen_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    JSON.stringify(group.projectIds),
    Math.min(group.avgConfidence * 1.1, 1.0),
    group.projectIds.length,
    JSON.stringify(newEvidence),
    now,
    now,
    patternId,
  );
}

// ============================================================================
// DB Row Type & Parser
// ============================================================================

interface DbCrossProjectPattern {
  id: string;
  pattern_type: string;
  title: string;
  description: string;
  source_project_ids: string;
  confidence: number;
  occurrence_count: number;
  evidence: string;
  metadata: string;
  status: string;
  promoted_at: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

function parsePattern(row: DbCrossProjectPattern): CrossProjectPattern {
  return {
    id: row.id,
    patternType: row.pattern_type as CrossProjectPattern['patternType'],
    title: row.title,
    description: row.description,
    sourceProjectIds: JSON.parse(row.source_project_ids || '[]'),
    confidence: row.confidence,
    occurrenceCount: row.occurrence_count,
    evidence: JSON.parse(row.evidence || '[]'),
    status: row.status as CrossProjectPattern['status'],
    promotedAt: row.promoted_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}
