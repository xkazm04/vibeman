# Integrations & Template Discovery — Feature + UI Scan
> Context: Integrations & Template Discovery | Group: Social & Integrations
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (5f feature / 0ui ui) | Priority: 2crit/2high/1med/0low
> Files read: ~14

> **Manifest drift note:** Only 3 of 23 manifest files exist on disk. The entire `src/app/features/Integrations/**` UI tree (Layout, Dashboard, IntegrationCard, IntegrationForm, EventsLog, and the whole `sub_TemplateDiscovery/` UI: `TemplateDiscoveryPanel.tsx`, `PromptPreviewModal.tsx`, `GenerationHistoryPanel.tsx`, `discoveryApi.ts`, `promptGenerator.ts`) is gone, as are the `/api/integrations/*` and `/api/prompt-templates/*` routes and `integration.repository.ts` / `prompt-template.repository.ts`. This matches the documented "headless-slim-down" (8 UI modules removed). What survives is a **purely headless** template-discovery subsystem: `src/lib/template-discovery/{scanner,parser,index}.ts`, `src/app/api/template-discovery/{route,[id]/route,generate/route}.ts`, `src/app/api/generation-history/route.ts`, the `discovered-template` + `generation-history` repositories, and two Tauri commands in `src-tauri/src/commands/{lifecycle,misc}_cmds.rs`. Because there is no UI, all five findings are **feature-scout** — there is no UI surface left to apply the 🎨 lens to. Findings below target the headless API/lib/Rust layer.

## 1. Rust `get_discovered_templates` queries a nonexistent `stale` column — headless template listing is broken
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: functionality
- **File(s)**: src-tauri/src/commands/lifecycle_cmds.rs:197 and :203; schema in src/app/db/migrations/146_template_status.ts:15-18; model in src/app/db/models/types.ts:688
- **Current state**: The registered Tauri command (src-tauri/src/lib.rs:149) runs `SELECT * FROM discovered_templates WHERE ... AND stale = 0`. But migration 146 defines no `stale` column — the table tracks lifecycle via `status TEXT ('active'|'stale'|'error')`. The TS repository and model agree (`status`, no boolean `stale`). Every call to this command errors at runtime ("no such column: stale"), so the desktop/headless build cannot list discovered templates at all.
- **Opportunity**: Change the predicate to `status != 'stale'` (and ideally `status = 'active'` to also exclude `'error'` rows). Add a thin integration test that runs the query against the real migrated schema so future column renames are caught.
- **Value**: Restores the only headless read path for discovered templates; without it the entire surviving feature is dead in the Tauri shell. A one-line fix unblocks the subsystem.
- **Effort**: 1
- **Implementation sketch**: In `lifecycle_cmds.rs` replace both `AND stale = 0` / `WHERE stale = 0` with `AND status = 'active'` / `WHERE status = 'active'`. Add a Rust `#[test]` (or a TS migration test) asserting the query prepares successfully against the migrated DB.

## 2. Rust `get_generation_history` filters on a nonexistent `project_id` column
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: functionality
- **File(s)**: src-tauri/src/commands/misc_cmds.rs:146 (registered at src-tauri/src/lib.rs:155); schema in src/app/db/migrations/069_fix_generation_history_fk.ts:33-39; repo in src/app/db/repositories/generation-history.repository.ts:21-31
- **Current state**: The command takes a required `project_id` arg and runs `SELECT * FROM generation_history WHERE project_id = ?1 ORDER BY created_at DESC LIMIT ?2`. The `generation_history` table has exactly five columns — `id, template_id, query, file_path, created_at` — and no `project_id`. The query errors at runtime, so generation history is unreadable from the Tauri shell.
- **Opportunity**: Either drop the `project_id` predicate (table is global, mirroring the TS `getAll()` repo), or — better, matching the command's intent — join/filter through `discovered_templates.source_project_path` (e.g. `WHERE gh.template_id IN (SELECT template_id FROM discovered_templates WHERE source_project_path LIKE ?1)`).
- **Value**: Restores headless access to "what requirements were generated from which template/query," the audit trail users rely on. Aligns the Rust layer with the actual schema and the surviving TS endpoint.
- **Effort**: 2
- **Implementation sketch**: Rewrite the SQL to the join-via-`discovered_templates` form (LEFT JOIN to also surface `template_name`, like the TS `getAll`), or remove the filter entirely and make `project_id` optional. Add a schema-backed test.

