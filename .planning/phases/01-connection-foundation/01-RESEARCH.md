# Phase 1: Connection Foundation - Research

**Researched:** 2026-01-27
**Domain:** Supabase connectivity, Flutter SDK integration, credential management
**Confidence:** HIGH

## Summary

This phase establishes the foundation for Vibeman-Butler communication via Supabase. Research focused on three areas: (1) Vibeman's existing Integrations module patterns for adding a new Supabase integration card, (2) existing Supabase infrastructure in Vibeman that can be extended, and (3) Flutter patterns in Butler for connection status and project selection.

The Vibeman codebase already has comprehensive Supabase integration infrastructure including types (`SupabaseConfig`, `SupabaseCredentials`), a connector (`src/lib/integrations/connectors/supabase.ts`), and UI components for the Supabase provider. Butler uses `get_it` for dependency injection and has a well-established `StatusDot` widget with three-state indicators that matches the phase requirements exactly.

**Primary recommendation:** Extend Vibeman's existing Supabase integration pattern with an additional "Service Role Key" field and table validation, then create a new `SupabaseConnectionService` in Butler that follows the existing service locator pattern.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.x | Vibeman Supabase client | Already installed, used in src/lib/supabase.ts |
| supabase_flutter | ^2.12.0 | Flutter Supabase SDK | Official Flutter SDK with realtime support |
| get_it | ^8.0.2 | Butler DI | Already used for all services in Butler |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| flutter_secure_storage | ^10.0.0 | Secure credential storage | Store Supabase keys in Butler |
| connectivity_plus | ^6.0.3 | Network monitoring | Already used in Butler for offline mode |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| supabase_flutter | Direct REST API | SDK handles auth refresh, realtime subscriptions automatically |
| flutter_secure_storage | shared_preferences | Secure storage encrypts credentials, essential for API keys |

**Installation (Butler):**
```bash
flutter pub add supabase_flutter
# flutter_secure_storage already installed
```

## Architecture Patterns

### Vibeman Integration Module Structure
```
src/app/features/Integrations/
  IntegrationsDashboard.tsx     # Main dashboard, handles CRUD
  IntegrationsLayout.tsx        # Layout wrapper
  components/
    IntegrationListColumn.tsx   # List of integrations
    IntegrationDetailPanel.tsx  # Edit/create panel with provider-specific fields
    IntegrationForm.tsx         # Modal form (older pattern)
    IntegrationCard.tsx         # Card display
```

### Pattern 1: Provider-Specific Config Fields
**What:** The `IntegrationDetailPanel.tsx` uses a switch statement to render provider-specific form fields based on the selected provider.
**When to use:** Adding new integration types or modifying existing ones.
**Example:**
```typescript
// Source: src/app/features/Integrations/components/IntegrationDetailPanel.tsx (lines 303-341)
case 'supabase':
  return (
    <>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Project URL</label>
        <input
          type="url"
          value={(config.projectUrl as string) || ''}
          onChange={(e) => setConfig({ ...config, projectUrl: e.target.value })}
          placeholder="https://xxx.supabase.co"
          disabled={!isEditing}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Table Name</label>
        <input
          type="text"
          value={(config.tableName as string) || ''}
          onChange={(e) => setConfig({ ...config, tableName: e.target.value })}
          placeholder="events"
          disabled={!isEditing}
          className={inputClass}
        />
      </div>
      {isEditing && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Anon Key</label>
          <input
            type="password"
            value={(credentials.anonKey as string) || ''}
            onChange={(e) => setCredentials({ ...credentials, anonKey: e.target.value })}
            placeholder="eyJ..."
            className={inputClass}
          />
        </div>
      )}
    </>
  );
```

### Pattern 2: Integration Connector Pattern
**What:** Connectors implement `IntegrationConnector` interface with `validate()`, `testConnection()`, and `sendEvent()`.
**When to use:** Testing connections, validating configuration.
**Example:**
```typescript
// Source: src/lib/integrations/connectors/supabase.ts (lines 121-214)
export const SupabaseConnector: IntegrationConnector = {
  provider: 'supabase',

  async validate(config, credentials): Promise<{ valid: boolean; error?: string }> {
    const supabaseConfig = config as unknown as SupabaseConfig;
    const supabaseCredentials = credentials as unknown as SupabaseCredentials;

    if (!supabaseConfig.projectUrl) {
      return { valid: false, error: 'Supabase project URL is required' };
    }
    // ... validation logic
  },

  async testConnection(config, credentials): Promise<{ success: boolean; message: string }> {
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }
    // ... test by inserting a test event
  },
};
```

