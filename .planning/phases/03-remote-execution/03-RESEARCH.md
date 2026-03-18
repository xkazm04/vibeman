# Phase 3: Remote Execution - Research

**Researched:** 2026-01-28
**Domain:** Remote batch execution, Zen mode command center, Supabase realtime sync, healthcheck API
**Confidence:** HIGH

## Summary

Phase 3 enables users to remotely trigger and monitor batch execution from Butler while Vibeman runs in "Zen mode." This phase builds on the foundation established in Phases 1-2, extending the existing Supabase message broker infrastructure to support:

1. **Butler Batch Composer** - UI for browsing requirements by project, selecting multiple via checkboxes, and starting batch execution
2. **Zen Mode Redesign** - Transform the current Zen page into a command center with 1-4 CLI session panels and an event sidebar
3. **Remote Execution Control** - Auto-execute incoming batch commands when Vibeman is in Zen mode
4. **Healthcheck System** - Vibeman publishes zen_mode status to Supabase; Butler checks before allowing batch start

The existing infrastructure provides an excellent foundation:
- `CLIBatchPanel` already manages 4 parallel CLI sessions with full state management via `cliSessionStore`
- `cliExecutionManager.ts` handles task execution, SSE monitoring, and recovery
- `commandProcessor` and `commandHandlers` already have placeholder handlers for `start_batch`
- `remoteEvents` publisher already supports `task_started`, `task_completed`, `task_failed`, `batch_progress` events
- `requirementSync.ts` already syncs requirements to Supabase as `requirement_pending` events

**Primary recommendation:** Redesign the Zen page to embed the existing `CLIBatchPanel` in a 1-4 session grid layout with event sidebar. Add a healthcheck API endpoint that publishes zen_mode status to Supabase `vibeman_events`. Butler subscribes to `vibeman_events` via Supabase Realtime for near-instant status updates.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.x | Vibeman Supabase client | Already used in remote event publisher |
| supabase_flutter | ^2.8.0 | Flutter Supabase SDK | Already in Butler for realtime subscriptions |
| zustand | ^4.x | Vibeman state management | Already used for CLI session store |
| Framer Motion | ^10.x | Zen page animations | Already used in Zen components |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| EventSource | built-in | SSE connection for execution monitoring | Already used in cliExecutionManager |
| postgres_changes | Supabase built-in | Realtime subscription to table changes | For Butler to receive status updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Realtime | Polling | Realtime provides instant updates; polling adds latency. For healthcheck, realtime is essential |
| Embedded CLIBatchPanel | New batch component | CLIBatchPanel already has all execution logic; reuse instead of rewriting |
| Single event sidebar | Per-session logs | Event sidebar provides unified view; per-session logs already exist in terminals |

**Installation:**
```bash
# No new dependencies required - all already in place
```

## Architecture Patterns

### Recommended Project Structure

**Vibeman (additions to existing):**
```
src/
├── app/
│   ├── api/
│   │   └── remote/
│   │       └── healthcheck/
│   │           └── route.ts          # NEW: Healthcheck API endpoint
│   └── zen/
│       ├── page.tsx                  # MODIFY: Redesign as command center
│       ├── components/
│       │   ├── ZenCommandCenter.tsx  # NEW: Main layout with session grid + sidebar
│       │   ├── ZenSessionGrid.tsx    # NEW: 2x2 CLI session panel grid
│       │   ├── ZenEventSidebar.tsx   # NEW: Accept/reject/batch event feed
│       │   └── ZenStatusBar.tsx      # NEW: Mode indicator + healthcheck status
│       └── lib/
│           └── zenModeService.ts     # NEW: Healthcheck publishing, command listening
├── lib/
│   └── remote/
│       └── commandHandlers.ts        # MODIFY: Implement start_batch handler
```

**Butler (additions to existing):**
```
lib/
├── models/
│   └── requirement.dart              # NEW: Requirement model
├── services/
│   └── batch_service.dart            # NEW: Batch composer service
└── screens/
    └── modules/
        └── batch/
            ├── batch_module.dart         # NEW: Main batch composer screen
            ├── requirement_list.dart     # NEW: Project-grouped requirement list
            ├── requirement_card.dart     # NEW: Selectable requirement card
            └── execution_status.dart     # NEW: Running status + slot indicators
```

### Pattern 1: Healthcheck Publishing Pattern

