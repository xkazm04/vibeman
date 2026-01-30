# Vibeman

## What This Is

An AI-driven development platform that automates the entire software development lifecycle using multiple specialized AI agents. Vibeman boosts personal productivity through intelligent code analysis, idea generation, batch implementation, and automated testing. Includes remote control via Butler mobile app for triaging and triggering execution while away from desk.

## Core Value

Maximize developer productivity by automating routine development tasks through AI agents, with seamless mobile control for managing work queues remotely.

## Current Milestone: v1.1 Dead Code Cleanup

**Goal:** Remove ~10,000 lines of unused code across client, server, database, and feature layers to reduce maintenance burden and improve codebase clarity.

**Target scope:**
- Client: Unused hooks, stores, example files (7 items, ~2,395 LOC)
- Server: Orphaned lib files and API routes (5 items, ~860 LOC)
- Database: Abandoned repositories and orphaned tables (23 exports, 21 tables)
- Features: Completely abandoned modules - CodeTree, RefactorSuggestion, ScanQueue (~4,833 LOC)

**Excluded (partial implementations to keep):**
- DailyStandup (backend utility, used by Manager)
- Proposals (types absorbed by Manager)
- DebtPrediction (has Layout, may be integrated later)

## Requirements

### Validated

<!-- v1.0 Butler-Vibeman Remote Integration (2026-01-28) -->
- ✓ Supabase integration with credentials management and connection testing
- ✓ Manual sync of directions and requirements to Supabase
- ✓ Auto-sync of accept/reject decisions back to SQLite
- ✓ Zen mode command center with 1-4 CLI sessions and event sidebar
- ✓ Remote batch execution via Supabase commands
- ✓ Butler mobile triage with swipe gestures (accept/reject/skip)
- ✓ Butler batch composer with healthcheck pre-flight
- ✓ Push notifications for batch completion/failure

### Active

<!-- v1.1 Dead Code Cleanup -->
- [ ] Remove unused client code (hooks, stores, examples)
- [ ] Remove unused server code (lib files, API routes)
- [ ] Remove orphaned database repositories and migrations
- [ ] Remove abandoned feature modules (CodeTree, RefactorSuggestion, ScanQueue)
- [ ] Verify no broken imports after cleanup
- [ ] Update documentation to reflect removed features

### Out of Scope

- Partial implementations (DailyStandup, Proposals, DebtPrediction) — keep for potential future use
- Refactoring working code — cleanup only, no behavior changes
- Adding new features — pure deletion milestone

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
*Last updated: 2026-01-29 after v1.1 milestone initialization*
