# API Reference

Vibeman exposes a REST API via Next.js App Router route handlers. All endpoints are served from `http://localhost:3000/api/` by default.

---

## Conventions

### Base URL

```
http://localhost:3000
```

Override with the `PORT` environment variable.

### Response Format

**Success responses** follow one of two patterns:

```json
{ "goals": [...] }
```

```json
{ "success": true, "data": { ... } }
```

**Error responses:**

```json
{ "error": "Human-readable error message" }
```

### Common Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | `string` | Filter by single project ID |
| `projectIds` | `string` | Comma-separated list of project IDs |
| `status` | `string` | Filter by status value |
| `limit` | `number` | Limit number of results |
| `offset` | `number` | Offset for pagination |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request (validation error, missing parameters) |
| `404` | Resource not found |
| `409` | Conflict (duplicate, constraint violation) |
| `500` | Internal server error |
| `502` | Bad gateway (upstream LLM error) |
| `503` | Service unavailable |

---

## Core Endpoints

### Projects

Manage registered projects.

#### `GET /api/projects`

List all projects.

```bash
curl http://localhost:3000/api/projects
```

**Response:**
```json
{
  "projects": [
    {
      "id": "abc-123",
      "name": "my-app",
      "path": "/home/user/projects/my-app",
      "port": 3001,
      "type": "nextjs"
    }
  ]
}
```

#### `POST /api/projects`

Register a new project.

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc-123",
    "name": "my-app",
    "path": "/home/user/projects/my-app",
    "port": 3001,
    "type": "nextjs"
  }'
```

**Body parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique project ID |
| `name` | `string` | Yes | Display name |
| `path` | `string` | Yes | Absolute path to project directory |
| `port` | `number` | Yes* | Dev server port (*not required for `combined` type) |
| `type` | `string` | No | `nextjs`, `react`, `express`, `fastapi`, `django`, `rails`, `generic`, `combined` (auto-detected if omitted) |
| `workspaceId` | `string` | No | Workspace grouping |
| `run_script` | `string` | No | Custom run script |

**Response:** `{ "success": true, "message": "Project added successfully" }`

#### `PUT /api/projects`

Update an existing project.

```bash
curl -X PUT http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "updates": { "name": "my-renamed-app", "port": 3002 }
  }'
```

#### `DELETE /api/projects`

Remove a project.

```bash
curl -X DELETE http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

---

### Goals

Manage requirements and goals within a project.

#### `GET /api/goals`

```bash
# List all goals for a project
curl "http://localhost:3000/api/goals?projectId=abc-123"

# Get a single goal by ID
curl "http://localhost:3000/api/goals?id=goal-456"

# Multi-project query
curl "http://localhost:3000/api/goals?projectIds=abc-123,def-456"
```

**Response:**
```json
{
  "goals": [
    {
      "id": "goal-456",
      "project_id": "abc-123",
      "context_id": null,
      "title": "Add user authentication",
      "description": "Implement login/signup flow",
      "status": "open",
      "order_index": 0
    }
  ]
}
```

#### `POST /api/goals`

```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "title": "Add user authentication",
    "description": "Implement login/signup flow",
    "status": "open"
  }'
```

**Body parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | Yes | Parent project ID |
| `title` | `string` | Yes | Goal title |
| `description` | `string` | No | Goal description |
| `status` | `string` | No | `open`, `in_progress`, `done` |
| `contextId` | `string` | No | Link to a context |
| `orderIndex` | `number` | No | Display order |

**Response (201):** `{ "goal": { ... } }`

#### `PUT /api/goals`

```bash
curl -X PUT http://localhost:3000/api/goals \
  -H "Content-Type: application/json" \
  -d '{
    "id": "goal-456",
    "status": "in_progress"
  }'
```

#### `DELETE /api/goals`

```bash
curl -X DELETE "http://localhost:3000/api/goals?id=goal-456"
```

**Response:** `{ "success": true }`

---

### Ideas

AI-generated improvement suggestions for a project.

#### `GET /api/ideas`