**What:** Vibeman publishes zen_mode status to `vibeman_events` table; Butler subscribes for updates
**When to use:** When entering/exiting Zen mode, periodically while in Zen mode
**Example:**
```typescript
// Source: Pattern from src/lib/remote/eventPublisher.ts
interface HealthcheckPayload {
  zen_mode: boolean;
  active_sessions: number;  // 0-4
  available_slots: number;  // 4 minus active
  timestamp: string;
}

// Publish healthcheck on mode change and every 30 seconds
async function publishHealthcheck(isZenMode: boolean, sessions: CLISessionState[]) {
  const activeSessions = sessions.filter(s => s.isRunning).length;

  const payload: HealthcheckPayload = {
    zen_mode: isZenMode,
    active_sessions: activeSessions,
    available_slots: 4 - activeSessions,
    timestamp: new Date().toISOString(),
  };

  // Use existing remote event publisher
  remoteEvents.publish('healthcheck', payload, projectId);
}
```

### Pattern 2: Butler Realtime Subscription for Healthcheck

**What:** Butler subscribes to `vibeman_events` for healthcheck updates
**When to use:** When batch composer screen is active
**Example:**
```dart
// Source: Supabase Flutter realtime docs
// https://supabase.com/docs/guides/realtime/realtime-listening-flutter

class BatchService {
  late RealtimeChannel _healthcheckChannel;

  void subscribeToHealthcheck(String projectId) {
    _healthcheckChannel = supabase.channel('healthcheck:$projectId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'vibeman_events',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'event_type',
          value: 'healthcheck',
        ),
        callback: (payload) {
          final data = payload.newRecord;
          _updateHealthcheckState(data['payload']);
        },
      )
      .subscribe();
  }

  bool canStartBatch() {
    return _lastHealthcheck?.zenMode == true &&
           _lastHealthcheck!.availableSlots > 0;
  }
}
```

### Pattern 3: Start Batch Command Flow

**What:** Butler inserts `start_batch` command; Vibeman polls and executes
**When to use:** User taps "Start Batch" in Butler
**Example:**
```dart
// Butler: Insert command to Supabase
Future<void> startBatch(List<String> requirementNames) async {
  await supabase.from('vibeman_commands').insert({
    'project_id': selectedProjectId,
    'command_type': 'start_batch',
    'payload': {
      'requirement_names': requirementNames,
      'session_preference': null,  // Let Vibeman choose available slot
    },
    'status': 'pending',
  });
}
```

```typescript
// Vibeman: Command handler (modify existing in commandHandlers.ts)
async function handleStartBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as StartBatchPayload;

  // Check if Zen mode is active
  const zenStore = useZenStore.getState();
  if (zenStore.mode !== 'online') {
    return { success: false, error: 'Vibeman is not in Zen mode' };
  }

  // Find available session slot
  const sessions = useCLISessionStore.getState().sessions;
  const availableSession = Object.entries(sessions)
    .find(([_, s]) => !s.isRunning && s.queue.length === 0);

  if (!availableSession) {
    return { success: false, error: 'No available CLI session slots' };
  }

  // Load requirements and add to session queue
  const tasks = await loadRequirementTasks(payload.requirement_names);
  useCLISessionStore.getState().addTasksToSession(availableSession[0], tasks);
  useCLISessionStore.getState().setAutoStart(availableSession[0], true);

  return {
    success: true,
    result: { sessionId: availableSession[0], taskCount: tasks.length },
  };
}
```

### Pattern 4: Zen Mode Event Sidebar

**What:** Real-time feed of accept/reject decisions and batch events
**When to use:** Zen page redesign
**Example:**
```typescript
// Source: Pattern from src/app/zen/lib/zenStore.ts ActivityItem

interface ZenEvent {
  id: string;
  timestamp: Date;
  type: 'accept' | 'reject' | 'skip' | 'batch_start' | 'task_complete' | 'task_fail';
  title: string;
  source: 'butler' | 'local';  // Where the action originated
  details?: string;
}

// Subscribe to both local events and remote events
function subscribeToEvents(projectId: string) {
  // Local execution events via SSE (existing pattern)
  const localSource = new EventSource('/api/bridge/stream?projectId=*');

  // Remote decision events via command processor
  commandProcessor.onCommandProcessed((command) => {
    if (['accept_idea', 'reject_idea', 'skip_idea'].includes(command.command_type)) {
      addEvent({
        type: command.command_type.replace('_idea', ''),
        title: command.payload.ideaTitle || 'Direction',
        source: 'butler',
      });
    }
  });
}
```

### Pattern 5: CLI Session Grid Layout

