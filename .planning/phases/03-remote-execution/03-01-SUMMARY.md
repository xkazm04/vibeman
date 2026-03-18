---
phase: 03-remote-execution
plan: 01
subsystem: remote
tags: [supabase, healthcheck, zen-mode, publisher]

dependency-graph:
  requires:
    - "01-01: Supabase event publisher infrastructure"
  provides:
    - "Healthcheck publishing service for Butler coordination"
    - "HealthcheckPayload type definition"
  affects:
    - "03-02: Zen mode integration (will call start/stop publishing)"
    - "03-03: Remote batch commands (uses healthcheck to know availability)"

tech-stack:
  added: []
  patterns:
    - "Singleton publisher with interval management"
    - "Dynamic Zustand imports for SSR safety"

key-files:
  created:
    - src/lib/remote/healthcheckPublisher.ts
    - src/app/api/remote/healthcheck/route.ts
  modified:
    - src/lib/remote/types.ts
    - src/lib/remote/index.ts

decisions:
  - id: "03-01-A"
    choice: "Client-side only publishing via dynamic imports"
    reason: "Zustand stores are client-side only; dynamic imports avoid SSR issues"

metrics:
  duration: "~4 min"
  completed: "2026-01-28"
---

# Phase 03 Plan 01: Healthcheck Publishing Summary

Healthcheck publisher service with 30-second interval publishing to Supabase for Butler coordination.

## What Was Built

### HealthcheckPayload Type
Added to `src/lib/remote/types.ts`:
```typescript
export interface HealthcheckPayload {
  zen_mode: boolean;        // true when accepting remote commands
  active_sessions: number;  // 0-4 running CLI sessions
  available_slots: number;  // 4 - active_sessions
  timestamp: string;        // ISO string
}
```

### HealthcheckPublisher Service
Created `src/lib/remote/healthcheckPublisher.ts`:
- Singleton class with `start(projectId)`, `stop()`, `publishNow()` methods
- 30-second interval publishing when started
- Dynamic imports for Zustand stores (SSR-safe)
- Exported convenience functions: `startHealthcheckPublishing`, `stopHealthcheckPublishing`, `publishHealthcheckNow`, `isHealthcheckPublishing`

### API Endpoint
Created `src/app/api/remote/healthcheck/route.ts`:
- GET: Returns endpoint documentation and usage info
- POST: Acknowledges request with guidance for client-side publishing
- Note: Actual state access requires client-side code where Zustand stores are available

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add healthcheck types and publisher service | eabb090 | types.ts, healthcheckPublisher.ts, index.ts |
| 2 | Create healthcheck API endpoint | 008f2f3 | healthcheck/route.ts |

## Key Implementation Details

**Why client-side only:** The healthcheck needs zen_mode from `useZenStore` and session count from `useCLISessionStore`. These are Zustand stores that only exist on the client. Dynamic imports ensure the module can be imported without errors during SSR.

**Usage pattern:**
```typescript
// Start publishing (e.g., when entering zen mode)
import { startHealthcheckPublishing } from '@/lib/remote';
startHealthcheckPublishing(projectId);

// Stop publishing (e.g., when leaving zen mode)
import { stopHealthcheckPublishing } from '@/lib/remote';
stopHealthcheckPublishing();

// Manual publish
import { publishHealthcheckNow } from '@/lib/remote';
publishHealthcheckNow(projectId);
```

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 03-02:** Zen mode can now integrate healthcheck publishing by calling start/stop on mode changes.

**Required integration points:**
1. Call `startHealthcheckPublishing(projectId)` when zen mode goes online
2. Call `stopHealthcheckPublishing()` when zen mode goes offline
3. Butler can subscribe to `healthcheck` events to know Vibeman availability
