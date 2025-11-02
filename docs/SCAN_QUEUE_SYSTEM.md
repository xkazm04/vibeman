# Scan Queue System Documentation

## Overview

The Scan Queue System provides automated scan triggering, real-time progress tracking, and notification management for AI-powered code analysis scans. This system enables hands-free workflow automation where scans can be triggered by file changes, Git pushes, or manual actions.

## Architecture

### Database Schema

#### `scan_queue` Table
Stores queued scan jobs with progress tracking and status management.

**Key Fields:**
- `id`: Unique queue item identifier
- `project_id`: Associated project
- `scan_type`: Type of scan (e.g., 'bug_hunter', 'security_protector')
- `trigger_type`: How the scan was triggered ('manual', 'git_push', 'file_change', 'scheduled')
- `status`: Current status ('queued', 'running', 'completed', 'failed', 'cancelled')
- `priority`: Queue priority (higher = processed first)
- `progress`: Progress percentage (0-100)
- `progress_message`: Human-readable progress status
- `current_step` / `total_steps`: Step tracking for detailed progress
- `auto_merge_enabled`: Whether to auto-accept high-impact, low-effort ideas

#### `scan_notifications` Table
Stores user notifications for scan events.

**Notification Types:**
- `scan_started`: Scan has begun processing
- `scan_completed`: Scan finished successfully
- `scan_failed`: Scan encountered an error
- `auto_merge_completed`: Auto-merge process completed

#### `file_watch_config` Table
Configuration for file watching per project.

**Configuration:**
- `watch_patterns`: JSON array of glob patterns to watch
- `ignore_patterns`: JSON array of patterns to ignore
- `scan_types`: JSON array of scan types to trigger
- `debounce_ms`: Debounce delay in milliseconds

## Core Components

### 1. Database Layer

**Repository:** `src/app/db/repositories/scanQueue.repository.ts`

Provides CRUD operations for:
- Queue items (create, read, update, delete)
- Notifications (create, read, mark as read)
- File watch configuration (get, upsert, toggle)

**Key Functions:**
```typescript
scanQueueDb.createQueueItem(item)
scanQueueDb.getNextPending(projectId?)
scanQueueDb.updateProgress(id, progress, message)
scanQueueDb.updateStatus(id, status, errorMessage?)
scanQueueDb.createNotification(notification)
scanQueueDb.upsertFileWatchConfig(config)
```

### 2. File Watcher System

**Module:** `src/lib/fileWatcher.ts`

Monitors file system changes and auto-enqueues scans based on configuration.

**Features:**
- Uses `chokidar` for cross-platform file watching
- Configurable glob patterns for watching/ignoring files
- Debouncing to prevent excessive scan triggering
- Hot-reload support for configuration changes

**Usage:**
```typescript
import { fileWatcherManager } from '@/lib/fileWatcher';

// Start watching a project
fileWatcherManager.startWatching(projectId, projectPath);

// Stop watching
await fileWatcherManager.stopWatching(projectId);

// Reload configuration
await fileWatcherManager.reloadConfig(projectId, projectPath);
```

### 3. Background Queue Worker

**Module:** `src/lib/scanQueueWorker.ts`

Processes queued scans with real-time progress updates.

**Features:**
- Polls database for pending queue items
- Executes scans with progress tracking
- Creates notifications for scan events
- Supports auto-merge functionality
- Configurable poll interval and concurrency

**Configuration:**
```typescript
scanQueueWorker.start({
  pollIntervalMs: 5000,      // Poll every 5 seconds
  maxConcurrent: 1,          // Process one scan at a time
  provider: 'gemini'         // LLM provider to use
});
```

**Auto-Merge:**
- Automatically accepts ideas with `impact=3` and `effort=1`
- Creates notification when auto-merge completes
- Can be enabled per queue item

### 4. API Endpoints

#### Queue Management

**`GET /api/scan-queue?projectId={id}&status={status}`**
Get queue items for a project, optionally filtered by status.

**`POST /api/scan-queue`**
Create a new queue item.