**What:** 2x2 grid layout embedding existing CLIBatchPanel sessions
**When to use:** Zen mode command center redesign
**Example:**
```typescript
// Source: Pattern from src/components/cli/CLIBatchPanel.tsx

export function ZenSessionGrid() {
  const sessions = useCLISessionStore((state) => state.sessions);

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {SESSIONS.map((sessionId, index) => (
        <div key={sessionId} className="min-h-[300px]">
          <ZenSessionPanel
            sessionId={sessionId}
            session={sessions[sessionId]}
            index={index}
          />
        </div>
      ))}
    </div>
  );
}

// Each panel shows:
// - Terminal output (CompactTerminal component)
// - Queue status (queued/running/completed counts)
// - Current task name
// - Stop button for running sessions
```

### Anti-Patterns to Avoid

- **Confirmation dialogs for remote commands:** User specified auto-execute in Zen mode. No dialogs.
- **Creating new CLI execution logic:** Use existing `cliExecutionManager.ts`. Don't duplicate.
- **Polling for healthcheck in Butler:** Use Supabase Realtime subscription for instant updates.
- **Starting batch without healthcheck:** Butler MUST verify Vibeman is ready before enabling start button.
- **More than 4 sessions:** Max is 4. This is a hard constraint from CLIBatchPanel.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI task execution | New execution engine | `cliExecutionManager.ts` | Has SSE monitoring, polling fallback, recovery |
| Session state | New state management | `cliSessionStore.ts` | Persistent Zustand store with recovery |
| Event publishing | Custom REST calls | `remoteEvents` from eventPublisher.ts | Fire-and-forget, singleton pattern |
| Command processing | Manual polling loop | `commandProcessor` | Already polls, handles, updates status |
| Realtime subscription | Manual WebSocket | supabase_flutter onPostgresChanges | SDK handles reconnection, cleanup |

**Key insight:** Phase 3 is primarily integration and UI work. The execution infrastructure exists. The sync infrastructure exists. Connect them with minimal new code.

## Common Pitfalls

### Pitfall 1: Healthcheck Stale After Tab Background
**What goes wrong:** User backgrounds browser, healthcheck stops publishing, Butler thinks Vibeman offline
**Why it happens:** Browser throttles timers in backgrounded tabs
**How to avoid:**
- Use `document.visibilityState` to detect tab visibility
- On visibility change to 'visible', immediately publish healthcheck
- In Butler, add grace period (30s) before marking offline
**Warning signs:** Status indicator flickering, batch start blocked intermittently

### Pitfall 2: Race Condition on Batch Start
**What goes wrong:** Two devices try to start batch simultaneously, both get same session slot
**Why it happens:** Session availability check and assignment not atomic
**How to avoid:**
- Command handler should claim session slot atomically in store
- If no slot available, queue the batch command (or return error)
- Consider pessimistic locking (mark session as 'claimed' before execution)
**Warning signs:** Tasks from different batches interleaved in same session

### Pitfall 3: Requirement Content Not Synced
**What goes wrong:** Butler shows requirement names but `start_batch` fails with "requirement not found"
**Why it happens:** Requirements were synced as events, but batch handler tries to read from filesystem
**How to avoid:**
- Either: Store requirement content in Supabase event payload (already done by requirementSync.ts)
- Or: On start_batch, load from local filesystem using requirement_name
- Decide: Use synced content OR local filesystem, not both
**Warning signs:** "Requirement not found" errors despite requirement appearing in Butler list

### Pitfall 4: Supabase Realtime Connection Limit
**What goes wrong:** Butler subscriptions silently fail after many connections
**Why it happens:** Supabase free tier limits concurrent realtime connections
**How to avoid:**
- Unsubscribe when leaving batch composer screen
- Use single channel with multiple event type filters
- Don't create new subscription on every screen visit
**Warning signs:** Healthcheck updates stop arriving, no error logged

### Pitfall 5: Event Sidebar Overwhelming User
**What goes wrong:** Sidebar floods with events, user can't track important ones
**Why it happens:** Every execution event published, including progress ticks
**How to avoid:**
- Filter to significant events: batch_start, task_complete, task_fail, decisions
- Exclude progress updates from sidebar (show in session panel instead)
- Limit to last 20 events, auto-scroll disabled
**Warning signs:** Sidebar constantly scrolling, user complaints about noise

## Code Examples

Verified patterns from existing codebase:

