# Butler-Vibeman Remote Integration

## What This Is

A remote development control system that connects the Butler mobile app (Flutter) to the Vibeman localhost development platform via Supabase. Users can triage AI-generated development suggestions and remotely trigger batch execution of development tasks from their phone, while Vibeman runs unattended in "Zen mode" executing work.

## Core Value

Enable productive use of idle time by triaging development directions from mobile while away from the desk, and trigger remote execution of development batches without needing physical access to the development machine.

## Requirements

### Validated

- Vibeman directions system exists — generates AI suggestions stored in SQLite
- Vibeman CLI batch execution works — CLIBatchPanel runs Claude Code sessions
- Butler Triage module exists — swipe-based card triage (currently GitHub issues)
- Butler Activity module exists — event feed with filtering
- Supabase schema designed — REMOTE_MESSAGE_BROKER.md has tables/RLS ready
- Remote Gateway architecture defined — REMOTE_GATEWAY_PROPOSAL.md

### Active

- [ ] Supabase integration setup in Vibeman (credentials, connection test)
- [ ] Manual sync: push directions/requirements from Vibeman to Supabase
- [ ] Auto sync: accept/reject from Supabase back to Vibeman SQLite
- [ ] Zen mode redesign: command center layout (1-4 CLI sessions + event sidebar)
- [ ] Zen mode command listener: poll/subscribe for incoming batch commands
- [ ] Zen mode auto-execution: start batches without desktop confirmation
- [ ] Healthcheck endpoint: report Zen mode status to Butler
- [ ] Butler Supabase connection: settings screen for credentials entry
- [ ] Butler project browser: view multiple Vibeman projects from one Supabase
- [ ] Butler Triage for directions: accept/reject/skip gestures on direction cards
- [ ] Butler Batch Composer: browse requirements by project, multi-select, start batch
- [ ] Butler healthcheck integration: check Vibeman status before batch start

### Out of Scope

- Google Cloud Run gateway — direct Supabase connection is simpler for this use case
- User authentication — single-user system, Supabase anon key sufficient
- Real-time push notifications — polling/subscription sufficient
- Conflict resolution — manual sync means user controls when data flows
- Offline mode for Butler — requires Supabase connectivity

## Context

**Existing Vibeman Architecture:**
- Next.js 16 + React 19 + TypeScript
- SQLite database with repository pattern (`src/app/db/`)
- Directions stored in `directions` table with pending/accepted/rejected status
- Requirements are `.claude/commands/` text files executed by Claude Code CLI
- CLIBatchPanel (`src/components/cli/CLIBatchPanel.tsx`) runs 1-4 concurrent sessions
- Integrations module exists (`src/app/features/Integrations/`) — add Supabase here
- Zen page exists (`src/app/zen/`) — currently batch monitoring, needs redesign

**Existing Butler Architecture:**
- Flutter with modular theme system (cyberpunk/modern/terminal)
- Triage module (`lib/screens/modules/triage/`) — swipe cards with physics
- Activity module (`lib/screens/modules/activity/`) — event feed with grouping
- Service locator pattern for dependency injection
- ModuleTheme system for visual styling

**Supabase Schema (from REMOTE_MESSAGE_BROKER.md):**
- `vibeman_clients` — API key management (may simplify to anon key only)
- `vibeman_events` — outbound events from Vibeman
- `vibeman_commands` — inbound commands to Vibeman (batch start, etc.)
- Real-time subscriptions enabled for command notifications

**Data Flow:**
1. Vibeman generates directions → SQLite
2. User clicks "Sync" → directions/requirements pushed to Supabase
3. Butler Triage shows pending directions → swipe accept/reject/skip
4. Decisions sync back to Vibeman SQLite (auto via subscription)
5. Butler Batch Composer → select requirements → start batch
6. Command inserted to Supabase → Vibeman Zen mode polls/subscribes
7. Vibeman spawns CLI sessions → executes requirements
8. Progress events published to Supabase → Butler receives updates

## Constraints

- **Platform**: Vibeman is Windows desktop app (localhost:3000), Butler is Android/iOS
- **Network**: Both apps must reach same Supabase instance
- **Execution**: Claude Code CLI must be available on Vibeman machine
- **Concurrency**: Max 4 simultaneous CLI sessions (existing CLIBatchPanel limit)
- **Single User**: No multi-user auth — one Supabase per user

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Cloud Run gateway | Direct connection simpler, gateway adds deployment complexity | — Pending |
| Hybrid sync (manual push, auto receive) | User controls data flow, prevents accidental overwrites | — Pending |
| Anon key auth (no API key rotation) | Single-user system, simplicity over security | — Pending |
| Redesign Zen page (not new page) | Existing page underutilized, avoid navigation sprawl | — Pending |
| Accept/Reject/Skip gestures (3 actions) | Matches existing Triage patterns, skip preserves items | — Pending |
| No desktop confirmation for remote batches | Fire-and-forget model enables true remote execution | — Pending |
| Healthcheck blocks in Butler (not queue) | Clear feedback prevents confusion about execution state | — Pending |

---
*Last updated: 2025-01-27 after initialization*
