# Phase 4: Notifications - Research

**Researched:** 2026-01-28
**Domain:** Flutter local notifications, Supabase Realtime event triggers, push notification patterns
**Confidence:** HIGH

## Summary

Phase 4 implements push notifications in Butler for batch completion and failure events. The research reveals that the required infrastructure is already 90% complete:

1. **Vibeman already publishes events:** The `cliExecutionManager.ts` publishes `task_completed` and `task_failed` events to Supabase's `vibeman_events` table on every task completion (lines 224-237).

2. **Butler already subscribes:** The `BatchService` already has `subscribeToExecution()` method that listens for `task_completed` and `task_failed` events via Supabase Realtime.

3. **Butler already has notification infrastructure:** The `EventNotificationService` is already configured with `flutter_local_notifications` (v18.0.1) and has working `showEventNotification()` method.

The implementation gap is simply connecting these pieces: when `BatchService` receives a `task_completed` or `task_failed` event, it should call `EventNotificationService.showEventNotification()`. This is a minimal integration task.

**Primary recommendation:** Add notification calls to the existing `subscribeToExecution()` callback in `BatchService`. No new packages, no new architecture - just wire the existing services together.

## Standard Stack

### Core (Already in Project - No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| flutter_local_notifications | ^18.0.1 | Local push notifications | Already in Butler pubspec.yaml |
| supabase_flutter | ^2.8.0 | Realtime event subscription | Already used by BatchService |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| get_it | ^8.0.2 | Service locator | Already used for dependency injection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local notifications | FCM (Firebase Cloud Messaging) | FCM required for true background/terminated notifications. Local notifications work when app is in foreground. For v1, local notifications are sufficient since user opens Butler to monitor. |
| Supabase Edge Functions + FCM | Direct local notifications | Edge Functions would enable notifications when app is terminated. Significantly more complexity. Defer to v2. |

**Installation:**
```bash
# No new dependencies required - all packages already in pubspec.yaml
flutter pub get  # Already done
```

## Architecture Patterns

### Existing Project Structure (Leveraged)
```
butler_flutter/lib/
├── services/
│   ├── batch_service.dart          # MODIFY: Add notification triggers
│   └── service_locator.dart        # Already registers EventNotificationService
├── data/
│   └── notifications/
│       ├── event_notification_service.dart  # EXISTING: Has showEventNotification()
│       └── notification_models.dart         # EXISTING: Has TaskCompletionStatus
└── models/
    └── requirement.dart            # EXISTING: Requirement model
```

### Pattern 1: Event-to-Notification Bridge

**What:** When BatchService receives Supabase Realtime event, trigger local notification
**When to use:** On `task_completed` and `task_failed` events in `subscribeToExecution()`
**Example:**
```dart
// Source: Extend existing BatchService.subscribeToExecution()
// butler_flutter/lib/services/batch_service.dart

void subscribeToExecution(String projectId) {
  _executionChannel?.unsubscribe();

  _executionChannel = _supabase
      .channel('execution:$projectId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'vibeman_events',
        callback: (payload) {
          final record = payload.newRecord;
          final eventType = record['event_type'] as String?;
          final data = record['payload'] as Map<String, dynamic>?;

          switch (eventType) {
            case 'task_completed':
              _completedCount++;
              _showBatchNotification(
                title: 'Task Completed',
                body: data?['title'] as String? ?? 'Task finished successfully',
                isSuccess: true,
              );
              notifyListeners();
              break;
            case 'task_failed':
              _failedCount++;
              _lastError = data?['error'] as String?;
              _showBatchNotification(
                title: 'Task Failed',
                body: data?['title'] as String? ?? 'Task execution failed',
                isSuccess: false,
              );
              notifyListeners();
              break;
            // ... rest of cases unchanged
          }
        },
      )
      .subscribe();
}
```

### Pattern 2: Batch Completion Detection

**What:** Detect when all tasks in a batch are complete (success or failure)
**When to use:** To show a final "Batch Complete" notification summarizing results
**Example:**
```dart
// Source: Pattern based on BatchService state tracking

// Track batch size when starting
int _totalBatchSize = 0;

Future<bool> startBatch(String projectId) async {
  // ... existing code ...
  _totalBatchSize = selectedRequirements.length;
  // ... rest unchanged ...
}

void _checkBatchComplete() {
  final processed = _completedCount + _failedCount;
  if (processed >= _totalBatchSize && _totalBatchSize > 0) {
    _executionStatus = _failedCount > 0
        ? ExecutionStatus.completed  // Some tasks succeeded
        : (_completedCount > 0 ? ExecutionStatus.completed : ExecutionStatus.failed);

    _showBatchNotification(
      title: 'Batch Complete',
      body: '$_completedCount succeeded, $_failedCount failed of $_totalBatchSize tasks',
      isSuccess: _failedCount == 0,
    );

    _totalBatchSize = 0;  // Reset for next batch
  }
}
```

