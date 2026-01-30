# Zen Mode Cross-Device Architecture

> Consolidated solution for multi-device sync and remote control (January 2026)
>
> **Update (Jan 29, 2026):** Remote triage moved to Tinder module. Zen focuses on connection management.

## Overview

Zen Mode provides cross-device communication for Vibeman instances through a shared Supabase backend. It enables:

- **Device Mesh Network**: Discover and connect to other Vibeman instances
- **Remote Triage**: Accept/reject/skip directions on remote devices
- **Remote Batch Control**: Start requirement batches on remote devices
- **Event Monitoring**: Track batch progress and events across devices

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Vibeman (PC1)     │         │   Vibeman (PC2)     │
│                     │         │                     │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ Zen Mode UI   │  │         │  │ Zen Mode UI   │  │
│  │ (Emulator)    │  │         │  │ (Emulator)    │  │
│  └───────┬───────┘  │         │  └───────┬───────┘  │
│          │          │         │          │          │
│  ┌───────▼───────┐  │         │  ┌───────▼───────┐  │
│  │ Command       │  │         │  │ Command       │  │
│  │ Processor     │◄─┼─────────┼──┤ Processor     │  │
│  └───────┬───────┘  │         │  └───────┬───────┘  │
│          │          │         │          │          │
└──────────┼──────────┘         └──────────┼──────────┘
           │                               │
           │     ┌─────────────────┐       │
           └────►│    Supabase     │◄──────┘
                 │                 │
                 │ vibeman_devices │
                 │ vibeman_commands│
                 │ vibeman_events  │
                 └─────────────────┘
```

## Zen Mode States

| Mode | Description |
|------|-------------|
| **Offline** | Local-only operation, no sync |
| **Online** | Configure Supabase connection |
| **Emulator** | Active mesh network participation |

## Key Components

### Frontend (`src/app/zen/`)

| Component | Purpose |
|-----------|---------|
| `ZenHeader` | Mode toggle (Offline/Online/Emulator) |
| `ZenControlPanel` | Main container, routes by mode |
| `RemoteSetupPanel` | Supabase configuration UI |
| `EmulatorPanel` | Tabbed interface for mesh control |
| `EmulatorTabs` | Triage / Batch / Monitor / Devices |
| `RemoteTriagePanel` | Swipeable direction cards |
| `RemoteBatchPanel` | Requirement selection & batch start |
| `RemoteMonitorPanel` | Batch progress & event feed |
| `DeviceGrid` | Device discovery & selection |

### Backend (`src/lib/remote/`)

| Module | Purpose |
|--------|---------|
| `deviceRegistry.ts` | Device registration & heartbeat |
| `commandProcessor.ts` | Poll & execute incoming commands |
| `commandHandlers.ts` | Handle specific command types |
| `config.server.ts` | Supabase configuration storage |
| `directionSync.ts` | Sync directions to Supabase |
| `requirementSync.ts` | Sync requirements to Supabase |
| `eventPublisher.ts` | Publish events to Supabase |

### API Routes (`src/app/api/remote/`)

| Route | Purpose |
|-------|---------|
| `/setup/status` | Check Supabase configuration |
| `/setup/save` | Save Supabase credentials |
| `/setup/validate` | Validate table schema |
| `/devices` | Register/list/unregister devices |
| `/mesh/commands` | Send/receive mesh commands |

### State Management (`src/stores/emulatorStore.ts`)

```typescript
interface EmulatorState {
  // Device state
  localDeviceId: string;
  localDeviceName: string;
  isRegistered: boolean;
  devices: RemoteDevice[];
  selectedDeviceId: string | null;

  // Remote data (from target device)
  remoteDirections: RemoteDirection[];
  remoteRequirements: RemoteRequirement[];
  remoteBatches: RemoteBatchInfo[];
  eventFeed: RemoteEvent[];

  // Module-specific remote modes
  isRemoteTaskRunnerMode: boolean;
}
```

## Command Flow

### Mesh Command Types

```typescript
type MeshCommandType =
  | 'healthcheck'
  | 'ping'
  | 'status_request'
  | 'fetch_directions'     // Get pending directions
  | 'triage_direction'     // Accept/reject/skip
  | 'fetch_requirements'   // Get requirement list
  | 'start_remote_batch'   // Start batch execution
  | 'get_batch_status';    // Query progress
