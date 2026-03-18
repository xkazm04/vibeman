---
phase: 02-sync-triage
plan: 02
subsystem: mobile-triage
tags: [flutter, supabase, swipe-gestures, direction-triage, mobile]
dependency-graph:
  requires: [02-01]
  provides:
    - direction_model
    - direction_service
    - direction_card_widget
    - direction_triage_screen
    - direction_badge
  affects: [02-03, 03-01]
tech-stack:
  added: []
  patterns:
    - ChangeNotifier service pattern
    - Scrollable list with swipe cards
    - Progressive haptic feedback
key-files:
  created:
    - lib/models/direction.dart
    - lib/services/direction_service.dart
    - lib/screens/modules/triage/direction_triage.dart
    - lib/screens/modules/triage/widgets/direction_card.dart
  modified:
    - lib/services/service_locator.dart
    - lib/widgets/supabase_status_indicator.dart
    - lib/models/models.dart
decisions:
  - id: direction-swipe-mapping
    decision: "Swipe right=accept, left=reject, down=skip (remapped from existing SwipeAction enum)"
    rationale: "Intuitive gesture mapping for accept/reject decisions, skip as neutral action"
metrics:
  duration: ~5 min
  completed: 2026-01-27
---

# Phase 2 Plan 2: Direction Triage UI Summary

**One-liner:** Flutter triage screen with swipeable direction cards and badge for pending count using Supabase events.

## What Was Built

### 1. Direction Model (`lib/models/direction.dart`)
- Data class for Vibeman directions from Supabase
- Fields: id, projectId, projectName, summary, direction (full content), contextName, createdAt, eventId
- Factory constructor `fromSupabase()` parses vibeman_events payload
- Support for equality, copyWith, and toString

### 2. DirectionService (`lib/services/direction_service.dart`)
- ChangeNotifier service registered in service_locator
- `fetchPendingDirections()` - queries vibeman_events where event_type='direction_pending'
- `sendDecision(directionId, commandType)` - inserts into vibeman_commands table
- Convenience methods: `acceptDirection()`, `rejectDirection()`, `skipDirection()`
- Automatic removal from local list after decision sent
- Getters: `directions`, `isLoading`, `pendingCount`, `error`

### 3. DirectionCard Widget (`lib/screens/modules/triage/widgets/direction_card.dart`)
- Scrollable list card (not stacked Tinder style, per user preference)
- Minimal content: project name header, summary, context badge
- Tap to expand and see full direction content
- Swipe gesture detection with progressive haptic feedback
- Supports both Cyberpunk and Terminal themes via ModuleTheme
- Swipe overlays with themed colors and labels

### 4. DirectionTriageScreen (`lib/screens/modules/triage/direction_triage.dart`)
- Main screen widget with ListView.builder
- Factory constructors for cyberpunk/terminal themes
- Pull-to-refresh support
- States: loading, empty, error, not-connected
- Swipe hints showing gesture directions
- Integrates DirectionService and SupabaseConnectionService

### 5. Badge Enhancement (`lib/widgets/supabase_status_indicator.dart`)
- Added pending direction count badge next to status dot
- Magenta accent color with glow effect
- Shows count when > 0 and Supabase connected
- Truncates to "99+" for large counts

## Swipe Action Mapping

| Swipe Direction | Action | Command Type | Visual |
|-----------------|--------|--------------|--------|
| Right | Accept | accept_direction | Green success color |
| Left | Reject | reject_direction | Red error color |
| Down | Skip | skip_direction | Yellow warning color |

Note: Uses existing SwipeAction enum values but remaps semantics for directions.

## Technical Patterns Used

1. **ChangeNotifier + ListenableBuilder** - Standard Flutter pattern for reactive UI
2. **Service Locator (GetIt)** - Lazy singleton registration consistent with existing services
3. **Progressive Haptic Feedback** - Light at threshold, medium at action reveal, heavy on execute
4. **Theme Abstraction** - Single widget works with both Cyberpunk and Terminal themes
5. **Optimistic UI** - Removes card from list immediately after swipe

## Verification Results

- [x] Flutter analyze passes (no errors)
- [x] Direction model with 30+ lines
- [x] DirectionService with 60+ lines and Supabase integration
- [x] DirectionTriageScreen with 150+ lines
- [x] DirectionCard with 80+ lines
- [x] Key link: DirectionTriageScreen -> DirectionService via fetchPendingDirections
- [x] Key link: DirectionService -> Supabase vibeman_events via from('vibeman_events')
- [x] Key link: DirectionService -> Supabase vibeman_commands via from('vibeman_commands')

## Deviations from Plan

None - plan executed exactly as written.

## Files Modified

| File | Changes |
|------|---------|
| lib/models/direction.dart | New file - Direction data model |
| lib/models/models.dart | Added direction.dart export |
| lib/services/direction_service.dart | New file - ChangeNotifier service |
| lib/services/service_locator.dart | Registered DirectionService |
| lib/screens/modules/triage/direction_triage.dart | New file - Triage screen |
| lib/screens/modules/triage/widgets/direction_card.dart | New file - Card widget |
| lib/widgets/supabase_status_indicator.dart | Added direction count badge |

## Commit

```
9b250be feat(02-02): add direction triage UI with swipe gestures
```

## Next Steps

- Plan 02-03: Add navigation to direction triage from Butler home screen
- Plan 03-01: Implement command execution on Vibeman side
- Integration testing with real directions from Vibeman

## Notes

The direction triage screen follows user's preference for scrollable vertical list rather than stacked Tinder-style cards. Each card can be expanded inline to show full direction content. The swipe gestures provide satisfying haptic feedback at multiple thresholds for a premium mobile experience.
