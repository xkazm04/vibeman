# Bridge Layer Implementation Plan

## Overview

This document outlines the implementation plan for enabling 3rd party control of Vibeman through a bridge layer, a Flutter Commands Center, and a Zen Layout for monitoring.

### Architecture Decisions (User Confirmed)
- **Bridge Architecture**: Embedded WebSocket server in Next.js
- **Batch Flow**: Manual batch assignment (ideas assigned to batches by user/3rd party)
- **Idea Generation**: Full control over generation parameters
- **Zen Layout**: Single session focus (monitor one batch at a time)

---

## Part 1: Bridge Layer (Vibeman)

### 1.1 WebSocket Server Setup

**Location**: `src/app/api/bridge/`

Since Next.js doesn't natively support WebSocket in API routes, we'll use a hybrid approach:
1. REST endpoints for operations (create, delete, update)
2. Server-Sent Events (SSE) for real-time updates (simpler than WebSocket in Next.js)
3. Optional: Standalone WebSocket server on separate port

**Recommended Approach**: SSE + REST API (simplest for Next.js)

```
src/app/api/bridge/
├── goals/
│   ├── route.ts           # GET (list), POST (create)
│   └── [id]/route.ts      # GET, DELETE
├── ideas/
│   ├── route.ts           # GET (list), POST (generate)
│   ├── [id]/
│   │   ├── route.ts       # GET, DELETE
│   │   └── action/route.ts # POST (accept/reject)
│   └── generate/route.ts   # POST (trigger generation with params)
├── batches/
│   ├── route.ts           # GET (list), POST (create)
│   ├── [id]/
│   │   ├── route.ts       # GET, PUT, DELETE
│   │   ├── assign/route.ts # POST (assign ideas to batch)
│   │   └── control/route.ts # POST (start/pause/stop)
├── stream/route.ts        # SSE endpoint for real-time updates
└── status/route.ts        # GET system status
```

### 1.2 Bridge API Specification

#### Goals API

```typescript
// GET /api/bridge/goals
// Response: { goals: Goal[], total: number }

// POST /api/bridge/goals
// Body: { projectId: string, name: string, description?: string }
// Response: { goal: Goal }

// DELETE /api/bridge/goals/[id]
// Response: { success: boolean }
```

#### Ideas API

```typescript
// GET /api/bridge/ideas
// Query: { projectId, status?, contextId?, limit?, offset? }
// Response: { ideas: Idea[], total: number }

// POST /api/bridge/ideas/generate
// Body: {
//   projectId: string,
//   scanTypes: string[],      // e.g., ['zen_architect', 'bug_hunter']
//   contextIds?: string[],    // Optional context filtering
//   provider?: string,        // LLM provider
//   maxIdeas?: number         // Limit generation
// }
// Response: { jobId: string, estimatedTasks: number }

// POST /api/bridge/ideas/[id]/action
// Body: { action: 'accept' | 'reject' | 'skip' }
// Response: { idea: Idea }
```

#### Batches API

```typescript
// GET /api/bridge/batches
// Response: { batches: Batch[] }

// POST /api/bridge/batches/[id]/assign
// Body: { ideaIds: string[] }
// Response: { assigned: number, batch: Batch }

// POST /api/bridge/batches/[id]/control
// Body: { action: 'start' | 'pause' | 'stop' | 'resume' }
// Response: { batch: Batch, status: string }
```

#### Stream API (SSE)

```typescript
// GET /api/bridge/stream
// Query: { projectId, events?: string[] }
// Events: idea_generated, idea_updated, batch_progress, task_completed, error
// Format: Server-Sent Events (text/event-stream)
```

### 1.3 Bridge Service Layer

**Location**: `src/lib/bridge/`

```typescript
// src/lib/bridge/types.ts
export interface BridgeEvent {
  type: 'idea_generated' | 'idea_updated' | 'batch_progress' |
        'task_completed' | 'goal_created' | 'error';
  payload: unknown;
  timestamp: string;
  projectId: string;
}

export interface BridgeClient {
  id: string;
  projectId: string;
  connectedAt: Date;
  lastPing: Date;
}

// src/lib/bridge/eventEmitter.ts
// In-memory event bus for SSE connections
export class BridgeEventEmitter {
  private clients: Map<string, WritableStreamDefaultWriter>;

  subscribe(clientId: string, writer: WritableStreamDefaultWriter): void;
  unsubscribe(clientId: string): void;
  emit(event: BridgeEvent): void;
  emitToProject(projectId: string, event: BridgeEvent): void;
}

// Singleton instance
export const bridgeEvents = new BridgeEventEmitter();
```

### 1.4 Integration Points

Connect bridge events to existing systems:

1. **Ideas Generation** (`src/app/features/Ideas/sub_IdeasSetup/lib/claudeIdeasExecutor.ts`)
   - Emit `idea_generated` events when ideas are created