Request body:
```json
{
  "projectId": "project-123",
  "scanType": "bug_hunter",
  "contextId": "context-456",
  "triggerType": "manual",
  "priority": 0,
  "autoMergeEnabled": false
}
```

**`GET /api/scan-queue/{id}`**
Get a specific queue item.

**`PATCH /api/scan-queue/{id}`**
Update queue item status or progress.

**`DELETE /api/scan-queue/{id}`**
Cancel a queue item (sets status to 'cancelled').

#### Worker Control

**`GET /api/scan-queue/worker`**
Get worker status.

Response:
```json
{
  "status": {
    "isRunning": true,
    "currentlyProcessing": 1,
    "config": {
      "pollIntervalMs": 5000,
      "maxConcurrent": 1,
      "provider": "gemini"
    }
  }
}
```

**`POST /api/scan-queue/worker`**
Control the worker.

Actions:
- `start`: Start the worker
- `stop`: Stop the worker
- `configure`: Update worker configuration

Request body:
```json
{
  "action": "start",
  "config": {
    "pollIntervalMs": 3000,
    "provider": "anthropic"
  }
}
```

#### Notifications

**`GET /api/scan-queue/notifications?projectId={id}&unreadOnly={true|false}`**
Get notifications for a project.

**`PATCH /api/scan-queue/notifications`**
Mark notification(s) as read.

**`DELETE /api/scan-queue/notifications?notificationId={id}`**
Delete a notification.

#### File Watch

**`GET /api/file-watch?projectId={id}`**
Get file watch configuration.

**`POST /api/file-watch`**
Create or update file watch configuration.

Request body:
```json
{
  "projectId": "project-123",
  "projectPath": "/path/to/project",
  "enabled": true,
  "watchPatterns": ["src/**/*.ts", "src/**/*.tsx"],
  "ignorePatterns": ["**/node_modules/**", "**/*.test.ts"],
  "scanTypes": ["bug_hunter", "security_protector"],
  "debounceMs": 5000
}
```

**`PATCH /api/file-watch`**
Toggle file watch enabled status.

### 5. UI Components

#### ScanQueueProgress

**Location:** `src/app/features/ScanQueue/components/ScanQueueProgress.tsx`

Displays active and recent scans with live progress bars.

**Features:**
- Auto-refresh (configurable interval)
- Real-time progress bars for running scans
- Step tracking (e.g., "2/4")
- Status indicators (queued, running, completed, failed)
- Auto-merge badge
- Error message display

**Usage:**
```tsx
<ScanQueueProgress
  projectId="project-123"
  autoRefresh={true}
  refreshIntervalMs={2000}
/>
```

#### ScanNotifications

**Location:** `src/app/features/ScanQueue/components/ScanNotifications.tsx`

Toast-style notifications for scan events.

**Features:**
- Fixed bottom-right positioning
- Auto-dismiss after 10 seconds (for completed/failed)
- Manual dismiss
- Mark all as read
- Animated entry/exit
- Color-coded by event type

**Usage:**
```tsx
<ScanNotifications
  projectId="project-123"
  autoRefresh={true}
  refreshIntervalMs={3000}
  maxDisplay={5}
/>
```

#### ScanQueueControl

**Location:** `src/app/features/ScanQueue/components/ScanQueueControl.tsx`

Control panel for managing worker and file watch.

**Features:**
- Start/stop queue worker
- Toggle file watch
- Live status indicator

**Usage:**
```tsx
<ScanQueueControl
  projectId="project-123"
  projectPath="/path/to/project"
/>
```

## Usage Examples

### 1. Manual Scan Trigger

```typescript
const response = await fetch('/api/scan-queue', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-123',
    scanType: 'bug_hunter',
    triggerType: 'manual',
    priority: 5
  })
});

const { queueItem } = await response.json();
console.log('Scan queued:', queueItem.id);
```

### 2. Set Up File Watching

```typescript
const response = await fetch('/api/file-watch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-123',
    projectPath: '/path/to/project',
    enabled: true,
    watchPatterns: ['src/**/*.ts', 'src/**/*.tsx'],
    ignorePatterns: ['**/*.test.ts'],
    scanTypes: ['bug_hunter', 'security_protector'],
    debounceMs: 5000
  })
});
```

