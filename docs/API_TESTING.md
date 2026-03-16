# API Endpoint Testing Guide

A hands-on guide for testing Vibeman's API endpoints locally using `curl`. Covers setup, request examples, expected responses, validation errors, and debugging.

---

## Prerequisites

### 1. Start the Dev Server

```bash
npm run dev
# Server starts on http://localhost:3000
```

All examples below assume the default base URL. Override with the `PORT` env var if needed.

### 2. Register a Project

Most endpoints require a `projectId`. Register a project first:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-project-1",
    "name": "my-test-app",
    "path": "/home/user/projects/my-test-app",
    "port": 3001,
    "type": "nextjs"
  }'
```

> **Note:** Replace `/home/user/projects/my-test-app` with an absolute path to a real directory on your machine. Structure scan endpoints verify the path exists on the filesystem.

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Minimum required for core API testing — **no API keys needed**. Endpoints that call LLMs (standup generation, brain reflection, conductor pipeline) require at least one provider key. See [ENVIRONMENT.md](ENVIRONMENT.md).

### 4. Shell Variables (Optional)

Set these to avoid repeating values in every curl command:

```bash
BASE=http://localhost:3000
PID=test-project-1
PPATH=/home/user/projects/my-test-app
```

---

## Synchronous Endpoints

These endpoints process the request and return results immediately.

### GET /api/projects — List Projects

```bash
curl $BASE/api/projects
```

**Expected response (200):**
```json
{
  "projects": [
    {
      "id": "test-project-1",
      "name": "my-test-app",
      "path": "/home/user/projects/my-test-app",
      "port": 3001,
      "type": "nextjs"
    }
  ]
}
```

---

### GET /api/goals — List Goals

```bash
curl "$BASE/api/goals?projectId=$PID"
```

**Expected response (200):**
```json
{ "goals": [] }
```

---

### POST /api/goals — Create a Goal

```bash
curl -X POST $BASE/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project-1",
    "title": "Add user authentication",
    "description": "Implement login and signup flow",
    "status": "open"
  }'
```

**Expected response (200):**
```json
{
  "goal": {
    "id": "generated-uuid",
    "project_id": "test-project-1",
    "title": "Add user authentication",
    "description": "Implement login and signup flow",
    "status": "open",
    "order_index": 0
  }
}
```

**Validation error — missing required field (422):**
```bash
curl -X POST $BASE/api/goals \
  -H "Content-Type: application/json" \
  -d '{ "title": "Missing projectId" }'
```
```json
{
  "success": false,
  "error": "Validation failed",
  "issues": [
    { "path": ["projectId"], "message": "Required" }
  ]
}
```

---

### GET /api/ideas — List Ideas

```bash
# All ideas for a project
curl "$BASE/api/ideas?projectId=$PID"

# Filter by status
curl "$BASE/api/ideas?projectId=$PID&status=pending"

# Limit results
curl "$BASE/api/ideas?projectId=$PID&limit=5"
```

**Expected response (200):**
```json
{
  "ideas": [],
  "pagination": { "appliedLimit": 50 }
}
```

**Validation error — invalid status value:**
```bash
curl "$BASE/api/ideas?projectId=$PID&status=invalid_status"
```
Returns 400 with an error message about invalid status.

---

### POST /api/ideas — Create an Idea

```bash
curl -X POST $BASE/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "00000000-0000-0000-0000-000000000001",
    "project_id": "test-project-1",
    "category": "refactor",
    "title": "Extract shared validation logic",
    "description": "Move duplicated validation into a shared module",
    "effort": 3,
    "impact": 7,
    "risk": 2
  }'
```

**Expected response (201):**
```json
{ "idea": { "id": "generated-uuid", "title": "Extract shared validation logic", "..." : "..." } }
```

**Validation errors:**

Title too long (max 500 chars):
```bash
curl -X POST $BASE/api/ideas \
  -H "Content-Type: application/json" \
  -d "{
    \"scan_id\": \"00000000-0000-0000-0000-000000000001\",
    \"project_id\": \"test-project-1\",
    \"category\": \"refactor\",
    \"title\": \"$(python3 -c 'print("x" * 501)')\"
  }"
```

Missing required fields:
```bash
curl -X POST $BASE/api/ideas \
  -H "Content-Type: application/json" \
  -d '{ "title": "Missing scan_id and project_id" }'
```
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fieldErrors": {
    "scan_id": "Must be a valid UUID",
    "project_id": "Must be a valid UUID",
    "category": "Invalid category"
  }
}
```

---

### POST /api/structure-scan — Full Structure Scan

Scans a project directory for structural violations and generates requirement files.

