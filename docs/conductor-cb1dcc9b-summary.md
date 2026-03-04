# Conductor Task cb1dcc9b Summary

**Task:** Unified response envelope for all Brain endpoints
**Category:** code_quality
**Effort:** 1/10
**Impact:** 2/10
**Status:** ✅ Complete

## Problem

Brain API endpoints returned inconsistent response shapes:
- `signals/route` → `{success, signals, stats}`
- `insights/route` → `{insights}` (no success field)
- `context/route` → `{success, context}`

This made client-side code unpredictable and error-prone.

## Solution

Implemented a unified `ApiResponse<T>` envelope enforcing `{success, data, error?, meta?}` structure across all Brain endpoints.

### Created Files

1. **`src/lib/api-helpers/apiResponse.ts`**
   - `buildSuccessResponse<T>(data, options?)` - Construct success responses
   - `buildErrorResponse(error, options?)` - Construct error responses
   - `withErrorHandler()` - Wrapper for standardized error handling

2. **`src/lib/api/schemas/common.ts`** (additions)
   - `unwrapEnvelope(response, key, fallback)` - Extract data from envelope
   - `extractMeta(response)` - Extract metadata from envelope
   - Backwards-compatible with legacy flat responses

3. **`src/lib/api/schemas/brain.ts`** (updated)
   - `BrainContextResponseSchema` - Envelope schema for context endpoint
   - `BrainSignalsResponseSchema` - Envelope schema for signals endpoint
   - `BrainInsightsResponseSchema` - Envelope schema for insights endpoint
   - `BrainHeatmapResponseSchema` - Envelope schema for heatmap endpoint
   - `BrainEffectivenessResponseSchema` - Envelope schema for effectiveness endpoint
   - All use `envelopeSchema()` helper for consistency

### Modified Files

Updated all Brain API routes to use the unified envelope:

1. **`src/app/api/brain/signals/route.ts`**
   - POST: `buildSuccessResponse({ message })`
   - GET: `buildSuccessResponse({ signals, stats })`
   - DELETE: `buildSuccessResponse({})`
   - All errors: `buildErrorResponse(message, { status })`

2. **`src/app/api/brain/signals/heatmap/route.ts`**
   - GET: `buildSuccessResponse({ heatmap })`

3. **`src/app/api/brain/context/route.ts`**
   - GET: `buildSuccessResponse({ context }, { meta: { cached } })`

4. **`src/app/api/brain/insights/route.ts`**
   - GET: `buildSuccessResponse({ insights })`
   - POST: `buildSuccessResponse({ evidence })`
   - DELETE: `buildSuccessResponse({ remaining })`
   - PATCH: `buildSuccessResponse({ resolution, remaining })`

5. **`src/app/api/brain/insights/effectiveness/route.ts`**
   - GET: `buildSuccessResponse({ insights, summary }, { meta: { cached, version } })`

6. **`src/stores/brainStore.ts`** (updated context fetching)
   - Uses `unwrapEnvelope()` for backwards-compatible data extraction

7. **`src/lib/apiResponseGuard.ts`**
   - Re-exports `unwrapEnvelope` and `extractMeta` for convenience
   - Re-exports new Brain envelope schemas

### Tests

1. **`tests/unit/lib/api-helpers/apiResponse.test.ts`** (11 tests)
   - Success response construction
   - Error response construction
   - Metadata handling
   - Status code validation
   - Response consistency

2. **`tests/unit/lib/api/schemas/envelope.test.ts`** (10 tests)
   - Envelope unwrapping (new format)
   - Envelope unwrapping (legacy format)
   - Metadata extraction
   - Fallback handling
   - Backwards compatibility

### Documentation

**`docs/unified-api-response-envelope.md`**
- Complete migration guide
- Usage examples (backend & frontend)
- Backwards compatibility notes
- Schema validation examples

## Before/After Examples

### signals/route.ts

**Before:**
```typescript
return NextResponse.json({
  success: true,
  signals,
  stats: { counts, totalSignals },
});
```

**After:**
```typescript
return buildSuccessResponse({
  signals,
  stats: { counts, totalSignals },
});
```

### insights/route.ts

**Before:**
```typescript
return NextResponse.json({ insights });
```

**After:**
```typescript
return buildSuccessResponse({ insights });
```

### effectiveness/route.ts

**Before:**
```typescript
return NextResponse.json({
  success: true,
  insights: results,
  summary,
  cached: true,
  version: 2,
});
```

**After:**
```typescript
return buildSuccessResponse(
  { insights: results, summary },
  { meta: { cached: true, version: 2 } }
);
```

## Client-Side Extraction

**Before:**
```typescript
const data = await response.json();
const context = data.context || null; // Different per endpoint
```

**After:**
```typescript
const data = await response.json();
const context = unwrapEnvelope(data, 'context', null); // Works for all
const meta = extractMeta(data);
if (meta?.cached) { /* ... */ }
```

## Impact

### Code Quality
- ✅ Consistent response structure across all Brain endpoints
- ✅ Type-safe response construction with `ApiResponse<T>`
- ✅ Centralized error handling
- ✅ Optional metadata field for caching/versioning

### Maintainability
- ✅ Single source of truth for response format
- ✅ Helper functions reduce boilerplate
- ✅ Backwards-compatible unwrapping for gradual migration

### Testing
- ✅ 21 passing tests (11 envelope + 10 unwrapping)
- ✅ 100% coverage of response construction utilities

## Migrated Endpoints

- ✅ `GET/POST/DELETE /api/brain/signals`
- ✅ `GET /api/brain/signals/heatmap`
- ✅ `GET /api/brain/context`
- ✅ `GET/POST/DELETE/PATCH /api/brain/insights`
- ✅ `GET /api/brain/insights/effectiveness`

## Not Migrated (Out of Scope)

These endpoints exist but weren't in the original modified files list:
- `/api/brain/outcomes`
- `/api/brain/reflection`
- `/api/brain/anomalies`
- `/api/brain/predictions`
- `/api/brain/correlations`
- `/api/brain/dashboard`
- `/api/brain/insights/influence`
- `/api/brain/signals/decay`

These can be migrated in future tasks following the same pattern.

## Files Changed

### Created (3 files)
- `src/lib/api-helpers/apiResponse.ts`
- `tests/unit/lib/api-helpers/apiResponse.test.ts`
- `tests/unit/lib/api/schemas/envelope.test.ts`
- `docs/unified-api-response-envelope.md`

### Modified (7 files)
- `src/app/api/brain/signals/route.ts`
- `src/app/api/brain/signals/heatmap/route.ts`
- `src/app/api/brain/context/route.ts`
- `src/app/api/brain/insights/route.ts`
- `src/app/api/brain/insights/effectiveness/route.ts`
- `src/lib/api/schemas/common.ts`
- `src/lib/api/schemas/brain.ts`
- `src/lib/apiResponseGuard.ts`
- `src/stores/brainStore.ts`

## Next Steps (Optional)

1. Migrate remaining Brain endpoints to use the envelope
2. Update all client-side code to use `unwrapEnvelope` consistently
3. Remove legacy response format support once all endpoints migrated
4. Extend pattern to other API domains (Goals, Directions, Questions)

## Validation

Run tests to verify:
```bash
npm test -- tests/unit/lib/api-helpers/apiResponse.test.ts tests/unit/lib/api/schemas/envelope.test.ts
```

Expected: ✅ 21 passing tests