### 3. Monitor Queue Progress

```typescript
const response = await fetch('/api/scan-queue?projectId=project-123&status=running');
const { queueItems } = await response.json();

for (const item of queueItems) {
  console.log(`${item.scan_type}: ${item.progress}% - ${item.progress_message}`);
}
```

### 4. Start the Worker

```typescript
const response = await fetch('/api/scan-queue/worker', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'start',
    config: {
      pollIntervalMs: 3000,
      maxConcurrent: 2,
      provider: 'anthropic'
    }
  })
});
```

## Workflow Diagrams

### File Change → Scan Flow

```
File Change Detected
    ↓
Debounce Timer (5s default)
    ↓
Create Queue Items (one per scan type)
    ↓
Notification: "Scans queued"
    ↓
Worker Polls Queue
    ↓
Process Queue Item
    ├─ Update status: 'running'
    ├─ Notification: "Scan started"
    ├─ Update progress: 0% → 25% → 50% → 75% → 100%
    ├─ Execute scan
    ├─ Store results
    ├─ Auto-merge (if enabled)
    ├─ Update status: 'completed'
    └─ Notification: "Scan completed"
```

### Git Push → Scan Flow

```
Git Push Hook
    ↓
Extract commit metadata
    ↓
Create Queue Item
    ├─ trigger_type: 'git_push'
    ├─ trigger_metadata: { commitHash, branch, author }
    └─ priority: 2 (higher than file_change)
    ↓
(Same as File Change flow)
```

## Configuration Best Practices

### File Watch Patterns

**Recommended patterns:**
```json
{
  "watchPatterns": [
    "src/**/*.{ts,tsx,js,jsx}",
    "app/**/*.{ts,tsx}",
    "lib/**/*.ts"
  ],
  "ignorePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}"
  ]
}
```

### Scan Type Selection

**Common combinations:**
- **Bug Prevention:** `bug_hunter`, `security_protector`
- **Performance:** `perf_optimizer`
- **Architecture:** `zen_architect`, `ambiguity_guardian`
- **Business Value:** `business_visionary`, `feature_scout`

### Debounce Timing

- **Fast iteration:** 2000ms
- **Standard:** 5000ms (default)
- **Large codebases:** 10000ms

## Performance Considerations

### Database Indexes

All critical queries are indexed:
- `idx_scan_queue_priority`: Fast priority-based queue retrieval
- `idx_scan_queue_status`: Filter by status
- `idx_scan_notifications_project`: Project-specific notifications

### Queue Cleanup

Clean up old completed/failed items periodically:

```typescript
scanQueueDb.cleanupOldItems(projectId, daysOld = 30);
```

### Worker Tuning

- **Single project:** `maxConcurrent: 1`
- **Multiple projects:** `maxConcurrent: 2-3`
- **Poll interval:** Balance between responsiveness and CPU usage

## Troubleshooting

### Scans Not Triggering

1. Check worker is running: `GET /api/scan-queue/worker`
2. Verify file watch is enabled: `GET /api/file-watch?projectId=X`
3. Check debounce hasn't delayed trigger
4. Verify watch patterns match changed files

### Progress Not Updating

1. Ensure auto-refresh is enabled in UI components
2. Check worker is processing items
3. Verify API endpoints are accessible

### High CPU Usage

1. Increase `pollIntervalMs` (default 5000ms)
2. Reduce `maxConcurrent`
3. Increase file watch `debounceMs`

## Future Enhancements

- [ ] Git push hook integration
- [ ] Scheduled scans (cron-like)
- [ ] Scan result diffing
- [ ] Smart auto-merge with ML scoring
- [ ] Multi-project batch scanning
- [ ] WebSocket for real-time updates
- [ ] Scan history analytics
- [ ] Custom trigger scripts

## Related Documentation

- [API Endpoints](./API_ENDPOINTS.md)
- [LangGraph Quick Reference](./LANGGRAPH_QUICK_REFERENCE.md)
- [README](../README.md)
