# Vibeman - High-Level Project Documentation

## Overview

**Vibeman** is an intelligent development workflow platform that amplifies personal productivity in software development by 100x-1000x through AI-powered automation. It transforms the entire software development lifecycle—from idea brainstorming and code analysis to automated implementation and testing—enabling developers to manage multiple projects with unprecedented efficiency.

### Key Value Proposition
- **AI-Driven Automation**: Leverages Claude Code for autonomous multi-stream batch code pipelines
- **Intelligent Context Management**: Organizes large codebases into instantly viewable, AI-composed contexts
- **Multi-Project Orchestration**: Manages multiple development projects simultaneously with dedicated dev servers
- **Real-Time Monitoring**: Tracks project events, scan results, and implementation progress in real-time

### Target Users
- **Solo Developers**: Who want to amplify their output without sacrificing quality
- **Technical Leads**: Managing multiple projects and codebases simultaneously
- **Development Teams**: Seeking automated code analysis, refactoring, and documentation generation
- **Product Managers**: Who need high-level visibility into development velocity and technical decisions

### Primary Goals
1. Generate 100x-1000x more code than manual development through AI automation
2. Produce valuable, creative ideas through structured multi-dimensional analysis
3. Maintain code quality at scale through automated testing and validation
4. Provide mental clarity for rapid development through intuitive UI and AI assistance

---

## Architecture & Tech Stack

### Core Technologies

**Frontend Framework**
- **Next.js 16** (App Router) - Full-stack React framework with server and client components
- **React 19** - Latest React features with improved concurrent rendering
- **TypeScript 5** - Type-safe development across the entire codebase
- **Tailwind CSS 4** - Utility-first styling with custom design system

**State Management**
- **Zustand** - Lightweight, unopinionated state management with persistence middleware
- **React Query** (@tanstack/react-query) - Server state synchronization and caching

**UI & Animation**
- **Framer Motion** - Declarative animations and transitions throughout the app
- **Lucide React** - Consistent icon library (700+ icons)
- **Monaco Editor** - Full-featured code editor with syntax highlighting

**Database & Persistence**
- **SQLite** with Better-SQLite3 - Local-first data persistence with WAL mode
- **Multiple Specialized DBs**: Goals, Projects, Monitoring, Events, Ideas, Scans

**AI & LLM Integration**
- **Multi-Provider Support**: Ollama (local), OpenAI, Anthropic Claude, Google Gemini
- **LangGraph** - Orchestrates knowledge-base constrained AI assistant
- **Claude Code Integration** - Autonomous code generation and task execution

**Process Management**
- **Node.js Child Processes** - Spawns and manages dev servers for multiple projects
- **Cross-Platform Support** - Windows (netstat) and Unix (lsof) process detection

### Architecture Pattern

Vibeman implements a **multi-project orchestration architecture** with these core principles:

1. **Singleton Process Manager** - Central service controlling all development servers
2. **Modular Database Layer** - Separate SQLite databases for different concerns (goals, projects, monitoring)
3. **Repository Pattern** - Type-safe CRUD operations abstracted from UI components
4. **Feature-Based Organization** - Self-contained feature modules with components, lib, and types
5. **Client-First Design** - Heavy client-side state with selective server interactions

### Key Architectural Components

#### 1. Process Management System
**Location**: `src/lib/processManager.ts`

The ProcessManager is a singleton service that orchestrates development servers across multiple projects:

- **Port Detection**: Scans existing processes on startup (Windows: netstat, Unix: lsof)
- **Process Spawning**: Launches `npm run dev` for each project on unique ports
- **Log Buffering**: Captures stdout/stderr with configurable buffer size (100 lines)
- **Graceful Shutdown**: SIGTERM with fallback to SIGKILL after timeout
- **Cross-Platform**: Handles Windows (`taskkill`) and Unix (`kill`) process control

```typescript
// Singleton pattern ensures single instance
const processManager = ProcessManager.getInstance();
await processManager.initialize();
await processManager.startProcess(projectId, projectPath, port);
```

#### 2. Database Layer Architecture

**Primary Database**: `database/goals.db`
- Goals, Contexts, Context Groups
- Scans, Ideas, Backlog Items
- Implementation Logs, Feature Requests
- Tech Debt, Conversations