```bash
# List ideas for a project
curl "http://localhost:3000/api/ideas?projectId=abc-123"

# Filter by status
curl "http://localhost:3000/api/ideas?projectId=abc-123&status=pending"

# Filter by goal
curl "http://localhost:3000/api/ideas?projectId=abc-123&goalId=goal-456"

# Limit results
curl "http://localhost:3000/api/ideas?projectId=abc-123&limit=10"
```

**Response:**
```json
{
  "ideas": [
    {
      "id": "idea-789",
      "project_id": "abc-123",
      "scan_id": "scan-001",
      "category": "refactor",
      "title": "Extract shared validation logic",
      "description": "...",
      "status": "pending",
      "effort": 3,
      "impact": 7,
      "risk": 2
    }
  ]
}
```

#### `POST /api/ideas`

```bash
curl -X POST http://localhost:3000/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "scan_id": "scan-001",
    "project_id": "abc-123",
    "category": "refactor",
    "title": "Extract shared validation logic",
    "description": "Move duplicated validation into a shared module",
    "effort": 3,
    "impact": 7
  }'
```

**Response (201):** `{ "idea": { ... } }`

#### `PATCH /api/ideas`

Update an idea (status, feedback, scores).

```bash
curl -X PATCH http://localhost:3000/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "idea-789",
    "status": "accepted",
    "user_feedback": "Good suggestion, will implement"
  }'
```

#### `DELETE /api/ideas`

```bash
# Delete a single idea
curl -X DELETE "http://localhost:3000/api/ideas?id=idea-789"

# Delete all ideas
curl -X DELETE "http://localhost:3000/api/ideas?all=true"
```

---

### Contexts

Organize code into business feature "contexts" — groups of related files.

#### `GET /api/contexts`

```bash
curl "http://localhost:3000/api/contexts?projectId=abc-123"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contexts": [
      {
        "id": "ctx-001",
        "project_id": "abc-123",
        "name": "Authentication",
        "description": "Login, signup, and session management",
        "file_paths": ["src/auth/login.ts", "src/auth/signup.ts"],
        "entry_points": ["src/auth/index.ts"],
        "db_tables": ["users", "sessions"],
        "keywords": ["auth", "login", "jwt"]
      }
    ],
    "groups": [...]
  }
}
```

#### `POST /api/contexts`

```bash
curl -X POST http://localhost:3000/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "name": "Authentication",
    "description": "Login, signup, and session management",
    "filePaths": ["src/auth/login.ts", "src/auth/signup.ts"],
    "entry_points": ["src/auth/index.ts"],
    "db_tables": ["users", "sessions"],
    "keywords": ["auth", "login"]
  }'
```

#### `PUT /api/contexts`

```bash
curl -X PUT http://localhost:3000/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "ctx-001",
    "updates": {
      "name": "Auth & Sessions",
      "filePaths": ["src/auth/login.ts", "src/auth/signup.ts", "src/auth/session.ts"]
    }
  }'
```

#### `DELETE /api/contexts`

```bash
# Delete single context
curl -X DELETE "http://localhost:3000/api/contexts?contextId=ctx-001"

# Delete all contexts for a project
curl -X DELETE "http://localhost:3000/api/contexts?projectId=abc-123"
```

---

## AI & LLM

### LLM Generate

Send a prompt to a configured LLM provider.

#### `POST /api/llm/generate`

```bash
curl -X POST http://localhost:3000/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain the purpose of WAL mode in SQLite",
    "provider": "ollama",
    "maxTokens": 500,
    "temperature": 0.7
  }'
```

**Body parameters:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | `string` | Yes | — | The prompt to send |
| `provider` | `string` | No | `ollama` | LLM provider to use |
| `model` | `string` | No | Provider default | Specific model ID |
| `maxTokens` | `number` | No | Provider default | Maximum tokens in response |
| `temperature` | `number` | No | Provider default | Sampling temperature |
| `systemPrompt` | `string` | No | — | System prompt |
| `projectId` | `string` | No | — | Project context |

**Success response:**
```json
{
  "success": true,
  "response": "WAL (Write-Ahead Logging) mode in SQLite...",
  "model": "qwen3.5:cloud",
  "usage": { "prompt_tokens": 12, "completion_tokens": 150 },
  "metadata": {}
}
```