### Pattern 3: iOS Notification Permissions

**What:** Request notification permissions on iOS before showing notifications
**When to use:** First app launch or when entering batch module
**Example:**
```dart
// Source: flutter_local_notifications official docs

Future<void> _requestIOSPermissions() async {
  final plugin = FlutterLocalNotificationsPlugin();
  await plugin
      .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>()
      ?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      );
}
```

### Anti-Patterns to Avoid

- **Notification spam:** Don't show notification for every progress tick. Only `task_completed` and `task_failed`.
- **Blocking UI on notification:** Show notifications asynchronously (fire-and-forget pattern)
- **Duplicate batch_completed events:** Vibeman doesn't currently publish `batch_completed`. Detect batch completion by counting tasks.
- **Ignoring app state:** When app is in foreground on batch screen, consider not showing system notification (just update UI)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local notifications | Custom notification UI | `flutter_local_notifications` | Platform-specific quirks, permissions, channels |
| Realtime subscription | Polling loop | Supabase `onPostgresChanges` | Already implemented in BatchService |
| Notification channel | Custom audio/vibration | AndroidNotificationDetails with importance: Importance.high | Platform handles priority correctly |

**Key insight:** Phase 4 is a wiring task, not a building task. All components exist. Connect BatchService events to EventNotificationService.

## Common Pitfalls

### Pitfall 1: iOS Notification Permission Not Requested
**What goes wrong:** Notifications silently don't appear on iOS
**Why it happens:** iOS requires explicit permission request; Android doesn't (for local notifications)
**How to avoid:**
- Call `requestPermissions()` on iOS plugin before showing any notification
- Do this in `EventNotificationService.initialize()` or on first batch screen visit
**Warning signs:** Works on Android simulator but not iOS device

### Pitfall 2: Notification Not Showing When App In Foreground (iOS)
**What goes wrong:** iOS doesn't show notification banner when app is open
**Why it happens:** iOS default behavior suppresses foreground notifications
**How to avoid:**
- Use `presentationOptions` parameter in iOS initialization
- Or: Only show system notification when app is backgrounded; use in-app toast when foregrounded
**Warning signs:** Notifications work when app minimized but not when viewing batch screen

### Pitfall 3: Double Notifications from Duplicate Events
**What goes wrong:** Same task completion shows two notifications
**Why it happens:** Supabase Realtime might deliver duplicate events on reconnection
**How to avoid:**
- Track processed event IDs in a Set
- Ignore events with IDs already seen in current session
**Warning signs:** Exact same notification appearing twice in quick succession

### Pitfall 4: Notification After Batch Screen Closed
**What goes wrong:** User navigates away, still gets notifications from old batch
**Why it happens:** Supabase subscription not cleaned up on screen dispose
**How to avoid:**
- Call `_executionChannel?.unsubscribe()` in BatchService.dispose() (already implemented)
- Consider: Only show notifications while batch screen is active, or always show (user preference)
**Warning signs:** Notifications appearing long after leaving batch screen

### Pitfall 5: Missing Android Notification Channel
**What goes wrong:** Notifications don't appear on Android 8+
**Why it happens:** Android 8+ requires notification channels; not created
**How to avoid:**
- `EventNotificationService` already creates channel in `showEventNotification()` via `AndroidNotificationDetails`
- Verify channel is created with `Importance.high` for heads-up notifications
**Warning signs:** Notifications appear in tray but no banner/sound

## Code Examples

Verified patterns from existing Butler codebase:

### Existing EventNotificationService Usage
```dart
// Source: butler_flutter/lib/data/notifications/event_notification_service.dart
// This is the existing implementation - USE AS-IS

Future<void> showEventNotification(ActivityEvent event) async {
  if (!_initialized) return;

  final title = event.title;
  final body = event.description;

  final androidDetails = AndroidNotificationDetails(
    'butler_events',
    'Activity Events',
    channelDescription: 'Notifications for new activity events',
    importance: Importance.high,
    priority: Priority.high,
    icon: '@mipmap/ic_launcher',
    styleInformation: BigTextStyleInformation(body),
  );

  final details = NotificationDetails(android: androidDetails);

  await _plugin.show(
    event.id.hashCode,
    title,
    body,
    details,
    payload: event.id,
  );
}
```