**Project Database**: `database/projects.db`
- Project registry with configurations
- Git integration settings
- Related project linking

**Monitor Database**: `database/monitor.db`
- Real-time events and metrics
- Process status tracking

**Events Database**: `database/events.db`
- System-wide event logging
- Audit trail for all actions

**Migration System**:
```typescript
// Automatic migrations on initialization
initializeTables() -> runMigrations()
```

Each table has:
- Typed interfaces (e.g., `DbGoal`, `DbContext`, `DbIdea`)
- Repository with CRUD operations (e.g., `goalDb`, `contextDb`, `ideaDb`)
- Foreign key relationships with cascade/set null rules

#### 3. State Management (Zustand)

**Store Architecture**:
```
activeProjectStore         → Current project, file structure, active context
projectConfigStore        → Multi-project configurations with persistence
unifiedProjectStore       → Cross-store project synchronization
contextStore             → Context groups, colors, metadata
blueprintStore           → Onboarding scan state
onboardingStore          → Module navigation state
refactorStore            → Code refactoring workflow state
themeStore               → UI theming (Annette voice assistant)
testResultStore          → Test execution results
```

**Persistence Strategy**:
- LocalStorage middleware for UI preferences
- SQLite for domain data (goals, contexts, ideas)
- File structures loaded on-demand, not persisted

#### 4. LangGraph AI Integration

**Location**: `src/lib/langgraph/`

LangGraph provides a **knowledge-base constrained AI assistant** that answers questions using ONLY project data:

```
User Question
    ↓
Router (analyzes intent)
    ↓
Tool Selection (goals, contexts, backlog, scans, ideas)
    ↓
Tool Execution (queries SQLite databases)
    ↓
LLM Response Generation (constrained to tool results)
    ↓
Structured Response
```

**Key Features**:
- **No General Knowledge**: Answers derived exclusively from project databases
- **Multi-Provider**: Supports Ollama, OpenAI, Anthropic, Gemini
- **Tool System**: Modular read-only tools for different data sources
- **Confidence Scoring**: Each response includes confidence percentage
- **Confirmation Flow**: Destructive operations require explicit user approval

**API Endpoint**:
```typescript
POST /api/lang
{
  message: "How many goals does this project have?",
  projectId: "project-123",
  provider: "gemini",
  model: "gemini-flash-latest",
  projectContext: { name: "My Project" }
}
```

#### 5. Context Management System

**Contexts** organize related files into documented units:

- **File Groups**: Collections of related source files
- **AI-Generated Docs**: Automatic context documentation via LLM analysis
- **Context Groups**: Higher-level organization with color coding
- **.context Files**: Persistent markdown documentation
- **Goal Linking**: Contexts can be associated with specific goals

**Database Schema**:
```sql
contexts
  ├─ id (TEXT PRIMARY KEY)
  ├─ project_id (TEXT NOT NULL)
  ├─ group_id (TEXT, optional)
  ├─ name (TEXT NOT NULL)
  ├─ description (TEXT)
  ├─ file_paths (TEXT, JSON array)
  ├─ has_context_file (INTEGER, boolean flag)
  └─ context_file_path (TEXT)
```

---

## Features & Capabilities

### 1. The Blueprint - Project Analysis Suite

A comprehensive scanning system for code understanding and improvements:

**Scan Types**:
- **High-Level Documentation**: Generates project overviews from codebase analysis
- **Feature Scan**: Identifies existing features and capabilities across contexts
- **Structure Scan**: Maps file organization, dependencies, and architecture
- **Build Scan**: Analyzes build configurations and dependencies
- **Vision Scan**: Creates forward-looking architectural documentation
- **Photo Scan**: Generates visual previews of UI components
- **Contexts Scan**: Automatically discovers logical code groupings
- **Unused Code Scan**: Detects dead code and unused dependencies

**Worker-Based Architecture**:
```typescript
// Scans run in Web Workers for non-blocking execution
POST /api/blueprint/scans/contexts
POST /api/blueprint/scans/structure
POST /api/blueprint/scans/vision
```

