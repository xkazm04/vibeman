# Feature+UI Scan — Fix Wave 1: Safety & Correctness Criticals

> 6 commits, 6 findings closed.
> Baseline preserved: TypeScript 0 → 0 errors; tests 539/542 → 539/542 (same 3 pre-existing failures); `cargo check` clean.

## Commits

| # | Commit | Finding closed | Severity | Files |
|---|---|---|---|---|
| 1 | `b594c14c` | security_scan gate no-op | critical | quality-gate/route.ts |
| 2 | `2b472f05` | 5 unwired migrations | critical | migrations/index.ts, 139_insight_lineage_table.ts |
| 3 | `b6674a26` | Rust `stale` column | critical | lifecycle_cmds.rs |
| 4 | `5e80c9fd` | Rust `project_id` column | critical | misc_cmds.rs |
| 5 | `8806a336` | orphaned social Tauri cmds | high | social_cmds.rs, lib.rs |
| 6 | `e0ef46bd` | unauth mesh/fleet RCE | critical | apiMiddleware.ts, mesh/commands/route.ts, fleet/route.ts |

## What was fixed (grouped by sub-pattern)

### Unsafe-fallback (a gate/guard that silently passes on the failure path)
1. **security_scan quality gate (`b594c14c`).** `npm audit` exits non-zero whenever any vulnerability exists, throwing into a catch that returned `passed:true` — so every project with high/critical CVEs passed the security gate. The audit report is still on stdout on non-zero exit; extracted `evaluateAuditResult()` and apply the high/critical threshold from the catch path. Genuinely-unevaluable scans (no lockfile/npm/registry) now fail closed with a warning, consistent with how the test/coverage gates already report unrunnable gates.

### Missing registration (shipped code never wired into its runner/registry)
2. **5 orphaned migrations (`2b472f05`).** Migration files 138/139/140/141/229 existed on disk but were absent from the `once()` registry in `index.ts`, so on a fresh DB `file_write_queue`, `triage_rules`, `brain_insights.canonical_id` + `insight_lineage`, and `cli_transcript_mirror` never got created — yet live repositories read them, throwing `no such table`/`no such column`. Wired all five in numeric/dependency order; normalized 139 from its outlier `{version,up,down}` shape to the standard `migrate139InsightLineage(db)` signature and made its `ADD COLUMN canonical_id` idempotent (PRAGMA guard). The other four were already idempotent (`safeMigration` + `IF NOT EXISTS`).

### Schema/code drift (Rust SQL referencing columns that no longer exist)
3. **`get_discovered_templates` (`b6674a26`).** Queried `WHERE stale = 0`, but migration 146 tracks lifecycle via `status TEXT('active'|'stale'|'error')` — there is no `stale` column, so the headless template listing threw `no such column: stale`. Now filters `status = 'active'`.
4. **`get_generation_history` (`5e80c9fd`).** Filtered `WHERE project_id = ?`, but `generation_history` has no `project_id` (cols: id, template_id, query, file_path, created_at). Rewrote to filter through the linked `discovered_templates.source_project_path` so the `project_id` arg stays meaningful and the query runs.

### Dead IPC over dropped tables
5. **orphaned social commands (`8806a336`).** `get_social_configs`/`get_social_discoveries` SELECT from `social_configs`/`social_discoveries`, dropped in the headless slim-down (migrations m047-m049 now empty stubs). They threw at runtime with zero callers. Removed both fns + their `generate_handler!` entries. (Migrations left untouched — not deleting historical migration files.)

### Unauthenticated privileged surface
6. **mesh/fleet command dispatch (`e0ef46bd`).** The mesh `/commands` POST explicitly skipped auth and fleet `batch_command` never checked a key, yet the processor executes every pending row — `start_remote_batch` runs Claude Code locally and `triage_direction` writes requirement files. That was unauthenticated RCE/filesystem-write for anyone on the mesh. Extracted `requireClient()` (the same check the main `/commands` route already applies) and required a valid active client with `write_commands`/`admin` before inserting EXECUTION-class commands; read/status commands stay open. Authed inserts now stamp `client_id` for provenance.

## Verification table

| Gate | Before (baseline) | After Wave 1 |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vitest run` | 539/542 (3 pre-existing fail) | 539/542 (same 3) |
| `cargo check` (src-tauri) | n/a (not captured pre-wave) | clean (0 errors; pre-existing dead-code warnings only) |

The 3 failing tests are pre-existing and unrelated: a Brain `sub_Memory` test imports a module slimmed out on 2026-06-13.

## Cumulative status (across all waves so far)

| Wave | Theme | Closed |
|---|---|---|
| 1 | Safety & correctness criticals | 6 |
| **Total** | | **6 / 95** |

Criticals: 6 of 11 critical findings closed (the remaining 5 are built-but-unwired/cleanup criticals slated for Waves 2–3 and 6, not safety/correctness).

## Patterns established (catalogue items 1–5)

1. **Unsafe-fallback gate** — a try/catch (or default branch) that returns success/pass on the *error* path. Bites when the error path is the *common* path (e.g. `npm audit` exits non-zero precisely when vulnerabilities exist). Fix: evaluate the real result from the error object (stdout is often still populated); fail **closed** when genuinely unevaluable.
2. **Orphaned-migration / unregistered-shipped-code** — a file exports a working entry point but no registry/runner line references it, so it silently never runs. Bites on fresh installs where the side effect (table/column) is missing while readers assume it exists. Fix: register it; guard the side effect for idempotency on already-migrated DBs. Smell: grep the registry for the file's export name → zero hits.
3. **Schema/code drift after a rename** — code (especially a second language layer like Rust) queries a column/table that a migration renamed or dropped. Bites at runtime only (compiles fine). Fix: align to the live schema; verify column names against the actual migration, not the model comment. Add a schema-backed test where possible.
4. **Dead IPC/command over dropped state** — a registered command/handler reads tables removed by a cleanup, throwing at call time with no callers. Fix: remove the command + its registration; leave historical migrations intact. Smell: command name has zero TS/JS callers AND its table has zero `CREATE` in live schema.
5. **Unauthenticated privileged surface** — a "convenience"/device-to-device route that skips the auth the canonical route enforces, feeding a processor that executes code or writes files. Fix: extract the canonical route's auth into a shared guard and apply it to the bypass routes for execution-class actions; stamp provenance (`client_id`). Smell: a header comment that literally says "this doesn't require authentication" next to an insert that a worker later executes.

## What remains

- **Wave 2 — Reconnect inert autonomy engines** (5): cross-project synthesis, signal decay, revert-learning, Build Fixer loop, behavioral-context MCP.
- **Wave 3 — Surface built backends in the UI** (6).
- **Wave 4 — Operator visibility & control** (5).
- **Wave 5 — UI consistency & design-system** (5).
- **Wave 6 — Headless-slim-down cleanup + context-map integrity** (5).

### Wave-1 follow-ups (deferred, noted for later)
- **Defense-in-depth at the processor layer**: `commandProcessor` still executes any pending execution-class row regardless of origin. Now that all HTTP insert paths stamp `client_id`, a processor-side guard ("execution-class requires a resolvable active client") is a safe second layer — deferred because it needs an audit of *all* insert paths to avoid breaking internal re-enqueues.
- **security_scan persistence** (Dependencies finding #2) and **auto-remediation PR** (finding #3) reuse the orphaned `security_scans`/`security_prs` schema — natural Wave-6 / Wave-2 items now that the gate is honest.