### Pattern 3: Butler Service Locator Pattern
**What:** Services are registered as lazy singletons in `service_locator.dart` and initialized in `initializeServices()`.
**When to use:** Creating new app-wide services.
**Example:**
```dart
// Source: butler/butler_flutter/lib/services/service_locator.dart
Future<void> setupServiceLocator() async {
  // Register service as lazy singleton
  locator.registerLazySingleton<MyService>(() => MyService());
}

Future<void> initializeServices() async {
  await locator<MyService>().initialize();
}
```

### Pattern 4: Butler StatusDot Widget
**What:** Unified status indicator with three states (active/success/error), optional pulse animation, semantic labels.
**When to use:** Displaying connection status.
**Example:**
```dart
// Source: butler/butler_flutter/lib/widgets/status_dot.dart
StatusDot(status: Status.active)   // Green pulsing dot (connected)
StatusDot(status: Status.warning)  // Yellow dot (connecting)
StatusDot(status: Status.error)    // Red dot (disconnected)
StatusDot(status: Status.inactive) // Grey dot (not configured)
```

### Pattern 5: Butler Header Integration
**What:** The app shell header in Butler has space for indicators next to the title.
**When to use:** Adding persistent status indicators.
**Example:**
```dart
// Source: butler/butler_flutter/lib/screens/app_shell.dart (lines 252-306)
Widget _buildHeader(bool isCompact) {
  return Row(
    children: [
      // Title
      Text('BUTLER', ...),
      const Spacer(),
      // Status indicators go here
      ListenableBuilder(
        listenable: _connectivityService,
        builder: (context, _) {
          return OfflineIndicator(...);
        },
      ),
    ],
  );
}
```

### Anti-Patterns to Avoid
- **Storing credentials in plain text:** Always use `flutter_secure_storage` for API keys
- **Creating Supabase client on every call:** Use singleton pattern with lazy initialization
- **Polling for connection status:** Use Supabase realtime subscription status callbacks instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credential storage (Flutter) | SharedPreferences | flutter_secure_storage | Already installed, encrypts data |
| Connection status UI | Custom dot widget | StatusDot widget | Already exists with proper animations, semantics |
| Service initialization | Static singletons | get_it service locator | Testable, matches existing Butler pattern |
| Realtime connection monitoring | Manual ping/heartbeat | supabase_flutter RealtimeSubscribeStatus | Built into SDK |
| Table existence check | Manual SQL query | Supabase REST API select limit 0 | Simpler, uses existing auth |

**Key insight:** Both codebases have well-established patterns. The implementation should extend existing patterns, not introduce new ones.

## Common Pitfalls

### Pitfall 1: Hardcoded Supabase URL in Flutter
**What goes wrong:** Storing Supabase URL and keys directly in Dart code exposes them in compiled apps.
**Why it happens:** Developers treat Flutter like web apps where env vars are common.
**How to avoid:** Store credentials in `flutter_secure_storage` after user enters them, never in source.
**Warning signs:** `const supabaseUrl = ...` in source files.

### Pitfall 2: Missing Table Validation on Save
**What goes wrong:** User saves credentials but Supabase tables don't exist, leading to confusing errors later.
**Why it happens:** Validation only checks connectivity, not schema.
**How to avoid:** On save, query for the existence of required tables (projects, directions, requirements). Show SQL schema to copy if missing.
**Warning signs:** Connection test passes but sync fails with "relation does not exist" errors.

### Pitfall 3: Realtime Connection Stale After Background
**What goes wrong:** Flutter app returns from background, realtime subscription appears connected but doesn't receive events.
**Why it happens:** Known issue with supabase_flutter when app is backgrounded for extended periods.
**How to avoid:** Reconnect on app resume using `WidgetsBindingObserver.didChangeAppLifecycleState`.
**Warning signs:** StatusDot shows green but no updates are received.

### Pitfall 4: Service Role Key Exposure
**What goes wrong:** Service role key used in client-side code gives full database access.
**Why it happens:** Confusion about when to use anon key vs service role key.
**How to avoid:** Butler should only need anon key for reading projects. Vibeman may need service role key for table validation, but should validate server-side only.
**Warning signs:** Service role key appearing in network requests from Butler.

### Pitfall 5: Project Dropdown Not Persisting Selection
**What goes wrong:** User selects project, restarts app, has to select again.
**Why it happens:** Forgetting to persist selection to local storage.
**How to avoid:** Use `SharedPreferences` to store last selected project ID, auto-select on app start.
**Warning signs:** Project always defaults to first item after restart.

## Code Examples

Verified patterns from the existing codebase:

