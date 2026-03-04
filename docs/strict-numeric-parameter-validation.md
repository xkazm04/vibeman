# Strict Numeric Parameter Validation with Bounds

## Summary
Created a centralized `parseQueryInt()` utility that validates and clamps numeric query parameters across all Brain API endpoints. This prevents NaN propagation into SQL queries and ensures consistent parameter handling.

## Problem
Multiple Brain endpoints were using `parseInt()` on query params without proper validation:
- No NaN checks - invalid inputs could propagate into SQL queries
- Inconsistent bounds handling - some routes clamped, others didn't
- Scattered validation logic - duplicated code across routes
- Poor error messages - generic 500 errors instead of specific 400s

Example before:
```typescript
const limit = parseInt(searchParams.get('limit') || '50', 10);
// If limit is 'abc', becomes NaN and breaks SQL query
```

## Solution
Created `parseQueryInt()` utility in `src/lib/api-helpers/parseQueryInt.ts`:

```typescript
parseQueryInt(value: string | null, options: {
  min?: number;
  max?: number;
  default?: number;
  paramName?: string;
}): number
```

Features:
- ✅ NaN detection with descriptive errors
- ✅ Min/max bounds clamping
- ✅ Default value support
- ✅ Custom parameter names in error messages
- ✅ Throws errors for 400 responses (invalid input)
- ✅ Returns validated numbers for safe SQL usage

## Routes Updated

### 1. `/api/brain/signals` (GET)
**Parameter:** `limit`
- Default: 50
- Range: 1-1000
- Before: `parseInt(searchParams.get('limit') || '50', 10)`
- After: `parseQueryInt(searchParams.get('limit'), { default: 50, min: 1, max: 1000 })`

### 2. `/api/brain/insights/effectiveness` (GET)
**Parameters:** `windowDays`, `minDirections`
- `windowDays`: default 90, range 1-365
- `minDirections`: default 3, range 1-100
- Before: `parseInt(searchParams.get('windowDays') || '90', 10)` (no bounds)
- After: `parseQueryInt(searchParams.get('windowDays'), { default: 90, min: 1, max: 365 })`

### 3. `/api/brain/context` (GET)
**Parameter:** `windowDays`
- Default: 7
- Range: 1-90
- Before: `parseInt(searchParams.get('windowDays') || '7', 10)`
- After: `parseQueryInt(searchParams.get('windowDays'), { default: 7, min: 1, max: 90 })`

### 4. `/api/brain/signals/heatmap` (GET)
**Parameter:** `days`
- Default: 90
- Range: 1-365
- Before: `Math.min(parseInt(searchParams.get('days') || '90', 10), 365)` (partial clamping)
- After: `parseQueryInt(searchParams.get('days'), { default: 90, min: 1, max: 365 })`

## Routes Already Correct

### `/api/brain/signals/decay` (POST)
Already implements proper validation with manual clamping:
```typescript
const clampedFactor = Math.max(0.8, Math.min(0.99, Number(decayFactor)));
const clampedRetention = Math.max(7, Math.min(90, Math.floor(Number(retentionDays))));
```
Note: Uses POST body params, not query params, so parseQueryInt doesn't apply.

## Testing
Created comprehensive test suite in `tests/unit/parseQueryInt.test.ts`:
- 34 tests covering all edge cases
- All tests passing ✅
- Coverage includes:
  - Basic parsing
  - Default values
  - Required parameters
  - NaN handling
  - Bounds clamping (min, max, both)
  - Real-world use cases
  - Edge cases (large numbers, zeros, partial numeric strings)
  - Error message validation

## Benefits
1. **Security:** Prevents invalid input from reaching SQL layer
2. **Consistency:** All Brain endpoints use same validation logic
3. **UX:** Clear 400 errors with descriptive messages instead of 500s
4. **Maintainability:** Single source of truth for numeric param validation
5. **Type Safety:** Returns guaranteed valid numbers

## Error Handling Examples

Before:
```typescript
// GET /api/brain/signals?limit=invalid
// Returns 500: SQL error or undefined behavior
```

After:
```typescript
// GET /api/brain/signals?limit=invalid
// Returns 400: { error: "limit must be a valid integer, got: invalid" }

// GET /api/brain/signals?limit=9999
// Silently clamps to 1000, continues processing
```

## Migration Pattern
If other endpoints need numeric validation:

```typescript
import { parseQueryInt } from '@/lib/api-helpers/parseQueryInt';

// Replace this:
const limit = parseInt(searchParams.get('limit') || '50', 10);

// With this:
const limit = parseQueryInt(searchParams.get('limit'), {
  default: 50,
  min: 1,
  max: 100,
  paramName: 'limit', // for better error messages
});
```

## Files Modified
- `src/lib/api-helpers/parseQueryInt.ts` (new)
- `src/app/api/brain/signals/route.ts`
- `src/app/api/brain/insights/effectiveness/route.ts`
- `src/app/api/brain/context/route.ts`
- `src/app/api/brain/signals/heatmap/route.ts`
- `tests/unit/parseQueryInt.test.ts` (new)

## Implementation Details

### Clamping Behavior
Values are clamped silently (no errors):
- Below min → clamped to min
- Above max → clamped to max
- Within range → unchanged
- Default values also clamped

### Error Behavior
Throws errors (for 400 responses):
- Null/empty + no default → "parameter is required"
- Invalid string (NaN) → "parameter must be a valid integer, got: {value}"

### Edge Cases Handled
- Leading/trailing whitespace: trimmed automatically
- Decimals: truncated (parseInt behavior)
- Partial numeric strings: parsed (parseInt behavior, e.g., '42abc' → 42)
- Very large/small numbers: clamped to bounds
- Zero bounds: supported
- Min equals max: supported (always returns that value)

## Category
Code Quality - Risk reduction, maintainability improvement

## Effort vs Impact
- Effort: 1/10 (simple utility, straightforward refactor)
- Impact: 2/10 (prevents edge case bugs, improves error messages)
- Risk: 0/10 (pure improvement, backward compatible behavior)