### Healthcheck API Route
```typescript
// Source: Pattern from src/app/api/remote/setup/status/route.ts
// Location: src/app/api/remote/healthcheck/route.ts

import { NextResponse } from 'next/server';
import { remoteEvents } from '@/lib/remote';
import { useCLISessionStore } from '@/components/cli/store';
import { useZenStore } from '@/app/zen/lib/zenStore';

export async function GET() {
  const zenStore = useZenStore.getState();
  const sessions = useCLISessionStore.getState().sessions;

  const activeSessions = Object.values(sessions).filter(s => s.isRunning).length;

  const status = {
    zen_mode: zenStore.mode === 'online',
    active_sessions: activeSessions,
    available_slots: 4 - activeSessions,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(status);
}

export async function POST() {
  // Force publish healthcheck to Supabase
  const zenStore = useZenStore.getState();
  const sessions = useCLISessionStore.getState().sessions;
  const projectId = /* get from active project */;

  const activeSessions = Object.values(sessions).filter(s => s.isRunning).length;

  remoteEvents.publish('healthcheck', {
    zen_mode: zenStore.mode === 'online',
    active_sessions: activeSessions,
    available_slots: 4 - activeSessions,
    timestamp: new Date().toISOString(),
  }, projectId);

  return NextResponse.json({ published: true });
}
```

### Butler Healthcheck Subscription
```dart
// Source: Pattern from Butler's SupabaseConnectionService
// Location: lib/services/batch_service.dart

class BatchService extends ChangeNotifier {
  HealthcheckState? _healthcheck;
  RealtimeChannel? _channel;

  bool get canStartBatch =>
    _healthcheck?.zenMode == true &&
    (_healthcheck?.availableSlots ?? 0) > 0;

  int get availableSlots => _healthcheck?.availableSlots ?? 0;

  void subscribeToHealthcheck(String projectId) {
    _channel?.unsubscribe();

    _channel = Supabase.instance.client
      .channel('healthcheck:$projectId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'vibeman_events',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'event_type',
          value: 'healthcheck',
        ),
        callback: (payload) {
          final data = payload.newRecord['payload'] as Map<String, dynamic>;
          _healthcheck = HealthcheckState(
            zenMode: data['zen_mode'] as bool,
            activeSessions: data['active_sessions'] as int,
            availableSlots: data['available_slots'] as int,
            timestamp: DateTime.parse(data['timestamp'] as String),
          );
          notifyListeners();
        },
      )
      .subscribe();
  }

  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }
}
```

### Start Batch Command Handler
```typescript
// Source: Extend existing src/lib/remote/commandHandlers.ts

interface StartBatchPayload {
  requirement_names: string[];
  session_preference?: CLISessionId;
}

async function handleStartBatch(command: RemoteCommand): Promise<CommandHandlerResult> {
  const payload = command.payload as StartBatchPayload;

  if (!payload.requirement_names || payload.requirement_names.length === 0) {
    return { success: false, error: 'No requirements specified' };
  }

  // Dynamic import to avoid circular dependencies
  const { useZenStore } = await import('@/app/zen/lib/zenStore');
  const { useCLISessionStore } = await import('@/components/cli/store');

  // Check Zen mode
  const zenState = useZenStore.getState();
  if (zenState.mode !== 'online') {
    return { success: false, error: 'Vibeman is not in Zen mode' };
  }

  // Find available session
  const sessions = useCLISessionStore.getState().sessions;
  const sessionEntries = Object.entries(sessions);

  let targetSession: [string, CLISessionState] | undefined;

  if (payload.session_preference) {
    const pref = sessions[payload.session_preference];
    if (!pref.isRunning && pref.queue.length === 0) {
      targetSession = [payload.session_preference, pref];
    }
  }

  if (!targetSession) {
    targetSession = sessionEntries.find(([_, s]) => !s.isRunning && s.queue.length === 0);
  }

  if (!targetSession) {
    return { success: false, error: 'No available CLI session slots (0 of 4 available)' };
  }

  // Load requirements from synced events or filesystem
  const tasks = await loadRequirementTasks(command.project_id, payload.requirement_names);

  if (tasks.length === 0) {
    return { success: false, error: 'No valid requirements found' };
  }

  // Add tasks and start execution
  const store = useCLISessionStore.getState();
  store.addTasksToSession(targetSession[0] as CLISessionId, tasks);
  store.setAutoStart(targetSession[0] as CLISessionId, true);
  store.setRunning(targetSession[0] as CLISessionId, true);

  // Trigger execution (existing pattern from CLIBatchPanel)
  const { executeNextTask } = await import('@/components/cli/store/cliExecutionManager');
  executeNextTask(targetSession[0] as CLISessionId);

  return {
    success: true,
    result: {
      session_id: targetSession[0],
      task_count: tasks.length,
      message: `Started batch with ${tasks.length} tasks in session ${targetSession[0]}`,
    },
  };
}

async function loadRequirementTasks(
  projectId: string,
  requirementNames: string[]
): Promise<QueuedTask[]> {
  // Option 1: Load from local filesystem
  const requirementsDir = path.join(projectPath, '.claude', 'requirements');

  return requirementNames
    .filter(name => fs.existsSync(path.join(requirementsDir, `${name}.md`)))
    .map(name => ({
      id: `${projectId}-${name}-${Date.now()}`,
      requirementName: name,
      projectPath,
      projectId,
      status: 'pending' as const,
      addedAt: Date.now(),
    }));
}
```

