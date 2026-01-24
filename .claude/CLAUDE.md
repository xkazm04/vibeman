# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vibeman** is an AI-driven development platform that automates the entire software development lifecycle using multiple specialized AI agents. It aims to boost personal productivity 100x-1000x through intelligent code analysis, idea generation, batch implementation, and automated testing.

**Tech Stack**: Next.js 16, React 19, TypeScript, SQLite/PostgreSQL, Tailwind CSS, Zustand, Framer Motion

**WARNING**: This is a localhost-only application that performs direct file system operations and database queries. It is designed for local development workflows and should NEVER be deployed to production environments accessible over the internet.

## Common Commands

### Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Type checking (use this to validate changes)
npx tsc --noEmit

# Type check specific files
npx tsc --noEmit path/to/file1.ts path/to/file2.tsx
```

### CI/CD Scripts
```bash
# Run automated refactor analysis in CI
npm run refactor:ci

# Create refactor PR
npm run create-refactor-pr
```

### Database Operations
- **NEW USER SETUP**: Database files (`.db`, `.db-shm`, `.db-wal`) are git-ignored
- Databases are automatically created on first application start
- Default location: `database/` directory (created automatically if doesn't exist)
- SQLite databases use WAL mode for better concurrency
- All tables created with `CREATE TABLE IF NOT EXISTS` pattern
- Migrations run automatically via `src/app/db/migrations/index.ts`
- **NO manual database setup required** - just run `npm run dev` and databases will initialize

## Architecture Overview

### Three-Layer Architecture

1. **Frontend Layer**: React components + Zustand stores
2. **API Layer**: 158+ API routes in `src/app/api/`
3. **Data Layer**: Multi-database support (SQLite/PostgreSQL) with abstracted driver pattern

### Path Aliases
- `@/*` resolves to `src/*`
- Example: `import { contextDb } from '@/app/db'`

### Core Architectural Patterns

#### Database Layer (`src/app/db/`)

**Multi-Database Driver Pattern**:
- Runtime database selection via `DB_DRIVER` env variable
- Primary: SQLite with WAL mode (better-sqlite3)
- Secondary: PostgreSQL with connection pooling
- Factory: `getDbDriver()` returns singleton driver instance
- Migrations: `runMigrations()` handles schema evolution

**Repository Pattern**:
Each entity has a dedicated repository in `src/app/db/repositories/`:
- `goalRepository` - Development goals/objectives
- `ideaRepository` - LLM-generated suggestions
- `contextRepository` - Code contexts and documentation
- `scanRepository` - Scan execution tracking with token counting
- `scanQueueRepository` - Background job management
- `implementationLogRepository` - Implementation history
- `testScenarioRepository` - Automated testing scenarios
- `techDebtRepository`, `securityPatchRepository`, `backlogRepository`, etc.

**Key Convention**: All repositories export standardized CRUD methods and use utilities from `repository.utils.ts` to reduce boilerplate.

**Token Tracking**: All scans record `input_tokens` and `output_tokens` for LLM cost analysis and billing.

#### State Management (`src/stores/`)

**21 Zustand Stores** organized by concern:
- **Core**: `contextStore`, `activeProjectStore`, `projectConfigStore`
- **Analysis**: `refactorStore`, `analysisStore`, `stateMachineStore`
- **UI/UX**: `tooltipStore`, `badgeStore`, `themeStore`, `decisionQueueStore`
- **Real-time**: `realtimeStore`, `serverProjectStore`, `unifiedProjectStore`

**Context Store Pattern**: `contextStore.ts` uses a custom listener-based implementation (not standard Zustand) with manual subscription system and `forceUpdate` hooks. It integrates with `contextAPI.ts` for database sync.

**Persist Middleware**: Stores use `persist()` middleware with standardized categories:
- `user_preference`: Always persist (theme, settings, projects)
- `session_work`: Persist wizard/queue progress, clear on project switch
- `cache`: Persist with TTL for fetched data (5 min default)
- `volatile`: Never persist (loading, errors, transient UI)

See `src/stores/PERSISTENCE_STRATEGY.md` for complete documentation and `src/stores/utils/persistence.ts` for helper utilities.

#### LLM Integration (`src/lib/llm/`)

**Unified LLM Manager** (`llm-manager.ts`):
- Multi-provider support: OpenAI, Anthropic (Claude), Google Gemini, Ollama (local), Internal API
- Runtime provider selection via `generate()` method
- Token counting per provider
- Progress streaming support
- Environment-based initialization (server vs client)

**Base Client Pattern**: All providers inherit from `BaseClient` with standard request/response interface, error handling, retry logic, and token counting.

**Common LLM Usage Patterns**:
1. Idea Evaluation: `ideaEvaluator.ts` uses Ollama to select best ideas
2. Package Generation: `packageGenerator.ts` uses Map-Reduce with LLMs
3. Blueprint Scans: Multiple scan types call different providers
4. Context Review: AI-generated context analysis
5. Test Design: LLM-generated test scenarios

### Feature Modules (`src/app/features/`)

Each feature is a standalone module with its own components, logic, and stores:

#### Blueprint (`Onboarding/sub_Blueprint/`)
- Comprehensive project analysis and setup wizard
- **Adapter Pattern**: Framework-specific scan strategies (Next.js, FastAPI, React Native) in `lib/adapters/`
- **Scan Types**: Build, Structure, Context, Vision (Playwright), Selector (test automation)
- **State Machine**: Workflow orchestration via `stateMachineInterpreter.ts`

#### Ideas System
- Continuous LLM-based suggestion generation with 12 specialized agents (zen_architect, bug_hunter, perf_optimizer, security_protector, etc.)
- Ideas evaluation via LLM to select best implementations
- **UI DSL**: Component descriptor system (`lib/uiDsl/RenderComponent.tsx`) for dynamic card rendering

#### RefactorWizard
- **Package-Based Refactoring**: Groups issues into strategic packages
- **Map-Reduce AI Pattern**:
  1. MAP: Local clustering by category/module/pattern
  2. REDUCE: LLM generates high-level strategy
  3. ASSIGN: Map issues to packages
- Dependency tracking, effort/impact estimation
- Generates requirements for Claude Code execution

#### TaskRunner
- Batch execution of Claude Code requirements
- Dual panel UI: batch selection + execution status
- Task statuses: queued, running, completed, failed, session-limit
- Integration with git, screenshots, requirement execution

#### ScanQueue
- Background job queue with progress tracking
- Auto-merge capability for accepted proposals
- File watch configuration for automatic triggers
- Real-time notifications for scan lifecycle events

#### Context Management
- Visual organization of code into "contexts" (business domains/features)
- Context groups with color coding
- Supports context files, preview images, test scenarios
- Integration with Goals system

#### Other Features
- `Goals` - Goal lifecycle management and timeline view
- `Annette` - Voice assistant with conversation memory
- `Concierge` - Feature request handling
- `TechDebtRadar` - Technical debt visualization
- `TestScenarioGenerator` - Automated test case generation

### API Routes (`src/app/api/`)

**Pattern**: Each route handles one resource with standard REST operations:
- GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletes
- Validation with `validateRequired()`
- Try/catch with `errorResponse()` handler
- Return `NextResponse.json()` with proper status codes

**Nested Routes for Related Operations**:
```
/api/ideas/
  ├── route.ts (CRUD)
  ├── vibeman/lib/ (ideaEvaluator, ideaHelpers)
  ├── update-implementation-status/route.ts
  └── tinder/route.ts

/api/scan-queue/
  ├── route.ts (queue management)
  ├── [id]/route.ts (specific item)
  ├── worker/route.ts (background processing)
  └── notifications/route.ts (event streaming)
```

**Claude Code Integration**:
- `/api/claude-code/route.ts` - Main requirement management interface
- `/api/claude-code/requirement/route.ts` - Requirement-specific operations

### Claude Code Integration (`src/app/Claude/`)

**Pattern: Requirement-Driven Automation**

1. Creates `.claude/` folder structure:
   - `requirements/` - Named requirement files
   - `logs/` - Execution logs
   - `settings.json` - Configuration

2. **Execution Pipeline**:
   - Build execution prompt with context (`executionPrompt.ts`)
   - Track file changes before/after execution
   - Auto-update contexts based on changed files (`contextAutoUpdate.ts`)
   - Maintain execution history

3. **Execution Queue**:
   - `claudeExecutionQueue.ts` - Manages async execution
   - `executionManager.ts` - Runs requirements
   - File change detection with snapshots

### Data Flow Pattern

**Typical Feature Flow**:
```
React Component
  ↓ (user action)
Zustand Store
  ↓ (action calls)
API Route `/api/...`
  ↓ (calls)
Repository (CRUD)
  ↓ (uses)
Database Driver (SQLite/PostgreSQL)
  ↓ (stores)
Database File/Server
```

**LLM Integration Flow**:
```
Feature/API Route
  → LLMManager.generate()
  → Provider Selection
  → Provider Client
  → API Call
  → Token Counting
  → Store Result
```

## Development Patterns

### When Adding New Features

1. **Database First**:
   - Define `DbXxx` type in `src/app/db/models/types.ts`
   - Create `xxxRepository.ts` with standard CRUD methods
   - Export from `src/app/db/index.ts` as `xxxDb`
   - Run migrations if schema changes needed

2. **State Management**:
   - Create Zustand store in `src/stores/xxx.ts`
   - Use `create()` with `persist()` middleware for appropriate state
   - Use `createPersistConfig()` from `utils/persistence.ts` for standardized config
   - Classify fields into persistence categories (user_preference, session_work, cache, volatile)
   - Always exclude loading/error states from persistence via `partialize`
   - Export hooks and types for components

3. **API Routes**:
   - Create route in `src/app/api/xxx/route.ts`
   - Use helper functions: `validateRequired()`, `successResponse()`, `errorResponse()`
   - Handle async errors with detailed messages

4. **Component Integration**:
   - Place in `src/app/features/XXX/` for major features
   - Use Zustand hooks to access state
   - Call API routes for data operations

### When Working with Scans

- Scans are tracked in `scans` table with token usage
- Queue items use `scan_queue` table with progress tracking
- Scan types defined in scan-specific adapters (Blueprint, Ideas, RefactorWizard)
- Always record `input_tokens` and `output_tokens` for cost analysis

### When Working with LLMs

- Use `llmManager.generate()` for all LLM calls
- Specify provider explicitly or use default
- Token counting is automatic
- For streaming, use `onProgress` callback
- For local/free runs, prefer Ollama provider

### When Working with Contexts

- Contexts represent code areas/features/business domains
- Use `contextStore` for state, `contextAPI` for database operations
- Context auto-update runs after Claude Code executions
- Contexts support files, previews, test scenarios, and goals

### File Organization

- Feature-specific code goes in `src/app/features/XXX/`
- Shared utilities in `src/lib/`
- Database logic in `src/app/db/`
- API routes in `src/app/api/`
- State stores in `src/stores/`
- UI components in `src/components/`

## Environment Configuration

Required environment variables (see `.env.example`):

**LLM Providers** (at least one required):
- `OPENAI_API_KEY` - OpenAI (GPT-4, GPT-3.5)
- `ANTHROPIC_API_KEY` - Anthropic Claude
- `GEMINI_API_KEY` - Google Gemini
- `OLLAMA_BASE_URL` - Local Ollama (default: http://localhost:11434)

**Optional Services**:
- `ELEVENLABS_API_KEY` - Voice assistant functionality
- `BROWSERBASE_API_KEY` - Automated testing and screenshots
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase integration

**Database**:
- `DATABASE_URL` - SQLite file path (default: ./data/vibeman.db)
- `DB_DRIVER` - Database driver: 'sqlite' or 'postgres'

## Testing

Currently no formal test suite is configured (no Jest/Vitest setup found).

**Manual Testing Approach**:
- Type checking: `npx tsc --noEmit`
- Run development server and test features manually
- Use RefactorWizard to identify code quality issues

## Key Technical Constraints

1. **Localhost Only**: Direct file system access, unsafe for public deployment
2. **Windows Environment**: Codebase developed on Windows (paths use backslashes in some areas)
3. **SQLite WAL Mode**: Concurrent reads/writes enabled, but single writer limitation applies
4. **Token Budget**: Track all LLM usage for cost monitoring
5. **Next.js 16 + React 19**: Using latest Next.js with Turbopack and React 19 features

## Critical Interdependencies

- **Database Layer** → Every feature depends on repositories
- **LLM Manager** → Analysis, Ideas, RefactorWizard, Blueprint scans all use it
- **Zustand Stores** → UI components depend heavily on state
- **API Routes** → Bridge between frontend and data layer
- **Integration Chain**: Blueprint Scans → Context Creation → Ideas Generation → Goal Selection → Task Scheduling → Claude Code Execution → Context Auto-Update

## Common Pitfalls

1. **Context Store**: Uses custom subscription system, not standard Zustand - don't treat it like other stores
2. **Path Separators**: Some code assumes Windows paths - use `path.join()` for cross-platform compatibility
3. **Database Drivers**: Always use driver abstraction, never import `better-sqlite3` directly
4. **Token Counting**: Must record tokens on ALL LLM calls for accurate cost tracking
5. **State Machine Transitions**: Blueprint workflow uses state machine - respect allowed transitions
6. **Async Errors**: API routes must handle errors with proper status codes and messages
7. **Store Persistence**: Never persist loading/error states, callback functions, or React nodes. Use `partialize` to exclude volatile fields

## Refactoring & Code Quality

- Use RefactorWizard for large-scale refactoring analysis
- CI script available: `npm run refactor:ci`
- Package-based approach groups related improvements
- Map-Reduce pattern scales to thousands of issues
- Auto-generates requirements for Claude Code execution