**Predictive Scheduling**:
- ML-based scan recommendations
- Automatic scheduling based on code change patterns
- Due scan notifications

### 2. Idea Generation & Tinder Interface

AI-powered idea generation with swipe-based evaluation:

**Idea Generation**:
- **Multi-Perspective Analysis**: 8 specialized analysis types (architecture, bugs, performance, security, etc.)
- **Context-Aware**: Analyzes specific code contexts for targeted ideas
- **Batch Processing**: Queue-based system for scanning multiple contexts
- **Provider Flexibility**: Choose between local (Ollama) or cloud LLMs

**Tinder Interface**:
- **Swipe-to-Accept/Reject**: Intuitive gesture-based idea evaluation
- **Drag Physics**: Smooth Framer Motion animations for card interactions
- **Status Tracking**: Pending → Accepted → Implemented workflow
- **Delete Option**: Remove irrelevant or duplicate ideas

**Database Flow**:
```
Scan → Ideas Generated → Ideas Table
  ↓
User Swipes (Tinder)
  ↓
Status Updated (accepted/rejected)
  ↓
Accepted Ideas → Implementation Queue
```

### 3. Goal & Task Management

Structured goal tracking with implementation logging:

**Goal System**:
- **Five States**: `open`, `in_progress`, `done`, `rejected`, `undecided`
- **Context Linking**: Goals can be associated with specific code contexts
- **Ordered Lists**: Drag-and-drop prioritization per project
- **Implementation Logs**: Detailed tracking of requirement execution

**Backlog System**:
- **Agent-Based**: Developer, Mastermind, Tester, Artist, Custom agents
- **Goal Linking**: Backlog items connect to parent goals
- **Impacted Files**: JSON-stored list of affected files per item
- **Proposal Workflow**: Proposal → Accepted → In Progress

### 4. Context Management

Visual file organization with AI-generated documentation:

**Features**:
- **Horizontal Context Bar**: Quick-access context selector with visual indicators
- **Context Groups**: Color-coded organizational categories (3×3 palette)
- **File Path Management**: Select and organize files within contexts
- **Auto-Documentation**: Generate context descriptions via LLM analysis
- **Preview Images**: Optional visual representations of contexts
- **Test Scenarios**: Automated screenshot generation for UI contexts

**UI Components**:
- `ContextSelector`: Dropdown with search and filtering
- `ContextJailCard`: Visual context representation with metrics
- `ContextGroupManager`: CRUD operations for groups
- `HorizontalContextBar`: Main navigation interface

### 5. Task Runner (Tasker)

Batch execution of Claude Code requirements:

**Capabilities**:
- **Requirement Loading**: Fetch requirements from multiple projects
- **Multi-Selection**: Select multiple requirements for batch execution
- **Async Execution**: Non-blocking task execution with status polling
- **Progress Tracking**: Real-time status updates (idle, queued, running, completed, failed)
- **Session Limits**: Graceful handling of API rate limits
- **Requirement Management**: Delete, reload, and organize requirements

**Workflow**:
```
Load Requirements → Select → Execute Async → Poll Status → Complete
```

### 6. Refactor Wizard

Step-by-step code refactoring workflow:

**Steps**:
1. **Scan**: Analyze codebase for refactoring opportunities
2. **Review**: Examine findings and select targets
3. **Configure**: Set refactoring parameters and scope
4. **Execute**: Run refactoring scripts
5. **Results**: View changes and verify outcomes

**State Management**:
```typescript
// Zustand store tracks wizard progress
refactorStore: {
  currentStep: 'scan' | 'review' | 'configure' | 'execute' | 'results',
  findings: RefactorFinding[],
  selectedFindings: string[],
  executionResults: RefactorResult[]
}
```

### 7. Annette Voice Assistant

Conversational AI interface with voice interaction:

**Features**:
- **Speech Recognition**: Browser-based Web Speech API integration
- **Text-to-Speech**: Server-side TTS with caching
- **LangGraph Integration**: Context-aware responses using project knowledge
- **Visual Feedback**: Neon status indicators and real-time waveform visualization
- **Session History**: Replay past conversations
- **Response Caching**: Reduces API calls for repeated queries

