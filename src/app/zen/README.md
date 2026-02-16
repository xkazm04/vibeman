# Zen Mode Module

A minimal, calm batch monitoring interface with cross-device task offloading via Supabase Realtime.

## Module Status

**Current State**: Production Ready

- **Local Monitoring**: Fully functional - monitors batch execution via SSE
- **Cross-Device Offloading**: Powered by Supabase Realtime - works across the internet

## Overview

Zen Mode serves two purposes:

1. **Batch Monitoring** - A distraction-free interface for watching task batch execution
2. **Cross-Device Offloading** - Distribute work across multiple machines running Vibeman

## Architecture

```
src/app/zen/
├── page.tsx                    # Standalone full-page Zen view
├── ZenLayout.tsx               # Embedded layout with tabs (Monitor/Control)
├── lib/
│   └── zenStore.ts             # Main Zustand store (mode, stats)
├── components/
│   ├── ZenHeader.tsx           # Header with connection status & clock
│   ├── ZenCommandCenter.tsx    # Main command interface
│   ├── ZenSessionGrid.tsx      # Session grid layout
│   ├── ZenSessionPanel.tsx     # Individual session panel
│   ├── ZenEventSidebar.tsx     # Real-time activity sidebar
│   ├── ZenStatusBar.tsx        # Status bar with counters
│   └── ModeToggleGroup.tsx     # Mode toggle controls
└── sub_ZenControl/
    ├── ZenControlPanel.tsx     # Main control panel with Supabase integration
    ├── lib/
    │   └── supabaseRealtimeStore.ts  # Cross-device state store
    ├── hooks/
    │   └── useSupabaseRealtime.ts    # Supabase connection hook
    └── components/
        ├── ModeToggle.tsx            # Offline/Online mode switch
        ├── SupabasePairingPanel.tsx  # 6-digit pairing code UI
        ├── OnlineDevices.tsx         # List of online devices
        └── SupabaseIncomingTasks.tsx # Tasks received from paired device
```

## Supabase Integration

### Prerequisites

1. A Supabase project (free tier works)
2. Environment variables in `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Run the migration SQL in Supabase Dashboard:
   ```
   src/app/db/db_sync/supabase_realtime_migration.sql
   ```

### Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `device_sessions` | Online devices with presence tracking |
| `bridge_events` | Event log for external app queries |
| `offload_tasks` | Cross-device task queue |

### Data Flow

```
DEVICE A (Active)                    SUPABASE                    DEVICE B (Passive)
─────────────────                    ────────                    ─────────────────
1. Generate code           ─────────────────────────────>        2. Enter code
        ↓                            ↓
3. Store pairing           device_sessions table                 4. Find & pair
        ↓                            ↓
5. Push task               offload_tasks table          ─────>   6. Claim task
        ↓                            ↓
