# External Requirements via Supabase

Automated pipeline for processing requirement proposals created by 3rd-party applications in a shared Supabase PostgreSQL database.

## Flow

```
3rd-party app                    Vibeman
─────────────                    ───────
INSERT INTO vibeman_requirements ──→ Poll every 30s (GET /api/external-requirements)
                                      │
                                      ▼
                                 Display in External column (TaskRunnerLayout)
                                      │
                                      ▼ User clicks Execute (or Execute All)
                                 ┌─────────────────────────────────┐
                                 │  Stage 1: ANALYZE               │
                                 │  - Fetch project contexts       │
                                 │  - Match contexts to requirement│
                                 │  - Build enriched prompt        │
                                 ├─────────────────────────────────┤
                                 │  Stage 2: EXECUTE               │
                                 │  - Create .claude/commands file │
                                 │  - Dispatch to CLI session      │
                                 │  - Poll until completion        │
                                 ├─────────────────────────────────┤
                                 │  Stage 3: CLEANUP               │
                                 │  - Create implementation log    │
                                 │  - Update Supabase status       │
                                 │  - Delete local requirement file│
                                 └─────────────────────────────────┘
```

## Supabase Tables

### `vibeman_projects`

Vibeman syncs its local projects here so 3rd-party apps can discover valid `project_id` values.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `device_id` | TEXT | Machine hostname (`os.hostname()`) |
| `project_id` | TEXT | Local project ID from SQLite |
| `project_name` | TEXT | Human-readable project name |
| `project_path` | TEXT | Local filesystem path |
| `synced_at` | TIMESTAMPTZ | Last sync timestamp |
| `created_at` | TIMESTAMPTZ | Row creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

**Unique constraint:** `(device_id, project_id)`

### `vibeman_requirements`

3rd-party apps INSERT proposals here. Vibeman polls, claims, processes, and updates status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `project_id` | TEXT | Target project (must match `vibeman_projects.project_id`) |
| `device_id` | TEXT | Target device (NULL = any device can claim) |
| `title` | TEXT | Short requirement title |
| `description` | TEXT | Full requirement description |
| `reasoning` | TEXT | Why this requirement matters (shown in prompt) |
| `category` | TEXT | `feature`, `bugfix`, `refactor`, `test`, `docs` |
| `priority` | INTEGER | 1-10 (10 = highest, determines processing order) |
| `effort` | INTEGER | 1-10 estimated effort |
| `impact` | INTEGER | 1-10 estimated impact |
| `risk` | INTEGER | 1-10 estimated risk |
| `status` | TEXT | `open` → `claimed` → `in_progress` → `implemented` / `failed` / `discarded` |
| `source_app` | TEXT | Name of the 3rd-party app that created this |
| `source_ref` | TEXT | External reference ID or URL |
| `context_hints` | TEXT | JSON string with suggested context names or file paths |
| `metadata` | JSONB | Extensible key-value data |
| `claimed_by` | TEXT | `device_id` of the machine that claimed this |
| `claimed_at` | TIMESTAMPTZ | When it was claimed |
| `completed_at` | TIMESTAMPTZ | When implementation finished |
| `implementation_log_id` | TEXT | Links to Vibeman's local `implementation_log` table |
| `error_message` | TEXT | Populated when `status = 'failed'` |

**Status lifecycle:**
```
open → claimed → in_progress → implemented
                             → failed (retryable)
     → discarded (manual)
```

## Files

### Service Layer
| File | Purpose |
|------|---------|
| `src/lib/supabase/schema-external.sql` | DDL to create both tables (run in Supabase SQL Editor) |
| `src/lib/supabase/external-types.ts` | TypeScript interfaces and type aliases |
| `src/lib/supabase/project-sync.ts` | `syncProjectsToSupabase()` — upserts local projects |
| `src/lib/supabase/external-requirements.ts` | CRUD: fetch, claim, update, discard, reset stale |

### API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/external-requirements` | GET | Fetch visible requirements for a project |
| `/api/external-requirements/[id]` | PATCH | Update requirement status |
| `/api/external-requirements/sync-projects` | POST | Push local projects to Supabase |
| `/api/external-requirements/process` | POST | Trigger the processing pipeline |

### Pipeline
| File | Purpose |
|------|---------|
| `src/app/features/TaskRunner/lib/externalPromptTemplate.ts` | Builds enriched prompt with analysis phase, matched contexts, MCP instructions |
| `src/app/features/TaskRunner/lib/externalRequirementPipeline.ts` | 3-stage orchestrator (analyze → execute → cleanup) + context matching |

### UI Components
| File | Purpose |
|------|---------|
| `src/app/features/TaskRunner/components/ExternalRequirementsColumn.tsx` | Column with teal accent, header controls, scrollable list |
| `src/app/features/TaskRunner/components/ExternalRequirementItem.tsx` | Individual requirement card with priority badge, actions |
| `src/app/features/TaskRunner/hooks/useExternalRequirements.ts` | React hook: polling, state management, actions |

### Modified Files
| File | Change |
|------|--------|
| `src/app/features/TaskRunner/TaskRunnerLayout.tsx` | External column rendered first in grid |
| `src/app/features/TaskRunner/TaskRunnerHeader.tsx` | Sync Projects button added |
| `src/app/features/TaskRunner/store/taskRunnerStore.ts` | `externalProcessing` state for per-requirement tracking |

## Prompt Template

The enriched prompt (`externalPromptTemplate.ts`) wraps the base `buildTaskPrompt()` and adds:

1. **External header** — priority, source app, category, external ID
2. **Analysis phase** — 5-step process before implementation:
   - Review matched contexts and identify files to modify
   - Check for parallel conflicts via `get_related_tasks` MCP tool
   - Consult `get_memory` MCP tool for patterns
   - Write 3-5 bullet implementation plan
   - Report progress via `report_progress` MCP tool
3. **Matched contexts** — auto-populated from context matching algorithm:
   - Context name, description, file paths, entry points, DB tables, API surface
4. **Context hints** — pass-through from 3rd-party's `context_hints` field
5. **Source reasoning** — the 3rd-party's `reasoning` if provided

## Context Matching

The `matchContextsToRequirement()` function scores project contexts against the requirement using:

- **Hint names** — direct match from `context_hints` JSON
- **Hint file paths** — overlap between hint paths and context file paths
- **Keyword overlap** — tokenized words from title/description vs context keywords
- **Category match** — requirement category vs context category
- **Description overlap** — token overlap with context descriptions

Top 5 contexts by score are included in the prompt.

## Device Identification

Uses `os.hostname()` (value: `Kaziho` on this machine). Multi-device claim contention is handled via optimistic locking: `UPDATE ... WHERE status = 'open'` — only one device succeeds.

## 3rd-Party Integration

3rd-party apps connect via `SUPABASE_POOLER_URL` (PostgreSQL wire protocol) and INSERT directly:

```sql
INSERT INTO vibeman_requirements (project_id, title, description, category, priority, source_app)
VALUES ('vibeman-main', 'Add feature X', 'Detailed description...', 'feature', 8, 'my-app');
```

Query available projects:
```sql
SELECT project_id, project_name FROM vibeman_projects WHERE device_id = 'Kaziho';
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `SUPABASE_POOLER_URL` | No | PostgreSQL connection string for 3rd-party apps |
