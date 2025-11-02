# Scan Queue System - Integration Guide

## Quick Start

This guide shows how to integrate the Scan Queue System into your Vibeman project.

## Step 1: Database Initialization

The database tables are automatically created when you start the application. The schema includes:
- `scan_queue`
- `scan_notifications`
- `file_watch_config`

No manual setup required!

## Step 2: Start the Queue Worker

Add this to your main application initialization (e.g., in `app/layout.tsx` or a dedicated initialization script):

```typescript
import { scanQueueWorker } from '@/lib/scanQueueWorker';

// Start the worker when app initializes
if (typeof window === 'undefined') { // Server-side only
  scanQueueWorker.start({
    pollIntervalMs: 5000,
    maxConcurrent: 1,
    provider: 'gemini' // or 'anthropic', 'openai', 'ollama'
  });
}
```

## Step 3: Add UI Components to Your Layout

### Option A: Full Integration (Recommended)

Add the components to your main layout or project dashboard:

```tsx
import { ScanQueueProgress } from '@/app/features/ScanQueue/components/ScanQueueProgress';
import { ScanNotifications } from '@/app/features/ScanQueue/components/ScanNotifications';
import { ScanQueueControl } from '@/app/features/ScanQueue/components/ScanQueueControl';

export default function ProjectDashboard({ projectId, projectPath }) {
  return (
    <div>
      {/* Control Panel */}
      <ScanQueueControl projectId={projectId} projectPath={projectPath} />

      {/* Progress Display */}
      <ScanQueueProgress projectId={projectId} />

      {/* Notifications (fixed position) */}
      <ScanNotifications projectId={projectId} />
    </div>
  );
}
```

### Option B: Minimal Integration

Just add notifications for a non-intrusive experience:

```tsx
import { ScanNotifications } from '@/app/features/ScanQueue/components/ScanNotifications';

export default function Layout({ children, projectId }) {
  return (
    <>
      {children}
      <ScanNotifications projectId={projectId} />
    </>
  );
}
```

## Step 4: Configure File Watching (Optional)

Set up automatic scan triggering when files change:

```typescript
// In your project settings or initialization
const setupFileWatch = async (projectId: string, projectPath: string) => {
  const response = await fetch('/api/file-watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      projectPath,
      enabled: true,
      watchPatterns: [
        'src/**/*.ts',
        'src/**/*.tsx',
        'app/**/*.ts',
        'app/**/*.tsx'
      ],
      ignorePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/*.test.ts'
      ],
      scanTypes: ['bug_hunter', 'security_protector'],
      debounceMs: 5000
    })
  });

  if (response.ok) {
    console.log('File watch configured successfully');
  }
};
```

## Step 5: Trigger Your First Scan

### Manual Trigger

```typescript
const triggerScan = async () => {
  const response = await fetch('/api/scan-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'your-project-id',
      scanType: 'bug_hunter',
      triggerType: 'manual',
      priority: 0,
      autoMergeEnabled: false
    })
  });

  const { queueItem } = await response.json();
  console.log('Scan queued:', queueItem);
};
```

### From Existing Scan Button

Modify your existing scan trigger to use the queue:

```typescript
// Before
const handleScan = async () => {
  await executeScan({ projectId, scanType });
};

// After
const handleScan = async () => {
  await fetch('/api/scan-queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      scanType,
      triggerType: 'manual',
      priority: 5 // Higher priority for manual scans
    })
  });
};
```

## Complete Integration Example

Here's a complete example showing all components working together:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { ScanQueueProgress } from '@/app/features/ScanQueue/components/ScanQueueProgress';
import { ScanNotifications } from '@/app/features/ScanQueue/components/ScanNotifications';
import { ScanQueueControl } from '@/app/features/ScanQueue/components/ScanQueueControl';