**Components**:
- `AnnettePanel`: Main orchestrator component
- `NeonStatusDisplay`: Visual status indicators (idle, listening, speaking, error)
- `VoiceVisualizer`: Real-time audio waveform using Canvas API
- `ChatDialog`: Text-based alternative interface

**API Endpoints**:
```typescript
POST /api/annette/chat        // Send message, get AI response
POST /api/annette/next-step   // Get recommended scan
GET  /api/annette/scan-briefing  // Generate status summary
POST /api/annette/analytics   // Log command execution
```

### 8. Reflection Dashboard

Analytics and insights for idea acceptance and scan effectiveness:

**Visualizations**:
- **Acceptance Chart**: Idea acceptance rates over time
- **Effort-Impact Matrix**: 2D visualization of idea prioritization
- **Scan Type Cards**: Performance metrics per scan type
- **Filter Panel**: Date range, scan type, and status filters

**Use Cases**:
- Identify high-impact, low-effort ideas for prioritization
- Analyze which scan types produce most valuable ideas
- Track acceptance patterns over time
- Optimize scan strategy based on historical data

### 9. Documentation Explorer

Browse and search project documentation:

**Features**:
- **Context-Based Docs**: View documentation by context
- **Markdown Rendering**: Rich text display with syntax highlighting
- **Search & Filter**: Quick navigation through large doc sets
- **Auto-Generated Content**: Docs created from code analysis

### 10. Monitoring & Events

Real-time visibility into system operations:

**Event System**:
- **Event Types**: `info`, `warning`, `error`, `success`, `proposal_accepted`, `proposal_rejected`
- **Agent Attribution**: Track which agent/system generated each event
- **Event Bar Chart**: Visual representation of event frequency
- **Project-Scoped**: Events filtered by active project

**Monitoring Dashboard**:
- Process status indicators
- Log streaming from dev servers
- Error aggregation and alerting
- Performance metrics

---

## Project Structure

### Directory Organization

```
vibeman/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main entry point (module router)
│   │   ├── api/                      # API routes
│   │   │   ├── annette/             # Voice assistant endpoints
│   │   │   ├── blueprint/           # Scan management
│   │   │   ├── contexts/            # Context CRUD
│   │   │   ├── goals/               # Goal management
│   │   │   ├── ideas/               # Idea operations
│   │   │   ├── kiro/                # Background tasks
│   │   │   ├── lang/                # LangGraph AI
│   │   │   ├── projects/            # Project management
│   │   │   └── server/              # Process control
│   │   ├── db/                      # Database layer
│   │   │   ├── drivers/             # Database drivers
│   │   │   ├── models/              # Type definitions
│   │   │   ├── repositories/        # Data access layer
│   │   │   ├── migrations/          # Schema migrations
│   │   │   ├── connection.ts        # DB connection singleton
│   │   │   ├── schema.ts            # Table definitions
│   │   │   └── index.ts             # Public API
│   │   └── features/                # Feature modules
│   │       ├── Annette/             # Voice assistant
│   │       ├── Context/             # Context management
│   │       ├── Goals/               # Goal tracking
│   │       ├── Ideas/               # Idea generation
│   │       ├── Onboarding/          # Blueprint onboarding
│   │       ├── Reflector/           # Analytics dashboard
│   │       ├── RefactorWizard/      # Refactoring workflow
│   │       ├── TaskRunner/          # Batch execution
│   │       └── tinder/              # Idea swipe interface
│   ├── components/                   # Shared UI components
│   │   ├── Navigation/              # Nav elements
│   │   └── ui/                      # Reusable UI primitives
│   ├── lib/                         # Shared libraries
│   │   ├── langgraph/               # LangGraph integration
│   │   ├── llm/                     # LLM provider abstraction
│   │   ├── processManager.ts        # Process orchestration
│   │   ├── project_database.ts      # Project DB access
│   │   └── monitor_database.ts      # Monitoring DB access
│   ├── stores/                      # Zustand state stores
│   │   ├── activeProjectStore.ts
│   │   ├── projectConfigStore.ts
│   │   ├── contextStore.ts
│   │   ├── blueprintStore.ts
│   │   ├── onboardingStore.ts
│   │   └── refactorStore.ts
│   └── types/                       # Shared TypeScript types
│       └── index.ts
├── database/                         # SQLite database files
│   ├── goals.db                     # Goals, contexts, ideas
│   ├── projects.db                  # Project registry
│   ├── monitor.db                   # Monitoring data
│   └── events.db                    # Event log
├── public/                          # Static assets
├── docs/                            # Documentation
│   ├── API_ENDPOINTS.md
│   ├── LANGGRAPH_QUICK_REFERENCE.md
│   ├── LANGGRAPH_TOOLS.md
│   ├── VOICEBOT_GUIDE.md
│   └── CI_CD_REFACTOR.md
├── scripts/                         # Build and automation scripts
├── context/                         # Generated context docs
│   └── high.md                      # This file
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

### Key Files by Purpose

**Entry Points**:
- `src/app/page.tsx` - Main app entry, module router
- `src/app/layout.tsx` - Root layout with providers
- `src/middleware.ts` - Next.js middleware (if present)

**Core Services**:
- `src/lib/processManager.ts` - Dev server orchestration (500+ lines)
- `src/lib/project_database.ts` - Project registry access
- `src/lib/langgraph/index.ts` - LangGraph orchestration
- `src/app/db/schema.ts` - Database schema definitions

**Feature Modules** (Self-Contained):
```
src/app/features/<FeatureName>/
├── components/          # UI components
├── lib/                # Business logic, utilities
├── <Feature>Layout.tsx # Main container
└── index.ts           # Public exports
```

**State Stores**:
- Each store follows the pattern: `create<Name>Store(persist(...))`
- Stores export hooks: `useStoreName()`
- Type-safe selectors and actions

**API Routes** (Next.js App Router):
```
src/app/api/<domain>/<operation>/route.ts
  ↓
