# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibeman is an intelligent development workflow platform built with Next.js 15, TypeScript, and React 19. It provides AI-powered automation, real-time project monitoring, and collaborative development tools for managing multiple development projects.

## Common Commands

### Development
```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Development Notes
- The dev server uses Turbopack for faster builds
- Hot reload is enabled by default
- Port conflicts are automatically detected and reported

## Architecture Overview

### Core Architecture Pattern

Vibeman uses a **multi-project orchestration** architecture where:
- Each project can have its own dev server running on a unique port
- A central ProcessManager (`src/lib/processManager.ts`) tracks and controls all running processes
- SQLite databases store persistent project state, goals, contexts, and events
- Zustand stores manage UI state with persistence

### Key System Components

#### 1. Process Management System
- **Location**: `src/lib/processManager.ts`
- **Purpose**: Singleton service that starts/stops development servers for managed projects
- **Key Features**:
  - Detects existing processes on startup via port scanning
  - Spawns `npm run dev` with custom ports
  - Captures and buffers stdout/stderr logs
  - Cross-platform support (Windows netstat, Unix lsof)
  - Graceful shutdown with fallback to force kill

#### 2. Database Layer
- **Primary DB**: `src/app/db/` - Modular SQLite database with goals, contexts, backlog items, events, scans, ideas, and implementation logs
- **Project DB**: `src/lib/project_database.ts` - Project registry and configurations
- **Monitor DB**: `src/lib/monitor_database.ts` - Real-time monitoring data
- **Architecture**: Each table has typed interfaces (e.g., `DbGoal`, `DbContext`) and a repository with CRUD operations (e.g., `goalDb`, `contextDb`)
- **Migration System**: Schema migrations run automatically on initialization via `runMigrations()`

#### 3. State Management (Zustand)
- **activeProjectStore** (`src/stores/activeProjectStore.ts`): Current project, file structure, active context
- **projectConfigStore**: Multi-project configurations
- State is persisted to localStorage via Zustand middleware
- File structures are NOT persisted (loaded on demand)

#### 4. LangGraph AI Integration
- **Location**: `src/lib/langgraph/`
- **Purpose**: Knowledge-base constrained AI assistant that answers questions using project data only
- **Architecture**:
  - Router analyzes user intent and maps to tools
  - Tools (in `tools/`) query database (goals, backlog, contexts, etc.)
  - LLM generates response ONLY from tool results (no general knowledge)
  - Supports multiple providers: Ollama, OpenAI, Anthropic, Gemini
- **Key Files**:
  - `index.ts`: Main orchestration and client selection
  - `langTypes.ts`: TypeScript types
  - `langTools.ts`: Tool definitions and execution
  - `langPrompts.ts`: System prompts enforcing KB-only responses
  - `tools/toolsReadOnly.ts`: Read-only tools (goals, contexts, backlog)
- **API Endpoint**: `POST /api/lang` (see `src/app/api/lang/route.ts`)

#### 5. File Structure & Context System
- Projects have a hierarchical file structure stored as `TreeNode` objects
- **Contexts**: Groups of related files with AI-generated documentation
  - Can belong to **Context Groups** for organization
  - Support `.context` files for persistent documentation
  - Stored in `contexts` and `context_groups` tables
- **Goals**: Development objectives linked to projects and optionally to contexts
  - Five states: `open`, `in_progress`, `done`, `rejected`, `undecided`
  - Ordered list per project

### Important Architectural Patterns

#### Multi-Project Support
Projects are defined with:
```typescript
interface Project {
  id: string;
  name: string;
  path: string;           // Absolute filesystem path
  port: number;           // Dev server port
  type?: 'nextjs' | 'fastapi' | 'other';
  relatedProjectId?: string;  // For linking frontend/backend
  git?: {                 // Optional Git integration
    repository: string;
    branch: string;
    autoSync?: boolean;
  };
  runScript?: string;     // Custom run command
}
```

#### Background Task Queue
- **Location**: `src/lib/claudeTaskManager.ts`
- **Purpose**: Queue system for long-running AI operations (context generation, project analysis)
- **Pattern**: Tasks are queued to SQLite, processed sequentially, with retry logic
- **API**: `POST /api/kiro/background-tasks` and `POST /api/kiro/start-queue`

#### API Route Organization
All API routes are under `src/app/api/` using Next.js App Router conventions:
- `/api/projects/*` - Project management
- `/api/server/*` - Process lifecycle (start/stop/status)
- `/api/goals/*` - Goal CRUD
- `/api/contexts/*` - Context CRUD
- `/api/context-groups/*` - Context group management
- `/api/backlog/*` - Backlog/task management
- `/api/kiro/*` - AI orchestration and background tasks
- `/api/lang/*` - LangGraph AI assistant
- `/api/monitor/*` - Real-time monitoring data

Full endpoint documentation: `docs/API_ENDPOINTS.md`

### Path Alias Configuration

TypeScript path alias `@/*` maps to `./src/*` (defined in `tsconfig.json`).

Always use the `@/` alias for imports:
```typescript
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { goalDb } from '@/app/db';
```

### UI Architecture

The main layout (`src/app/page.tsx`) composes:
- **CoderLayout**: File explorer, context manager, goals panel, code editor
- **MonitorLayout**: Event logs and background task monitoring (combined footer panel)
- **ProjectManagerPanel**: Floating panel for switching projects

Components use:
- **Framer Motion** for animations
- **React Query** for server state
- **Monaco Editor** for code editing
- **Resizable Panels** for flexible layouts

### Database Schema Key Points

#### Goals Table
- `context_id` is optional (nullable foreign key to contexts)
- `status` constraint: `'open' | 'in_progress' | 'done' | 'rejected' | 'undecided'`
- Ordered by `order_index` per project

#### Contexts Table
- `group_id` is optional (contexts can exist without groups)
- `file_paths` is JSON string array
- `has_context_file` boolean flag (0/1)
- `context_file_path` stores path to generated `.context` file

#### Backlog Items Table
- Links to goals via `goal_id` (nullable)
- `agent` field: `'developer' | 'mastermind' | 'tester' | 'artist' | 'custom'`
- `impacted_files` is JSON string of `ImpactedFile[]`
- `type`: `'proposal' | 'custom'`

### Important Implementation Details

#### ProcessManager Port Detection
On Windows, uses `netstat -ano | findstr :PORT` and parses PID from output.
On Unix, uses `lsof -t -i :PORT` which directly returns PID.

#### Cross-Platform Process Control
- Windows: `taskkill /PID X /T /F` for force kill
- Unix: `kill -TERM X` for graceful, `kill -KILL X` for force

#### Database Connection Management
- Each database module exports a singleton getter function (e.g., `getDatabase()`)
- Connections use WAL mode for concurrent access
- Cleanup handlers registered for `exit`, `SIGINT`, `SIGTERM`

#### Monaco Editor Integration
File editing uses `@monaco-editor/react` with:
- Syntax highlighting via Monaco's built-in language support
- Diff viewer for code review workflows
- Side-by-side multi-file editing

### LangGraph Integration Specifics

When using LangGraph (`/api/lang`):
1. Always provide `projectId` - required for tool execution
2. Use `projectContext` object to pass additional metadata
3. Check `needsConfirmation` flag for destructive operations
4. Monitor `confidence` score (0-100) for response quality
5. Inspect `toolsUsed` array to see which KB tools were invoked

Example request:
```typescript
const response = await fetch('/api/lang', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "How many goals does this project have?",
    projectId: "project-123",
    provider: "gemini",
    model: "gemini-flash-latest",
    projectContext: { name: "My Project" }
  })
});
```

## Testing and Debugging

### Process Status Debugging
- `GET /api/server/status` - Get all process statuses
- `GET /api/server/logs/[id]` - Get logs for a specific process
- `GET /api/server/debug` - Debug endpoints index
- `POST /api/server/debug/scan-ports` - Scan for in-use ports

### Database Debugging
The database modules log migration progress and errors to console. Check server logs when:
- Schema changes are made
- New columns are added
- Foreign key relationships change

### Background Task Monitoring
- `GET /api/kiro/background-tasks` - List all queued/running tasks
- `POST /api/kiro/start-queue` - Manually start queue processor
- Tasks are stored in `database/background_tasks.db`

## Key Dependencies

- **Next.js 15** with App Router and React 19
- **better-sqlite3** for local data persistence
- **Zustand** for state management
- **@tanstack/react-query** for server state
- **@monaco-editor/react** for code editing
- **framer-motion** for animations
- **openai** SDK for LLM integration
- **@modelcontextprotocol/sdk** for MCP support

## Important Conventions

### Error Handling Pattern
API routes should:
1. Validate inputs at the top
2. Use try-catch blocks
3. Return structured errors: `{ error: string, details?: any }`
4. Log errors with context

### Component Organization
- Feature components in `src/app/[feature]/` (e.g., `coder/`, `monitor/`)
- Shared components in `src/components/`
- Shared features in `src/app/features/`

### Type Definitions
- Shared types in `src/types/index.ts`
- Database types defined inline in database modules (e.g., `DbGoal`, `DbContext`)
- LangGraph types in `src/lib/langgraph/langTypes.ts`

## Git Integration

Projects can specify Git configuration:
- Auto-clone repositories on project creation
- Auto-sync (pull) on server start
- Manual pull via `POST /api/server/git/pull`
- Status check via `POST /api/server/git/status`

Git operations use the `gitManager` service (`src/lib/gitManager.ts`).

## LLM Provider Configuration

The app supports multiple LLM providers:
- **Ollama**: Local models (default: `gpt-oss:20b`)
- **OpenAI**: Cloud API (default: `gpt-4o`)
- **Anthropic**: Claude models (default: `claude-sonnet-4-20250514`)
- **Gemini**: Google models (default: `gemini-flash-latest`)

LLM client abstraction in `src/lib/llm/` with unified interface.

## Documentation References

- **LangGraph Quick Reference**: `docs/LANGGRAPH_QUICK_REFERENCE.md`
- **LangGraph Tools**: `docs/LANGGRAPH_TOOLS.md`
- **API Endpoints**: `docs/API_ENDPOINTS.md`
- **Voicebot Guide**: `docs/VOICEBOT_GUIDE.md`
- **README**: `README.md` (high-level overview)