## 3. `/api/template-discovery/generate` never records a generation_history entry — silent, untracked generations
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/template-discovery/generate/route.ts:74-90; src/app/db/repositories/generation-history.repository.ts:40-71; src/app/api/generation-history/route.ts:37-56
- **Current state**: The generate route creates the requirement `.md` via `createRequirement(...)` and returns the file path, but it does **not** call `generationHistoryRepository.create()`. History was previously written by the now-deleted UI (`GenerationHistoryPanel`) calling POST `/api/generation-history` separately. With the UI gone, every server-generated requirement is now invisible to the history table, so finding #2's history (once fixed) and the TS `getAll()` will be perpetually empty.
- **Opportunity**: Record history server-side at the point of generation, inside the same request that writes the file, so tracking can't be skipped by callers.
- **Value**: Restores the generation audit trail (which template + query produced which file) for the autonomous-orchestration workflow, without depending on a client to make a second call. Eliminates a class of "where did this requirement come from?" gaps.
- **Effort**: 2
- **Implementation sketch**: In `generate/route.ts`, after a successful `createRequirement`, call `generationHistoryRepository.create({ template_id, query, file_path: result.filePath })` inside a try/catch so a history failure doesn't fail the generation. Keep the standalone POST endpoint for backward compat.

## 4. GET `/api/template-discovery` returns stale/error templates to consumers with no status filter
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/api/template-discovery/route.ts:185-206; repo `getAll`/`getBySourcePath` at src/app/db/repositories/discovered-template.repository.ts:26-70
- **Current state**: Migration 146 added a deliberate non-destructive lifecycle (`active`/`stale`/`error`) so templates that vanished or failed to parse are kept but flagged. Yet the HTTP GET (`getAll` / `getBySourcePath`) returns **all** rows regardless of `status`, with no query param to filter. A headless consumer that lists templates to generate from will happily pick a `stale` (no longer in source) or `error` (unparseable) template — defeating the entire purpose of the status column. The Rust path (finding #1) at least intends to filter; the HTTP path does not.
- **Opportunity**: Add an optional `?status=active|stale|error|all` query param (defaulting to `active`) to the GET handler and a `getByStatus(sourcePath?, status)` repo method, so consumers get only usable templates by default but can still inspect stale/error rows.
- **Value**: Prevents autonomous flows from generating requirements off dead/broken templates, while preserving the recovery/inspection value the status column was added for. Low-risk, additive.
- **Effort**: 2
- **Implementation sketch**: In `route.ts` read `status` from `searchParams` (default `'active'`); add `getByStatus` to the repo (`WHERE status = ?` + optional `source_project_path`); when `status === 'all'` keep current behavior. Document the param in docs/API.md.

## 5. Template discovery scan path is hardcoded to `src/templates/**` — non-conforming projects yield zero templates
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: feature
- **File(s)**: src/lib/template-discovery/scanner.ts:30-43 (`extractCategory`) and :49-65 (`discoverTemplateFiles` glob patterns)
- **Current state**: `discoverTemplateFiles` only globs `src/templates/*/*.ts` and `src/templates/*/*/*.ts`, and `extractCategory` only recognizes the literal `src/templates/{category}/` segment. Any project that keeps templates under `templates/`, `packages/*/templates/`, `app/templates/`, or a configured location returns zero discovered files with no diagnostic — the scan "succeeds" with `filesScanned: 0`. For a tool meant to discover templates across arbitrary external projects, this silently excludes most real layouts.
- **Opportunity**: Accept an optional `templateRoots: string[]` (or glob list) in the `ScanRequest`, defaulting to the current `src/templates` patterns, and derive `category` relative to the matched root rather than a hardcoded `src/templates/` regex.
- **Value**: Makes discovery work against real-world repo layouts instead of one convention, materially widening how many projects can feed templates into the generation pipeline — directly serving the cross-project orchestration direction.
- **Effort**: 3
- **Implementation sketch**: Add optional `templateRoots` to `ScanRequest` in `route.ts`; pass into `discoverTemplateFiles(projectPath, roots)`; build glob patterns from each root and change `extractCategory` to compute the category as the first path segment under the matched root. Keep the `src/templates` default so existing behavior is unchanged.
