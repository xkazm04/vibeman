# Cross-Device Task Offload Implementation Plan

## Overview

This feature enables users to offload implementation tasks from a primary Vibeman instance (e.g., PC) to secondary devices (e.g., laptop) when all batch slots are full but the idea backlog still has pending work.

## Use Case

1. User works on Vibeman on their PC
2. All 4 batch slots are full with running tasks
3. Idea backlog still has 20+ accepted ideas waiting
4. User wants to use their laptop to process additional ideas
5. Laptop runs Vibeman with the same project (different filepath)
6. Tasks sync and execute in parallel across devices

## Architecture

```
                                 +------------------+
                                 |   Source Device  |
                                 |   (PC / Offloader)|
                                 +--------+---------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
            +-------v-------+                           +-------v-------+
            | Bridge API    |                           | Zen Monitor   |
            | /api/bridge/* |                           | (SSE Stream)  |
            +-------+-------+                           +---------------+
                    |
                    | HTTP + SSE
                    |
            +-------v-------+
            | Target Device |
            | (Laptop/Offloadee)|
            +-------+-------+
                    |
            +-------v-------+
            | TaskRunner    |
            | (Executes)    |
            +---------------+
```

## Database Schema

### New Table: `device_pairs`

```sql
CREATE TABLE IF NOT EXISTS device_pairs (
  id TEXT PRIMARY KEY,
  source_device_id TEXT NOT NULL,           -- UUID of source device
  target_device_id TEXT NOT NULL,           -- UUID of target device
  source_project_id TEXT NOT NULL,          -- Project ID on source
  target_project_path TEXT NOT NULL,        -- Project path on target device
  pairing_code TEXT UNIQUE,                 -- 6-digit pairing code
  status TEXT DEFAULT 'pending',            -- pending, active, disconnected
  last_sync_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_project_id) REFERENCES projects(id)
);
```

### New Table: `offload_queue`

```sql
CREATE TABLE IF NOT EXISTS offload_queue (
  id TEXT PRIMARY KEY,
  device_pair_id TEXT NOT NULL,
  idea_id TEXT NOT NULL,
  requirement_content TEXT NOT NULL,        -- Full requirement file content
  status TEXT DEFAULT 'pending',            -- pending, synced, running, completed, failed
  synced_at TEXT,
  completed_at TEXT,
  result_summary TEXT,
  FOREIGN KEY (device_pair_id) REFERENCES device_pairs(id),
  FOREIGN KEY (idea_id) REFERENCES ideas(id)
);
```

## Implementation Phases

### Phase 1: Device Pairing

#### 1.1 Pairing Code Generation (Source Device)

```typescript
// POST /api/bridge/offload/pair
interface PairingRequest {
  projectId: string;
  deviceName: string;
}

interface PairingResponse {
  pairingCode: string;      // e.g., "847291"
  expiresAt: string;        // 5 minute expiry
  sourceDeviceId: string;
}
```

**UI Location**: Zen Mode > Offload Tab > "Generate Pairing Code"

#### 1.2 Pairing Acceptance (Target Device)

```typescript
// POST /api/bridge/offload/accept
interface AcceptRequest {
  pairingCode: string;
  targetProjectPath: string;  // Local path to same project
  deviceName: string;
}

interface AcceptResponse {
  success: boolean;
  devicePairId: string;
  sourceDeviceUrl: string;    // For SSE connection
}
```

**UI Location**: Zen Mode > Offload Tab > "Enter Pairing Code"

### Phase 2: Requirement Sync

#### 2.1 Idea Selection for Offload (Source Device)

```typescript
// POST /api/bridge/offload/queue
interface OffloadRequest {
  devicePairId: string;
  ideaIds: string[];        // Ideas to offload
}

interface OffloadResponse {
  queued: number;
  requirements: Array<{
    ideaId: string;
    requirementPath: string;  // .claude/requirements/xxx.md
    content: string;
  }>;
}
```

**Process**:
1. User selects accepted ideas in Zen Mode
2. System generates requirement files from ideas
3. Requirement content is queued for sync

#### 2.2 Requirement Pull (Target Device)

```typescript
// GET /api/bridge/offload/pull?devicePairId=xxx
interface PullResponse {
  requirements: Array<{
    id: string;
    ideaId: string;
    content: string;
    filename: string;
  }>;
}
```

**Process**:
1. Target device polls for new requirements
2. Writes requirement files to local `.claude/requirements/`
3. Marks as synced in offload_queue

### Phase 3: Execution & Status Sync

#### 3.1 Task Execution (Target Device)

Standard TaskRunner execution:
1. Requirement appears in local TaskRunner queue
2. User assigns to local batch
3. Claude Code executes the requirement
4. Results are tracked locally