```

### Command Lifecycle

```
1. Emulator sends command → vibeman_commands (status: 'pending')
2. Target polls vibeman_commands for their device_id
3. Target's commandProcessor executes handler
4. Handler writes result → vibeman_commands (status: 'completed')
5. Emulator polls for result by command_id
```

## Supabase Tables

### vibeman_devices
```sql
- id: uuid
- device_id: text (unique)
- device_name: text
- device_type: text
- hostname: text
- status: text (online/offline/busy)
- last_seen: timestamp
- capabilities: jsonb
```

### vibeman_commands
```sql
- id: uuid
- project_id: text
- command_type: text
- payload: jsonb
- status: text (pending/processing/completed/failed)
- result: jsonb
- target_device_id: text (nullable for broadcast)
- created_at: timestamp
- processed_at: timestamp
```

### vibeman_events
```sql
- id: uuid
- event_type: text
- project_id: text
- payload: jsonb
- source: text
- created_at: timestamp
```

## Module Boundaries

After consolidation (Jan 2026):

| Module | Responsibility |
|--------|---------------|
| **Zen Mode** | All Supabase cross-device sync, mesh network, remote triage, remote batch |
| **Integrations** | External webhooks (GitHub, Slack, Discord, etc.) - no Supabase provider |

## Tinder Remote Mode Integration

The Tinder module now supports remote triage via the device mesh:

### How It Works

1. User connects to mesh network via Zen Mode (Online → Emulator)
2. User selects a target device in Zen's device grid
3. In Tinder module, a "Remote" toggle appears when connection is available
4. Clicking Remote switches Tinder to fetch directions from the selected device
5. Accept/Reject actions are sent as mesh commands to the target device

### Key Files

| File | Purpose |
|------|---------|
| `src/app/features/tinder/lib/useRemoteTinderMode.ts` | Checks device connection status |
| `src/app/features/tinder/lib/useRemoteTinderItems.ts` | Fetches/triages items via mesh commands |
| `src/app/features/tinder/components/TinderFilterTabs.tsx` | Contains Remote mode toggle |
| `src/app/features/tinder/TinderLayout.tsx` | Switches between local/remote data sources |

### Data Flow

```
Tinder (Local)                Tinder (Remote)
     │                              │
     │ useTinderItems()             │ useRemoteTinderItems()
     │                              │
     ▼                              ▼
Local SQLite DB              Mesh Commands
                                    │
                                    ▼
                             Target Device
                                    │
                                    ▼
                             Target's SQLite DB
```

## TaskRunner Remote Batch Management

The TaskRunner module now supports remote batch management via the device mesh:

### How It Works

1. User connects to mesh network via Zen Mode (Online → Emulator)
2. User selects a target device in Zen's device grid
3. In TaskRunner CLI mode, a "Remote" toggle appears when connection is available
4. Clicking Remote enables remote batch section below local CLI sessions
5. User can view/select requirements from remote device and start batches
6. Batch progress is polled every 10 seconds and displayed in RemoteBatchMonitor

### Key Files

| File | Purpose |
|------|---------|
| `src/app/features/TaskRunner/hooks/useRemoteTaskRunner.ts` | Hook for remote batch management |
| `src/app/features/TaskRunner/components/RemoteBatchSection.tsx` | Container for remote UI |
| `src/app/features/TaskRunner/components/RemoteRequirementCard.tsx` | Selectable requirement card |
| `src/app/features/TaskRunner/components/RemoteBatchMonitor.tsx` | Active batch progress display |
| `src/app/features/TaskRunner/components/RemoteBatchCard.tsx` | Individual batch progress card |
| `src/app/features/TaskRunner/TaskRunnerHeader.tsx` | Contains remote mode toggle |
| `src/components/cli/CLIBatchPanel.tsx` | Renders RemoteBatchSection when remote mode active |

### Visual Theme

- Local CLI sessions: **Purple/Cyan** theme
- Remote batch section: **Emerald/Green** theme (distinct visual separation)

### Data Flow

```
TaskRunnerHeader (remote toggle)
         │
         ▼
   emulatorStore
   (isRemoteTaskRunnerMode)
         │
         ▼
CLIBatchPanel ──► useRemoteTaskRunner hook
         │              │
         ▼              ▼
RemoteBatchSection    /api/remote/mesh/commands
         │              │
         ▼              ▼
[Requirements List]   External Device
[Batch Monitor]       (executes tasks)
```

## Related Documentation

- [REMOTE_MESSAGE_BROKER.md](./REMOTE_MESSAGE_BROKER.md) - Original broker design
- [butler-vibeman-integration-guide.md](./butler-vibeman-integration-guide.md) - Butler mobile app integration
