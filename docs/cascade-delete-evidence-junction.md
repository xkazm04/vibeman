# Migration 137: Cascade Delete Evidence Junction

## Problem
The `brain_insight_evidence` junction table had `ON DELETE CASCADE` for `insight_id` but no cascade handling when evidence sources (directions, reflections, signals) were deleted. This caused orphaned junction rows where `evidence_id` pointed to deleted records, creating ghost references in `getByEvidence()` and `countByEvidence()` queries.

## Solution
Added DELETE triggers on the source tables (`directions`, `brain_reflections`, `behavioral_signals`) to automatically cascade deletions to the junction table.

## Implementation

### Triggers Created
1. **trigger_delete_direction_evidence**: Deletes junction rows when a direction is deleted
2. **trigger_delete_reflection_evidence**: Deletes junction rows when a reflection is deleted
3. **trigger_delete_signal_evidence**: Deletes junction rows when a signal is deleted

### Migration Details
- **File**: `src/app/db/migrations/137_cascade_delete_evidence_junction.ts`
- **Idempotent**: Yes - checks if triggers exist before creating
- **Cleanup**: Automatically removes any existing orphaned evidence on migration
- **Test Coverage**:
  - 7 functional tests in `tests/unit/cascade-delete-evidence-junction.test.ts` ✅
  - 2 integration tests in `tests/unit/migration-integration.test.ts` ✅
  - All 9 tests passing

### Trigger Logic
```sql
-- Example: Direction deletion cascade
CREATE TRIGGER trigger_delete_direction_evidence
AFTER DELETE ON directions
BEGIN
  DELETE FROM brain_insight_evidence
  WHERE evidence_type = 'direction' AND evidence_id = OLD.id;
END;
```

## Impact
- **Effort**: 1/10 (straightforward trigger implementation)
- **Impact**: 2/10 (prevents data integrity issues)
- **Risk**: Low (triggers are well-tested, idempotent migration)

## Testing
All tests pass:
- ✅ Triggers are created correctly
- ✅ Direction deletion cascades to junction
- ✅ Reflection deletion cascades to junction
- ✅ Signal deletion cascades to junction
- ✅ Multiple evidence references handled correctly
- ✅ Existing orphaned data cleaned up on migration
- ✅ Insight deletion still works via FK constraint

## Related Files
- Migration: `src/app/db/migrations/137_cascade_delete_evidence_junction.ts`
- Tests: `tests/unit/cascade-delete-evidence-junction.test.ts`
- Junction table: Created in migration 135
- Evidence repositories: Use junction table for queries