**Error response (502):**
```json
{
  "success": false,
  "error": "Connection refused",
  "code": "PROVIDER_UNAVAILABLE",
  "userMessage": "The LLM provider is not available",
  "recoveryActions": ["Check if Ollama is running", "Try a different provider"],
  "isTransient": true,
  "retryDelay": 5000
}
```

---

### Claude Code Tasks

Manage tasks dispatched to CLI providers.

#### `GET /api/claude-code/tasks`

```bash
# List all tasks
curl http://localhost:3000/api/claude-code/tasks

# Filter by project
curl "http://localhost:3000/api/claude-code/tasks?projectId=abc-123"
```

**Response:** `{ "tasks": [...] }`

#### `GET /api/claude-code/tasks/:id`

```bash
curl http://localhost:3000/api/claude-code/tasks/task-001
```

#### `POST /api/claude-code/execute`

Execute a task via a CLI provider.

```bash
curl -X POST http://localhost:3000/api/claude-code/execute \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add input validation to the signup form",
    "projectPath": "/home/user/projects/my-app",
    "provider": "claude"
  }'
```

#### `POST /api/claude-code/test-connection`

Test connectivity to a CLI provider.

```bash
curl -X POST http://localhost:3000/api/claude-code/test-connection \
  -H "Content-Type: application/json" \
  -d '{ "provider": "claude" }'
```

---

## Conductor Pipeline

The adaptive AI pipeline that orchestrates Plan, Dispatch, and Reflect phases.

#### `POST /api/conductor/run`

Start, pause, resume, or stop a conductor run.

```bash
# Start a new run
curl -X POST http://localhost:3000/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "projectId": "abc-123",
    "goalId": "goal-456"
  }'

# Pause a run
curl -X POST http://localhost:3000/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{
    "action": "pause",
    "runId": "run-789"
  }'

# Resume a paused run
curl -X POST http://localhost:3000/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resume",
    "runId": "run-789"
  }'

# Stop a run
curl -X POST http://localhost:3000/api/conductor/run \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stop",
    "runId": "run-789"
  }'
```

**Body parameters (start):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `string` | Yes | `start`, `pause`, `resume`, `stop` |
| `projectId` | `string` | Yes (start) | Target project |
| `goalId` | `string` | Yes (start) | Goal to execute |
| `runId` | `string` | No | Run ID (auto-generated for start) |
| `config` | `object` | No | Pipeline configuration overrides |
| `refinedIntent` | `string` | No | Refined execution intent |

**Response:**
```json
{ "success": true, "runId": "run-789", "status": "running" }
```

#### `GET /api/conductor/status`

```bash
# By run ID
curl "http://localhost:3000/api/conductor/status?runId=run-789"

# Latest run for a project
curl "http://localhost:3000/api/conductor/status?projectId=abc-123"
```

**Response:**
```json
{
  "success": true,
  "run": {
    "id": "run-789",
    "projectId": "abc-123",
    "goalId": "goal-456",
    "status": "running",
    "currentStage": "dispatch",
    "cycle": 1,
    "config": {},
    "stages": {},
    "metrics": {},
    "startedAt": "2025-01-15T10:00:00Z",
    "completedAt": null,
    "pipelineVersion": "v3"
  }
}
```

#### `GET /api/conductor/history`

```bash
curl "http://localhost:3000/api/conductor/history?projectId=abc-123"
```

#### `GET /api/conductor/config`

```bash
curl http://localhost:3000/api/conductor/config
```

#### `PUT /api/conductor/config`

```bash
curl -X PUT http://localhost:3000/api/conductor/config \
  -H "Content-Type: application/json" \
  -d '{ "maxCycles": 5, "autoHeal": true }'
```

#### `GET /api/conductor/healing`

View self-healing patches.

```bash
curl http://localhost:3000/api/conductor/healing
```

#### `GET /api/conductor/usage`

```bash
curl http://localhost:3000/api/conductor/usage
```

---

## Brain System

Behavioral learning, insights, and signals.

#### `GET /api/brain/insights`

```bash
curl "http://localhost:3000/api/brain/insights?projectId=abc-123"

# Global insights
curl "http://localhost:3000/api/brain/insights?scope=global"
```

