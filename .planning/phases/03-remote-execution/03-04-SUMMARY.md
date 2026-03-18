---
phase: 03-remote-execution
plan: 04
title: Butler Batch Composer
subsystem: butler-mobile
tags: [flutter, supabase-realtime, batch-execution, mobile-ui]

dependency_graph:
  requires: ["03-01"]  # Healthcheck publisher
  provides: ["batch-composer-ui", "requirement-selection", "batch-trigger"]
  affects: []

tech_stack:
  added: []  # No new dependencies - uses existing supabase_flutter
  patterns:
    - "ChangeNotifier service pattern for BatchService"
    - "Consumer widget for reactive UI"
    - "Supabase onPostgresChanges for realtime subscriptions"
    - "Modal bottom sheet for requirement details"

key_files:
  created:
    - lib/models/requirement.dart
    - lib/services/batch_service.dart
    - lib/screens/modules/batch/requirement_card.dart
    - lib/screens/modules/batch/requirement_list.dart
    - lib/screens/modules/batch/execution_status.dart
    - lib/screens/modules/batch/batch_module.dart
    - lib/screens/modules/batch_module.dart
  modified:
    - lib/models/models.dart
    - lib/services/services.dart

decisions:
  - id: BATCH-SERVICE-PATTERN
    choice: "Module-local BatchService instance"
    reason: "BatchModule creates/disposes its own service tied to lifecycle"
    alternatives: ["GetIt singleton", "Provider at app root"]

  - id: SLOTS-INDICATOR
    choice: "Visual dot indicators for session slots (4 dots)"
    reason: "Quick visual scan of availability without reading numbers"
    alternatives: ["Progress bar", "Text only"]

metrics:
  duration: ~5 min
  completed: 2026-01-28
---

# Phase 03 Plan 04: Butler Batch Composer Summary

**One-liner:** Batch composer UI with requirement list, multi-select, healthcheck status, and slot indicators for remote execution

## What Was Built

### 1. Requirement Model (`lib/models/requirement.dart`)
- Data model for requirements synced from Vibeman
- `fromSupabase` factory for parsing `vibeman_events` rows
- Fields: id, name, projectId, projectName, content, syncedAt

### 2. BatchService (`lib/services/batch_service.dart`)
- ChangeNotifier service for batch execution management
- `loadRequirements(projectId)` - fetches from `vibeman_events` with `event_type='requirement_pending'`
- `subscribeToHealthcheck(projectId)` - realtime subscription to healthcheck events
- `subscribeToExecution(projectId)` - monitors task_completed/task_failed events
- `toggleSelection/selectAll/clearSelection` - requirement selection management
- `canStartBatch` getter checks: zenMode true, availableSlots > 0, selectedIds not empty, not running
- `startBatch(projectId)` - inserts command into `vibeman_commands` table

### 3. RequirementCard (`lib/screens/modules/batch/requirement_card.dart`)
- Card widget with checkbox, name, project, and sync time
- Selected state with highlight color and border
- Long-press for viewing requirement details
- Relative time formatting for sync timestamp

### 4. RequirementList (`lib/screens/modules/batch/requirement_list.dart`)
- List of requirements with selection header
- Select All / Clear buttons
- Empty state with sync guidance
- Bottom sheet for requirement content preview

### 5. ExecutionStatusBar (`lib/screens/modules/batch/execution_status.dart`)
- Zen mode indicator (green dot when ready)
- Session slots visualization (4 dots showing availability)
- Progress row when batch is running
- Error message display
- Start Batch button (enabled only when canStartBatch)

### 6. BatchModule (`lib/screens/modules/batch/batch_module.dart`)
- Main screen combining RequirementList and ExecutionStatusBar
- Project indicator chip in app bar
- Refresh button for reloading requirements
- Not-connected state with settings link
- Module-local service lifecycle management

## Key Implementation Details

### Supabase Realtime Integration
```dart
// Healthcheck subscription
_supabase
    .channel('healthcheck:$projectId')
    .onPostgresChanges(
      event: PostgresChangeEvent.insert,
      table: 'vibeman_events',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'event_type',
        value: 'healthcheck',
      ),
      callback: (payload) => _healthcheck = HealthcheckState.fromPayload(...)
    )
```

### canStartBatch Logic
```dart
bool get canStartBatch =>
    _healthcheck?.zenMode == true &&
    (_healthcheck?.availableSlots ?? 0) > 0 &&
    _selectedIds.isNotEmpty &&
    _executionStatus != ExecutionStatus.running;
```

### Batch Start Command
```dart
await _supabase.from('vibeman_commands').insert({
  'project_id': projectId,
  'command_type': 'start_batch',
  'payload': {
    'requirement_names': selectedRequirements.map((r) => r.name).toList(),
    'project_id': projectId,
    'total_count': selectedRequirements.length,
  },
  'status': 'pending',
});
```

## Verification

- [x] `dart analyze` passes with no errors
- [x] All files compile successfully
- [x] Follows existing Butler patterns (ChangeNotifier, Consumer, service locator)

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Status

| Criterion | Status |
|-----------|--------|
| User can browse requirements by project | DONE |
| User can select multiple requirements via checkboxes | DONE |
| User can start batch from Butler when healthcheck shows ready | DONE |
| User can see execution status (running/completed/failed) | DONE |
| User can see session slot availability | DONE |
| Code compiles and passes flutter analyze | DONE |

## Next Phase Readiness

Phase 3 (Remote Execution) is now complete:
- [x] 03-01: Healthcheck publisher (Vibeman publishes zen mode status)
- [x] 03-02: Zen Command Center (1-4 session grid with event sidebar)
- [x] 03-03: Remote execution control (auto-execute incoming batch commands)
- [x] 03-04: Butler batch composer (this plan)

Ready to proceed to Phase 4: Notifications.
