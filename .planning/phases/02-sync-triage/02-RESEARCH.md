# Phase 2: Sync & Triage - Research

**Researched:** 2026-01-28
**Domain:** Supabase sync, Flutter swipe gestures, bidirectional data flow
**Confidence:** HIGH

## Summary

Phase 2 implements bidirectional synchronization between Vibeman (Next.js) and Butler (Flutter) through Supabase. This phase adds:
1. Manual sync button in Vibeman's Integrations module that pushes pending directions and requirements to Supabase
2. Direction triage UI in Butler with swipe gestures (accept/reject/skip)
3. Decision sync back to Vibeman via polling

The existing infrastructure provides a solid foundation:
- Vibeman already has remote API routes (`/api/remote/*`) and Supabase connector
- Butler already has `SupabaseConnectionService` with realtime subscription capability
- Butler already has a mature swipeable card implementation in `TriageModule` with `SwipeableIssueCard`
- The `vibeman_events` and `vibeman_commands` tables exist for the message broker pattern

**Primary recommendation:** Reuse existing Butler triage patterns (SwipeAction enum, IssueCard structure) for directions. Use the established `vibeman_events` table for direction sync and `vibeman_commands` for decision sync-back. Vibeman polls for completed commands every 60 seconds.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supabase_flutter | ^2.8.0 | Flutter Supabase client | Already in Butler pubspec |
| @supabase/supabase-js | N/A | Next.js Supabase client | Already in Vibeman remote APIs |
| flutter_secure_storage | ^10.0.0 | Credential storage | Already in Butler for Supabase creds |
| shared_preferences | ^2.3.4 | Project selection persistence | Already in Butler |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| flutter/physics | built-in | Spring animations for swipe | Already used in triage_base.dart |
| flutter/services | built-in | HapticFeedback | Already used in triage swipes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling | Supabase Realtime | Realtime adds complexity; polling every 60s is simpler and matches user decision from CONTEXT.md |
| Custom swipe | flutter_dismissible | Existing SwipeableIssueCard is more mature with physics-based animations |

**Installation:**
```bash
# No new dependencies required - all already in place
```

## Architecture Patterns

### Recommended Project Structure

**Vibeman (additions to existing):**
```
src/
├── app/
│   ├── api/
│   │   └── remote/
│   │       └── sync/
│   │           └── route.ts          # NEW: Sync trigger endpoint
│   └── features/
│       └── Integrations/
│           └── components/
│               └── SyncButton.tsx    # NEW: Manual sync button
├── lib/
│   └── remote/
│       └── directionSync.ts          # NEW: Direction sync logic
```

**Butler (additions to existing):**
```
lib/
├── models/
│   └── direction.dart                # NEW: Direction model
├── services/
│   └── direction_service.dart        # NEW: Direction fetch/decision
└── screens/
    └── modules/
        └── triage/
            ├── direction_triage.dart # NEW: Direction triage screen
            └── widgets/
                └── direction_card.dart # NEW: Direction card widget
```

### Pattern 1: Event-Based Sync (Vibeman -> Supabase)

**What:** Sync directions as events to `vibeman_events` table
**When to use:** Manual sync button pressed in Integrations module
**Example:**
```typescript
// Source: Existing pattern from src/lib/remote/types.ts
interface DirectionEvent {
  id: string;
  project_id: string;
  event_type: 'direction_pending';  // NEW event type
  payload: {
    direction_id: string;
    summary: string;
    direction: string;  // Full markdown content
    context_name: string | null;
    project_name: string;
  };
  source: 'vibeman';
  created_at: string;
}
```

### Pattern 2: Command-Based Decisions (Butler -> Vibeman)

**What:** Butler sends accept/reject/skip as commands via `vibeman_commands`
**When to use:** User swipes on a direction card
**Example:**
```dart
// Source: Existing pattern from docs/REMOTE_MESSAGE_BROKER.md
// Command types to add: accept_direction, reject_direction, skip_direction

Future<void> acceptDirection(String directionId) async {
  await supabase.from('vibeman_commands').insert({
    'project_id': selectedProjectId,
    'command_type': 'accept_direction',
    'payload': {'direction_id': directionId},
    'status': 'pending',
  });
}
```

### Pattern 3: Polling for Decision Updates (Vibeman)

**What:** Vibeman polls Supabase every 60 seconds for completed direction commands
**When to use:** Background service in Vibeman
**Example:**
```typescript
// Source: User decision from 02-CONTEXT.md
async function pollDirectionDecisions() {
  const { data: commands } = await supabase
    .from('vibeman_commands')
    .select('*')
    .in('command_type', ['accept_direction', 'reject_direction', 'skip_direction'])
    .eq('status', 'pending')
    .order('created_at');

  for (const cmd of commands || []) {
    await processDirectionCommand(cmd);
    await markCommandCompleted(cmd.id);
  }
}
```