**Response:**
```json
{
  "success": true,
  "insights": [
    {
      "title": "Test coverage correlates with deployment success",
      "confidence": 0.85,
      "project_id": "abc-123",
      "confidenceHistory": [
        { "confidence": 0.7, "date": "2025-01-10" },
        { "confidence": 0.85, "date": "2025-01-15" }
      ]
    }
  ]
}
```

#### `GET /api/brain/signals`

```bash
curl "http://localhost:3000/api/brain/signals?projectId=abc-123"
```

#### `GET /api/brain/dashboard`

```bash
curl "http://localhost:3000/api/brain/dashboard?projectId=abc-123"
```

#### `GET /api/brain/correlations`

```bash
curl "http://localhost:3000/api/brain/correlations?projectId=abc-123"
```

#### `POST /api/brain/reflection`

Trigger a brain reflection cycle.

```bash
curl -X POST http://localhost:3000/api/brain/reflection \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

---

## Scanning & Queue

#### `GET /api/scan-queue`

```bash
curl "http://localhost:3000/api/scan-queue?projectId=abc-123"

# Filter by status
curl "http://localhost:3000/api/scan-queue?projectId=abc-123&status=queued"
```

**Response:**
```json
{ "queueItems": [...] }
```

#### `POST /api/scan-queue`

Queue a new scan.

```bash
curl -X POST http://localhost:3000/api/scan-queue \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "scanType": "structure",
    "triggerType": "manual",
    "priority": 1
  }'
```

**Body parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | Yes | Project to scan |
| `scanType` | `string` | Yes | Scan type (e.g., `structure`, `build`, `context`, `vision`) |
| `contextId` | `string` | No | Specific context to scan |
| `triggerType` | `string` | No | `manual` (default), `auto` |
| `priority` | `number` | No | Queue priority |

**Response (201):** `{ "queueItem": { ... } }`

#### `POST /api/structure-scan`

Trigger a full structure scan.

```bash
curl -X POST http://localhost:3000/api/structure-scan \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123", "projectPath": "/home/user/projects/my-app" }'
```

---

## Standups

#### `GET /api/standup`

Get a standup summary for a period.

```bash
curl "http://localhost:3000/api/standup?projectId=abc-123&periodType=daily&periodStart=2025-01-15"
```

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `periodType` | `string` | Yes | `daily` or `weekly` |
| `periodStart` | `string` | Yes | Period start date (YYYY-MM-DD) |

**Response:**
```json
{
  "success": true,
  "summary": {
    "title": "Daily Standup — Jan 15, 2025",
    "summary": "...",
    "stats": {
      "implementationsCount": 5,
      "ideasGenerated": 12,
      "ideasAccepted": 8,
      "ideasRejected": 4,
      "ideasImplemented": 3,
      "scansCount": 2
    },
    "blockers": [],
    "highlights": [],
    "insights": {
      "velocityTrend": "increasing",
      "burnoutRisk": "low",
      "focusAreas": [{ "area": "testing", "priority": "high" }]
    }
  }
}
```

#### `POST /api/standup/generate`

Generate a new standup summary.

```bash
curl -X POST http://localhost:3000/api/standup/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "periodType": "daily",
    "periodStart": "2025-01-15"
  }'
```

---

## System Status

#### `GET /api/system-status`

Health check across all subsystems.

```bash
# Full system status
curl http://localhost:3000/api/system-status

# Specific component
curl "http://localhost:3000/api/system-status?component=database"
curl "http://localhost:3000/api/system-status?component=llm"
```

**Component options:** `queue`, `llm`, `database`, `sessions`, `taskRunner`, `brain`, `resources`, `cache`, `migrations`, `all`

**Response:**
```json
{
  "summary": {
    "status": "operational",
    "uptime": 3600,
    "timestamp": "2025-01-15T10:00:00Z"
  },
  "database": {
    "status": "operational",
    "connectionTime": 2,
    "tables": [{ "name": "goals", "rowCount": 15, "indexed": true }]
  },
  "llm": {
    "status": "operational",
    "providers": [
      { "name": "anthropic", "configured": true, "available": true },
      { "name": "ollama", "configured": true, "available": true }
    ]
  },
  "resources": {
    "status": "operational",
    "cpu": { "usage": 15.2, "threshold": 90 },
    "memory": { "heapPercent": 42.1, "rssBytes": 157286400, "threshold": 90 }
  },
  "alerts": []
}
```

---

## Directions & Questions

#### `GET /api/directions`

```bash
curl "http://localhost:3000/api/directions?projectId=abc-123"
```

#### `POST /api/directions`

```bash
curl -X POST http://localhost:3000/api/directions \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "title": "Migrate to PostgreSQL",
    "description": "Consider switching from SQLite for multi-user support"
  }'
