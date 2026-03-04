# Effectiveness Cache Invalidation Enhancement

## Overview
Extended the insight effectiveness cache invalidation system to trigger on all direction status changes (accepted, rejected, reverted, deleted), not just accepted. Added cache versioning to enable client-side staleness detection.

## Changes Made

### 1. Database Schema (Migration 136)
- **File**: `src/app/db/migrations/136_effectiveness_cache_version.ts`
- Added `version` column to `insight_effectiveness_cache` table
- Default value: 1
- Type: INTEGER NOT NULL

### 2. Cache Repository
- **File**: `src/app/db/repositories/insight-effectiveness-cache.repository.ts`
- Updated `CachedEffectivenessResult` interface to include `version: number`
- Modified `get()` to return version number from cache
- Modified `set()` to auto-increment version on every write
- Updated `invalidate()` comment to reflect all status changes trigger invalidation

### 3. API Route Updates

#### Accept Endpoint
- **File**: `src/app/api/directions/[id]/accept/route.ts`
- Already had cache invalidation on line 227
- No changes needed

#### Reject Endpoint
- **File**: `src/app/api/directions/[id]/route.ts`
- Added cache invalidation on rejection (line 118)
- Import added: `insightEffectivenessCache`

#### Delete Endpoint
- **File**: `src/app/api/directions/[id]/route.ts`
- Added cache invalidation on deletion (line 182)
- Fetches direction before deletion to access `project_id`

#### Outcome Revert Endpoint
- **File**: `src/app/api/directions/[id]/outcome/route.ts`
- Added cache invalidation on revert (line 207)
- Import added: `insightEffectivenessCache`

#### Pair Reject Endpoint
- **File**: `src/app/api/directions/pair/[pairId]/reject/route.ts`
- Added cache invalidation on pair rejection (line 50)
- Import added: `insightEffectivenessCache`

#### Pair Delete Endpoint
- **File**: `src/app/api/directions/pair/[pairId]/route.ts`
- Added cache invalidation on pair deletion (line 30)
- Import added: `insightEffectivenessCache`
- Fetches pair before deletion to access `project_id`

### 4. Effectiveness API Response
- **File**: `src/app/api/brain/insights/effectiveness/route.ts`
- Updated cache hit response to include `version` field (line 79)
- Updated fresh computation response to include `version` field (line 224)
- Retrieves version after writing to cache

## Migration Registration
- **File**: `src/app/db/migrations/index.ts`
- Added import for `migrate136EffectivenessCacheVersion`
- Registered migration call after migration 135

## Cache Invalidation Triggers

The cache is now invalidated on:
1. ✅ Direction accepted (already existed)
2. ✅ Direction rejected (NEW)
3. ✅ Direction deleted (NEW)
4. ✅ Direction outcome reverted (NEW)
5. ✅ Direction pair rejected (NEW)
6. ✅ Direction pair deleted (NEW)

## Client-Side Staleness Detection

Clients can now detect stale cached data by:
1. Storing the `version` number from the API response
2. On subsequent requests, comparing the returned `version` with the stored version
3. If `version` differs, the cache was invalidated and data is fresh
4. If `version` is the same, the client can use their local cache

Example:
```typescript
// First request
const response1 = await fetch('/api/brain/insights/effectiveness?projectId=123');
const { version: v1, insights, summary } = await response1.json();
// Store v1, insights, summary locally

// Later request
const response2 = await fetch('/api/brain/insights/effectiveness?projectId=123');
const { version: v2 } = await response2.json();
if (v2 !== v1) {
  // Cache was invalidated, use fresh data
} else {
  // Use local cached data
}
```

## Testing Considerations
- Cache version increments on every write (not just invalidation)
- All direction status transitions now properly invalidate cache
- Cache invalidation is non-critical (wrapped in try-catch) to prevent main flow breakage
- Migration handles existing cache entries with default version = 1

## Risk Assessment
- **Risk**: null/10 (as specified in requirement)
- All changes are additive (new column, new invalidation calls)
- Existing cache entries get default version = 1
- Cache invalidation failures are caught and ignored (non-critical)
- No breaking changes to existing API contracts
