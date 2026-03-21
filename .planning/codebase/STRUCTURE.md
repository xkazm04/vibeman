# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
vibeman/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API routes (40+ endpoints)
│   │   ├── db/                       # Database layer
│   │   │   ├── migrations/           # 54 migration files
│   │   │   ├── repositories/         # Data access objects
│   │   │   ├── models/               # Database type definitions
│   │   │   ├── drivers/              # Connection abstraction
│   │   │   ├── connection.ts         # Instrumented connection wrapper
│   │   │   ├── schema.ts             # Table initialization
│   │   │   └── index.ts              # Migration entry point
│   │   ├── features/                 # Feature modules (14+)
│   │   │   ├── Ideas/                # Idea generation & scanning
│   │   │   ├── TaskRunner/           # Task execution & external requirements
│   │   │   ├── Manager/              # Conductor autonomous pipeline
│   │   │   ├── Brain/                # Analytics & insights
│   │   │   ├── Context/              # Code context management
│   │   │   ├── Reflector/            # Code reflection
│   │   │   ├── Goals/                # Goal management
│   │   │   ├── Tinder/               # Idea swiping interface
│   │   │   ├── HallOfFame/           # Achievement tracking
│   │   │   ├── Social/               # Collaboration features
│   │   │   ├── Questions/            # Q&A system
│   │   │   ├── Integrations/         # External integrations
│   │   │   ├── Commander/            # Command palette
│   │   │   └── Overview/             # Dashboard
│   │   ├── lib/                      # Shared app logic
│   │   ├── docs/                     # Documentation pages
│   │   ├── ideas/                    # Idea routes & layout
│   │   ├── projects/                 # Project routes & layout
│   │   ├── runner/                   # Task runner routes
│   │   ├── reflector/                # Reflector routes
│   │   ├── tasker/                   # Tasker routes
│   │   ├── tinder/                   # Tinder routes
│   │   ├── zen/                      # Zen routes
│   │   ├── Claude/                   # Claude feature
│   │   ├── monitor/                  # Monitoring utilities
│   │   ├── layout.tsx                # Root layout (providers)
│   │   ├── page.tsx                  # Home page (module router)
│   │   ├── globals.css               # Global styles
│   │   └── favicon.ico
│   ├── components/                   # Reusable UI components
│   │   ├── Navigation/               # TopBar, PageTransition
│   │   ├── Modal/                    # Modal components
│   │   ├── ui/                       # Atomic UI elements
│   │   ├── charts/                   # D3/Recharts visualizations
│   │   ├── buttons/                  # Button variants
│   │   ├── cards/                    # Card components
│   │   ├── cli/                      # CLI terminal UI
│   │   ├── lazy/                     # Deferred/lazy components
│   │   ├── ErrorBoundary.tsx         # Error handling
│   │   ├── QueryProvider.tsx         # React Query setup
│   │   └── UnifiedWorkflow/          # Workflow orchestration
│   ├── hooks/                        # Custom React hooks
│   │   ├── usePolling.ts             # Unified polling hook
│   │   ├── useErrorHandler.ts        # Error handling hook
│   │   ├── useAIOperation.ts         # AI operation wrapper
│   │   ├── useBulkOperation.ts       # Bulk operations
│   │   ├── useContextMetadata.ts     # Context utilities
│   │   ├── useFocusHighlight.tsx     # Focus tracking
│   │   └── [15+ other hooks]
│   ├── stores/                       # Zustand state stores
│   │   ├── clientProjectStore.ts     # Active project & UI state
│   │   ├── onboardingStore.ts        # Module selection
│   │   ├── brainStore.ts             # Behavioral analytics
│   │   ├── contextStore.ts           # Context selection & data
│   │   ├── messageStore.ts           # Chat messages
│   │   ├── nodeStore.ts              # DAG node state
│   │   ├── annetteStore.ts           # Assistant state
│   │   ├── PERSISTENCE_STRATEGY.md   # Store design doc
│   │   └── [15+ other stores]
│   ├── lib/                          # Shared libraries
│   │   ├── queries/                  # API query wrappers
│   │   │   ├── goalQueries.ts
│   │   │   ├── contextQueries.ts
│   │   │   ├── ideaQueries.ts
│   │   │   └── [5+ other queries]
│   │   ├── api/                      # API integration helpers
│   │   ├── api-types/                # API response type definitions
│   │   ├── api-helpers/              # Response guards, error types
│   │   ├── ai/                       # AI client initialization
│   │   ├── claude-terminal/          # Multi-provider CLI management
│   │   ├── supabase/                 # Supabase integration
│   │   ├── brain/                    # Analytics algorithms
│   │   ├── analysis/                 # Code analysis utilities
│   │   ├── dag/                      # DAG (directed acyclic graph)
│   │   ├── db/                       # Database utilities
│   │   ├── constants/                # Constants & enums
│   │   ├── command/                  # Command dispatch system
│   │   ├── errorClassifier.ts        # Error classification logic
│   │   ├── dependencyScanner.ts      # Dependency analysis
│   │   ├── api-errors.ts             # Error type definitions
│   │   └── [20+ utility modules]
│   ├── types/                        # Shared TypeScript types
│   │   ├── index.ts                  # Core types (Project, Goal, etc.)
│   │   ├── signals.ts                # Signal types
│   │   ├── badges.ts                 # Badge definitions
│   │   └── ideaCategory.ts           # Idea category enums
│   ├── utils/                        # Utility functions
│   ├── helpers/                      # Helper functions
│   ├── contexts/                     # React context providers
│   ├── services/                     # Service layer
│   ├── prompts/                      # AI prompt templates
│   └── mcp-server/                   # Model Context Protocol server
├── scripts/                          # Build & automation scripts
├── tests/                            # Test files (Vitest)
│   ├── api/
│   ├── setup/                        # Test factories & setup
│   └── coverage/
├── public/                           # Static assets
│   ├── llm_icons/                    # Provider icons
│   ├── logo/
│   ├── screenshots/
│   └── patterns/
├── database/                         # Database files
├── data/
│   └── prompts/                      # Prompt data
├── docs/                             # Documentation
├── .planning/
│   └── codebase/                     # Generated analysis docs
├── .claude/                          # Claude metadata & skills
├── .github/                          # GitHub workflows
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── vitest.config.ts                  # Test runner config
└── next.config.mjs                   # Next.js config
```

## Directory Purposes

**`src/app/`**
- Purpose: Next.js App Router structure for pages, layouts, and API routes
- Contains: Route handlers, feature modules, database layer, core application logic
- Key files: `layout.tsx` (root layout with providers), `page.tsx` (module router)

**`src/app/api/`**
- Purpose: Server-side API endpoints implementing business logic
- Contains: 40+ route files organized by feature
- Key patterns: `/api/conductor/{run,status,config}` for autonomous pipeline, `/api/external-requirements/*` for external task processing

**`src/app/db/`**
- Purpose: Complete database abstraction and persistence layer
- Contains: Connection management, schema, migrations (54 files), repositories, driver abstraction
- Key pattern: `getConnection()` provides database interface, migrations auto-run on first initialization

**`src/app/features/`**
- Purpose: Self-contained feature modules with UI, logic, and state
- Contains: 14+ feature directories (Ideas, TaskRunner, Manager, Brain, etc.)
- Key pattern: Each feature has `[Name]Layout.tsx` as entry, `lib/` for business logic, `components/` for UI

**`src/components/`**
- Purpose: Reusable React components across application
- Contains: UI primitives, layout components, modals, forms, visualizations
- Key pattern: Components are feature-agnostic, accept data via props, dispatch to stores/hooks

**`src/hooks/`**
- Purpose: Custom React hooks encapsulating stateful logic
- Contains: 20+ hooks for API operations, polling, error handling, focus tracking
- Key pattern: Use query wrappers internally, return state and actions to components
- Key hook: `usePolling()` provides unified interval-based polling for real-time updates

**`src/stores/`**
- Purpose: Zustand state management with persistence
- Contains: 15+ stores for projects, UI state, analytics, chat, workflows
- Key pattern: Stores use `persist` middleware, integrate with `serverProjectStore` for data syncing
- Key store: `useClientProjectStore` consolidates project selection and UI state

**`src/lib/queries/`**
- Purpose: Type-safe API client wrappers with response validation
- Contains: Query keys, request/response types, fetch functions
- Key pattern: Each file exports `*Keys` for React Query, request/response types, and wrapped fetch function

**`src/lib/`**
- Purpose: Shared utilities, integrations, and algorithms
- Contains: AI clients, database utilities, analysis tools, API helpers, prompt templates
- Key modules: `claude-terminal/` (multi-provider CLI), `brain/` (analytics), `analysis/` (code analysis)

**`src/types/`**
- Purpose: Shared TypeScript type definitions
- Contains: Domain types (Project, Goal, Context), progress types, response types
- Key file: `index.ts` with core types used across application

**`src/app/db/migrations/`**
- Purpose: Schema versioning and incremental updates
- Contains: 54 migration files, each run exactly once via `_migrations_applied` tracking
- Key pattern: Use `addColumnIfNotExists()` to avoid breaking changes on other devices

**`src/app/db/repositories/`**
- Purpose: Data access objects encapsulating SQL for specific entities
- Contains: CRUD operations for goals, contexts, conductor runs, etc.
- Key pattern: Repositories handle snake_case ↔ camelCase conversion, execute raw SQL

**`src/app/features/Manager/lib/conductor/`**
- Purpose: Autonomous development pipeline orchestration
- Contains: Stages (Scout, Triage, Batch, Execute, Review), self-healing logic, balancing config
- Key files: `conductorOrchestrator.ts` (main execution), `types.ts` (type definitions)

**`src/app/features/TaskRunner/lib/`**
- Purpose: Task execution and external requirements handling
- Contains: External requirement pipeline, prompt templates, task runners
- Key files: `externalRequirementPipeline.ts` (execution flow), `externalPromptTemplate.ts` (prompts)

**`src/contexts/`**
- Purpose: React context providers for cross-app concerns
- Contains: ModalContext, ErrorContext, etc.
- Key pattern: Wrapped in root layout.tsx via providers

**`scripts/`**
- Purpose: Build-time and automation scripts
- Contains: Refactor CI scripts, PR creation, benchmark collection
- Key script: `refactor-ci.ts` for automated code improvements

**`tests/`**
- Purpose: Vitest unit and integration tests
- Contains: API tests, setup factories, coverage reports
- Key location: `tests/api/conductor/pipeline.test.ts` (14 conductor tests)

**`public/`**
- Purpose: Static assets served by Next.js
- Contains: LLM provider icons, logo, screenshots, UI patterns
- Key structure: `public/llm_icons/` for provider branding

**`.planning/codebase/`**
- Purpose: Generated analysis documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Used by: `/gsd:plan-phase` and `/gsd:execute-phase` commands

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout wrapping entire app with providers (QueryProvider, ErrorBoundary, ModalProvider, ControlPanelProvider, UnifiedWorkflowProvider)
- `src/app/page.tsx`: Home page implementing module router, switches between 14+ features based on `useOnboardingStore().activeModule`
- `src/app/db/drivers/index.ts`: Database initialization, creates connection on first access

**Configuration:**
- `package.json`: Dependencies, scripts, TypeScript overrides
- `tsconfig.json`: TypeScript compiler options
- `vitest.config.ts`: Test runner configuration
- `next.config.mjs`: Next.js build configuration
- `.env*`: Environment variables (never read/commit secrets)

**Core Logic:**
- `src/app/features/Manager/lib/conductor/conductorOrchestrator.ts`: 5-stage autonomous pipeline orchestration
- `src/app/features/TaskRunner/lib/externalRequirementPipeline.ts`: External task execution pipeline
- `src/lib/brain/`: Behavioral analytics and correlation algorithms
- `src/lib/errorClassifier.ts`: Error categorization for self-healing

**Testing:**
- `tests/api/conductor/pipeline.test.ts`: Conductor pipeline tests (14 tests)
- `tests/setup/`: Mock factories and test database setup

## Naming Conventions

**Files:**
- Components: PascalCase, `.tsx` extension (e.g., `TaskRunnerLayout.tsx`, `ErrorBoundary.tsx`)
- Hooks: camelCase with `use` prefix, `.ts` or `.tsx` (e.g., `usePolling.ts`, `useFocusHighlight.tsx`)
- Utils/Helpers: camelCase, `.ts` (e.g., `errorClassifier.ts`, `dependencyScanner.ts`)
- Types: camelCase, `*.ts` (e.g., `goalQueries.ts` exports Goal types)
- Stores: camelCase with `Store` suffix (e.g., `clientProjectStore.ts`, `brainStore.ts`)
- Tests: Matching source file + `.test.ts` or `.spec.ts` (e.g., `pipeline.test.ts`)

**Directories:**
- Features: PascalCase, mirroring exported component name (e.g., `Ideas/IdeasLayout.tsx`, `Manager/ManagerLayout.tsx`)
- API routes: kebab-case matching endpoint path (e.g., `/api/conductor/run` → `src/app/api/conductor/run/route.ts`)
- Utilities: camelCase (e.g., `src/lib/api-helpers/`, `src/utils/`)

**Database:**
- Tables: snake_case (e.g., `goals`, `contexts`, `conductor_runs`)
- Columns: snake_case (e.g., `project_id`, `order_index`, `created_at`)
- Migration files: `mXXX_description.ts` (e.g., `m001_init_tables.ts`, `m035_conductor_tables.ts`)

**Types & Constants:**
- Interfaces: PascalCase (e.g., `Project`, `Goal`, `PipelineRun`)
- Enums: PascalCase (e.g., `ProjectType`, `PipelineStage`)
- Type names: Suffix with purpose (e.g., `CreateGoalRequest`, `GoalResponse`, `DbGoal`)

**API Requests/Responses:**
- Request params: camelCase (e.g., `orderIndex`, `projectId`, `contextId`)
- Response bodies: camelCase (e.g., `activeProject`, `fileStructure`)
- Query keys: Array tuples (e.g., `['goals', projectId]`)

## Where to Add New Code

**New Feature:**
- Create directory: `src/app/features/[FeatureName]/`
- Add entry point: `src/app/features/[FeatureName]/[FeatureName]Layout.tsx`
- Add to module router: `src/app/page.tsx` switch case for `activeModule`
- Business logic: `src/app/features/[FeatureName]/lib/`
- Components: `src/app/features/[FeatureName]/components/`
- Feature store: `src/app/features/[FeatureName]/store/` or `src/stores/[featureName]Store.ts`

**New API Endpoint:**
- Create route: `src/app/api/[resource]/[id]/route.ts` following REST patterns
- Create query wrapper: `src/lib/queries/[resource]Queries.ts` with types
- Create types: `src/lib/api-types/[resource].ts` for request/response shapes
- Create repository: `src/app/db/repositories/[resource].repository.ts` if DB access needed

**New Component:**
- Reusable UI: `src/components/[Category]/[ComponentName].tsx`
- Feature-specific: `src/app/features/[Feature]/components/[ComponentName].tsx`
- Export from `index.ts` barrel files for cleaner imports

**New Hook:**
- Location: `src/hooks/use[HookName].ts` or `use[HookName].tsx`
- Follow pattern: Export hook function, optional context if needed
- Register polling: Use `usePolling()` for any interval-based updates

**New Utility/Helper:**
- Shared: `src/lib/[category]/[name].ts` (e.g., `src/lib/analysis/dependencyScanner.ts`)
- Feature-specific: `src/app/features/[Feature]/lib/[name].ts`
- Export from index file for batched imports

**Database Schema Change:**
- Create migration: `src/app/db/migrations/mXXX_description.ts`
- Use `addColumnIfNotExists()` helper to avoid breaking existing databases
- Update types: `src/app/db/models/types.ts` with new DbEntity interface
- Register migration: Add to `runMigrations()` in `src/app/db/migrations/index.ts` wrapped in `once()`

**New Store:**
- Create: `src/stores/[featureName]Store.ts`
- Use `create()` with `devtools`, `persist` middleware if UI state
- Export reusable actions, typed state interface
- If project-scoped: Integrate with `useClientProjectStore` for filtering

**New Test:**
- Unit test: `tests/[path]/[file].test.ts` matching source structure
- API test: `tests/api/[route]/[resource].test.ts`
- Use factory from `tests/setup/` for mock data
- Register Vitest with config: `vitest.config.ts`

## Special Directories

**`src/app/db/migrations/`**
- Purpose: Schema versioning, never directly modify database
- Generated: No, manually created
- Committed: Yes
- Pattern: Each migration wrapped in `once()` to prevent re-runs, tracked in `_migrations_applied` table

**`src/app/db/models/`**
- Purpose: TypeScript type definitions for database records
- Generated: No, manually maintained
- Committed: Yes
- Pattern: `DbXxx` interfaces mirror database schema (snake_case), converted to frontend types (camelCase)

**`database/`**
- Purpose: SQLite database file storage (development and testing)
- Generated: Yes, created on first app run
- Committed: No (in .gitignore)
- Pattern: `database/vibeman.db` for production, `database/test-*.db` for tests

**`.next/`**
- Purpose: Next.js build output
- Generated: Yes, by `next build`
- Committed: No (in .gitignore)

**`node_modules/`**
- Purpose: npm dependencies
- Generated: Yes, by `npm install`
- Committed: No (in .gitignore)

**`.planning/codebase/`**
- Purpose: Codebase analysis documentation generated by GSD tools
- Generated: Yes, by `/gsd:map-codebase`
- Committed: Yes
- Files: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`dist/`**
- Purpose: MCP server compiled output
- Generated: Yes, by `npm run build:mcp`
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-14*