### Vibeman: Testing Supabase Connection
```typescript
// Source: src/lib/integrations/connectors/supabase.ts
async function supabaseRequest(
  projectUrl: string,
  tableName: string,
  data: Record<string, unknown>,
  credentials: SupabaseCredentials,
  method: 'POST' | 'GET' = 'POST'
): Promise<{ success: boolean; status?: number; data?: unknown; error?: string }> {
  try {
    const apiUrl = `${projectUrl}/rest/v1/${tableName}`;
    const apiKey = credentials.serviceRoleKey || credentials.anonKey;

    const headers: Record<string, string> = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };

    const response = await fetch(apiUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      // Extract error message from response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch { }
      return { success: false, status: response.status, error: errorMessage };
    }

    return { success: true, status: response.status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Butler: Service Initialization Pattern
```dart
// Pattern from: butler/butler_flutter/lib/services/service_locator.dart
// Register as lazy singleton - not created until first access
locator.registerLazySingleton<SupabaseConnectionService>(
  () => SupabaseConnectionService(),
);

// Initialize in main.dart after setupServiceLocator()
await locator<SupabaseConnectionService>().initialize();
```

### Butler: Using StatusDot for Connection State
```dart
// Pattern from: butler/butler_flutter/lib/widgets/status_dot.dart
// Map connection state to Status enum
Status get connectionStatus {
  if (!_isConfigured) return Status.inactive;
  if (_isConnecting) return Status.warning;
  if (_isConnected) return Status.active;
  return Status.error;
}

// In header widget
StatusDot(
  status: connectionService.connectionStatus,
  size: 8,
  showGlow: true,
)
```

### Supabase Flutter: Realtime Subscribe Status
```dart
// Source: supabase_flutter pub.dev documentation
final channel = supabase.channel('my_channel');
channel
  .onPostgresChanges(
    event: PostgresChangeEvent.all,
    schema: 'public',
    table: 'my_table',
    callback: (payload) {
      print('Change received: ${payload.toString()}');
    },
  )
  .subscribe((status, [error]) {
    if (status == RealtimeSubscribeStatus.subscribed) {
      // Connected and receiving events
    } else if (status == RealtimeSubscribeStatus.closed) {
      // Disconnected
    }
  });
```

### Vibeman: Existing Supabase Types
```typescript
// Source: src/app/db/models/integration.types.ts
export interface SupabaseConfig {
  projectUrl: string;
  tableName: string;
  columnMapping?: Record<string, string>;
  includeMetadata?: boolean;
}

export interface SupabaseCredentials {
  anonKey: string;
  serviceRoleKey?: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual WebSocket management | supabase_flutter RealtimeSubscribeStatus | SDK v2.x | Automatic reconnection, status callbacks |
| Environment variables for Flutter keys | Secure storage after user entry | Best practice | Keys not compiled into app |

**Deprecated/outdated:**
- Direct `createClient()` on every operation: Use `Supabase.instance.client` singleton instead

## Open Questions

Things that couldn't be fully resolved:

1. **Table validation SQL**
   - What we know: Need to check if `projects`, `directions`, `requirements` tables exist
   - What's unclear: Exact column structure needed for each table
   - Recommendation: Start with minimal required columns, show user the SQL to run. Table schema should be defined in Phase 2 when we implement sync.

2. **Reconnection on app resume behavior**
   - What we know: supabase_flutter has known issues with long-running desktop apps
   - What's unclear: How reliable is automatic reconnection in practice
   - Recommendation: Implement `WidgetsBindingObserver` to manually reconnect on resume, add exponential backoff

3. **Project list source of truth**
   - What we know: CONTEXT.md says "query projects table from Supabase (Vibeman syncs project list to Supabase)"
   - What's unclear: How/when Vibeman syncs its projects to Supabase
   - Recommendation: For Phase 1, assume projects table exists and is populated. Phase 2 will implement the sync from Vibeman.

## Sources

### Primary (HIGH confidence)
- Vibeman codebase analysis:
  - `src/app/features/Integrations/` - Complete integration module structure
  - `src/lib/integrations/connectors/supabase.ts` - Existing Supabase connector
  - `src/app/db/models/integration.types.ts` - Type definitions
  - `src/lib/supabase.ts` - Existing Supabase client setup
- Butler codebase analysis:
  - `butler/butler_flutter/lib/services/service_locator.dart` - DI pattern
  - `butler/butler_flutter/lib/widgets/status_dot.dart` - Status indicator widget
  - `butler/butler_flutter/lib/screens/app_shell.dart` - Header layout

### Secondary (MEDIUM confidence)
- [supabase_flutter pub.dev](https://pub.dev/packages/supabase_flutter) - v2.12.0 documentation, installation, initialization
- [Supabase Flutter Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/flutter) - Official getting started guide

### Tertiary (LOW confidence)
- [GitHub Discussion #33153](https://github.com/orgs/supabase/discussions/33153) - Realtime 403 issues (edge case)
- [GitHub Issue #1012](https://github.com/supabase/supabase-flutter/issues/1012) - Realtime connection stability (known issue)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already installed in both codebases
- Architecture: HIGH - Patterns extracted directly from existing code
- Pitfalls: MEDIUM - Based on SDK documentation and known issues

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable libraries)
