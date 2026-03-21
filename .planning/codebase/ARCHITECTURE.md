# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Modular Next.js App Router application with feature-based organization, event-driven state management (Zustand), and a sophisticated multi-stage autonomous development pipeline (Conductor).

**Key Characteristics:**
- Feature-driven layout: Each feature (Ideas, TaskRunner, Manager, etc.) is a self-contained module with its own components, hooks, and business logic
- Client-side state management via Zustand with persistence middleware for UI and selection state
- Server-side SQLite database with better-sqlite3 driver abstraction layer supporting future driver swaps
- API-first architecture: Client communicates with backend exclusively through `/api/` routes
- Multi-provider LLM support: Claude, Ollama via unified `CLIProvider` routing
- Self-healing pipeline: Error classification and automated prompt patching for autonomous development

## Layers

**Presentation Layer (Components):**
- Purpose: React components for UI rendering, animations, and user interaction
- Location: `src/components/`, `src/app/features/*/components/`
- Contains: Feature layouts, UI components (buttons, cards, modals), forms, visualizations
- Depends on: Hooks, stores, utilities
- Used by: Pages and feature modules

**Feature Modules Layer:**
- Purpose: Domain-specific business logic and layout management
- Location: `src/app/features/*/` (Ideas, TaskRunner, Manager, Brain, etc.)
- Contains: Feature layouts (IdeasLayout, TaskRunnerLayout, ManagerLayout), sub-components, hooks, stores
- Depends on: Stores, API queries, utilities, business logic
- Used by: Home page router, other features as composition

**State Management Layer (Zustand Stores):**
- Purpose: Client-side state for UI state, selections, active projects, theme, polls
- Location: `src/stores/`
- Contains: `useClientProjectStore`, `useOnboardingStore`, `useBrainStore`, `useContextStore`, theme stores
- Depends on: Persistence middleware, server project store
- Used by: Components, hooks, features

**API Query Layer:**
- Purpose: Type-safe client-side wrappers for API endpoints with React Query integration
- Location: `src/lib/queries/`
- Contains: Query keys, request/response types, fetch wrappers (goalQueries, contextQueries, ideaQueries, etc.)
- Depends on: Types, API types, response guards
- Used by: Components, hooks, feature logic

**API Route Layer:**
- Purpose: Server-side request handlers for CRUD operations and business logic
- Location: `src/app/api/*/route.ts`
- Contains: Route handlers for projects, contexts, ideas, conductor pipeline, external requirements
- Depends on: Database repositories, business logic, services
- Used by: Client queries, external webhooks

**Database Layer:**
- Purpose: Data persistence and schema management
- Location: `src/app/db/`
- Contains:
  - `connection.ts`: Database connection interface with instrumentation
  - `schema.ts`: Table initialization
  - `migrations/`: 54 migration files for schema evolution
  - `repositories/`: Data access objects (goals, contexts, conductor runs, etc.)
  - `models/`: TypeScript types for database records
  - `drivers/`: Connection abstraction allowing driver swaps (currently better-sqlite3)
- Depends on: better-sqlite3, migration utilities
- Used by: API routes, business logic services

**Business Logic Layer:**
- Purpose: Core domain logic for pipelines, analysis, and operations
- Location: `src/app/features/*/lib/`, `src/lib/`
- Contains:
  - Conductor pipeline stages (Scout, Triage, Batch, Execute, Review) at `src/app/features/Manager/lib/conductor/`
  - External requirements pipeline at `src/app/features/TaskRunner/lib/externalRequirementPipeline.ts`
  - Error classifier and healing analyzer
  - Code analysis (dependencyScanner, architectureAnalyzer)
- Depends on: Database, API client SDKs, types
- Used by: API routes, stores

**Utilities & Helpers:**
- Purpose: Shared functions for common operations
- Location: `src/lib/`, `src/helpers/`, `src/utils/`
- Contains: API helpers, design tokens, accessibility utilities, event database
- Depends on: Types, config
- Used by: All layers

## Data Flow

**Interactive Feature Usage Flow:**

1. User clicks UI component in feature module (e.g., TaskRunnerLayout)
2. Component calls hook (e.g., `useGoals()`) with dependencies
3. Hook triggers query via `src/lib/queries/*` (e.g., `getGoals(projectId)`)
4. Query wrapper fetches from `/api/*/route.ts` with type guards
5. API route uses repository to query SQLite database
6. Result flows back through query → hook → component → store state
7. Component re-renders with new data

**Conductor Pipeline Flow (Autonomous Development):**

1. Manager module initiates pipeline run via `/api/conductor/run`
2. Orchestrator (`conductorOrchestrator.ts`) stages execution: Scout → Triage → Batch → Execute → Review
3. Each stage:
   - Reads context and config from database
   - Executes business logic (e.g., Scout scans files, Triage filters ideas)
   - Writes results to `conductor_runs`, `conductor_errors` tables
4. On error, self-healing triggers:
   - Error classifier categorizes failure
   - Healing analyzer suggests fix
   - Prompt patcher applies correction
   - Pipeline retries with adjusted prompt
5. Results stored in database for review and metrics

**External Requirements Pipeline Flow:**

