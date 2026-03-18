---
phase: 02
plan: 03
subsystem: remote-sync
tags: [polling, supabase, decisions, sqlite, zustand, badge]
depends_on:
  requires: ["02-01", "02-02"]
  provides: ["decision-polling", "sync-back", "decision-badge"]
  affects: ["03-remote-execution"]
tech_stack:
  added: []
  patterns: ["singleton-poller", "zustand-persist", "dropdown-badge"]
key_files:
  created:
    - src/lib/remote/decisionPoller.ts
    - src/app/api/remote/poll-decisions/route.ts
    - src/stores/decisionSyncStore.ts
    - src/app/features/Integrations/components/DecisionBadge.tsx
  modified:
    - src/app/features/Integrations/components/IntegrationDetailPanel.tsx
decisions:
  - "Singleton poller pattern for DecisionPoller class"
  - "60 second default polling interval (configurable)"
  - "Skip direction leaves status as pending (no SQLite change)"
  - "Zustand persist for cache category with recent decisions"
  - "Auto-start polling when Supabase integration is active"
metrics:
  duration: "~5 min"
  completed: "2026-01-28"
---

# Phase 02 Plan 03: Decision Polling Summary

**One-liner:** Background polling service that syncs accept/reject/skip decisions from Butler to SQLite with notification badge

## What Was Built

### 1. DecisionPoller Class (`src/lib/remote/decisionPoller.ts`)
- Singleton class that polls Supabase vibeman_commands every 60 seconds
- Queries for pending direction commands: accept_direction, reject_direction, skip_direction
- Processes each command by updating SQLite direction status
- Marks processed commands as completed in Supabase
- Exports convenience functions: `startDecisionPolling()`, `stopDecisionPolling()`, `pollDecisions()`

### 2. Poll Decisions API (`src/app/api/remote/poll-decisions/route.ts`)
- POST endpoint for manual poll triggering
- Returns processed count and decision details
- Used by both manual "Poll Now" button and background poller

### 3. Decision Sync Store (`src/stores/decisionSyncStore.ts`)
- Zustand store with persist middleware (cache category)
- Tracks: isPolling, lastPollAt, newDecisionCount, recentDecisions
- Actions: startPolling, stopPolling, pollNow, clearNewDecisionCount
- Helper functions: getTimeSinceLastPoll, formatDecisionAction

### 4. DecisionBadge Component (`src/app/features/Integrations/components/DecisionBadge.tsx`)
- Orange notification badge showing new decision count
- Dropdown with recent decisions and action icons
- Clear button to acknowledge decisions
- Only visible when count > 0

### 5. IntegrationDetailPanel Updates
- Auto-starts polling when Supabase integration is active
- Added DecisionBadge next to Remote Sync Actions header
- Added "Poll Decisions" button for manual triggering
- Shows "Last synced: X minutes ago" with auto-polling status

## Decision Flow

```
Butler (Flutter)           Supabase                    Vibeman
    |                          |                          |
    |-- swipe accept --------->|                          |
    |                          | vibeman_commands         |
    |                          | (status: pending)        |
    |                          |                          |
    |                          |<------- poll every 60s --|
    |                          |                          |
    |                          |-- pending commands ----->|
    |                          |                          |
    |                          |                  Update SQLite
    |                          |                  direction.status
    |                          |                          |
    |                          |<--- mark completed ------|
    |                          |                          |
    |                          |                  Show badge
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit`: PASS
- `npm run lint`: PASS
- Files created match must_haves specification
- Exports match required interface

## Next Phase Readiness

Phase 3 (Remote Execution) can now build on:
- Established polling pattern for commands
- Decision sync store for tracking sync status
- Badge notification pattern for user feedback

The bidirectional sync loop is complete:
1. Vibeman pushes directions to Supabase (02-01)
2. Butler displays and triages directions (02-02)
3. Vibeman polls decisions and updates SQLite (02-03)