```bash
curl -X POST $BASE/api/structure-scan \
  -H "Content-Type: application/json" \
  -d "{
    \"projectPath\": \"$PPATH\",
    \"projectType\": \"nextjs\"
  }"
```

**Expected response — no violations (200):**
```json
{
  "success": true,
  "message": "No structure violations found",
  "violations": 0,
  "requirementFiles": []
}
```

**Expected response — violations found (200):**
```json
{
  "success": true,
  "message": "Found 3 violations, created 2 requirement files",
  "violations": 3,
  "requirementFiles": ["req-file-1.md", "req-file-2.md"]
}
```

**Error — path does not exist (404):**
```bash
curl -X POST $BASE/api/structure-scan \
  -H "Content-Type: application/json" \
  -d '{ "projectPath": "/nonexistent/path", "projectType": "nextjs" }'
```
```json
{ "error": "Project path does not exist" }
```

**Error — missing fields (400):**
```bash
curl -X POST $BASE/api/structure-scan \
  -H "Content-Type: application/json" \
  -d '{}'
```
```json
{ "error": "projectPath is required" }
```

---

### POST /api/structure-scan/analyze — Analyze Only (Step 1)

Returns violations without generating requirement files.

```bash
curl -X POST $BASE/api/structure-scan/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"projectPath\": \"$PPATH\",
    \"projectType\": \"nextjs\"
  }"
```

**Expected response (200):**
```json
{
  "success": true,
  "data": {
    "violations": [],
    "violationCount": 0,
    "message": "No violations found"
  }
}
```

**Validation error — invalid project type (400):**
```bash
curl -X POST $BASE/api/structure-scan/analyze \
  -H "Content-Type: application/json" \
  -d '{ "projectPath": "/some/path", "projectType": "invalid_type" }'
```
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fieldErrors": { "projectType": "Invalid project type" }
}
```

---

### POST /api/structure-scan/save — Save Requirements (Step 2)

Saves selected violations as requirement files.

```bash
curl -X POST $BASE/api/structure-scan/save \
  -H "Content-Type: application/json" \
  -d "{
    \"projectPath\": \"$PPATH\",
    \"projectId\": \"test-project-1\",
    \"violations\": [
      {
        \"rule\": \"missing-tests\",
        \"severity\": \"warning\",
        \"message\": \"No test files found\",
        \"path\": \"src/\"
      }
    ]
  }"
```

**Expected response (200):**
```json
{
  "success": true,
  "data": { "requirementFiles": ["req-missing-tests.md"] }
}
```

**Validation error — empty violations array (400):**
```bash
curl -X POST $BASE/api/structure-scan/save \
  -H "Content-Type: application/json" \
  -d '{ "projectPath": "/some/path", "projectId": "test-project-1", "violations": [] }'
```
```json
{
  "success": false,
  "error": "violations must be a non-empty array",
  "code": "VALIDATION_ERROR"
}
```

---

### GET /api/system-status — Health Check

```bash
# Full system status
curl $BASE/api/system-status

# Single component
curl "$BASE/api/system-status?component=database"
curl "$BASE/api/system-status?component=llm"
```

**Expected response (200):**
```json
{
  "summary": { "status": "operational", "uptime": 3600 },
  "database": { "status": "operational", "connectionTime": 2 },
  "llm": {
    "status": "operational",
    "providers": [
      { "name": "ollama", "configured": true, "available": true }
    ]
  }
}
```

---

### POST /api/llm/generate — LLM Prompt

Requires at least one LLM provider configured.

```bash
curl -X POST $BASE/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain WAL mode in SQLite in one sentence",
    "provider": "ollama",
    "maxTokens": 100
  }'
```

**Expected response (200):**
```json
{
  "success": true,
  "response": "WAL mode allows concurrent reads while a write is in progress...",
  "model": "qwen3.5:cloud",
  "usage": { "prompt_tokens": 12, "completion_tokens": 30 }
}
```

**Error — provider unavailable (502):**
```json
{
  "success": false,
  "error": "Connection refused",
  "code": "PROVIDER_UNAVAILABLE",
  "userMessage": "The LLM provider is not available",
  "recoveryActions": ["Check if Ollama is running", "Try a different provider"]
}
```

---

## Asynchronous / Long-Running Endpoints

These endpoints start background work and return immediately. Poll a status endpoint to track progress.

### POST /api/claude-code/execute — Execute a Requirement

Queues a requirement for execution via a CLI provider. Rate-limited to **5 requests/minute**.

```bash
curl -X POST $BASE/api/claude-code/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"projectPath\": \"$PPATH\",
    \"requirementName\": \"add-input-validation\",
    \"projectId\": \"test-project-1\",
    \"async\": true
  }"