export async function GET(request: NextRequest)
export async function POST(request: NextRequest)
```

### Module Interaction Flow

```
User Interface (React Components)
    ↓
Zustand Stores (State Management)
    ↓
API Routes (/api/*)
    ↓
Repositories (Database Layer)
    ↓
SQLite Databases (Persistence)

External Services:
- LLM Providers (OpenAI, Anthropic, Ollama, Gemini)
- Process Manager (Child Process Spawning)
- File System (Code Analysis, Context Loading)
```

---

## Development Workflow

### Running the Project

**Development Server**:
```bash
npm run dev          # Start Next.js dev server with Turbopack
# Server runs on http://localhost:3000 (default)
# Turbopack provides faster builds and HMR
```

**Production Build**:
```bash
npm run build        # Build optimized production bundle
npm run start        # Start production server
```

**Linting & Type Checking**:
```bash
npm run lint         # ESLint with Next.js config
npx tsc --noEmit     # TypeScript type checking
```

### Build Process

**Turbopack** (Next.js 16 default):
- Faster cold starts than Webpack
- Optimized HMR (Hot Module Replacement)
- Incremental compilation
- Parallel build processes

**Output Structure**:
```
.next/
├── static/          # Static assets
├── server/          # Server-side code
└── cache/           # Build cache
```

### Database Migrations

**Automatic Migration System**:
```typescript
// On app initialization
initializeTables()
  ↓
runMigrations()
  ↓
Apply pending schema changes
```

**Migration Pattern**:
```typescript
// src/app/db/migrations/index.ts
export function runMigrations(db: DatabaseConnection) {
  const version = getCurrentVersion(db);

  if (version < 1) migration001_add_token_columns(db);
  if (version < 2) migration002_normalize_contexts(db);
  // ... incremental migrations

  setVersion(db, LATEST_VERSION);
}
```

**Adding New Migrations**:
1. Create migration function in `migrations/index.ts`
2. Add conditional execution based on version
3. Update `LATEST_VERSION` constant
4. Test migration on copy of production DB

### Testing Approach

**Current State**: Manual testing with planned automated test suite

**Planned Testing Strategy**:
- **Unit Tests**: Jest for utility functions and business logic
- **Component Tests**: React Testing Library for UI components
- **Integration Tests**: Playwright for end-to-end workflows
- **Test Identifiers**: `data-testid` attributes on interactive elements

**Test Structure** (Planned):
```
tests/
├── unit/
│   ├── lib/
│   └── db/
├── integration/
│   └── api/
└── e2e/
    └── features/
```

### Development Best Practices

**Code Organization**:
- Feature modules are self-contained (components, lib, types)
- Shared utilities in `src/lib/`
- Reusable UI components in `src/components/ui/`
- Database access through repositories only

**TypeScript Patterns**:
- Strict mode enabled
- Interface-first design for data models
- Type exports from barrel files (`index.ts`)
- No `any` types in production code

**State Management**:
- Zustand for UI state (lightweight, performant)
- React Query for server state (caching, invalidation)
- LocalStorage persistence for user preferences
- SQLite for domain data

**Component Patterns**:
- Functional components with hooks
- `'use client'` directive for client-side features
- Framer Motion for animations
- Lucide React for icons

**Error Handling**:
```typescript
// API routes
try {
  // ... operation
  return NextResponse.json({ success: true, data });
} catch (error) {
  return NextResponse.json(
    { success: false, error: error.message },
    { status: 500 }
  );
}
```

**Path Aliases**:
```typescript
// tsconfig.json: "@/*" maps to "./src/*"
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { goalDb } from '@/app/db';
```

---

## Design Patterns & Best Practices

### 1. Singleton Pattern

**ProcessManager** ensures single instance across the application:
```typescript
class ProcessManager {
  private static instance: ProcessManager;

  static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }
}
```

**Database Connections** use singleton pattern:
```typescript
// src/app/db/connection.ts
let dbInstance: Database | null = null;

export function getConnection(): Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL'); // Write-Ahead Logging
  }
  return dbInstance;
}
```

### 2. Repository Pattern

**Data Access Abstraction**:
```typescript
// src/app/db/repositories/goal.repository.ts
export const goalDb = {
  getGoalsByProject(projectId: string): DbGoal[] {
    return db.prepare('SELECT * FROM goals WHERE project_id = ?').all(projectId);
  },

  createGoal(goal: Omit<DbGoal, 'created_at' | 'updated_at'>): DbGoal {
    const stmt = db.prepare('INSERT INTO goals (...) VALUES (...)');
    stmt.run(...);
    return this.getGoalById(goal.id);
  },

  updateGoal(id: string, updates: Partial<DbGoal>): void { /* ... */ },
  deleteGoal(id: string): void { /* ... */ }
};
```

**Benefits**:
- Type-safe database operations
- SQL queries isolated from UI code
- Easy to mock for testing
- Consistent error handling

### 3. Feature Module Pattern

**Self-Contained Features**:
```
feature/
├── components/           # UI components (React)
│   ├── FeatureCard.tsx
│   ├── FeatureModal.tsx
│   └── index.ts         # Re-exports
├── lib/                 # Business logic
│   ├── api.ts          # API wrappers
│   ├── types.ts        # Type definitions
│   ├── utils.ts        # Helper functions
│   └── index.ts        # Re-exports
├── FeatureLayout.tsx   # Main container
└── index.ts           # Public API
```

**Benefits**:
- Clear boundaries between features
- Easy to locate related code
- Prevents circular dependencies
- Simplifies code splitting

### 4. Observer Pattern (Zustand)

**Reactive State Management**:
```typescript
// Store definition
export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set, get) => ({
      activeProject: null,
      setActiveProject: (project) => set({ activeProject: project }),
      // ... other actions
    }),
    { name: 'active-project-storage' }
  )
);