7. Listen for updates      Realtime broadcast           <─────   8. Update status
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bridge/realtime/connect` | POST | Register device, get pairing code |
| `/api/bridge/realtime/connect` | GET | List online devices for project |
| `/api/bridge/realtime/pair` | POST | Pair with 6-digit code |
| `/api/bridge/realtime/pair` | DELETE | Unpair from partner |
| `/api/bridge/realtime/disconnect` | POST | Mark device offline |
| `/api/bridge/realtime/events` | GET | Query event history |
| `/api/bridge/realtime/events` | POST | Log event + broadcast |
| `/api/bridge/realtime/tasks` | GET | List offload tasks |
| `/api/bridge/realtime/tasks` | POST | Create offload task |
| `/api/bridge/realtime/tasks/[id]/claim` | POST | Claim a pending task |
| `/api/bridge/realtime/tasks/[id]/status` | PUT | Update task status |

## State Management

### zenStore (Zustand with persist)

```typescript
interface ZenState {
  mode: 'offline' | 'online';       // Monitoring vs accepting tasks
  selectedBatchId: BatchId | null;  // Currently monitored batch
  isConnected: boolean;             // SSE connection state
  currentTask: { ... } | null;      // Currently running task
  recentActivity: ActivityItem[];   // Activity log (last 50)
  stats: ZenStats;                  // Counters
}
```

### supabaseRealtimeStore (Zustand)

```typescript
interface SupabaseRealtimeState {
  connection: RealtimeConnectionState;  // isConnected, error, etc.
  deviceId: string | null;              // This device's ID
  deviceName: string;                   // Device display name
  projectId: string | null;             // Current project
  role: DeviceRole;                     // active/passive/observer
  pairing: PairingState;                // Pairing status
  onlineDevices: DbDeviceSession[];     // Other online devices
  incomingTasks: DbOffloadTask[];       // Tasks to execute
  outgoingTasks: DbOffloadTask[];       // Tasks sent to partner
}
```

## TaskRunner Integration

The `DualBatchPanel` component includes a `RemoteOffloadButton` that allows delegating queued tasks to a paired device:

```
src/app/features/TaskRunner/components/
├── DualBatchPanel.tsx        # Batch display with offload buttons
├── TaskOffloadPanel.tsx      # Local batch-to-batch offload
└── RemoteOffloadButton.tsx   # Remote device offload via Supabase
```

## Usage

### Accessing Zen Mode

1. **Standalone**: Navigate to `/zen`
2. **Embedded**: Available as tab in Manager/Reflector layouts

### Monitoring a Batch

1. Open Zen Mode
2. Select a batch from the dropdown
3. View real-time stats and activity

### Cross-Device Pairing

**Device A** (generates code):
1. Switch to "Control" tab
2. Switch to "Online" mode
3. Click "Generate Pairing Code"
4. Share the 6-digit code with Device B

**Device B** (enters code):
1. Switch to "Control" tab
2. Switch to "Online" mode
3. Enter the 6-digit code
4. Click "Pair" - devices are now connected

### Task Offloading

**From TaskRunner** (Device A):
1. Create a batch with tasks
2. Click "Remote" button on batch header
3. Select tasks to offload
4. Click "Offload" - tasks appear on Device B

**On Device B**:
1. Tasks appear in "Incoming Tasks"
2. Click "Claim" to take ownership
3. Click "Start" to begin execution
4. Mark "Complete" or "Failed" when done

## External App Access

External applications can access Vibeman events via Supabase:

### Query via REST API

```bash
curl -X GET \
  "https://your-project.supabase.co/rest/v1/bridge_events?project_id=eq.xxx&order=timestamp.desc" \
  -H "apikey: YOUR_ANON_KEY"
```

### Subscribe via Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

supabase
  .channel('vibeman:events')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bridge_events' },
      (payload) => console.log('New event:', payload.new))
  .subscribe();
```

### Query Task History

```typescript
const { data: tasks } = await supabase
  .from('offload_tasks')
  .select('*')
  .eq('project_id', 'your-project-id')
  .order('created_at', { ascending: false });
```

## Realtime Module

The core realtime functionality is in `src/lib/supabase/`:

| File | Purpose |
|------|---------|
| `realtime.ts` | VibemanRealtime class - connection, channels |
| `realtimeTypes.ts` | TypeScript types for all entities |
| `index.ts` | Re-exports for easy importing |

### Key Functions

```typescript
import { vibemanRealtime, isSupabaseRealtimeConfigured } from '@/lib/supabase';

// Connect to Supabase Realtime
await vibemanRealtime.connect({
  projectId: 'my-project',
  role: 'active',
});

// Generate pairing code
const code = await vibemanRealtime.generatePairingCode();

// Pair with another device
await vibemanRealtime.pairWithCode('123456');

// Create an offload task
const taskId = await vibemanRealtime.createTask('my-requirement', 'content...');

// Claim a task
await vibemanRealtime.claimTask(taskId);

// Update task status
await vibemanRealtime.updateTaskStatus(taskId, 'completed', {
  resultSummary: 'Task completed successfully'
});

// Disconnect
await vibemanRealtime.disconnect();
```

## Bridge Events Integration

The Bridge event emitter automatically persists events to Supabase:

```typescript
// Events emitted via bridgeEvents.emit() are:
// 1. Broadcast to local SSE clients
// 2. Persisted to Supabase bridge_events table

bridgeEvents.emit('task_completed', { taskId: '...' }, projectId);
```

This allows external apps to query historical events or subscribe to real-time updates.

## Troubleshooting

### "Supabase not configured"

Ensure your `.env` file has all required variables and restart the dev server.

### Devices not seeing each other

1. Check both devices are on the same project
2. Verify Supabase tables exist (run migration SQL)
3. Check browser console for connection errors

### Tasks not appearing

1. Ensure devices are paired (green "Paired" indicator)
2. Check that tasks have status "pending"
3. Verify the `offload_tasks` table has entries

## File References

| File | Purpose |
|------|---------|
| `zenStore.ts` | Main state store |
| `supabaseRealtimeStore.ts` | Cross-device state |
| `useSupabaseRealtime.ts` | React hook for realtime |
| `SupabasePairingPanel.tsx` | Pairing UI |
| `RemoteOffloadButton.tsx` | TaskRunner integration |
| `supabase_realtime_migration.sql` | Database schema |