### Adding Batch Notification Method to BatchService
```dart
// Source: Pattern based on existing EventNotificationService
// Add to: butler_flutter/lib/services/batch_service.dart

class BatchService extends ChangeNotifier {
  final SupabaseClient _supabase;
  final EventNotificationService? _notificationService;  // NEW: Injected dependency

  BatchService(this._supabase, {EventNotificationService? notificationService})
      : _notificationService = notificationService;

  // NEW: Helper method to show batch notifications
  Future<void> _showBatchNotification({
    required String title,
    required String body,
    required bool isSuccess,
  }) async {
    final service = _notificationService;
    if (service == null) return;

    // Create a synthetic ActivityEvent for the notification service
    final event = ActivityEvent(
      id: 'batch-${DateTime.now().millisecondsSinceEpoch}',
      title: isSuccess ? 'Batch: $title' : 'Batch Error: $title',
      description: body,
      timestamp: DateTime.now(),
      type: isSuccess ? ActivityEventType.taskComplete : ActivityEventType.taskFailed,
    );

    await service.showEventNotification(event);
  }
}
```

### iOS Initialization with Permissions
```dart
// Source: flutter_local_notifications official docs + existing EventNotificationService pattern
// Modify: butler_flutter/lib/data/notifications/event_notification_service.dart

Future<void> initialize() async {
  if (_initialized) return;

  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

  // iOS settings with foreground presentation
  const darwinSettings = DarwinInitializationSettings(
    requestAlertPermission: true,
    requestBadgePermission: true,
    requestSoundPermission: true,
    // Show notifications even when app is in foreground
    defaultPresentAlert: true,
    defaultPresentBadge: true,
    defaultPresentSound: true,
  );

  const initSettings = InitializationSettings(
    android: androidSettings,
    iOS: darwinSettings,
  );

  await _plugin.initialize(
    initSettings,
    onDidReceiveNotificationResponse: (response) {
      onNotificationTapped?.call(response.payload);
    },
  );

  _initialized = true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM for all notifications | Local notifications for foreground | flutter_local_notifications maturity | Simpler setup, no server required |
| Manual polling for completion | Supabase Realtime | Already implemented in Phase 3 | Instant notification triggers |
| Custom notification UI | System notifications | flutter_local_notifications v18+ | Platform-native UX, less code |

**Deprecated/outdated:**
- None for this phase. All existing infrastructure is current.

## Open Questions

Things that couldn't be fully resolved:

1. **Should notifications show when app is foregrounded on batch screen?**
   - What we know: iOS can suppress foreground notifications. Android always shows them.
   - What's unclear: User preference - some may want banner even when viewing batch screen
   - Recommendation: Show notifications regardless of app state for v1. Let users see completion even if they tabbed away briefly.

2. **Should we show individual task notifications or only batch summary?**
   - What we know: Requirements say "batch completes" and "batch fails"
   - What's unclear: Does user want notification per task, or only when entire batch finishes?
   - Recommendation: Show per-task notifications during execution, plus final summary. User can monitor progress if they check phone during batch.

3. **Background/terminated app notifications**
   - What we know: Local notifications only work when app is running (foreground or background on iOS, foreground on Android for Supabase Realtime)
   - What's unclear: How important is notification when app is fully closed?
   - Recommendation: Defer to v2. Would require Supabase Edge Functions + FCM. Current scope is foreground notifications.

## Sources

### Primary (HIGH confidence)
- `butler_flutter/lib/services/batch_service.dart` - Existing Supabase Realtime subscription for task events
- `butler_flutter/lib/data/notifications/event_notification_service.dart` - Existing local notification service
- `butler_flutter/pubspec.yaml` - Confirms flutter_local_notifications v18.0.1 and supabase_flutter v2.8.0
- `vibeman/src/components/cli/store/cliExecutionManager.ts` - Confirms task_completed and task_failed event publishing

### Secondary (MEDIUM confidence)
- [flutter_local_notifications pub.dev](https://pub.dev/packages/flutter_local_notifications) - v20.0.0 docs (Butler uses v18.0.1, API compatible)
- [Supabase Flutter Realtime docs](https://supabase.com/docs/guides/realtime/realtime-listening-flutter) - onPostgresChanges pattern

### Tertiary (LOW confidence)
- Web search results for iOS foreground notification behavior - Platform behavior varies by iOS version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already in project and working
- Architecture: HIGH - Extending existing, tested patterns
- Pitfalls: MEDIUM - iOS behavior needs validation on device

**Research date:** 2026-01-28
**Valid until:** 60 days (stable infrastructure, no pending package updates)
