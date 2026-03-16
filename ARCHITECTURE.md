# Architecture

This document describes Vibeman's technical architecture, design patterns, and conventions for contributors.

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Directory Structure](#directory-structure)
- [Feature-Based Organization](#feature-based-organization)
- [API Layer](#api-layer)
- [Database Layer](#database-layer)
- [State Management](#state-management)
- [CLI Integration](#cli-integration)
- [Theme System](#theme-system)
- [Key Design Patterns](#key-design-patterns)
- [Adding a New Feature](#adding-a-new-feature)

---

## High-Level Overview

Vibeman is a **Next.js 16 App Router** application that runs locally. It uses **SQLite** for persistence, **Zustand** for client state, and integrates with multiple AI CLI providers for task execution.

```
┌──────────────────────────────────────────────────────┐
│                    Browser (React 19)                 │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐             │
│  │ Zustand  │  │ React   │  │ Tailwind │             │
│  │ Stores   │  │ Query   │  │ + Framer │             │
│  └────┬─────┘  └────┬────┘  └──────────┘             │
│       │              │                                │
│       ▼              ▼                                │
│  ┌────────────────────────┐                           │
│  │    Next.js App Router  │                           │
│  │    (API Routes)        │                           │
│  └───────────┬────────────┘                           │
└──────────────┼───────────────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌──────────────┐
│ SQLite │ │ File │ │ CLI Providers│
│  (DB)  │ │System│ │ (subprocess) │
└────────┘ └──────┘ └──────────────┘
                      │  │  │  │
                      ▼  ▼  ▼  ▼
                    Claude Gemini
                    Copilot Ollama
```

### Core Principles

- **Localhost-first:** No cloud deployment. Direct filesystem and database access.
- **Feature isolation:** Each feature is self-contained with its own components, lib, and API routes.
- **Multi-provider:** AI execution is provider-agnostic through a unified CLI abstraction.
- **Auto-initializing:** Database, migrations, and stores initialize on first use with no manual setup.

---

## Directory Structure

```
src/
├── app/                        # Next.js App Router root
│   ├── api/                    # Server-side API routes
│   │   ├── conductor/          # Conductor pipeline endpoints
│   │   ├── goals/              # Goal CRUD + GitHub sync
│   │   ├── ideas/              # Idea management
│   │   ├── claude-terminal/    # CLI session management
│   │   ├── contexts/           # Context CRUD
│   │   ├── brain/              # Behavioral analytics
│   │   ├── annette/            # Voice assistant
│   │   ├── external-requirements/  # Supabase sync
│   │   ├── observability/      # Performance metrics
│   │   ├── health/             # Health checks
│   │   └── ...                 # 50+ endpoint groups
│   │
│   ├── db/                     # Database layer
│   │   ├── connection.ts       # getDatabase() singleton
│   │   ├── drivers/            # Database driver abstraction
│   │   ├── migrations/         # 65+ sequential migrations
│   │   └── repositories/       # Repository pattern data access
│   │
│   └── features/               # Feature modules (UI + logic)
│       ├── Conductor/          # AI pipeline orchestration
│       ├── TaskRunner/         # Multi-provider task execution
│       ├── Goals/              # Requirement tracking
│       ├── Ideas/              # Improvement suggestions
│       ├── Context/            # Code section management
│       ├── Brain/              # Behavioral learning
│       ├── Annette/            # Voice assistant
│       ├── Social/             # Feedback aggregation
│       ├── Manager/            # Implementation review
│       ├── reflector/          # Weekly reflection & analysis
│       ├── Overview/           # Architecture visualization
│       ├── tinder/             # Swipe-based idea evaluation
│       ├── RefactorWizard/     # Multi-step refactoring
│       ├── DailyStandup/       # Daily standup reports
│       ├── Integrations/       # External service connectors
│       ├── Questions/          # Clarifying feedback engine
│       ├── Proposals/          # Feature request management
│       ├── HallOfFame/         # Implemented feature recognition
│       ├── Docs/               # In-app documentation
│       ├── Onboarding/         # First-run setup
│       └── Depndencies/        # Dependency analysis
│
├── components/                 # Shared, reusable UI components
│   ├── ui/                     # Base UI primitives
│   └── ...                     # Feature-agnostic components
│
├── hooks/                      # Custom React hooks
│   ├── usePolling.ts           # Interval-based polling (preferred)
│   ├── useAbortableFetch.ts    # Fetch with AbortController
│   ├── useGoals.ts             # Goal data fetching
│   ├── useEventBus.ts          # Pub/sub event system
│   └── ...                     # 25+ hooks
│
├── lib/                        # Business logic and utilities
│   ├── claude-terminal/        # CLI provider abstraction
│   │   ├── types.ts            # CLIProvider, PROVIDER_MODELS
│   │   └── ...                 # Session management, SSE
│   ├── llm/                    # LLM client wrappers
│   ├── supabase/               # Cloud sync services
│   ├── brain/                  # Behavioral signal analysis
│   ├── design-tokens/          # Theme design tokens
│   └── ...                     # 40+ utility modules
│
├── stores/                     # Zustand state stores
│   ├── clientProjectStore.ts   # Active project state
│   ├── serverProjectStore.ts   # Project list from backend
│   ├── themeStore.ts           # Theme selection + colors
│   ├── contextStore.ts         # Contexts and groups
│   ├── brainStore.ts           # Behavioral signals
│   ├── annette/                # Voice assistant stores
│   └── ...                     # 30+ stores
│
├── types/                      # Shared TypeScript definitions
│   └── index.ts                # Project, CLIProvider, etc.
│
└── prompts/                    # LLM prompt templates
```

---

## Feature-Based Organization

Each feature in `src/app/features/` follows a consistent structure:

```
features/
└── FeatureName/
    ├── FeatureNameLayout.tsx    # Top-level layout component (entry point)
    ├── components/             # Feature-specific React components
    │   ├── FeatureView.tsx
    │   ├── FeatureModal.tsx
    │   └── ...
    ├── lib/                    # Feature-specific business logic
    │   ├── featureUtils.ts
    │   └── ...
    └── sub_SubFeature/         # Optional sub-feature modules
        ├── components/
        └── lib/
```

### Key Features

#### Conductor (`features/Conductor/`)

The adaptive AI pipeline that orchestrates development cycles:

- **Plan Phase** — Analyzes the goal, generates a structured execution plan
- **Dispatch Phase** — Routes tasks to CLI providers, manages concurrent execution
- **Reflect Phase** — Evaluates results, triggers self-healing on errors
- **Self-Healing** — Error classifier -> healing analyzer -> prompt patcher chain
- **Brain Advisor** — Provides behavioral insights to improve future cycles

Files: `lib/v3/{conductorV3,planPhase,dispatchPhase,reflectPhase,brainAdvisor,types}.ts`

#### TaskRunner (`features/TaskRunner/`)

Batch task execution across multiple AI providers:

- Multi-column kanban interface with real-time SSE streaming
- External requirements column (Supabase integration)
- Auto-assignment to 4 concurrent CLI sessions
- Polling manager for cleanup and batch data fetching

#### Context System (`features/Context/`)

The foundational organizational layer. Contexts represent code sections (business features) that flow through the entire lifecycle:

- Drag-and-drop file structure management
- Context groups with color-coded organization
- Auto-update after implementations
- Cross-context dependency mapping

---

## API Layer

### Route Convention

All API routes follow the Next.js App Router pattern:

```
src/app/api/{resource}/route.ts          # GET, POST for collection
src/app/api/{resource}/[id]/route.ts     # GET, PUT, DELETE for individual
```

### Response Format

```typescript
// Success
NextResponse.json({ success: true, data: result })

// Error
NextResponse.json({ success: false, error: 'Error description' }, { status: 400 })
```

### Request Validation

Use Zod schemas with a `withValidation` wrapper where applicable:

```typescript
export const POST = withValidation(CreateGoalSchema, async (req, body) => {
  const result = goalDb.create(body);
  return NextResponse.json({ success: true, data: result });
});
```

### Major API Groups

| Group | Path | Purpose |
|-------|------|---------|
| Conductor | `/api/conductor/*` | Pipeline execution, config, healing, history |
| Goals | `/api/goals` | Goal CRUD, GitHub sync |
| Ideas | `/api/ideas` | Idea management, aggregation |
| Contexts | `/api/contexts`, `/api/context-groups` | Context and group CRUD |
| CLI | `/api/claude-terminal/*` | Session management, task dispatch |
| Brain | `/api/brain/*` | Dashboard, signals, anomalies, predictions |
| Annette | `/api/annette/*` | Chat, voice, autonomous agent |
| External | `/api/external-requirements/*` | Supabase sync, requirement processing |
| Observability | `/api/observability` | Performance metrics |
| Health | `/api/health`, `/api/diagnostics` | System health checks |

---

## Database Layer

### Connection

```typescript
import { getDatabase } from '@/app/db/connection';

const db = getDatabase();
```

`getDatabase()` returns a singleton `better-sqlite3` instance. The database auto-initializes on first import, running all pending migrations.

### Repository Pattern

Data access is organized into repositories in `src/app/db/repositories/`:

```typescript
// src/app/db/repositories/goal.repository.ts
export const goalDb = {
  getAll: (filters?: GoalFilters) => { ... },
  getById: (id: string) => { ... },
  create: (goal: CreateGoalInput) => { ... },
  update: (id: string, data: UpdateGoalInput) => { ... },
  delete: (id: string) => { ... },
};
```

Repositories are exported via a central index and imported as namespaced objects:

```typescript
import { goalDb, ideaDb, contextDb } from '@/app/db/repositories';
```

### Migration System

Migrations live in `src/app/db/migrations/` and are numbered sequentially (m001, m002, ..., m143+).

**Critical rules:**

1. New columns must be **nullable or have defaults**
2. Never **drop or recreate tables** — use `addColumnIfNotExists()`
3. Wrap every migration in **`runOnce('mXXX', fn)`** to prevent re-runs
4. The `_migrations_applied` table tracks which migrations have been applied

### Hot-Writes System

A separate database instance (`hot-writes.ts`) handles high-frequency writes (observability metrics, API call tracking). An aggregation worker periodically rolls up detailed records into summary tables to prevent main DB lock contention.

---

## State Management

### Zustand Stores

Client state is managed by Zustand stores in `src/stores/`. Each store follows this pattern:

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyState {
  items: Item[];
  loading: boolean;
  setItems: (items: Item[]) => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    persist(
      (set) => ({
        items: [],
        loading: false,
        setItems: (items) => set({ items }),
      }),
      { name: 'my-store-key' }
    )
  )
);
```

### Key Stores

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `clientProjectStore` | Active project, file structure, UI prefs | localStorage |
| `serverProjectStore` | Project list from backend | No |
| `themeStore` | Theme selection and color config | localStorage |
| `contextStore` | Contexts, groups, loading state | No |
| `brainStore` | Behavioral signals and anomalies | No |
| `annette/chatStore` | Chat messages, session state | localStorage |

### Selector Optimization

Use `useShallow` for multi-value selectors to prevent unnecessary re-renders:

```typescript
import { useShallow } from 'zustand/react/shallow';

const { items, loading } = useMyStore(
  useShallow((s) => ({ items: s.items, loading: s.loading }))
);
```

---

## CLI Integration

### Provider Architecture

The CLI layer (`src/lib/claude-terminal/`) provides a unified interface over multiple AI providers:

```typescript
type CLIProvider = 'claude' | 'gemini' | 'copilot' | 'ollama';
```

| Provider | Mechanism | Communication |
|----------|-----------|---------------|
| Claude | `spawn('claude')` subprocess | Piped stdio, stream-json |
| Gemini | `spawn('gemini')` subprocess | Piped stdio, stream-json |
| Ollama | `spawn('claude')` with env override | Claude CLI → Ollama API |
| Copilot | In-process `@github/copilot-sdk` | Direct SDK calls |

### Session Lifecycle

```
idle → running → (waiting_approval) → completed | error
```

- Each session tracks token usage (`totalTokensIn`, `totalTokensOut`, `totalCostUsd`)
- Tool approval flow: pending tools pause execution until user approves/denies
- SSE events stream real-time updates to the UI

### Model Routing

`PROVIDER_MODELS` in `src/lib/claude-terminal/types.ts` defines available models per provider. The `routeModel()` function maps a model selection to the correct provider and CLI arguments.

---

## Theme System

Three built-in themes managed by `useThemeStore`:

| Theme | Palette |
|-------|---------|
| **Phantom** (default) | Purple/Violet/Fuchsia gradients |
| **Midnight** | Cyan/Blue tones |
| **Shadow** | Red/Rose accents |

### Usage

```typescript
const { getThemeColors } = useThemeStore();
const colors = getThemeColors();

// Apply theme colors
<div className={colors.bg}>
  <span className={colors.text}>Themed text</span>
</div>
```

Theme colors are defined as Tailwind class strings, including gradients, borders, glows, and accent variants. Design tokens live in `src/lib/design-tokens/`.

---

## Key Design Patterns

### Polling

Use the `usePolling` hook from `@/hooks/usePolling` for consistent interval-based data fetching:

```typescript
usePolling({
  fn: () => fetch('/api/goals').then(r => r.json()),
  interval: 5000,
  enabled: true,
  onSuccess: (data) => setGoals(data),
});
```

### Event Bus

The `useEventBus` hook provides a pub/sub system for cross-component communication without prop drilling:

```typescript
// Publisher
const { emit } = useEventBus();
emit('goal:updated', { id: '123' });

// Subscriber
useEventBus({
  'goal:updated': (payload) => refetchGoals(),
});
```

### Error Handling

API routes return structured errors. Client-side, use the `useErrorHandler` hook or handle in React Query's `onError`:

```typescript
const { handleError } = useErrorHandler();

try {
  await updateGoal(data);
} catch (err) {
  handleError(err, 'Failed to update goal');
}
```

### Toast Notifications

Use `sonner` via the message store:

```typescript
import { toast } from 'sonner';

toast.success('Goal created');
toast.error('Failed to save');
```

---

## Adding a New Feature

### 1. Create the Feature Directory

```
src/app/features/MyFeature/
├── MyFeatureLayout.tsx     # Entry point layout
├── components/
│   └── MyFeatureView.tsx   # Main view component
└── lib/
    └── myFeatureUtils.ts   # Business logic
```

### 2. Add API Routes (if needed)

```
src/app/api/my-feature/
├── route.ts                # GET (list), POST (create)
└── [id]/
    └── route.ts            # GET (single), PUT, DELETE
```

### 3. Add a Zustand Store (if needed)

Create `src/stores/myFeatureStore.ts` following the existing pattern with `devtools` and optionally `persist` middleware.

### 4. Add Database Tables (if needed)

Create a migration in `src/app/db/migrations/` and a repository in `src/app/db/repositories/`. Follow the migration rules in [CONTRIBUTING.md](CONTRIBUTING.md#database-migrations).

### 5. Wire Up Navigation

Add the feature to the app's navigation/layout system so users can access it.

### 6. Write Tests

Add tests alongside your code (`*.test.ts`) or in the `tests/` directory. Test database interactions, business logic, and critical UI behavior.
