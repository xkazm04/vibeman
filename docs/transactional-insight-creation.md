# Transactional Batch Insight Creation with FK Checks

## Overview
Enhanced the brain insight creation methods (`create` and `createBatch`) in `brain-insight.repository.ts` to use database transactions and validate foreign key references before inserting evidence junction rows.

## Problem
Previously, `createBatch()` inserted insights in one loop and evidence junction rows in a second loop without a wrapping transaction. If a junction insert failed midway:
- Orphaned insights existed without their evidence relationships
- No rollback occurred, leaving the database in an inconsistent state
- Evidence references (signal IDs, direction IDs, reflection IDs) were never validated for existence
- Dangling foreign keys could be inserted

## Solution

### 1. Transactional Wrapping
Both `create()` and `createBatch()` now wrap all database operations in a `db.transaction()` call:
- If any operation fails, the entire transaction rolls back
- No partial state is committed to the database
- Atomicity is guaranteed for insight + evidence creation

### 2. Foreign Key Validation
Before inserting each evidence reference into the junction table:
- **Direction evidence**: Validated via `SELECT 1 FROM directions WHERE id = ?`
- **Reflection evidence**: Validated via `SELECT 1 FROM brain_reflections WHERE id = ?`
- **Signal evidence**: Currently skipped (signals don't have a persistent table yet)

If a reference doesn't exist, an error is thrown and the transaction rolls back.

### 3. Error Messages
Descriptive error messages include:
- Evidence type (direction/signal/reflection)
- Evidence ID that failed validation
- Insight title for context

Example: `Evidence reference direction:dir_nonexistent does not exist for insight "Invalid Pattern"`

## Code Changes

### Files Modified
- `src/app/db/repositories/brain-insight.repository.ts`
  - Updated `create()` method with transaction and FK validation
  - Updated `createBatch()` method with transaction and FK validation
- `tests/api/brain/insight-evidence-junction.test.ts`
  - Added test for FK validation failure and rollback
  - Added test for batch rollback when any evidence FK fails
  - Added test for reflection evidence validation
  - Added test for signal evidence (no validation)
  - Fixed existing test to create required reflection

### Implementation Pattern
```typescript
const transaction = db.transaction(() => {
  // Insert insight
  stmt.run(...);

  // Validate and insert evidence
  const directionExistsStmt = db.prepare('SELECT 1 FROM directions WHERE id = ? LIMIT 1');
  const reflectionExistsStmt = db.prepare('SELECT 1 FROM brain_reflections WHERE id = ? LIMIT 1');

  for (const ref of evidence) {
    let exists = false;
    if (ref.type === 'direction') {
      exists = !!directionExistsStmt.get(ref.id);
    } else if (ref.type === 'reflection') {
      exists = !!reflectionExistsStmt.get(ref.id);
    } else if (ref.type === 'signal') {
      exists = true; // Skip validation for signals
    }

    if (!exists) {
      throw new Error(`Evidence reference ${ref.type}:${ref.id} does not exist`);
    }

    evidenceStmt.run(id, ref.type, ref.id, now);
  }
});

transaction(); // Execute with automatic rollback on error
```

## Test Coverage

### New Tests
1. **FK Validation Failure**: Verifies single insight creation rolls back on invalid evidence
2. **Batch Rollback**: Verifies entire batch rolls back if any insight has invalid evidence
3. **Reflection Validation**: Tests both valid and invalid reflection evidence references
4. **Signal Pass-through**: Confirms signals bypass FK validation (no persistent table)

### Test Results
All 11 tests pass:
- ✓ should create insight with evidence in junction table
- ✓ should find insights by evidence (reverse lookup)
- ✓ should get evidence for insight from junction table
- ✓ should count insights by evidence
- ✓ should cascade delete evidence when insight is deleted
- ✓ should support batch create with junction table
- ✓ should handle empty evidence array
- ✓ **should rollback transaction when evidence FK validation fails** (new)
- ✓ **should rollback batch transaction when any evidence FK fails** (new)
- ✓ **should validate reflection evidence references** (new)
- ✓ **should allow signal evidence without FK validation** (new)

## Impact

### Benefits
- **Data Integrity**: No orphaned insights or dangling evidence references
- **Atomicity**: All-or-nothing guarantee for insight creation
- **Error Detection**: Catch invalid evidence references at write-time, not read-time
- **Consistency**: Database state remains consistent even on partial failures

### Performance
- Minimal overhead: FK validation queries are simple indexed lookups
- Transaction overhead is negligible for batch sizes typical in reflection completion
- Prepared statements reused across evidence references

### Risk
- **Low Risk**: Changes are additive (validation + transactions)
- Existing valid data creation paths unaffected
- Invalid data that previously slipped through will now be caught (desired behavior)

## Future Considerations

### Signal Table
When a persistent `behavioral_signals` or similar table is added:
1. Update the FK validation in `create()` and `createBatch()`
2. Add validation query: `SELECT 1 FROM behavioral_signals WHERE id = ?`
3. Remove the `ref.type === 'signal'` bypass logic
4. Update tests to create signal fixtures

### Performance Optimization
If batch sizes grow significantly (>1000 insights):
- Consider using a single prepared statement for all FK checks
- Batch validate all evidence IDs before insertion
- Use `WHERE id IN (?, ?, ...)` for bulk validation

## Related Files
- `src/app/db/migrations/135_brain_insight_evidence_junction.ts` - Junction table schema
- `src/app/db/models/brain.types.ts` - Type definitions for EvidenceRef
- `src/app/api/brain/insights/route.ts` - API endpoint using repository