```

**Expected response (200):**
```json
{
  "success": true,
  "executionId": "generated-uuid",
  "status": "queued"
}
```

**Synchronous mode** (blocks until complete):
```bash
curl -X POST $BASE/api/claude-code/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"projectPath\": \"$PPATH\",
    \"requirementName\": \"add-input-validation\",
    \"async\": false
  }"
```

**Validation error — missing required field (400):**
```bash
curl -X POST $BASE/api/claude-code/execute \
  -H "Content-Type: application/json" \
  -d '{ "projectPath": "/some/path" }'
```
```json
{
  "success": false,
  "error": "Missing required field: requirementName",
  "code": "MISSING_REQUIRED_FIELD",
  "errorId": "err_a1b2c3d4e5f6"
}
```

**Validation error — invalid JSON (400):**
```bash
curl -X POST $BASE/api/claude-code/execute \
  -H "Content-Type: application/json" \
  -d 'not json'
```
```json
{
  "success": false,
  "error": "Request body must be valid JSON",
  "code": "INVALID_FORMAT"
}
```

**Rate limit exceeded (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded (5/min). Try again in 12s.",
  "code": "RATE_LIMITED",
  "details": { "retryAfter": 12, "limit": "5/min" }
}
```

Check rate limit headers on every response:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1710585602
```

---

### POST /api/conductor/run — Start Pipeline

Starts, pauses, resumes, or stops a Conductor pipeline run.

**Start a new run:**
```bash
GOAL_ID=<goal-id-from-POST-goals>

curl -X POST $BASE/api/conductor/run \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"start\",
    \"projectId\": \"$PID\",
    \"goalId\": \"$GOAL_ID\"
  }"
```

**Expected response (200):**
```json
{ "success": true, "runId": "generated-uuid", "status": "running" }
```

**Pause a run:**
```bash
curl -X POST $BASE/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{ "action": "pause", "runId": "run-uuid" }'
```

**Stop a run:**
```bash
curl -X POST $BASE/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{ "action": "stop", "runId": "run-uuid" }'
```

**Validation error — missing goalId for start (400):**
```bash
curl -X POST $BASE/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{ "action": "start", "projectId": "test-project-1" }'
```
```json
{ "success": false, "error": "Conductor requires a goalId" }
```

**Validation error — invalid action (422):**
```bash
curl -X POST $BASE/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{ "action": "explode", "projectId": "test-project-1" }'
```
```json
{
  "success": false,
  "error": "Validation failed",
  "issues": [
    { "path": ["action"], "message": "Invalid enum value" }
  ]
}
```

---

### GET /api/conductor/status — Poll Run Status

```bash
# By run ID
curl "$BASE/api/conductor/status?runId=run-uuid"

# Latest run for a project
curl "$BASE/api/conductor/status?projectId=$PID"
```

**Expected response (200):**
```json
{
  "success": true,
  "run": {
    "id": "run-uuid",
    "projectId": "test-project-1",
    "goalId": "goal-uuid",
    "status": "running",
    "currentStage": "plan",
    "cycle": 1,
    "pipelineVersion": "3",
    "startedAt": "2025-01-15T10:00:00Z",
    "completedAt": null
  }
}
```

**No runs found (200):**
```json
{ "success": true, "run": null }
```

**Missing parameters (400):**
```bash
curl "$BASE/api/conductor/status"
```
```json
{ "success": false, "error": "Missing runId or projectId" }
```

---

### POST /api/conductor/refine-intent — Answer Intent Questions

When a pipeline pauses for intent refinement, submit answers to resume:

```bash
curl -X POST $BASE/api/conductor/refine-intent \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "run-uuid",
    "answers": [
      { "questionId": "q1", "answer": "Yes, implement OAuth2 flow" },
      { "questionId": "q2", "answer": "Use approach B with JWT tokens" }
    ]
  }'
```

**Expected response (200):**
```json
{ "success": true }
```

**Error — run not paused (409):**
```json
{ "success": false, "error": "Run is not paused" }
```

---

## Common Error Response Formats

### Standard Error Envelope

Most endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "errorId": "err_a1b2c3d4e5f6",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "context": { "method": "POST", "path": "/api/goals", "bodySize": 123 }
}
```

The `errorId` can be correlated with server logs for debugging.

### Field-Level Validation Errors