```

#### `GET /api/questions`

```bash
curl "http://localhost:3000/api/questions?projectId=abc-123"
```

#### `POST /api/questions`

```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "abc-123",
    "question": "Should we add rate limiting to the API?"
  }'
```

---

## Server Management

#### `GET /api/server/status`

Get status of managed project dev servers.

```bash
curl http://localhost:3000/api/server/status
```

#### `POST /api/server/start`

Start a project's dev server.

```bash
curl -X POST http://localhost:3000/api/server/start \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

#### `POST /api/server/stop`

```bash
curl -X POST http://localhost:3000/api/server/stop \
  -H "Content-Type: application/json" \
  -d '{ "projectId": "abc-123" }'
```

---

## Admin & Diagnostics

#### `GET /api/cache`

View cache status.

```bash
curl http://localhost:3000/api/cache
```

#### `DELETE /api/cache`

Clear the cache.

```bash
curl -X DELETE http://localhost:3000/api/cache
```

#### `GET /api/db/performance`

Database performance metrics.

```bash
curl http://localhost:3000/api/db/performance
```

#### `GET /api/diagnostics/llm-resilience`

Test LLM provider resilience and fallback chains.

```bash
curl http://localhost:3000/api/diagnostics/llm-resilience
```

#### `GET /api/observability/stats`

API observability statistics.

```bash
curl http://localhost:3000/api/observability/stats
```

---

## Additional Endpoint Groups

These endpoints follow the same conventions as above. Consult the source code in `src/app/api/` for detailed schemas.

| Group | Base Path | Description |
|-------|-----------|-------------|
| **AI Generation** | `/api/ai/` | Prompt composition and content generation |
| **Annette** | `/api/annette/` | Voice assistant chat, memory, rapport |
| **Architecture** | `/api/architecture/` | Codebase architecture analysis |
| **Context Generation** | `/api/context-generation/` | Auto-generate contexts from codebase |
| **Context Groups** | `/api/context-groups/` | Organize contexts into groups |
| **Context Map** | `/api/context-map/` | Visual context mapping |
| **Cross-Task** | `/api/cross-task/` | Cross-task dependency management |
| **Dependencies** | `/api/dependencies/` | Dependency scanning and upgrades |
| **External Requirements** | `/api/external-requirements/` | Supabase-synced external requirements |
| **Implementation Logs** | `/api/implementation-logs/` | Track implementation history |
| **Integrations** | `/api/integrations/` | Third-party integration management |
| **Kiro** | `/api/kiro/` | AI project review and folder analysis |
| **Lifecycle** | `/api/lifecycle/` | Deployment lifecycle and quality gates |
| **Monitor** | `/api/monitor/` | API call monitoring and pattern analysis |
| **Remote** | `/api/remote/` | Multi-device sync and fleet management |
| **Scan Profiles** | `/api/scan-profiles/` | Custom scan configurations |
| **Social** | `/api/social/` | Multi-channel feedback collection |
| **Template Discovery** | `/api/template-discovery/` | Project template generation |
| **Tinder** | `/api/tinder/` | Swipe-based idea evaluation |
| **Triage Rules** | `/api/triage-rules/` | Automated scan result triage |
| **Voicebot** | `/api/voicebot/` | Voice I/O (TTS, STT, Nova Sonic) |
| **Workspaces** | `/api/workspaces/` | Workspace management |

---

## Middleware

All API routes are wrapped with observability middleware that tracks:
- Request timing and duration
- Error rates and types
- Provider usage metrics

View these metrics at `GET /api/observability/stats` or `GET /api/monitor/statistics`.
