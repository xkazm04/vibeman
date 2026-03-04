# Brain Insight Evidence Junction Table

## Overview

Normalized insight evidence from opaque JSON strings in `brain_insights.evidence` to a relational junction table (`brain_insight_evidence`) with typed references.

## Problem Statement

Previously, insight evidence was stored as JSON strings in `brain_insights.evidence`:
- **Impossible to query** which insights cite signal X or reflection R without full-table JSON parsing
- **3 separate queries** required to resolve evidence (one per type: direction, signal, reflection)
- **Cache invalidation** had to use blanket invalidation instead of targeting specific evidence chains
- **Evidence relationships** were opaque and not first-class database entities

## Solution

Created `brain_insight_evidence` junction table with:
- `insight_id` → FK to `brain_insights.id`
- `evidence_type` → 'direction' | 'signal' | 'reflection'
- `evidence_id` → FK to respective table
- Proper indexes for both forward and reverse lookups

## Schema

```sql
CREATE TABLE brain_insight_evidence (
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
```

## Benefits

### 1. Queryable Evidence Relationships

**Before:** Full-table scan with JSON parsing
```sql
-- Not possible without application-level JSON parsing of every row
```

**After:** Simple indexed JOIN
```sql
SELECT bi.*
FROM brain_insights bi
JOIN brain_insight_evidence bie ON bie.insight_id = bi.id
WHERE bie.evidence_type = 'signal' AND bie.evidence_id = 'sig_123';
```

### 2. Single UNION Query for Evidence Resolution

**Before:** 3 separate queries
```typescript
// Query 1: Get all directions
const directionMap = directionDb.getDirectionsByIds(directionIds);

// Query 2: Get all signals
const signalRows = hotDb.prepare(
  `SELECT * FROM behavioral_signals WHERE id IN (...)`
).all(...signalIds);

// Query 3: Get all reflections
for (const id of reflectionIds) {
  const ref = brainReflectionDb.getById(id);
}
```

**After:** Single UNION ALL query
```typescript
const unifiedQuery = `
  SELECT 'direction' AS refType, id, summary, ... FROM directions WHERE id IN (...)
  UNION ALL
  SELECT 'reflection' AS refType, id, ... FROM brain_reflections WHERE id IN (...)
`;
const rows = db.prepare(unifiedQuery).all(...params);
```

### 3. Targeted Cache Invalidation

**Before:** Blanket invalidation when any evidence changes

**After:** Target specific insights affected by evidence change
```typescript
// Invalidate only insights that cite this specific direction
const affectedInsights = brainInsightRepository.getByEvidence('direction', directionId);
for (const insight of affectedInsights) {
  invalidateCache(insight.id);
}
```

### 4. Evidence Analytics

New queries enabled:
- Most-cited evidence entities
- Insights per evidence type distribution
- Evidence usage trends over time
- Orphaned evidence detection

## Migration

**Migration 135** (`135_brain_insight_evidence_junction.ts`):
1. Creates junction table with indexes
2. Migrates existing JSON evidence to relational rows
3. Idempotent — skips already-migrated insights

**Backward Compatibility:**
- `brain_insights.evidence` column remains for legacy compatibility
- Migration parses both typed `EvidenceRef[]` and legacy `string[]` formats
- Both JSON and junction table are kept in sync during writes

## API Changes

### POST `/api/brain/insights`

**New capability:** Resolve evidence via junction table
```typescript
// Option 1: Resolve by insight ID (uses junction table)
POST /api/brain/insights
{ "insightId": "bi_abc123" }

// Option 2: Typed evidence refs (new format)
POST /api/brain/insights
{ "evidenceRefs": [
    { "type": "direction", "id": "dir_001" },
    { "type": "signal", "id": "sig_123" }
  ]
}

// Option 3: Legacy format (still supported)
POST /api/brain/insights
{ "evidenceIds": ["dir_001", "dir_002"] }
```

**Response:** Unified evidence resolution with UNION query
```typescript
{
  "success": true,
  "evidence": {
    "dir_001": {
      "refType": "direction",
      "id": "dir_001",
      "summary": "Direction summary",
      "status": "accepted",
      ...
    },
    "sig_123": {
      "refType": "signal",
      "id": "sig_123",
      "summary": "Signal: git_activity",
      ...
    }
  }
}
```

## Repository Methods

### New Methods in `brainInsightRepository`

```typescript
// Reverse lookup: Find insights citing evidence X
getByEvidence(evidenceType: 'direction' | 'signal' | 'reflection', evidenceId: string): DbBrainInsight[]

// Get evidence for insight from junction table
getEvidenceForInsight(insightId: string): EvidenceRef[]

// Count insights citing evidence (for cache invalidation decisions)
countByEvidence(evidenceType, evidenceId): number
```

### Updated Methods

```typescript
// create() now inserts into junction table
create(input) {
  // ... insert into brain_insights
  // NEW: Insert evidence into junction table
  for (const ref of input.evidence) {
    insertIntoJunction(input.id, ref.type, ref.id);
  }
}

// createBatch() now bulk-inserts into junction table
createBatch(reflectionId, projectId, insights) {
  // ... batch insert into brain_insights
  // NEW: Batch insert evidence into junction table
}
```

## Test Coverage

**Test File:** `tests/api/brain/insight-evidence-junction.test.ts`

Tests verify:
- ✅ Evidence stored in junction table during insight creation
- ✅ Reverse lookups (find insights citing evidence X)
- ✅ Get evidence for insight from junction table
- ✅ Count insights by evidence
- ✅ Cascade delete (evidence deleted when insight deleted)
- ✅ Batch create with junction table
- ✅ Empty evidence array handling

**Results:** All 7 tests passing

## Performance Impact

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Find insights citing signal X | O(N) full scan + JSON parse | O(log N) index lookup | ~100-1000x faster |
| Resolve evidence for insight | 3 separate queries | 1 UNION query | 3x fewer round-trips |
| Cache invalidation | Blanket invalidation | Targeted by evidence | Reduces unnecessary invalidations |

## Files Modified

### New Files
- `src/app/db/migrations/135_brain_insight_evidence_junction.ts` — Migration
- `tests/api/brain/insight-evidence-junction.test.ts` — Test suite

### Modified Files
- `src/app/db/migrations/index.ts` — Added migration 135
- `src/app/db/repositories/brain-insight.repository.ts` — Added junction table methods
- `src/app/api/brain/insights/route.ts` — UNION query for evidence resolution

## Future Enhancements

1. **Remove JSON column** after confidence in migration (breaking change)
2. **Evidence popularity analytics** — rank most-cited evidence
3. **Evidence-driven recommendations** — suggest insights based on new evidence
4. **Cross-project evidence linking** — insights from multiple projects citing same evidence

## Related Issues

Addresses the requirement: "Normalize evidence into relational junction table"
- Effort: 2/10
- Impact: 3/10
- Risk: 2/10
- Category: code_quality