Endpoints using `validateRequestBody` return field-specific errors:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fieldErrors": {
    "projectPath": "Required field is missing",
    "projectType": "Invalid project type"
  }
}
```

### Zod Schema Validation Errors

Endpoints using `withValidation` (conductor, goals) return Zod-style issues:

```json
{
  "success": false,
  "error": "Validation failed",
  "issues": [
    { "path": ["action"], "message": "Invalid enum value. Expected 'start' | 'pause' | 'resume' | 'stop'" },
    { "path": ["projectId"], "message": "Required" }
  ]
}
```

### Legacy Error Format

Some older endpoints return a simpler format:

```json
{ "error": "Project path does not exist" }
```

---

## Common Failure Modes

### Invalid JSON Body

Forgetting the `Content-Type` header or sending malformed JSON:

```bash
# Missing Content-Type header
curl -X POST $BASE/api/goals -d '{"title":"test"}'

# Malformed JSON
curl -X POST $BASE/api/goals \
  -H "Content-Type: application/json" \
  -d '{title: missing quotes}'
```

Fix: Always include `-H "Content-Type: application/json"` and validate your JSON.

### Path Does Not Exist

Structure scan endpoints verify the project path exists on the filesystem:

```bash
curl -X POST $BASE/api/structure-scan \
  -H "Content-Type: application/json" \
  -d '{ "projectPath": "/does/not/exist", "projectType": "nextjs" }'
```
Returns 404: `{ "error": "Project path does not exist" }`

Fix: Use an absolute path to a directory that exists on your machine.

### Database Not Initialized

If the dev server hasn't started yet or the database file is missing:

```json
{
  "success": false,
  "error": "Database connection failed",
  "code": "DATABASE_CONNECTION_ERROR"
}
```

Fix: Start the dev server (`npm run dev`) — the database is created automatically on first boot.

### LLM Provider Not Available

Endpoints that call LLMs fail if no provider is configured or reachable:

```json
{
  "success": false,
  "error": "Connection refused",
  "code": "PROVIDER_UNAVAILABLE",
  "recoveryActions": ["Check if Ollama is running", "Try a different provider"]
}
```

Fix: Ensure at least one LLM provider is configured in `.env.local` and reachable.

### Rate Limiting

The `claude-code/execute` endpoint is rate-limited to 5 req/min. Rapid calls return 429:

```json
{
  "success": false,
  "error": "Rate limit exceeded (5/min). Try again in 12s.",
  "code": "RATE_LIMITED"
}
```

Fix: Wait for the `Retry-After` header value (in seconds) before retrying.

---

## Interpreting Logging Output

Set `LOG_LEVEL=debug` in `.env.local` for verbose server logs.

### Log Format

Server logs use structured output with these levels:

| Level | When Used |
|-------|-----------|
| `debug` | Request/response details, validation steps, query timing |
| `info` | Successful operations, pipeline stage transitions |
| `warn` | Recoverable errors, fallback activations, deprecation notices |
| `error` | Unrecoverable failures, stack traces |

### Correlating Errors

When an API returns an `errorId` (e.g., `err_a1b2c3d4e5f6`), search server logs for the same ID:

```bash
# If running in a terminal, search the output
npm run dev 2>&1 | grep "err_a1b2c3d4e5f6"
```

### Observability Dashboard

API call metrics are tracked automatically. View them:

```bash
curl $BASE/api/observability/stats
```

---

## Quick Validation Error Reference

| Endpoint | Invalid Input | Error Code | Status |
|----------|---------------|------------|--------|
| POST /api/goals | Missing `projectId` | Zod validation | 422 |
| POST /api/ideas | Invalid UUID for `scan_id` | `VALIDATION_ERROR` | 400 |
| POST /api/ideas | Title > 500 chars | `VALIDATION_ERROR` | 400 |
| POST /api/ideas | Score outside 1-10 | `VALIDATION_ERROR` | 400 |
| POST /api/structure-scan | Missing `projectPath` | Legacy `error` | 400 |
| POST /api/structure-scan | Path doesn't exist | Legacy `error` | 404 |
| POST /api/structure-scan/analyze | Invalid `projectType` | `VALIDATION_ERROR` | 400 |
| POST /api/structure-scan/save | Empty `violations` array | `VALIDATION_ERROR` | 400 |
| POST /api/claude-code/execute | Missing `requirementName` | `MISSING_REQUIRED_FIELD` | 400 |
| POST /api/claude-code/execute | Malformed JSON | `INVALID_FORMAT` | 400 |
| POST /api/conductor/run | Invalid `action` enum | Zod validation | 422 |
| POST /api/conductor/run | Missing `goalId` on start | `error` message | 400 |
| Any rate-limited endpoint | Too many requests | `RATE_LIMITED` | 429 |
