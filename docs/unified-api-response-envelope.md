# Unified API Response Envelope

## Overview

All Brain API endpoints now use a standardized response structure to ensure consistency and predictability across the application. This eliminates the previous inconsistencies where different endpoints returned different response shapes.

## Response Structure

### Success Response

```typescript
{
  success: true,
  data: {
    // Endpoint-specific data
  },
  meta?: {
    // Optional metadata (e.g., cached: true, version: 2)
  }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message string",
  meta?: {
    // Optional metadata
  }
}
```

## Previous vs New Structure

### Before (Inconsistent)

**signals/route.ts:**
```typescript
{ success: true, signals: [...], stats: {...} }
```

**insights/route.ts:**
```typescript
{ insights: [...] }  // No success field
```

**context/route.ts:**
```typescript
{ success: true, context: {...} }
```

### After (Consistent)

**All endpoints:**
```typescript
{
  success: true,
  data: {
    signals: [...],
    stats: {...}
  }
}

{
  success: true,
  data: {
    insights: [...]
  }
}

{
  success: true,
  data: {
    context: {...}
  }
}
```

## Usage

### Backend (API Routes)

```typescript
import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';

// Success with data
return buildSuccessResponse({
  signals: [...],
  stats: { total: 10 }
});

// Success with metadata
return buildSuccessResponse(
  { insights: [...] },
  { meta: { cached: true, version: 2 } }
);

// Error response
return buildErrorResponse('projectId is required', { status: 400 });

// Error with metadata
return buildErrorResponse(
  'Validation failed',
  { status: 400, meta: { field: 'email' } }
);
```

### Frontend (Client Code)

```typescript
import { unwrapEnvelope, extractMeta } from '@/lib/api/schemas/common';

const response = await fetch('/api/brain/signals?projectId=123');
const json = await response.json();

// Extract data
const signals = unwrapEnvelope(json, 'signals', []);
const stats = unwrapEnvelope(json, 'stats', {});

// Extract metadata
const meta = extractMeta(json);
if (meta?.cached) {
  console.log('Using cached data, version:', meta.version);
}
```

### Backwards Compatibility

The `unwrapEnvelope` helper supports both the new envelope format and legacy flat responses:

```typescript
// New format
const newResponse = { success: true, data: { signals: [...] } };
unwrapEnvelope(newResponse, 'signals', []); // Works

// Legacy format (for gradual migration)
const legacyResponse = { signals: [...] };
unwrapEnvelope(legacyResponse, 'signals', []); // Also works
```

## Migrated Endpoints

The following Brain API endpoints now use the unified envelope:

- ✅ `GET/POST/DELETE /api/brain/signals`
- ✅ `GET /api/brain/signals/heatmap`
- ✅ `GET /api/brain/context`
- ✅ `GET/POST/DELETE/PATCH /api/brain/insights`
- ✅ `GET /api/brain/insights/effectiveness`

## Benefits

1. **Consistency**: All endpoints follow the same structure
2. **Type Safety**: Single `ApiResponse<T>` type for all responses
3. **Error Handling**: Standardized error format across all endpoints
4. **Metadata Support**: Optional metadata field for caching, versioning, etc.
5. **Backwards Compatible**: Unwrap helpers handle both old and new formats

## TypeScript Types

```typescript
// Core envelope type
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

// Example usage
type SignalsResponse = ApiResponse<{
  signals: BehavioralSignal[];
  stats: {
    counts: Record<string, number>;
    totalSignals: number;
  };
}>;
```

## Schema Validation

Updated Zod schemas ensure runtime validation matches the envelope structure:

```typescript
import { BrainSignalsResponseSchema } from '@/lib/api/schemas/brain';

const validated = parseApiResponse(rawJson, BrainSignalsResponseSchema, '/api/brain/signals');
const signals = unwrapEnvelope(validated, 'signals', []);
```

## Migration Guide

To migrate an existing endpoint:

1. Import helpers:
   ```typescript
   import { buildSuccessResponse, buildErrorResponse } from '@/lib/api-helpers/apiResponse';
   ```

2. Replace success responses:
   ```typescript
   // Before
   return NextResponse.json({ success: true, data: {...} });

   // After
   return buildSuccessResponse({ data: {...} });
   ```

3. Replace error responses:
   ```typescript
   // Before
   return NextResponse.json(
     { success: false, error: 'Message' },
     { status: 400 }
   );

   // After
   return buildErrorResponse('Message', { status: 400 });
   ```

4. Update client code to use `unwrapEnvelope` if needed for compatibility.

## Testing

Tests are located in:
- `tests/unit/lib/api-helpers/apiResponse.test.ts` - Envelope construction
- `tests/unit/lib/api/schemas/envelope.test.ts` - Unwrapping utilities

Run tests:
```bash
npm test -- tests/unit/lib/api-helpers/apiResponse.test.ts tests/unit/lib/api/schemas/envelope.test.ts
```
