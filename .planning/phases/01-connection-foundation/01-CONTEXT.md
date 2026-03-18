# Phase 1: Connection Foundation - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish Supabase connectivity between Vibeman and Butler. Users can configure credentials in Vibeman, test the connection, see connection status in Butler, and switch between projects. This phase does NOT include syncing directions or requirements — that's Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Credentials Setup UI
- Add Supabase as a new integration card in the existing Integrations module
- Fields: Supabase URL, Anon Key, Service Role Key (three fields)
- On save: validate that required tables exist in Supabase
- If tables missing: show the SQL schema for user to copy and run in Supabase SQL editor

### Connection Test Feedback
- "Test Connection" button checks basic connectivity only (can we reach Supabase?)
- Success: show green checkmark icon, simple "Connected" text
- Failure: show red X icon with specific error reason inline
- Loading: disable button and show spinner next to it while testing

### Status Indicator in Butler
- Location: app bar / header, always visible
- Style: subtle colored dot (small, not prominent)
- States: three states — green (connected), yellow (connecting/reconnecting), red (disconnected)
- Tap behavior: no action (visual indicator only)

### Project List Behavior
- Discovery: query projects table from Supabase (Vibeman syncs project list to Supabase)
- Display: dropdown in header, compact, next to connection indicator
- Info per project: name only (no counts or paths)
- Persistence: remember last selected project locally, auto-select on app open

### Claude's Discretion
- Exact styling and spacing of integration card
- Animation/transition when connection state changes
- Dropdown component choice in Flutter
- Error message wording for various failure scenarios

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-connection-foundation*
*Context gathered: 2026-01-27*
