---
phase: 02
plan: 01
subsystem: remote-sync
tags: [supabase, sync, directions, requirements, api, ui]

dependency_graph:
  requires:
    - "01-01: Supabase connector and integration framework"
    - "01-02: Butler project configuration"
  provides:
    - "Manual sync functionality for directions to Supabase"
    - "Manual sync functionality for requirements to Supabase"
    - "Sync button in Integrations UI"
  affects:
    - "02-02: Butler mobile triage (will read synced data)"
    - "03-01: Remote batch execution (may extend sync patterns)"

tech_stack:
  added: []
  patterns:
    - "Parallel sync operations with independent error handling"
    - "REST API insert to vibeman_events table"
    - "Toast-based user feedback for async operations"

file_tracking:
  key_files:
    created:
      - "src/lib/remote/directionSync.ts"
      - "src/lib/remote/requirementSync.ts"
      - "src/app/api/remote/sync/route.ts"
      - "src/app/features/Integrations/components/SyncButton.tsx"
    modified:
      - "src/app/features/Integrations/components/IntegrationDetailPanel.tsx"

decisions:
  - id: "02-01-01"
    title: "Parallel sync with partial success handling"
    context: "Directions and requirements are independent sync operations"
    decision: "Run syncs in parallel, handle partial failures gracefully"
    rationale: "Faster sync, better UX when one succeeds but other fails"
  - id: "02-01-02"
    title: "Project path from projectDb"
    context: "Need project filesystem path for requirements sync"
    decision: "Use projectDb.getProject() to get path"
    rationale: "Consistent with existing project management patterns"

metrics:
  duration: "~5 min"
  completed: "2026-01-27"
---

# Phase 02 Plan 01: Sync Button and Direction/Requirement Publishing Summary

**One-liner:** Manual sync button in Integrations pushes pending directions and .claude/requirements to Supabase vibeman_events table.

## What Was Built

### 1. Direction Sync Utility (`src/lib/remote/directionSync.ts`)
- `syncPendingDirections(projectId, projectName)` function
- Queries pending directions from SQLite via directionRepository
- Inserts each direction as `direction_pending` event in Supabase
- Payload includes: direction_id, summary, direction content, context_name
- Returns count of synced items and any errors

### 2. Requirement Sync Utility (`src/lib/remote/requirementSync.ts`)
- `syncRequirements(projectId, projectName, projectPath)` function
- Reads all .md files from `.claude/requirements/` directory
- Inserts each requirement as `requirement_pending` event in Supabase
- Payload includes: requirement_name, full content
- Returns count of synced items and any errors

### 3. Sync API Endpoint (`src/app/api/remote/sync/route.ts`)
- POST endpoint accepting `{ projectId }`
- Runs both syncs in parallel using Promise.all
- Returns combined result with individual counts
- Handles partial success (one sync fails, other succeeds)
- Uses standardized API error handling from api-errors.ts

### 4. SyncButton Component (`src/app/features/Integrations/components/SyncButton.tsx`)
- "Sync to Butler" button with Cloud icon
- Loading state with spinner
- Success/error state indication (green/red)
- Toast notifications for feedback:
  - Success: "Synced X directions, Y requirements"
  - Warning: Partial failures
  - Error: Full sync failure
- Motion animations for polish

### 5. IntegrationDetailPanel Integration
- SyncButton appears in "Remote Sync Actions" section
- Only visible for Supabase integrations with `status === 'active'`
- Positioned after Events section, before Save button
- Helper text explains purpose

## Event Schema

Events inserted into `vibeman_events` table:

```typescript
// Direction event
{
  event_type: 'direction_pending',
  project_id: string,
  project_name: string,
  payload: {
    direction_id: string,
    summary: string,
    direction: string,  // full markdown content
    context_name: string,
  },
  source: 'vibeman_sync',
}

// Requirement event
{
  event_type: 'requirement_pending',
  project_id: string,
  project_name: string,
  payload: {
    requirement_name: string,  // filename without .md
    content: string,  // full file content
  },
  source: 'vibeman_sync',
}
```

## Data Flow

```
User clicks "Sync to Butler"
    |
    v
POST /api/remote/sync { projectId }
    |
    v
projectDb.getProject(projectId) -> path, name
    |
    +---> syncPendingDirections(projectId, name)
    |         |
    |         v
    |     directionRepository.getPendingDirections()
    |         |
    |         v
    |     Supabase REST API insert -> vibeman_events
    |
    +---> syncRequirements(projectId, name, path)
              |
              v
          fs.readdirSync('.claude/requirements/')
              |
              v
          Supabase REST API insert -> vibeman_events
    |
    v
Response { directions: { count }, requirements: { count } }
    |
    v
Toast notification in UI
```

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- Type check: PASS (npx tsc --noEmit)
- Lint: PASS (npm run lint)
- All files created at specified paths
- Exports match specification

## Next Phase Readiness

Ready for 02-02 (Butler mobile triage) which will:
1. Query `vibeman_events` for `direction_pending` and `requirement_pending` events
2. Display in mobile-friendly triage UI
3. Create commands for accept/reject actions

## Commits

| Hash | Message |
|------|---------|
| 8af588f | feat(02-01): add direction and requirement sync utilities |
| e34abe0 | feat(02-01): add sync API endpoint |
| f4b5486 | feat(02-01): add Sync button to Supabase integration panel |