#### 3.2 Status Sync Back to Source

```typescript
// POST /api/bridge/offload/status
interface StatusUpdate {
  devicePairId: string;
  ideaId: string;
  status: 'running' | 'completed' | 'failed';
  summary?: string;
  filesChanged?: string[];
  error?: string;
}
```

**SSE Events** (on Source):
- `offload_task_started` - Task began on target device
- `offload_task_completed` - Task finished successfully
- `offload_task_failed` - Task failed

### Phase 4: Result Merge (Optional)

#### 4.1 Git-Based Sync

For projects using git:
1. Target device commits changes to a branch
2. Source device fetches and merges
3. Conflict resolution handled manually

```typescript
// POST /api/bridge/offload/commit
interface CommitRequest {
  devicePairId: string;
  ideaId: string;
  branchName: string;       // e.g., "offload/idea-123"
  commitMessage: string;
}
```

#### 4.2 File-Based Sync (No Git)

For non-git projects:
1. Changed files are bundled
2. Transferred via Bridge API
3. Applied to source project

## UI Components

### Zen Mode > Offload Tab

```
+------------------------------------------+
| Offload Manager                          |
+------------------------------------------+
| Status: Connected to "Laptop-Work"       |
| Synced Tasks: 12 | Running: 2 | Done: 8  |
+------------------------------------------+

+------------------+  +-------------------+
| OFFLOAD IDEAS    |  | REMOTE STATUS     |
| [x] Idea #234    |  | Task #12: Running |
| [x] Idea #235    |  | Task #11: Done    |
| [ ] Idea #236    |  | Task #10: Done    |
| [ ] Idea #237    |  | ...               |
+------------------+  +-------------------+

[Offload Selected (3)]  [Refresh Status]

+------------------------------------------+
| Pairing                                  |
+------------------------------------------+
| Your Code: 847291  [Copy]               |
| - OR -                                   |
| [Enter Partner Code: ______] [Connect]   |
+------------------------------------------+
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bridge/offload/pair` | POST | Generate pairing code |
| `/api/bridge/offload/accept` | POST | Accept pairing with code |
| `/api/bridge/offload/disconnect` | POST | End device pairing |
| `/api/bridge/offload/queue` | POST | Queue ideas for offload |
| `/api/bridge/offload/pull` | GET | Pull pending requirements |
| `/api/bridge/offload/status` | POST | Update task status |
| `/api/bridge/offload/status` | GET | Get all offload statuses |

## Security Considerations

1. **Pairing Code Expiry**: Codes expire after 5 minutes
2. **Device Verification**: Devices must be on same network (optional LAN-only mode)
3. **API Key Sharing**: Paired devices share Bridge API key for duration of session
4. **No Sensitive Data**: Only requirement content synced, no credentials

## Implementation Priority

### MVP (Phase 1-2)
1. Device pairing UI in Zen Mode
2. Basic requirement sync
3. Manual status check

### v1.1 (Phase 3)
1. Real-time SSE status updates
2. Automatic requirement polling
3. Progress visualization

### v1.2 (Phase 4)
1. Git branch sync
2. File transfer for non-git projects
3. Conflict detection

## File Structure

```
src/
  app/
    api/
      bridge/
        offload/
          pair/route.ts
          accept/route.ts
          disconnect/route.ts
          queue/route.ts
          pull/route.ts
          status/route.ts
    zen/
      components/
        ZenOffload.tsx
        OffloadPairing.tsx
        OffloadQueue.tsx
        OffloadStatus.tsx
      lib/
        offloadStore.ts
  lib/
    bridge/
      offload.ts           # Offload utilities
      devicePairing.ts     # Pairing logic
  db/
    repositories/
      device-pair.repository.ts
      offload-queue.repository.ts
    models/
      offload.types.ts
```

## Configuration

```env
# .env
OFFLOAD_ENABLED=true
OFFLOAD_PAIRING_EXPIRY_MS=300000  # 5 minutes
OFFLOAD_SYNC_INTERVAL_MS=5000     # Poll every 5 seconds
OFFLOAD_LAN_ONLY=false            # Restrict to local network
```

## Testing Scenarios

1. **Happy Path**: Pair -> Queue -> Sync -> Execute -> Complete
2. **Network Disconnect**: Handle reconnection and state recovery
3. **Partial Sync**: Resume from incomplete sync
4. **Concurrent Execution**: Multiple ideas running on target
5. **Result Merge Conflict**: Handle git conflicts gracefully

## Future Enhancements

1. **Multi-Device Support**: More than 2 devices in a mesh
2. **Cloud Relay**: Sync via cloud for remote devices
3. **Mobile App**: iOS/Android companion for monitoring
4. **Automatic Load Balancing**: Distribute tasks across available devices