// Component usage
function ProjectSelector() {
  const { activeProject, setActiveProject } = useActiveProjectStore();
  // Component re-renders when activeProject changes
}
```

### 5. Factory Pattern (LLM Providers)

**Multi-Provider Abstraction**:
```typescript
// src/lib/llm/index.ts
export function getLLMClient(provider: SupportedProvider, model?: string) {
  switch (provider) {
    case 'ollama':
      return new OllamaClient(model || 'gpt-oss:20b');
    case 'openai':
      return new OpenAIClient(model || 'gpt-4o');
    case 'anthropic':
      return new AnthropicClient(model || 'claude-sonnet-4-20250514');
    case 'gemini':
      return new GeminiClient(model || 'gemini-flash-latest');
  }
}
```

**Unified Interface**:
```typescript
interface LLMClient {
  chat(messages: Message[]): Promise<ChatResponse>;
  stream(messages: Message[]): AsyncIterable<string>;
  embeddings(text: string): Promise<number[]>;
}
```

### 6. Command Pattern (Task Queue)

**Background Task Management**:
```typescript
// src/lib/claudeTaskManager.ts
interface Task {
  id: string;
  type: 'context_generation' | 'project_analysis' | 'refactoring';
  payload: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
}

export const taskQueue = {
  enqueue(task: Task): void { /* ... */ },
  process(): Promise<void> { /* ... */ },
  retry(taskId: string): void { /* ... */ }
};
```

### 7. Adapter Pattern (Database Drivers)

**Cross-Database Compatibility**:
```typescript
// src/app/db/drivers/index.ts
interface DatabaseDriver {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}

