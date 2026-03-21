# Vibeman Conductor Redesign

## What This Is

A local-first autonomous development management tool. The Conductor module orchestrates goal-driven software development: it analyzes the codebase, generates a prioritized backlog, produces requirement specs, distributes implementation across 1-4 CLI sessions, and validates the result against quality criteria. Built as a Next.js web app for a single power user managing multiple projects.

## Core Value

Conductor reliably and autonomously turns a high-level goal into committed, production-quality code — with minimal human intervention beyond goal definition and optional triage approval.

## Requirements

### Validated

- Goal management UI with CRUD operations — existing
- Multi-provider CLI sessions (Claude, Ollama) with 4 concurrent slots — existing
- SQLite persistence with migration system — existing
- Zustand state management with persist middleware — existing
- Brain module for pattern storage and retrieval — existing
- Ideas module for creative backlog generation — existing
- TaskRunner for multi-task execution — existing
- Theme system (Purple/Cyan/Red) — existing
- Project management with active project selection — existing
- API-first architecture with typed query wrappers — existing

### Active

- [ ] Conductor pipeline rebuild from scratch (new architecture)
- [ ] Goal-to-backlog: codebase analysis to identify gaps, debt, missing tests relative to goal
- [ ] Backlog triage with optional user approval/adjustment checkpoint
- [ ] Markdown requirement spec generation (one .md per backlog item with acceptance criteria, affected files, approach)
- [ ] Domain-isolated parallel execution across 1-4 CLI sessions
- [ ] Brain integration as pattern library + active decision engine
- [ ] Automated test generation for new code during execution
- [ ] Build validation (TypeScript compiles, no errors)
- [ ] LLM-powered code review against quality rubric
- [ ] Execution report + commit on goal completion
- [ ] Configurable checkpoints (triage, pre-execute, post-review)

### Out of Scope

- Multi-user support — single-user local tool
- PR/branch workflow — commits directly, no branching strategy
- Deployment automation — tool produces committed code, not deployments
- Real-time collaboration — solo developer workflow
- Existing test suite execution as gate — only new test generation and build validation

## Context

- This is a brownfield redesign: the current Conductor (Scout → Triage → Batch → Execute → Review with self-healing) exists but will be rebuilt from scratch
- Brain module provides learned patterns and active decision support — Conductor should query Brain for architecture decisions and code conventions
- Ideas module can feed creative suggestions into backlog generation
- TaskRunner handles CLI session management — Conductor orchestrates which tasks go to which sessions
- The app runs locally on Windows 11, SQLite is the primary datastore
- CLI providers route through `src/lib/claude-terminal/` with model routing via `routeModel()`

## Constraints

- **Tech stack**: Next.js App Router, TypeScript, SQLite via better-sqlite3, Zustand — must stay within existing stack
- **CLI sessions**: Maximum 4 concurrent sessions, domain isolation required to prevent file conflicts
- **Single user**: No auth, no multi-tenancy, localhost only
- **Database migrations**: Must use `addColumnIfNotExists()`, never drop/recreate tables, new columns must be nullable or have defaults

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Rebuild Conductor from scratch | Current pipeline has reliability issues, architecture doesn't support Brain/Ideas integration cleanly | — Pending |
| Domain isolation for parallel sessions | Simpler than file-level locking, prevents merge conflicts by design | — Pending |
| Markdown specs over structured JSON | Human-readable, easier to review at triage checkpoint, LLM-friendly format | — Pending |
| Brain as both pattern library and decision engine | Maximizes value of learned patterns — passive reference + active consultation | — Pending |
| Checkpoints over full autonomy | User wants control at key gates without micromanaging every step | — Pending |

---
*Last updated: 2026-03-14 after initialization*
