# Development Guide

In-depth architecture and development reference for Vibeman contributors. For high-level structure and conventions, see [ARCHITECTURE.md](ARCHITECTURE.md). For setup instructions, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Modules](#key-modules)
- [Data Flow](#data-flow)
- [API Structure](#api-structure)
- [Database Schema](#database-schema)
- [Claude & CLI Integration](#claude--cli-integration)
- [Design Decisions](#design-decisions)
- [Common Development Workflows](#common-development-workflows)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React 19)                             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │   Zustand     │  │  React Query │  │  Hooks    │  │  Feature Modules │   │
│  │   Stores      │  │  (TanStack)  │  │  30+      │  │  23 features     │   │
│  │   (45+)       │  │  Caching     │  │  Polling  │  │  Self-contained  │   │
│  └──────┬────────┘  └──────┬───────┘  │  SSE      │  └──────┬───────────┘   │
│         │                  │          │  Events   │         │               │
│         │                  │          └─────┬─────┘         │               │
│         ▼                  ▼                ▼               ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Next.js 16 App Router                           │    │
│  │                  (Pages, Layouts, Providers)                         │    │
│  └───────────────────────────┬─────────────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ HTTP (fetch / SSE)
┌──────────────────────────────┼──────────────────────────────────────────────┐
│                     SERVER (Next.js API Routes)                             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  /api/goals   │  │/api/conductor│  │  /api/brain  │  │/api/claude-   │   │
│  │  /api/ideas   │  │  /run        │  │  /insights   │  │ terminal/     │   │
│  │  /api/contexts│  │  /status     │  │  /signals    │  │ /query        │   │
│  │  /api/scans   │  │  /healing    │  │  /anomalies  │  │ /stream       │   │
│  └──────┬────────┘  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘   │
│         │                  │                 │                  │            │
│         ▼                  ▼                 ▼                  ▼            │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │     Database Layer            │  │     CLI Execution Layer             │  │
│  │  ┌────────────────────────┐  │  │  ┌───────────────────────────────┐  │  │
│  │  │   Repositories (65+)   │  │  │  │   Session Manager             │  │  │
│  │  │   goalDb, ideaDb, ...  │  │  │  │   Execution Strategies        │  │  │
│  │  └───────────┬────────────┘  │  │  │   Approval Handler            │  │  │
│  │              │               │  │  └───────────┬───────────────────┘  │  │
│  │              ▼               │  │              │                      │  │
│  │  ┌────────────────────────┐  │  │  ┌───────────▼───────────────────┐  │  │
│  │  │   SQLite (better-      │  │  │  │   Subprocesses / SDK          │  │  │
│  │  │   sqlite3) + WAL       │  │  │  │   ┌───────┐ ┌───────┐        │  │  │
│  │  │   ┌──────┐ ┌────────┐ │  │  │  │   │Claude │ │Gemini │        │  │  │
│  │  │   │ Main │ │  Hot-  │ │  │  │  │   │  CLI  │ │  CLI  │        │  │  │
│  │  │   │  DB  │ │ Writes │ │  │  │  │   └───────┘ └───────┘        │  │  │
│  │  │   └──────┘ └────────┘ │  │  │  │   ┌───────┐ ┌───────┐        │  │  │
│  │  └────────────────────────┘  │  │  │   │Copilot│ │Ollama │        │  │  │
│  └──────────────────────────────┘  │  │   │  SDK  │ │  CLI  │        │  │  │
│                                    │  │   └───────┘ └───────┘        │  │  │
│  ┌──────────────────────────────┐  │  └──────────────────────────────┘  │  │
│  │  Optional Cloud Integrations │  └─────────────────────────────────────┘  │
│  │  ┌──────────┐ ┌──────────┐  │                                           │
│  │  │ Supabase │ │  GitHub  │  │                                           │
│  │  │   Sync   │ │ Projects │  │                                           │
│  │  └──────────┘ └──────────┘  │                                           │
│  └──────────────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Runtime Model

Vibeman runs as a single Next.js process on localhost. There is no separate backend server, message queue, or external database. Everything runs in-process:

- **Frontend**: React 19 with server components and client components coexisting
- **API**: Next.js Route Handlers serve as the backend (`src/app/api/`)
- **Database**: SQLite accessed directly via `better-sqlite3` (synchronous, in-process)
- **CLI Providers**: Spawned as child processes via Node.js `child_process.spawn()`
- **Cloud sync**: Optional fire-and-forget calls to Supabase and GitHub APIs

---

## Key Modules

### Frontend (`src/app/features/`)

23 self-contained feature modules. Each owns its UI, business logic, and local state:

| Module | Responsibility |
|--------|---------------|
| **Conductor** | Autonomous AI pipeline: Plan → Dispatch → Reflect cycles with self-healing |
| **TaskRunner** | Batch task execution across CLI providers with real-time streaming |
| **Goals** | Requirement lifecycle (open → in_progress → done) with GitHub Projects sync |
| **Ideas** | AI-generated improvement suggestions from codebase scans |
| **Context** | Code section organization — the foundational unit that flows through the lifecycle |
| **Brain** | Behavioral learning: signal collection, insight generation, anomaly detection |
| **tinder** | Swipe-based idea evaluation (accept/reject with scoring) |
| **Annette** | Voice assistant with chat, voice lab, and autonomous agent modes |
| **reflector** | Weekly reflection and pattern analysis |
| **Social** | Feedback aggregation with sentiment analysis |
| **Overview** | Architecture visualization using React Flow graphs |
| **RefactorWizard** | Multi-step AI-guided refactoring pipeline |
| **DailyStandup** | Auto-generated standup summaries from activity data |

### Backend (`src/app/api/`)

70+ endpoint groups following REST conventions. All routes use the Next.js Route Handler pattern and return a unified envelope (`{ success, data }` or `{ success, error }`).

### Database Layer (`src/app/db/`)

- **`connection.ts`** — Singleton `getDatabase()` with query instrumentation
- **`drivers/`** — Database driver abstraction (currently SQLite only)
- **`repositories/`** — 65+ domain-specific data access objects
- **`migrations/`** — Sequential, idempotent migrations tracked via `_migrations_applied`
- **`hot-writes.ts`** — Separate DB instance for high-frequency observability writes

### Libraries (`src/lib/`)

| Module | Responsibility |
|--------|---------------|
| **`claude-terminal/`** | CLI provider abstraction — session management, subprocess spawning, output parsing |
| **`llm/`** | Multi-provider LLM client (Anthropic, OpenAI, Gemini, Ollama, Groq) with circuit breaker and retry |
| **`supabase/`** | Cloud sync: project sync, external requirements, goal sync |
| **`brain/`** | Behavioral signal analysis and insight generation |
| **`config/envConfig.ts`** | Centralized environment variable access with server-only guards |
| **`validation/`** | Input validation and path sanitization |
| **`observability/`** | Query pattern collection and performance monitoring |

### State Management (`src/stores/`)

45+ Zustand stores. Key ones:

| Store | What it holds |
|-------|--------------|
| `clientProjectStore` | Active project, file structure, selected context |
| `themeStore` | Theme selection (Phantom/Midnight/Shadow) and color config |
| `onboardingStore` | Active module selection, sidebar state |
| `contextStore` | Contexts and groups for the active project |
| `brainStore` | Behavioral signals and anomaly data |

---

## Data Flow

### Task Execution Flow (Requirement → Implementation)

This is the core workflow — how a development task goes from creation to execution:

```
1. REQUIREMENT CREATION
   User creates a goal in the Goals UI
        │
        ▼
   POST /api/goals  →  goalDb.create()  →  SQLite (goals table)
        │
        ├── fire-and-forget: syncGoalToSupabase()
        └── fire-and-forget: syncGoalToGitHub()

2. IDEA GENERATION (optional)
   Scans analyze the codebase and generate improvement ideas
        │
        ▼
   POST /api/ideas/generate  →  LLM analysis  →  ideaDb.create()
        │
        ▼
   Ideas appear in Tinder UI for swipe evaluation
   Accepted ideas can be linked to goals as requirements

3. TASK DISPATCH (TaskRunner)
   Requirements are assigned to CLI sessions
        │
        ▼
   ┌──────────────────────────────────────────────────┐
   │  TaskRunner Layout (Kanban columns)              │
   │                                                   │
   │  [External] [Idle] [Queued] [Running] [Done]     │
   │                                                   │
   │  Auto-assigner picks idle CLI session             │
   │  Execution strategy selected based on provider    │
   └──────────────────────────┬────────────────────────┘
                              │
                              ▼
   executionStrategy.execute(requirement, session)
        │
        ├── TerminalStrategy:  spawn('claude', args)  →  piped stdio
        ├── QueueStrategy:     POST /api/claude-code/execute
        ├── CopilotSdkStrategy: copilot.complete()
        └── RemoteMeshStrategy: POST to remote device

4. REAL-TIME UPDATES
   CLI output streams back via SSE
        │
        ▼
   EventSource('/api/claude-terminal/stream')  →  UI updates
        │
        ▼
   On completion: task status updated, implementation logged
   Brain signals recorded for behavioral learning
```

### Conductor Pipeline Flow (Autonomous Cycles)

The Conductor runs goal-directed development autonomously:

```
   User sets a goal and starts the Conductor
        │
        ▼
   POST /api/conductor/run  { action: 'start', goalId, config }
        │
        ▼
   ┌─────────────────────────────────────────────┐
   │              v3 Pipeline Loop                │
   │                                              │
   │  ┌──────────┐                                │
   │  │   PLAN   │  Analyze goal + codebase       │
   │  │          │  Generate structured task list  │
   │  └────┬─────┘                                │
   │       │                                      │
   │       ▼                                      │
   │  ┌──────────┐                                │
   │  │ DISPATCH │  Route tasks to CLI providers  │
   │  │          │  Execute concurrently           │
   │  │          │  Validate builds after each     │
   │  └────┬─────┘                                │
   │       │                                      │
   │       ▼                                      │
   │  ┌──────────┐     ┌──────────────────────┐   │
   │  │ REFLECT  │────>│ Self-Healing Engine   │   │
   │  │          │     │ errorClassifier       │   │
   │  │          │     │ healingAnalyzer       │   │
   │  │ Decision:│     │ promptPatcher         │   │
   │  │ done /   │     └──────────────────────┘   │
   │  │ continue/│                                │
   │  │ needs_   │     ┌──────────────────────┐   │
   │  │ input    │────>│ Brain Advisor        │   │
   │  └────┬─────┘     │ Behavioral insights  │   │
   │       │           │ Q&A guidance          │   │
   │       │           └──────────────────────┘   │
   │       │                                      │
   │       ├── done ──────> Pipeline completes    │
   │       ├── needs_input ──> Pause for user     │
   │       └── continue ──> Next cycle (back to   │
   │                         PLAN)                │
   └─────────────────────────────────────────────┘

   State persisted in: conductor_runs table
   Polling: GET /api/conductor/status?projectId=xxx
```

### External Requirements Flow (Cloud → Local)

For teams using Supabase to queue tasks from external sources:

```
   External system writes to Supabase
        │
        ▼
   vibeman_requirements table (status: 'open')
        │
        ▼
   ExternalRequirementsColumn polls Supabase
        │
        ▼
   Device claims requirement:
     UPDATE SET device_id = hostname(), status = 'claimed'
     WHERE status = 'open'  (optimistic lock)
        │
        ▼
   externalRequirementPipeline.ts:
     1. Analyze — match to local contexts via similarity
     2. Execute — dispatch to CLI session
     3. Cleanup — update Supabase status, clean local files
        │
        ▼
   Stale claims (>30 min) automatically reset to 'open'
```

---

## API Structure

### Conventions

- **Path**: `src/app/api/{resource}/route.ts` (collection) and `src/app/api/{resource}/[id]/route.ts` (individual)
- **Methods**: `GET` (list/read), `POST` (create/action), `PUT`/`PATCH` (update), `DELETE` (remove)
- **Envelope**: All responses use `{ success: true, data }` or `{ success: false, error }` format
- **Validation**: Zod schemas with `withValidation` wrapper where applicable
- **Project scoping**: Most endpoints require `projectId` as a query parameter or request body field
- **Field naming**: Database uses `snake_case`, API accepts both, frontend uses `camelCase`

### Endpoint Reference

#### Core Data

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/goals` | GET, POST, PUT, DELETE | Goal CRUD with sync triggers |
| `/api/ideas` | GET, POST, PUT, DELETE | Idea management |
| `/api/ideas/generate` | POST | Trigger AI idea generation |
| `/api/contexts` | GET, POST, PUT, DELETE | Code section management |
| `/api/context-groups` | GET, POST, PUT, DELETE | Context group organization |
| `/api/scans` | GET, POST, DELETE | Codebase scan records |
| `/api/projects` | GET, POST, PUT, DELETE | Project CRUD |

#### Conductor Pipeline

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/conductor/run` | POST | Start/pause/resume/stop pipeline |
| `/api/conductor/status` | GET | Current run status with triage data |
| `/api/conductor/config` | GET, POST | Pipeline configuration |
| `/api/conductor/history` | GET | Run history for a project |
| `/api/conductor/healing` | POST | Trigger self-healing actions |
| `/api/conductor/usage` | GET | Token and cost metrics |

#### CLI & Execution

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/claude-terminal/query` | POST | Send query to CLI session |
| `/api/claude-terminal/stream` | GET | SSE stream for session output |
| `/api/claude-code/execute` | POST | Queue-based task execution |
| `/api/claude-code/sessions` | GET, POST, DELETE | Session lifecycle |
| `/api/claude-code/tasks/[id]/progress` | GET | Task progress polling |

#### Analytics & Brain

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/brain/insights` | GET, POST, PATCH, DELETE | Insight CRUD with evidence resolution |
| `/api/brain/signals` | GET, POST | Behavioral signal recording |
| `/api/brain/anomalies` | GET | Anomaly detection results |
| `/api/brain/correlations` | GET | Cross-signal correlation analysis |
| `/api/brain/dashboard` | GET | Aggregated dashboard data |

#### System

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/health` | GET | System health check |
| `/api/diagnostics` | GET | Detailed system diagnostics |
| `/api/observability` | GET | Performance metrics |
| `/api/llm` | POST | Generic LLM completion proxy |

---

## Database Schema

### Core Tables

The database is SQLite, auto-initialized on first start. Schema is defined in `src/app/db/schema.ts` with evolution handled by sequential migrations.

#### `goals`

Development requirements with lifecycle tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT | Owner project |
| context_id | TEXT FK | Optional linked context |
| order_index | INTEGER | Display ordering |
| title | TEXT | Goal title |
| description | TEXT | Detailed description |
| status | TEXT | `open`, `in_progress`, `done`, `rejected`, `undecided` |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

Added via migrations: `github_item_id`, `supabase_id`, `priority`, `tags`, `acceptance_criteria`.

#### `contexts`

Code sections representing business features — the foundational organizational unit.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT | Owner project |
| group_id | TEXT FK | Optional context group |
| name | TEXT | Context name |
| description | TEXT | What this code section does |
| file_paths | TEXT | JSON array of file paths |
| target | TEXT | Goal/target functionality |
| target_fulfillment | TEXT | Progress toward target |
| implemented_tasks | INTEGER | Counter of completed tasks |
| has_context_file | INTEGER | Whether a context spec file exists |
| context_file_path | TEXT | Path to context file |

#### `ideas`

AI-generated improvement suggestions from codebase scans.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| scan_id | TEXT FK | Source scan |
| project_id | TEXT | Owner project |
| context_id | TEXT FK | Optional linked context |
| category | TEXT | Improvement category |
| title | TEXT | Idea title |
| description | TEXT | What to improve |
| reasoning | TEXT | Why this matters |
| status | TEXT | `pending`, `accepted`, `rejected`, `implemented` |
| effort | INTEGER | 1-10 effort estimate |
| impact | INTEGER | 1-10 impact estimate |
| risk | INTEGER | 1-10 risk estimate |
| requirement_id | TEXT | Linked requirement (when accepted) |
| goal_id | TEXT FK | Linked goal |

#### `scans`

Records of AI-powered codebase analysis runs.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| project_id | TEXT | Owner project |
| scan_type | TEXT | Type of scan (structure, build, context, vision) |
| summary | TEXT | Scan result summary |
| input_tokens | INTEGER | LLM tokens consumed (input) |
| output_tokens | INTEGER | LLM tokens consumed (output) |
| timestamp | TEXT | When the scan ran |

### Conductor Tables

#### `conductor_runs`

Pipeline execution records.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | Run UUID |
| project_id | TEXT | Owner project |
| goal_id | TEXT | Target goal |
| status | TEXT | `idle`, `running`, `paused`, `completed`, `failed`, `interrupted` |
| current_stage | TEXT | Active phase (plan/dispatch/reflect) |
| cycle | INTEGER | Current cycle number |
| pipeline_version | INTEGER | Always 3 for v3 |
| config_snapshot | TEXT | JSON pipeline configuration |
| stages_state | TEXT | JSON per-stage state |
| metrics | TEXT | JSON run metrics (tokens, duration, etc.) |
| process_log | TEXT | JSON execution log |
| reflection_history | TEXT | JSON history of reflect phase outputs |

#### `conductor_errors`

Error classifications from pipeline execution.

#### `conductor_healing_patches`

Self-healing prompt patches generated by the error recovery system.

### Brain Tables

#### `brain_insights`

Behavioral learning insights generated from reflections.

#### `brain_insight_evidence_junction`

Links insights to evidence sources using typed refs (`direction`, `signal`, `reflection`).

#### `behavioral_signals` (hot-writes DB)

High-frequency behavioral signals with decay tracking. Written to a separate database to avoid lock contention.

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `events` | System event log (info, warning, error, success) |
| `implementation_log` | Record of completed implementations |
| `tech_debt` | Technical debt items with severity scoring |
| `scan_queue` | Queued/running/completed scan jobs |
| `scan_notifications` | Scan completion notifications |
| `context_groups` | Color-coded context group containers |
| `directions` | Strategic development directions |
| `file_watch_config` | File watcher settings for auto-scanning |
| `_migrations_applied` | Migration tracking (one row per applied migration) |

### Entity Relationships

```
projects ─┬── goals ──── ideas (via goal_id)
           │      └───── contexts (via context_id on goal)
           │
           ├── contexts ─┬── context_groups (via group_id)
           │              └── ideas (via context_id)
           │
           ├── scans ──── ideas (via scan_id, CASCADE)
           │      └───── scan_queue (via scan_id)
           │
           ├── conductor_runs
           │      ├── conductor_errors
           │      └── conductor_healing_patches
           │
           ├── events
           ├── implementation_log
           ├── tech_debt
           └── directions
```

---

## Claude & CLI Integration

### Architecture

The CLI integration layer provides a unified interface for executing AI-powered development tasks across multiple providers. It lives primarily in `src/lib/claude-terminal/`.

```
┌──────────────────────────────────────────────────────────┐
│  TaskRunner / Conductor (caller)                          │
│                                                           │
│  Picks an execution strategy based on provider:           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ TerminalStrategy   → spawn() subprocess             │  │
│  │ QueueStrategy      → server-side queue execution    │  │
│  │ CopilotSdkStrategy → @github/copilot-sdk in-process│  │
│  │ RemoteMeshStrategy → HTTP to remote Vibeman device  │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────┬────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│  CLI Service (src/lib/claude-terminal/cli-service.ts)     │
│                                                           │
│  buildSpawnConfig(provider, model, projectPath)            │
│       │                                                   │
│       ├── claude  → spawn('claude', ['--model', model])   │
│       ├── gemini  → spawn('gemini', [...args])            │
│       ├── ollama  → spawn('claude', [...]) + OLLAMA env   │
│       └── copilot → in-process SDK call                   │
│                                                           │
│  Output: stream-json lines parsed into TerminalMessage[]  │
│  Approval: PendingApproval objects pause execution        │
└──────────────────────────────────────────────────────────┘
```

### Provider Configuration

Defined in `src/lib/claude-terminal/types.ts`:

```typescript
type CLIProvider = 'claude' | 'gemini' | 'copilot' | 'ollama';
```

| Provider | Binary | Communication | Notes |
|----------|--------|---------------|-------|
| Claude | `claude` CLI | Piped stdio, stream-json | Primary provider, supports Agent SDK |
| Gemini | `gemini` CLI | Piped stdio, stream-json | Google's CLI tool |
| Copilot | In-process | `@github/copilot-sdk` | No subprocess, direct SDK calls |
| Ollama | `claude` CLI | Piped stdio with env override | Routes through Claude CLI to local Ollama |

### Session Lifecycle

```
                    ┌─────────────────────┐
                    │       idle          │
                    └──────────┬──────────┘
                               │ startQuery()
                               ▼
                    ┌─────────────────────┐
              ┌─────│      running        │─────┐
              │     └──────────┬──────────┘     │
              │                │                │
    tool needs approval   completes        error occurs
              │                │                │
              ▼                ▼                ▼
   ┌──────────────────┐ ┌───────────┐  ┌───────────┐
   │ waiting_approval │ │ completed │  │   error   │
   └────────┬─────────┘ └───────────┘  └───────────┘
            │
   user approves/denies
            │
            ▼
   ┌─────────────────────┐
   │      running        │  (continues execution)
   └─────────────────────┘
```

Each session tracks:
- **Messages**: Typed array (`user`, `assistant`, `tool_use`, `tool_result`, `error`, `system`, `approval_request`)
- **Token usage**: `totalTokensIn`, `totalTokensOut`, `totalCostUsd`
- **Task assignment**: Which requirement ID is being executed
- **Provider & model**: Which AI provider and model configuration

### Prompt Construction

Task prompts are built by the prompt template system:

- **Base**: `src/app/features/TaskRunner/lib/promptTemplate.ts` — `buildTaskPrompt()` constructs a structured prompt from the requirement, context files, and project metadata
- **External wrapper**: `src/app/features/TaskRunner/lib/externalPromptTemplate.ts` — wraps base prompts with Supabase requirement metadata
- **Conductor**: Plan/Dispatch/Reflect phases each construct their own specialized prompts in `src/app/features/Conductor/lib/v3/`

### LLM Provider Abstraction

For non-CLI LLM calls (idea generation, analysis, summaries), the `src/lib/llm/` module provides:

- **`llm-manager.ts`** — Main facade with provider selection
- **Providers**: Anthropic, OpenAI, Gemini, Ollama, Groq, Internal
- **Resilience**: Circuit breaker pattern (`circuitBreaker.ts`) prevents cascading failures; retry with exponential backoff (`retryStrategy.ts`)
- **Fallback chain**: `resilient.ts` tries providers in order until one succeeds

---

## Design Decisions

### Why localhost-first?

Vibeman directly accesses the filesystem, spawns CLI subprocesses, and reads/writes SQLite. A cloud deployment would require reimagining the entire execution model. Localhost gives us:
- Direct file system access for codebase scanning and context file management
- Subprocess spawning for CLI providers (Claude, Gemini, etc.)
- Zero-latency SQLite queries (synchronous, in-process)
- No auth complexity — single user on their own machine

### Why SQLite over PostgreSQL?

- **Zero setup**: Database auto-creates on first run, no external service needed
- **Portable**: Single file, easy to back up or move between machines
- **Fast for our scale**: Single-user localhost app doesn't need connection pooling
- **WAL mode**: Enables concurrent reads during writes without blocking
- The hot-writes separation handles the only high-frequency write pattern (observability signals)

### Why Zustand over Redux?

- Minimal boilerplate — stores are plain functions, not action/reducer ceremonies
- Built-in `persist` middleware for localStorage with zero config
- Selector-based subscriptions prevent unnecessary re-renders
- 45+ stores stay manageable because each is small and focused

### Why feature-based organization?

Each feature directory (`src/app/features/FeatureName/`) contains its own components, business logic, and hooks. This means:
- Adding a feature doesn't touch shared code
- Removing a feature is a clean directory deletion
- Contributors can understand one feature without reading the entire codebase
- The 23 features don't create cross-cutting complexity

### Why subprocess spawning for CLI providers?

AI coding assistants (Claude Code, Gemini CLI) are designed as terminal tools. Rather than reimplementing their capabilities:
- We spawn them as subprocesses and parse their structured output
- Each CLI tool handles its own authentication, model routing, and tool execution
- We get new CLI features (tool use, file editing, etc.) for free on updates
- The unified `CLIProvider` abstraction means adding a new provider is ~100 lines

### Why a repository pattern?

65+ repositories might seem heavy, but each is just a thin wrapper over SQL:
- **Testable**: Repositories can be swapped with mocks in tests
- **Discoverable**: `goalDb.create()` is clearer than raw SQL scattered in route handlers
- **Central index**: `import { goalDb } from '@/app/db/repositories'` — one import for any data access
- **Migration safety**: Repositories encapsulate SQL, so schema changes are localized

### Why fire-and-forget sync?

Supabase and GitHub sync operations use a non-blocking pattern:
```typescript
fireAndForgetSync(() => syncGoalToSupabase(goal), 'Create goal');
```
This ensures API responses return instantly. Cloud sync is best-effort — the local SQLite database is always the source of truth.

---

## Common Development Workflows

### Running the App

```bash
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm start            # Start production server
```

### Type Checking and Linting

```bash
npx tsc --noEmit     # Type-check without emitting files
npm run lint         # Run ESLint
```

### Running Tests

```bash
npm test             # Run all tests (Vitest, sequential execution)
npm test -- --run    # Run once without watch mode
npm test -- path/to/file.test.ts   # Run specific test file
```

Tests use an in-memory SQLite database. Sequential execution (`singleFork: true` in vitest config) prevents database conflicts.

### Adding a New API Endpoint

1. Create `src/app/api/my-resource/route.ts`
2. Export named functions for HTTP methods (`GET`, `POST`, etc.)
3. Use the standard response envelope:
   ```typescript
   return NextResponse.json({ success: true, data: result });
   ```
4. Add input validation with Zod if the endpoint accepts a body
5. Scope queries by `projectId` from request params

### Adding a New Database Table

1. Create a new migration file in `src/app/db/migrations/` with the next available number
2. Wrap in `runOnce()`:
   ```typescript
   import { once } from './migration.utils';
   export const m212_my_new_table = once('m212', (db) => {
     db.exec(`CREATE TABLE IF NOT EXISTS my_table (...)`);
   });
   ```
3. Add the migration call in `src/app/db/migrations/index.ts`
4. Create a repository in `src/app/db/repositories/my-table.repository.ts`
5. Export from `src/app/db/index.ts`

**Critical rules**:
- New columns on existing tables must be **nullable or have defaults**
- Never drop or recreate tables — use `addColumnIfNotExists()`
- All migrations must be idempotent via `runOnce()` wrapper

### Adding a New Feature Module

1. Create the directory structure:
   ```
   src/app/features/MyFeature/
   ├── MyFeatureLayout.tsx
   ├── components/
   └── lib/
   ```
2. Add API routes if needed (`src/app/api/my-feature/route.ts`)
3. Add a Zustand store if needed (`src/stores/myFeatureStore.ts`)
4. Add database tables and repositories if needed (see above)
5. Wire into the app navigation via the module router in `src/app/page.tsx`

### Debugging Database Issues

```bash
# Open the SQLite database directly
sqlite3 database/vibeman.db

# Check migration status
SELECT * FROM _migrations_applied ORDER BY applied_at;

# Check table schema
.schema goals
```

### Environment Variables

All env access goes through `src/lib/config/envConfig.ts`. Never read `process.env` directly:

```typescript
import { env } from '@/lib/config/envConfig';

const key = env.anthropicApiKey();  // Server-only, throws on client
```

See `.env.example` for the full list of available variables. At minimum, set one LLM provider API key (e.g., `ANTHROPIC_API_KEY`).