export function getConnection(): DatabaseDriver {
  if (USE_BETTER_SQLITE3) {
    return new BetterSQLite3Driver(DB_PATH);
  } else {
    return new SQLJSDriver(DB_PATH);
  }
}
```

### 8. Middleware Pattern (Next.js API)

**Request/Response Pipeline**:
```typescript
// Error handling middleware
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  };
}
```

### Code Quality Measures

**TypeScript Strict Mode**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**ESLint Configuration**:
- Next.js recommended rules
- React 19 best practices
- Unused variable detection
- Import order enforcement

**Naming Conventions**:
- Components: `PascalCase` (e.g., `GoalCard.tsx`)
- Files: `camelCase` or `kebab-case` (e.g., `goalApi.ts`, `goal-repository.ts`)
- Database tables: `snake_case` (e.g., `context_groups`)
- API routes: `kebab-case` (e.g., `/api/goals/by-context`)

### Performance Considerations

**Database Optimization**:
- **WAL Mode**: Write-Ahead Logging for concurrent reads
- **Prepared Statements**: Prevent SQL injection, improve performance
- **Indexes**: Strategic indexes on foreign keys and frequently queried columns
- **Connection Pooling**: Singleton connection reuse

**Frontend Performance**:
- **Code Splitting**: Dynamic imports for heavy features
- **Lazy Loading**: `LazyContentSection` component for below-fold content
- **Memoization**: `useMemo` and `useCallback` for expensive computations
- **Virtual Scrolling**: React Window for large lists

**Process Management**:
- **Log Buffers**: Limited to 100 lines per process
- **Graceful Shutdown**: SIGTERM with 5-second timeout
- **Port Reuse Detection**: Prevents duplicate process spawning

### Security Practices

**Content Security Policy** (next.config.ts):
```typescript
headers: [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'"
    ].join('; ')
  }
]
```

**SQL Injection Prevention**:
```typescript
// Always use prepared statements
db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
// NEVER concatenate user input
// db.prepare(`SELECT * FROM goals WHERE id = '${id}'`); ❌
```

**Environment Variables**:
```typescript
// API keys stored in .env.local (not committed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

**Input Validation**:
```typescript
// API routes validate all inputs
if (!projectId || typeof projectId !== 'string') {
  return NextResponse.json(
    { error: 'Invalid project ID' },
    { status: 400 }
  );
}
```

**CORS Configuration**:
```typescript
// Restricted to localhost in development
const ALLOWED_ORIGINS = ['http://localhost:3000'];
```

---

## Integration Capabilities

### Git Integration

**Project-Level Git Support**:
```typescript
interface Project {
  git?: {
    repository: string;
    branch: string;
    autoSync?: boolean;
  };
}
```

**Operations**:
- Auto-clone repositories on project creation
- Auto-pull on server start (if `autoSync` enabled)
- Manual pull via `POST /api/server/git/pull`
- Status check via `POST /api/server/git/status`

**Implementation**: `src/lib/gitManager.ts`

### Claude Code Integration

**Background Task Execution**:
```typescript
POST /api/kiro/background-tasks
{
  type: 'requirement_execution',
  requirementFile: 'implement-feature-x.md',
  projectPath: '/path/to/project'
}
```

