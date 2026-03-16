# API Error Codes Reference

All API routes return errors in a consistent envelope:

```json
{
  "success": false,
  "error": "Human-readable message (sanitized)",
  "code": "MACHINE_READABLE_CODE",
  "details": "Optional extra context (sanitized, 4xx only)",
  "fieldErrors": { "field": "per-field message" },
  "userMessage": "Actionable suggestion from ErrorClassifier",
  "recoveryActions": ["RETRY", "CHECK_INPUT"]
}
```

## Error Codes

### Validation Errors (HTTP 400)

| Code | Description | When |
|------|-------------|------|
| `MISSING_REQUIRED_FIELD` | A required field was not provided | POST/PATCH body missing a required key |
| `INVALID_FIELD_VALUE` | A field value failed validation | Value out of range, wrong type, etc. |
| `INVALID_ACTION` | Unrecognized action parameter | Unknown `action` in request body |
| `INVALID_FORMAT` | Malformed request structure | JSON parse error, wrong content-type |
| `VALIDATION_ERROR` | General validation failure | Zod schema validation, business rules |

### Authentication & Authorization (HTTP 401, 403)

| Code | Description | When |
|------|-------------|------|
| `UNAUTHORIZED` | No valid authentication | Missing or expired auth token |
| `FORBIDDEN` | Authenticated but not permitted | Insufficient permissions for operation |
| `INVALID_TOKEN` | Token present but invalid | Malformed or revoked token |

### Resource Errors (HTTP 404, 409)

| Code | Description | When |
|------|-------------|------|
| `RESOURCE_NOT_FOUND` | Requested entity does not exist | GET/PATCH/DELETE by ID, no match |
| `RESOURCE_ALREADY_EXISTS` | Entity with same key exists | Duplicate creation attempt |
| `RESOURCE_CONFLICT` | Operation conflicts with current state | Concurrent modification, state machine violation |

### Database Errors (HTTP 500)

| Code | Description | When |
|------|-------------|------|
| `DATABASE_ERROR` | Generic database operation failure | Query execution error |
| `DATABASE_CONNECTION_ERROR` | Cannot connect to database | SQLite file locked, missing, corrupted |
| `QUERY_ERROR` | Specific query failed | Constraint violation, syntax error |

> **Note**: Database error details are **never** sent to the client. The client receives a generic message; full details are logged server-side only.

### External Service Errors (HTTP 502, 503)

| Code | Description | When |
|------|-------------|------|
| `LLM_ERROR` | AI/LLM provider returned an error | Claude, Gemini, Copilot API failures |
| `EXTERNAL_SERVICE_ERROR` | Third-party service call failed | Supabase, external APIs |
| `SERVICE_UNAVAILABLE` | Service is temporarily down | Provider timeout, maintenance |

### File System Errors (HTTP 400, 404, 500)

| Code | Description | When |
|------|-------------|------|
| `FILE_NOT_FOUND` | File does not exist (404) | Requirement file, config file missing |
| `FILE_READ_ERROR` | Cannot read file (500) | Permission denied, encoding error |
| `FILE_WRITE_ERROR` | Cannot write file (500) | Disk full, permission denied |
| `INVALID_PATH` | Path validation failed (400) | Path traversal attempt, invalid characters |

### Operation Errors (HTTP 500)

| Code | Description | When |
|------|-------------|------|
| `OPERATION_FAILED` | Named operation did not complete | Pipeline step, batch process failure |
| `INTERNAL_ERROR` | Unexpected internal error | Unclassified server-side exception |
| `UNKNOWN_ERROR` | Completely unrecognized error | Non-Error thrown, null/undefined caught |

### Rate Limiting (HTTP 429)

| Code | Description | When |
|------|-------------|------|
| `RATE_LIMITED` | Too many requests | Per-endpoint rate limit exceeded |
| `QUOTA_EXCEEDED` | Usage quota exhausted | LLM token budget, API call limits |

## Security Policy

1. **5xx errors** — The client **never** sees internal details (stack traces, file paths, SQL, connection strings). A generic message is returned; full details are logged server-side via `logger.error()`.

2. **4xx errors** — Messages describe the input problem but are still run through `sanitizeErrorMessage()` to strip any accidentally-included paths, tokens, or stack traces.

3. **Sensitive field redaction** — The `logger` automatically redacts fields matching `password`, `secret`, `token`, `apikey`, `authorization`, etc.

4. **Error sanitization patterns** — See `src/lib/api-helpers/errorSanitizer.ts` for the full list of patterns that are stripped before any error reaches the client.

## Usage in Route Handlers

### Option 1: `withApiErrorHandler` (recommended for new routes)

Wraps a handler with a try/catch that feeds through the centralized error system:

```typescript
import { withApiErrorHandler } from '@/lib/api-errors';

async function handleGet(request: NextRequest) {
  const data = db.getAll();
  return NextResponse.json({ data });
}

export const GET = withApiErrorHandler(handleGet, 'myResource.GET');
```

### Option 2: `withRequestLogging` (adds structured logging)

Same error boundary plus request/response logging with timing:

```typescript
import { withRequestLogging } from '@/app/api/middleware';

export const GET = withRequestLogging(handleGet, '/api/my-resource');
```

### Option 3: Manual try/catch with `handleApiError`

For routes that need custom error logic before the catch-all:

```typescript
import { handleApiError, ApiErrorCode } from '@/lib/api-errors';

export async function GET(request: NextRequest) {
  try {
    // ... route logic
  } catch (error) {
    return handleApiError(error, 'myResource.GET', ApiErrorCode.DATABASE_ERROR);
  }
}
```

### Throwing typed errors

```typescript
import { ApiError, ApiErrorCode } from '@/lib/api-errors';

throw new ApiError(
  ApiErrorCode.RESOURCE_NOT_FOUND,
  'Project not found',
  { projectId: id }
);
```

### Helper shortcuts

```typescript
import {
  notFoundError,
  validationError,
  databaseError,
  invalidActionError,
  operationFailedError,
  validateRequiredFields,
} from '@/lib/api-errors';

// Quick 404
return notFoundError('Project');

// Validate required body fields (returns null if OK, or 400 response)
const err = validateRequiredFields(body, ['projectId', 'name']);
if (err) return err;
```

## ErrorClassifier Integration

When `handleApiError` catches an unknown error, it uses `ErrorClassifier.classify()` to:

1. Detect the error type (network, timeout, auth, rate-limit, etc.)
2. Generate a user-friendly `userMessage`
3. Suggest `recoveryActions` the client can display (RETRY, CHECK_INPUT, etc.)

These are included in the response envelope so frontends can show actionable guidance.