### Pattern 4: Scrollable List with Expandable Cards (Butler)

**What:** Vertical list of direction cards with tap-to-expand (not stacked Tinder cards)
**When to use:** Direction triage screen
**Example:**
```dart
// Source: User decision from 02-CONTEXT.md - "Scrollable vertical list"
// NOT the stacked SwipeableIssueCard pattern

ListView.builder(
  itemCount: directions.length,
  itemBuilder: (context, index) {
    return DirectionCard(
      direction: directions[index],
      onSwipe: (action) => _handleSwipe(directions[index], action),
      onTap: () => _expandDirection(directions[index]),
    );
  },
)
```

### Anti-Patterns to Avoid

- **Direct SQLite access from Butler:** Always go through Supabase as message broker
- **Real-time subscriptions for decisions:** User specified polling (60s), not realtime
- **Auto-sync on direction creation:** User specified manual sync only
- **Syncing ALL directions:** Only sync pending (untriaged) directions
- **Stacked card UI:** User specified scrollable list, not Tinder-style stacks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe physics | Custom gesture detector | Existing SwipeableIssueCard pattern from triage_base.dart | Has spring physics, haptics, fly-off animations |
| Supabase connection | New connection logic | Existing SupabaseConnectionService | Already handles credentials, status, project selection |
| API key validation | New auth system | Existing vibeman_clients table | Already has permission system |
| Event publishing | Direct insert | Existing supabase connector pattern | Has validation, error handling |

**Key insight:** Butler's triage module has sophisticated swipe handling with progressive haptics, spring physics, and micro-interactions. Reuse the pattern but adapt the card content for directions.

## Common Pitfalls

### Pitfall 1: Syncing Requirements vs Directions
**What goes wrong:** Confusion between direction sync and requirement sync
**Why it happens:** Both are mentioned in CONTEXT.md "syncs both directions AND requirements"
**How to avoid:**
- Directions: Pending development guidance items for triage
- Requirements: Generated after direction is accepted, different data model
- Sync requirements separately but in same button action
**Warning signs:** Trying to create requirements in Supabase before direction is accepted

### Pitfall 2: Realtime vs Polling Mismatch
**What goes wrong:** Using realtime subscriptions when polling was specified
**Why it happens:** Supabase makes realtime easy, tempting to use it
**How to avoid:**
- Butler CAN use realtime for receiving new directions (optional, nice-to-have)
- Vibeman MUST use polling (60s) for decision updates per user spec
- Keep the distinction clear in code comments
**Warning signs:** Import of realtime subscriptions in Vibeman code

### Pitfall 3: Badge Count Source
**What goes wrong:** Badge shows wrong count or doesn't update
**Why it happens:** Unclear where pending count comes from
**How to avoid:**
- Butler badge: Count of directions with status='pending' in local state
- Vibeman badge: Count of newly synced decisions from Supabase (poll result)
- Both need separate tracking mechanisms
**Warning signs:** Badge count getting out of sync with actual list length

### Pitfall 4: Project ID Mismatch
**What goes wrong:** Directions don't appear in Butler
**Why it happens:** Project ID format differs between Vibeman and Butler
**How to avoid:**
- Use consistent project_id format across both apps
- Project selection in Butler should match Vibeman's project_id exactly
- Log project_id on both sides during development
**Warning signs:** Empty direction list despite successful sync

### Pitfall 5: Swipe Direction Semantics
**What goes wrong:** User expects Tinder-like swipes but gets something different
**Why it happens:** Mixing metaphors from different triage implementations
**How to avoid:**
- Accept = swipe RIGHT (positive action)
- Reject = swipe LEFT (negative action)
- Skip/Defer = swipe DOWN (postpone)
- Match user expectations from existing triage module
**Warning signs:** Inconsistent swipe directions between issues and directions

## Code Examples

Verified patterns from existing codebase:

### Supabase Event Publishing (Vibeman)
```typescript
// Source: src/lib/integrations/connectors/supabase.ts
async function publishDirectionEvent(direction: DbDirection, projectName: string) {
  const apiKey = credentials.serviceRoleKey || credentials.anonKey;

  const response = await fetch(`${projectUrl}/rest/v1/vibeman_events`, {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      event_type: 'direction_pending',
      project_id: direction.project_id,
      project_name: projectName,
      payload: {
        direction_id: direction.id,
        summary: direction.summary,
        direction: direction.direction,
        context_name: direction.context_name,
      },
    }),
  });

  return response.ok;
}
```