export default function ProjectWorkspace({ projectId, projectPath }: {
  projectId: string;
  projectPath: string;
}) {
  const [fileWatchConfigured, setFileWatchConfigured] = useState(false);

  // Initialize file watch on mount
  useEffect(() => {
    const initFileWatch = async () => {
      try {
        const response = await fetch('/api/file-watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            projectPath,
            enabled: true,
            watchPatterns: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
            ignorePatterns: ['**/node_modules/**', '**/*.test.ts'],
            scanTypes: ['bug_hunter', 'security_protector'],
            debounceMs: 5000
          })
        });

        if (response.ok) {
          setFileWatchConfigured(true);
        }
      } catch (error) {
        console.error('Failed to configure file watch:', error);
      }
    };

    initFileWatch();
  }, [projectId, projectPath]);

  const handleManualScan = async (scanType: string) => {
    await fetch('/api/scan-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        scanType,
        triggerType: 'manual',
        priority: 5,
        autoMergeEnabled: false
      })
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Project Workspace</h1>
        <ScanQueueControl projectId={projectId} projectPath={projectPath} />
      </div>

      {/* File Watch Status */}
      {fileWatchConfigured && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400">
            Auto-scan enabled - changes will trigger scans automatically
          </p>
        </div>
      )}

      {/* Manual Scan Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleManualScan('bug_hunter')}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg"
        >
          Run Bug Hunter
        </button>
        <button
          onClick={() => handleManualScan('security_protector')}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg"
        >
          Run Security Scan
        </button>
      </div>

      {/* Queue Progress */}
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Scan Queue</h2>
        <ScanQueueProgress
          projectId={projectId}
          autoRefresh={true}
          refreshIntervalMs={2000}
        />
      </div>

      {/* Other project content */}
      {/* ... */}

      {/* Notifications (fixed bottom-right) */}
      <ScanNotifications
        projectId={projectId}
        autoRefresh={true}
        refreshIntervalMs={3000}
        maxDisplay={5}
      />
    </div>
  );
}
```

## Server-Side Initialization

Create a server initialization script to start the worker automatically:

```typescript
// lib/serverInit.ts
import { scanQueueWorker } from '@/lib/scanQueueWorker';
import { fileWatcherManager } from '@/lib/fileWatcher';

let initialized = false;

export function initializeServer() {
  if (initialized) return;

  // Start queue worker
  scanQueueWorker.start({
    pollIntervalMs: 5000,
    maxConcurrent: 1,
    provider: 'gemini'
  });

  // Load and start file watchers for active projects
  // (You'll need to implement this based on your project storage)

  initialized = true;
  console.log('Scan queue system initialized');
}

// Auto-initialize on import
if (typeof window === 'undefined') {
  initializeServer();
}
```

Then import in your root layout:

```typescript
// app/layout.tsx
import '@/lib/serverInit'; // Auto-initializes worker

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## Testing Your Integration

1. **Test Worker Status:**
```bash
curl http://localhost:3000/api/scan-queue/worker
```

2. **Test Manual Scan:**
```bash
curl -X POST http://localhost:3000/api/scan-queue \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-project",
    "scanType": "bug_hunter",
    "triggerType": "manual"
  }'
```

3. **Test File Watch:**
Make a change to a watched file and check the queue after debounce period:
```bash
curl http://localhost:3000/api/scan-queue?projectId=test-project
```

## Common Issues

### Worker Not Processing Items

**Solution:** Ensure the worker is started on the server side (not in browser):
```typescript
if (typeof window === 'undefined') {
  scanQueueWorker.start();
}
```

### File Watch Not Triggering

**Solution:** Check that:
1. File watch config exists and is enabled
2. Changed files match watch patterns
3. Files aren't in ignore patterns
4. Debounce period has elapsed

### Notifications Not Showing

**Solution:** Make sure `ScanNotifications` component is mounted and receiving the correct `projectId`.

## Next Steps

- Configure auto-merge for high-priority ideas
- Set up Git push hooks for automatic scanning
- Customize notification behavior
- Add custom scan types
- Integrate with CI/CD pipeline

For more details, see [SCAN_QUEUE_SYSTEM.md](./SCAN_QUEUE_SYSTEM.md)