1. User creates external requirement in TaskRunner
2. Task queued to Supabase `vibeman_requirements` table
3. `/api/external-requirements/process` polls for new requirements
4. Pipeline stages: analyze → execute → cleanup
5. Execution occurs in CLI session (Claude, Ollama)
6. Results synced back to database and UI via polling

**State Management & Persistence:**

- UI state (activeProject, selectedProjectId, showPreview) persisted via Zustand persist middleware → localStorage
- On app reload: Zustand rehydrates from localStorage, verifies state validity against server projects
- Stores integrate with server store (`useServerProjectStore`) for canonical data
- Real-time updates via polling hooks (`usePolling`) at 2-10 second intervals

## Key Abstractions

**Feature Module:**
- Purpose: Encapsulated feature UI with its own state, logic, and components
- Examples: `src/app/features/Ideas/`, `src/app/features/TaskRunner/`, `src/app/features/Manager/`
- Pattern: Each has `[FeatureName]Layout.tsx` as entry point, `lib/` for business logic, `components/` for UI, optional feature-specific store

**Conductor Pipeline:**
- Purpose: Autonomous 5-stage development workflow with self-healing error recovery
- Examples: Stages in `src/app/features/Manager/lib/conductor/stages/`
- Pattern: Each stage is a pure function receiving `context` and `config`, returning `StageOutput` with metrics

**Query Wrapper:**
- Purpose: Type-safe API client with response validation
- Examples: `src/lib/queries/goalQueries.ts`, `contextQueries.ts`
- Pattern: Export query keys, request/response interfaces, wrapped fetch function with response guard

**Repository:**
- Purpose: Data access object encapsulating SQL for specific entity
- Examples: `src/app/db/repositories/goals.repository.ts`, `contexts.repository.ts`
- Pattern: CRUD methods returning TypeScript models, handles snake_case ↔ camelCase conversion

**Zustand Store:**
- Purpose: Client-side state with actions and persistence
- Examples: `src/stores/clientProjectStore.ts`, `onboardingStore.ts`, `brainStore.ts`
- Pattern: `create()` with `devtools`, `persist` middleware, typed interface, rehydration hooks

**Store Action (Thunk):**
- Purpose: Async operation triggered by component, updates store
- Examples: `loadProjectFileStructure()` in clientProjectStore
- Pattern: Async function setting loading → fetching → success/error states

## Entry Points

**Web Application:**
- Location: `src/app/layout.tsx` → `src/app/page.tsx`
- Triggers: Application initialization on browser load
- Responsibilities:
  - Layout wraps entire app with providers (QueryProvider, ErrorBoundary, ModalProvider, etc.)
  - Page renders TopBar, LazyContentSection with module router, GlobalTaskBar
  - Module router switches between features based on `useOnboardingStore().activeModule`

**API Routes:**
- Location: `src/app/api/*/route.ts` (40+ routes)
- Triggers: Fetch calls from client, webhooks from external services
- Responsibilities: Request parsing, business logic execution, database operations, response serialization

**Database Initialization:**
- Location: `src/app/db/drivers/index.ts` → `getConnection()` → `initializeTables()`
- Triggers: First database access in application
- Responsibilities: Create connection, run migrations, initialize schema

**CLI Providers:**
- Location: `src/lib/claude-terminal/` for session management
- Triggers: User initiates terminal/autonomous operation
- Responsibilities: Route requests to appropriate provider (Claude, Ollama), manage 4 concurrent sessions

## Error Handling

**Strategy:** Layered error handling with classification, logging, and recovery attempts

**Patterns:**
- **API Routes:** Try-catch wrapping business logic, returning standardized error response with `errorCode` and `message`
- **Query Wrappers:** Response guards validate API response schema before use, throw on mismatch
- **Error Context:** Global `useErrorHandler()` hook captures and broadcasts errors to ErrorBoundary
- **Conductor Pipeline:** Error classifier catches stage failures, analyzes error type, healing analyzer suggests fix, prompt patcher retries
- **Database:** Foreign key constraints prevent orphaned records, migrations use `addColumnIfNotExists()` to prevent breaking changes
- **Async Operations:** Abort controllers cancel in-flight requests on component unmount

## Cross-Cutting Concerns

**Logging:**
- Approach: Console logging + query pattern collection for schema intelligence
- Instrumented via `queryPatternCollector` wrapping database `prepare()` calls
- Timing metadata persists to `query_patterns` table for performance analysis

**Validation:**
- Approach: TypeScript types + response schema guards
- API responses validated against Zod schemas before reaching components
- Request params typed and validated at API route entry

**Authentication:**
- Approach: Environment-based provider credentials (Anthropic API key, etc.)
- No built-in user auth (assumes single-user development tool)
- Device identification via `os.hostname()` for multi-device external requirements syncing

**Caching:**
- Approach: React Query with stale-while-revalidate, prepared statement cache for database queries
- Query keys organized by entity and filters
- Cache bypass via `_t` timestamp parameter for forced refresh

**Performance:**
- Approach: Lazy loading features, virtualized lists (react-window), debounced polling
- Schema intelligence analyzes query patterns to identify bottlenecks
- Prepared statement cache reduces compilation overhead

**Theme System:**
- Approach: Purple/Cyan/Red theme tokens via `useThemeStore`
- Applied to design tokens, component styling, visual hierarchy

---

*Architecture analysis: 2026-03-14*
