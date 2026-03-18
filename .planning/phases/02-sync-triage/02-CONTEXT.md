# Phase 2: Sync & Triage - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable Vibeman to push pending directions and requirements to Supabase, and Butler to display them as swipeable cards for triage. Accept/reject decisions sync back to Vibeman SQLite automatically. This phase does NOT include batch execution or requirement browsing — that's Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Sync Mechanism
- Manual "Sync" button in Integrations module (not on Directions page)
- Single button syncs both directions AND requirements together
- Only pending (untriaged) directions are synced — not all directions
- User explicitly triggers sync; no auto-sync on change

### Card Content & Layout
- Minimal content: summary/title only, project name in header row
- Scrollable vertical list (not stacked Tinder-style cards)
- Tap card to expand and see full detail (inline or modal)
- Project name displayed prominently at top of each card

### Decision Sync Back
- Immediate: each swipe updates Supabase instantly
- Vibeman polls Supabase every 60 seconds for decision updates
- Badge count notification on relevant UI element when decisions arrive
- Updates written to SQLite without user intervention

### Claude's Discretion
- Exact card styling and animations
- Modal vs inline expansion for detail view
- Badge placement and styling
- Error handling for sync failures
- Swipe threshold and visual feedback during gesture

</decisions>

<specifics>
## Specific Ideas

No specific references provided — open to standard approaches for card lists and swipe gestures.

</specifics>

<deferred>
## Deferred Ideas

- **Emulator component** in Integrations module — tablet-like view replicating Butler features within Vibeman, capable of managing tasks on remote Vibeman instances via Supabase. This is a significant feature (second client) that deserves its own phase.

</deferred>

---

*Phase: 02-sync-triage*
*Context gathered: 2026-01-27*