### Zen Mode Command Center Layout
```typescript
// Source: Pattern from existing ZenLayout.tsx
// Location: src/app/zen/components/ZenCommandCenter.tsx

export function ZenCommandCenter() {
  const { mode } = useZenStore();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Status Bar */}
      <ZenStatusBar />

      {/* Main Content: Session Grid + Event Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* CLI Session Grid (2x2) - 70% width */}
        <div className="flex-1 p-4">
          <ZenSessionGrid />
        </div>

        {/* Event Sidebar - 30% width */}
        <div className="w-80 border-l border-gray-800 flex flex-col">
          <ZenEventSidebar />
        </div>
      </div>

      {/* Footer with Zen mode indicator */}
      <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            mode === 'online' ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-xs text-gray-400">
            {mode === 'online' ? 'Zen Mode Active - Accepting Remote Commands' : 'Offline'}
          </span>
        </div>
        <span className="text-xs text-gray-600">Press Esc to exit</span>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for healthcheck | Supabase Realtime subscription | 2025 | Instant status updates, reduced load |
| Batch execution requires desktop interaction | Auto-execute in Zen mode | Phase 3 | True remote execution capability |
| Single CLI session | 4 parallel sessions (CLIBatchPanel) | Existing | 4x throughput, better utilization |

**Deprecated/outdated:**
- Manual batch panel: The existing Zen page has a batch selector but doesn't show CLI panels. Redesign replaces this.
- Bridge SSE for cross-device: Supabase Realtime is the new pattern for internet-wide communication.

## Open Questions

Things that couldn't be fully resolved:

1. **Session slot preference from Butler**
   - What we know: User can see which slots are available (BATCH-06)
   - What's unclear: Should Butler let user choose which slot, or auto-assign?
   - Recommendation: Auto-assign to first available slot. Simpler UX, no edge cases.

2. **Requirement content source**
   - What we know: requirementSync.ts syncs content to Supabase; filesystem has authoritative copy
   - What's unclear: Should start_batch use synced content or re-read from filesystem?
   - Recommendation: Use filesystem. Synced content may be stale. Filesystem is source of truth.

3. **Healthcheck publish frequency**
   - What we know: Need periodic updates + on mode change
   - What's unclear: Optimal frequency (every 10s? 30s? 60s?)
   - Recommendation: Every 30 seconds + on mode/session state change. Balance freshness vs Supabase insert volume.

4. **What happens if Vibeman exits Zen mode mid-batch?**
   - What we know: Sessions continue running even if user switches pages
   - What's unclear: Should switching away from Zen mode abort? Pause? Continue?
   - Recommendation: Continue running. isRunning state persists in cliSessionStore. User can return to Zen to monitor.

## Sources

### Primary (HIGH confidence)
- `src/components/cli/CLIBatchPanel.tsx` - Existing 4-session batch panel
- `src/components/cli/store/cliSessionStore.ts` - Session state management
- `src/components/cli/store/cliExecutionManager.ts` - Execution, monitoring, recovery
- `src/lib/remote/commandHandlers.ts` - Existing command handlers (start_batch placeholder)
- `src/lib/remote/eventPublisher.ts` - Event publishing pattern
- `src/lib/remote/requirementSync.ts` - Requirement sync to Supabase
- `src/app/zen/sub_ZenControl/hooks/useSupabaseRealtime.ts` - Realtime subscription pattern
- `docs/REMOTE_MESSAGE_BROKER.md` - Complete schema and API documentation

### Secondary (MEDIUM confidence)
- [Supabase Postgres Changes Docs](https://supabase.com/docs/guides/realtime/postgres-changes) - Realtime subscription API
- [Supabase Flutter Realtime](https://supabase.com/docs/guides/realtime/realtime-listening-flutter) - Flutter-specific patterns
- [Next.js Healthcheck Guide](https://hyperping.com/blog/nextjs-health-check-endpoint) - API route patterns

### Tertiary (LOW confidence)
- Web search results for Supabase scaling - Performance considerations at scale

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns established
- Architecture: HIGH - Extending existing patterns (CLIBatchPanel, commandHandlers, eventPublisher)
- Pitfalls: MEDIUM - Some edge cases need validation during implementation

**Research date:** 2026-01-28
**Valid until:** 30 days (stable infrastructure, patterns from existing code)