### Supabase Query (Butler)
```dart
// Source: lib/services/supabase_connection_service.dart pattern
Future<List<Direction>> fetchPendingDirections() async {
  final client = Supabase.instance.client;
  final response = await client
    .from('vibeman_events')
    .select('*')
    .eq('project_id', selectedProjectId)
    .eq('event_type', 'direction_pending')
    .order('created_at', ascending: false);

  return (response as List)
    .map((json) => Direction.fromSupabase(json))
    .toList();
}
```

### Swipe Action Handler (Butler)
```dart
// Source: lib/screens/modules/triage/triage_base.dart pattern
void _executeSwipe(SwipeAction action, Direction direction) {
  HapticFeedback.heavyImpact();

  // Determine command type
  String commandType;
  switch (action) {
    case SwipeAction.assign:  // Using assign as accept
      commandType = 'accept_direction';
      break;
    case SwipeAction.defer:
      commandType = 'skip_direction';
      break;
    case SwipeAction.archive:  // Using archive as reject
      commandType = 'reject_direction';
      break;
    default:
      return;
  }

  // Insert command to Supabase
  _directionService.sendDecision(direction.id, commandType);

  // Remove from local list
  setState(() {
    _directions.remove(direction);
  });
}
```

### Polling Service (Vibeman)
```typescript
// Source: Pattern from src/lib/remote/commandProcessor.ts
class DirectionDecisionPoller {
  private intervalId: NodeJS.Timeout | null = null;

  start(intervalMs: number = 60000) {
    this.intervalId = setInterval(async () => {
      await this.pollDecisions();
    }, intervalMs);
  }

  async pollDecisions() {
    const config = getActiveRemoteConfig();
    if (!config) return;

    const supabase = createClient(config.url, config.serviceRoleKey);

    const { data: commands } = await supabase
      .from('vibeman_commands')
      .select('*')
      .in('command_type', ['accept_direction', 'reject_direction', 'skip_direction'])
      .eq('status', 'pending');

    for (const cmd of commands || []) {
      await this.processCommand(cmd);
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stacked Tinder cards | Scrollable list | Phase 2 CONTEXT.md decision | Simpler implementation, better for longer lists |
| Realtime sync-back | 60s polling | Phase 2 CONTEXT.md decision | Reduced complexity, predictable behavior |
| Per-page sync buttons | Centralized in Integrations | Phase 2 CONTEXT.md decision | Single source of truth for sync state |

**Deprecated/outdated:**
- None relevant - this is new functionality building on existing patterns

## Open Questions

Things that couldn't be fully resolved:

1. **How should direction_pending events be cleaned up after acceptance?**
   - What we know: Events are inserted, commands are processed
   - What's unclear: Should old events be deleted after direction is triaged?
   - Recommendation: Mark events as 'processed' rather than delete, or use cleanup function from schema

2. **What happens if direction is accepted in Vibeman before Butler syncs decision?**
   - What we know: Both systems can update direction status
   - What's unclear: Race condition handling
   - Recommendation: Vibeman is source of truth; Butler should refresh on focus

3. **Should requirements also appear in Butler for reference?**
   - What we know: CONTEXT.md says sync both directions AND requirements
   - What's unclear: Are requirements displayed or just synced for future phases?
   - Recommendation: Sync requirements but don't display in Phase 2; Phase 3 handles requirement browsing

## Sources

### Primary (HIGH confidence)
- `src/lib/integrations/connectors/supabase.ts` - Existing Supabase connector pattern
- `src/lib/remote/types.ts` - Event and command type definitions
- `src/app/api/remote/commands/route.ts` - Command processing pattern
- `lib/services/supabase_connection_service.dart` - Butler Supabase connection
- `lib/screens/modules/triage/triage_base.dart` - Swipe gesture implementation
- `docs/REMOTE_MESSAGE_BROKER.md` - Schema and API documentation

### Secondary (MEDIUM confidence)
- [Supabase Dart subscribe reference](https://supabase.com/docs/reference/dart/subscribe) - Flutter realtime patterns
- [Flutter Dismissible docs](https://docs.flutter.dev/cookbook/gestures/dismissible) - Swipe gesture best practices

### Tertiary (LOW confidence)
- Web search results for Flutter swipe patterns - General community patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in project
- Architecture: HIGH - Patterns derived from existing codebase
- Pitfalls: MEDIUM - Some edge cases need validation during implementation

**Research date:** 2026-01-28
**Valid until:** 30 days (stable patterns, existing infrastructure)