2. **TaskRunner** (`src/stores/taskRunnerStore.ts`)
   - Emit `batch_progress` and `task_completed` events
   - Hook into `updateTaskProgress` action

3. **Goals** (`src/app/db/repositories/goal.repository.ts`)
   - Emit `goal_created` on goal creation

---

## Part 2: Flutter Commands Center

### 2.1 Page Structure

**Location**: `lib/features/commands/`

```
lib/features/commands/
├── commands_page.dart           # Main page with TabBar
├── tabs/
│   ├── goals_tab.dart           # Goals management
│   ├── ideas_tab.dart           # Ideas tinder + generation
│   └── batches_tab.dart         # Batch control
├── services/
│   ├── bridge_service.dart      # HTTP + SSE client
│   └── commands_state.dart      # ChangeNotifier state
├── models/
│   ├── goal.dart
│   ├── idea.dart
│   └── batch.dart
└── widgets/
    ├── goal_card.dart
    ├── idea_swipe_card.dart
    ├── batch_control_card.dart
    └── generation_panel.dart
```

### 2.2 Bridge Service

```dart
// lib/features/commands/services/bridge_service.dart
class BridgeService {
  final String baseUrl;
  final StreamController<BridgeEvent> _eventController;

  // REST methods
  Future<List<Goal>> getGoals(String projectId);
  Future<Goal> createGoal(String projectId, String name, String? description);
  Future<void> deleteGoal(String goalId);

  Future<List<Idea>> getIdeas(String projectId, {String? status});
  Future<String> generateIdeas(GenerateIdeasRequest request);
  Future<Idea> updateIdeaStatus(String ideaId, IdeaAction action);

  Future<List<Batch>> getBatches();
  Future<void> assignIdeasToBatch(String batchId, List<String> ideaIds);
  Future<void> controlBatch(String batchId, BatchAction action);

  // SSE stream
  Stream<BridgeEvent> get events => _eventController.stream;
  Future<void> connect(String projectId);
  void disconnect();
}
```

### 2.3 Commands State Management

```dart
// lib/features/commands/services/commands_state.dart
class CommandsState extends ChangeNotifier {
  final BridgeService _bridge;

  // State
  List<Goal> goals = [];
  List<Idea> pendingIdeas = [];
  List<Idea> acceptedIdeas = [];
  List<Batch> batches = [];
  String? selectedProjectId;
  bool isGenerating = false;

  // Actions
  Future<void> loadGoals();
  Future<void> createGoal(String name, String? description);
  Future<void> deleteGoal(String goalId);

  Future<void> loadIdeas();
  Future<void> generateIdeas(List<String> scanTypes, List<String>? contextIds);
  Future<void> acceptIdea(String ideaId);
  Future<void> rejectIdea(String ideaId);

  Future<void> loadBatches();
  Future<void> assignIdeasToBatch(String batchId, List<String> ideaIds);
  Future<void> startBatch(String batchId);
  Future<void> pauseBatch(String batchId);
  Future<void> stopBatch(String batchId);

  // SSE event handling
  void _handleEvent(BridgeEvent event);
}
```

### 2.4 Tab Designs

#### Goals Tab
- List of goals with create/delete actions
- Simple card layout
- Swipe to delete or delete button

#### Ideas Tab
- **Top section**: Generation controls
  - Scan type multi-select chips
  - Context selector (optional)
  - "Generate" button
- **Middle section**: Tinder-style swipe cards
  - Swipe right = accept
  - Swipe left = reject
  - Tap to expand details
- **Bottom section**: Accepted ideas queue
  - List of accepted ideas ready for batch assignment

#### Batches Tab
- 4 batch cards (A, B, C, D) in 2x2 grid
- Each card shows:
  - Batch name
  - Task count / completed
  - Status indicator (idle, running, paused)
  - Control buttons (play/pause/stop)
- Drag-drop or button to assign accepted ideas

---

## Part 3: Zen Layout (Vibeman)

### 3.1 Page Structure

**Location**: `src/app/zen/page.tsx`

```
src/app/zen/
├── page.tsx                    # Main Zen layout
├── components/
│   ├── ZenHeader.tsx           # Minimal header with session info
│   ├── ZenTaskFeed.tsx         # Real-time task feed
│   ├── ZenBatchSelector.tsx    # Batch switcher
│   ├── ZenStats.tsx            # Session statistics
│   └── ZenNotifications.tsx    # Toast notifications
└── lib/
    └── zenStore.ts             # Zustand store for zen mode
```

### 3.2 Zen Layout Design

**Philosophy**: Minimal, calm, focused on a single batch session