**Task Queue System**:
1. Requirements queued to SQLite (`background_tasks` table)
2. Queue processor executes sequentially
3. Claude Code runs autonomously with skills
4. Results logged to `implementation_log` table

### LLM Provider Integration

**Supported Providers**:
```typescript
type SupportedProvider = 'ollama' | 'openai' | 'anthropic' | 'gemini';

const DEFAULT_MODELS = {
  ollama: 'gpt-oss:20b',        // Local inference
  openai: 'gpt-4o',             // Cloud API
  anthropic: 'claude-sonnet-4-20250514',
  gemini: 'gemini-flash-latest'
};
```

**Unified Client Interface**:
```typescript
const client = getLLMClient(provider, model);
const response = await client.chat(messages);
```

### API Endpoints

Full documentation: `docs/API_ENDPOINTS.md`

**Key Endpoints**:

**Projects**:
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

**Processes**:
- `POST /api/server/start` - Start dev server
- `POST /api/server/stop` - Stop dev server
- `GET /api/server/status` - Get all process statuses
- `GET /api/server/logs/:id` - Get process logs

**Goals**:
- `GET /api/goals?projectId=X` - Get goals for project
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

**Contexts**:
- `GET /api/contexts?projectId=X` - Get contexts
- `POST /api/contexts` - Create context
- `PUT /api/contexts/:id` - Update context
- `POST /api/contexts/generate-description` - AI-generate description

**Ideas**:
- `GET /api/ideas?projectId=X` - Get ideas
- `POST /api/ideas/scan` - Generate new ideas via scan
- `POST /api/ideas/tinder/accept` - Accept idea
- `POST /api/ideas/tinder/reject` - Reject idea

**LangGraph AI**:
- `POST /api/lang` - Send message to AI assistant

**Annette**:
- `POST /api/annette/chat` - Chat with voice assistant
- `GET /api/annette/scan-briefing` - Get scan status summary
- `POST /api/annette/next-step` - Get recommended next scan

---

## Future Enhancements

Based on the codebase structure, planned enhancements include:

### Automated Testing Suite
- Unit tests for utility functions and repositories
- Component tests with React Testing Library
- E2E tests with Playwright
- Test identifiers (`data-testid`) already in place

### Multi-User Support
- Authentication layer (JWT or session-based)
- User-scoped projects and goals
- Collaboration features (shared contexts, team goals)
- Real-time updates via WebSockets

### Cloud Deployment
- Docker containerization
- CI/CD pipeline (GitHub Actions)
- Cloud database migration (PostgreSQL/MySQL)
- Horizontal scaling for multiple users

### Advanced Analytics
- Velocity metrics (goals completed per week)
- Code quality trends over time
- LLM usage analytics (tokens, costs)
- Predictive insights for project health

### Enhanced AI Capabilities
- Multi-step reasoning with chain-of-thought
- Autonomous bug fixing workflows
- Automated test generation
- Code review automation

### Plugin System
- Third-party integrations (Jira, Linear, GitHub Issues)
- Custom scan types via plugins
- LLM provider plugins
- Custom UI themes

---

## Conclusion

Vibeman represents a paradigm shift in software development productivity, leveraging cutting-edge AI to automate the entire development lifecycle. Its architecture is built for scale, with modular features, type-safe code, and a robust database layer that can handle massive amounts of generated code and ideas.

**Key Strengths**:
- **Comprehensive Automation**: From idea generation to code implementation
- **Multi-Project Management**: Handle dozens of projects simultaneously
- **Extensible Architecture**: Feature modules and plugin-ready design
- **Local-First**: SQLite persistence with optional cloud sync
- **AI-Native**: LLM integration at every layer of the stack

**Ideal For**:
- Solo developers seeking 100x productivity gains
- Teams managing complex, multi-repository projects
- Organizations exploring AI-driven development workflows
- Developers building on top of Claude Code

For more information, see:
- `README.md` - Getting started guide
- `CLAUDE.md` - Developer guide for Claude Code
- `docs/` - Detailed feature documentation
- `src/app/features/` - Feature-specific implementations

---

*Generated by Blueprint Vision Scan - High-Level Documentation Generator*
*Project: Vibeman*
*Date: 2025*
*Version: 1.0*