```
┌─────────────────────────────────────────────────────────────┐
│  [Batch A ▼]              ZEN MODE              12:34 PM    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │     Currently Running: Fix authentication flow      │   │
│  │     ━━━━━━━━━━━━━━━━━━━━░░░░░░  67%                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐              │
│  │ Completed │  │  Pending  │  │  Failed   │              │
│  │    12     │  │     5     │  │     1     │              │
│  └───────────┘  └───────────┘  └───────────┘              │
│                                                             │
│  Recent Activity                                           │
│  ─────────────────────────────────────────────────────     │
│  ✓ 12:32 - Add user profile endpoint                      │
│  ✓ 12:28 - Fix validation bug in form                      │
│  ✓ 12:15 - Update database schema                          │
│  • 12:10 - Refactor authentication module                  │
│  ✗ 12:05 - Add caching layer (failed)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Zen Store

```typescript
// src/app/zen/lib/zenStore.ts
interface ZenState {
  selectedBatchId: BatchId | null;
  isConnected: boolean;
  currentTask: Task | null;
  recentActivity: ActivityItem[];
  stats: {
    completed: number;
    pending: number;
    failed: number;
    sessionStart: Date;
  };

  // Actions
  selectBatch: (batchId: BatchId) => void;
  connect: () => void;
  disconnect: () => void;
}
```

### 3.4 Integration with SSE

Zen Layout connects to `/api/bridge/stream` to receive real-time updates:
- `task_completed` - Update activity feed and stats
- `batch_progress` - Update progress bar
- `error` - Show notification toast

---

## Implementation Order

### Phase 1: Bridge REST API (Priority: High)
1. Create `/api/bridge/goals/` endpoints
2. Create `/api/bridge/ideas/` endpoints
3. Create `/api/bridge/batches/` endpoints
4. Create `/api/bridge/status/` endpoint
5. Add authentication/API key support

### Phase 2: Bridge SSE Stream (Priority: High)
1. Implement `BridgeEventEmitter` singleton
2. Create `/api/bridge/stream` SSE endpoint
3. Integrate event emission into existing systems:
   - TaskRunner store
   - Ideas generation
   - Goals repository

### Phase 3: Flutter Commands Center (Priority: Medium)
1. Create `BridgeService` with HTTP client
2. Implement SSE stream connection
3. Build Goals tab
4. Build Ideas tab with generation + tinder
5. Build Batches tab with controls
6. Add state management

### Phase 4: Zen Layout (Priority: Medium)
1. Create basic page structure
2. Implement ZenStore with batch selection
3. Connect to SSE stream
4. Build task feed component
5. Build stats display
6. Add batch switcher

### Phase 5: Polish & Testing (Priority: Low)
1. Error handling improvements
2. Connection recovery (SSE reconnect)
3. Loading states and skeletons
4. Mobile responsiveness (Flutter)
5. Keyboard shortcuts (Zen Layout)

---

## Security Considerations

1. **API Key Authentication**
   - Add `X-Bridge-API-Key` header requirement
   - Store key in environment variable
   - Validate on all bridge endpoints

2. **Project Isolation**
   - All operations scoped to projectId
   - Validate project access before operations

3. **Rate Limiting**
   - Limit idea generation requests
   - Limit SSE connections per client

---

## File Changes Summary

### New Files to Create (Vibeman)
- `src/app/api/bridge/goals/route.ts`
- `src/app/api/bridge/goals/[id]/route.ts`
- `src/app/api/bridge/ideas/route.ts`
- `src/app/api/bridge/ideas/[id]/route.ts`
- `src/app/api/bridge/ideas/[id]/action/route.ts`
- `src/app/api/bridge/ideas/generate/route.ts`
- `src/app/api/bridge/batches/route.ts`
- `src/app/api/bridge/batches/[id]/route.ts`
- `src/app/api/bridge/batches/[id]/assign/route.ts`
- `src/app/api/bridge/batches/[id]/control/route.ts`
- `src/app/api/bridge/stream/route.ts`
- `src/app/api/bridge/status/route.ts`
- `src/lib/bridge/types.ts`
- `src/lib/bridge/eventEmitter.ts`
- `src/lib/bridge/auth.ts`
- `src/app/zen/page.tsx`
- `src/app/zen/components/*.tsx`
- `src/app/zen/lib/zenStore.ts`

### Files to Modify (Vibeman)
- `src/stores/taskRunnerStore.ts` - Add event emission
- `src/app/features/Ideas/sub_IdeasSetup/lib/claudeIdeasExecutor.ts` - Add event emission

### New Files to Create (Flutter)
- `lib/features/commands/commands_page.dart`
- `lib/features/commands/tabs/goals_tab.dart`
- `lib/features/commands/tabs/ideas_tab.dart`
- `lib/features/commands/tabs/batches_tab.dart`
- `lib/features/commands/services/bridge_service.dart`
- `lib/features/commands/services/commands_state.dart`
- `lib/features/commands/models/*.dart`
- `lib/features/commands/widgets/*.dart`

---

## Estimated Complexity

| Component | Files | Complexity |
|-----------|-------|------------|
| Bridge REST API | 12 | Medium |
| Bridge SSE | 3 | Medium |
| Bridge Integration | 2 | Low |
| Flutter Commands | 12 | Medium |
| Zen Layout | 6 | Low |
| **Total** | **35** | **Medium** |
