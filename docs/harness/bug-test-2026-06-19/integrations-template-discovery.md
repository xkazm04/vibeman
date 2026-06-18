# Integrations & Template Discovery — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495748361_xnwn981
> Group: Social & Integrations
> Files read: ~15
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

> NOTE — STALE MANIFEST: ~12 of the 22 manifest files do NOT exist on disk. Missing/stale: the entire `src/app/features/Integrations/` feature dir (Layout, Dashboard, all components, EventsLog, the whole `sub_TemplateDiscovery/` UI + `discoveryApi.ts` + `promptGenerator.ts`); `api/integrations/*` (route, events, registry, stats, test); `api/prompt-templates/route.ts` + `review/route.ts`; `integration.repository.ts`; `prompt-template.repository.ts`. The live surface is only: `api/template-discovery/{route,[id],generate}`, `src/lib/template-discovery/{scanner,parser,index}`, `discovered-template.repository.ts`, `generation-history.repository.ts`, and the file-writer `Claude/sub_ClaudeCodeManager/folderManager.ts`. Findings below target the code that actually exists. (The "webhook receiver / event-log / integration-test SSRF" surfaces the prompt asked me to hunt are not present — there is no webhook or integration-test endpoint in this context anymore.)

## 1. Generate endpoint writes attacker-controlled files to any directory on the host (no project allowlist, overwrite clobbers existing requirements)
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: Security / arbitrary file write / SSRF-equivalent (server FS)
- **File**: src/app/api/template-discovery/generate/route.ts:37-74 (→ folderManager.ts:223-264 `createRequirement` / `initializeClaudeFolder`)
- **Scenario**: `POST /api/template-discovery/generate {"targetProjectPath":"C:/Users/victim/Desktop","templateId":"x","query":"y","content":"<arbitrary md>","overwrite":true}`. The route validates only that `targetProjectPath` exists and is a directory (`stat`). It never checks the path against the registered-projects list. `createRequirement` then runs `initializeClaudeFolder` (which `mkdirSync(.claude, .claude/commands, ...)` plus writes a default `settings.json`/`CLAUDE.md`) and `fs.writeFileSync` of caller-supplied `content` into `{targetProjectPath}/.claude/commands/{templateId}-{slug}.md`. With `overwrite:true` it silently clobbers any pre-existing requirement of that name (e.g. someone's `context-scan.md` that drives autonomous CLI runs).
- **Root cause**: Design assumes `targetProjectPath` is a trusted, already-registered workspace; the endpoint treats "the path exists" as authorization. No allowlist/canonicalization-against-known-roots step. The filename is sanitized (folderManager:246-250) so there's no traversal *within* the name — but the base directory is fully free.
- **Impact**: Any local/LAN caller (the dev server binds without auth) can scatter `.claude/` folders + markdown across the filesystem, and by overwriting `context-scan.md` or other requirement files inject instructions that a later Claude Code CLI execution will run — i.e. file-write → code-execution pivot. Also a quiet data-loss vector for existing requirements.
- **Fix sketch**: Resolve `targetProjectPath` and assert it is (a canonical-prefix of) a registered project from the projects store before writing; reject otherwise. Default `overwrite` stays false; only honor true after the same allowlist check.
- **Value**: effort 3 / impact 9 / risk 8

## 2. `upsert()` is a non-atomic check-then-insert — concurrent scans of the same project throw uncaught UNIQUE-constraint errors (→ 500) or lose updates
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: Race condition / missing transaction
- **File**: src/app/db/repositories/discovered-template.repository.ts:89-182 (SELECT at :97-104, INSERT at :156-178)
- **Scenario**: Two `POST /api/template-discovery` scans of the same `projectPath` run concurrently (double-click, retry, two tabs). Both `SELECT ... WHERE source_project_path=? AND template_id=?` find no row, both take the INSERT branch. `(source_project_path, template_id)` is unique (confirmed by migration 069 comment + FK rationale), so the second INSERT raises a UNIQUE-constraint error. It is NOT a "table missing" error, so `withTableCheck` (a plain try/translate wrapper, not a transaction) rethrows → the route's catch returns a generic 500 and the whole scan's partial work is reported as failure.
- **Root cause**: `withTableCheck` is assumed to provide write safety but only re-maps the missing-table error; the read and write are separate statements with no `BEGIN IMMEDIATE`/`INSERT … ON CONFLICT`. Single-user assumption.
- **Impact**: Intermittent 500s on concurrent/retried scans; under interleaving the unchanged/updated counts and last-writer-wins state become non-deterministic. `upsertMany` loops this, widening the window.
- **Fix sketch**: Use `INSERT … ON CONFLICT(source_project_path, template_id) DO UPDATE …` (or wrap the SELECT+write in `db.transaction(...)` with `BEGIN IMMEDIATE`) so the whole upsert is atomic and conflict-tolerant.
- **Value**: effort 3 / impact 6 / risk 4

## 3. Zero test coverage across the entire live context (scanner, parser, repository, all 4 routes, file writer)
- **Severity**: High
- **Lens**: test-mastery
- **Category**: Missing tests / blast-radius
- **File**: src/lib/template-discovery/{scanner.ts,parser.ts}, discovered-template.repository.ts, api/template-discovery/**, folderManager.ts:createRequirement (no `*.test.ts` exists for any — glob over the context returned nothing)
- **Scenario**: No test pins: (a) `createRequirement` filename sanitization + the overwrite-clobber guard (Finding 1's safety net), (b) `upsert` action correctness — created/updated/unchanged by content-hash + the stale/error→active reset at :111-121, (c) `markStale`'s empty-`currentTemplateIds` guard (:228) and the "skip stale-marking on parse errors" route logic (route.ts:148-151), (d) `parser` regex extraction.
- **Root cause**: Feature shipped without a harness; the invariants that protect data (stale-marking guard, hash-based change detection) and the host FS (sanitization) are unverified, so a refactor can silently break them.
- **Impact**: A regression that drops the `currentTemplateIds.length===0` guard would mass-mark every template stale; a sanitization regression re-opens Finding 1's traversal. Both are silent.
- **Fix sketch**: vitest + better-sqlite3 in-memory DB. LLM-generatable batches anchored to real invariants: upsert-action matrix (hash equal→unchanged, content change→updated, new→created), `markStale` guard (empty list ⇒ 0 changes; preserves non-listed via status not delete), `createRequirement` sanitization (`../`, absolute, unicode → safe slug; `overwrite=false` refuses existing), parser extraction of `templateId/templateName/description`.
- **Value**: effort 4 / impact 7 / risk 2

## 4. Parser silently drops valid templates when `templateName`/`templateId` use template literals or non-quoted values (regex-on-source extraction)
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: Silent failure / brittle parsing
- **File**: src/lib/template-discovery/parser.ts:81-94
- **Scenario**: A real `TemplateConfig` export whose `templateName: \`Tech ${x}\`` (backtick), or value built via a constant/spread, is parsed: the regexes `templateId:\s*['"]([^'"]+)['"]` and `templateName:\s*['"]...['"]` don't match. The `if (templateIdMatch && templateNameMatch)` gate at :85 fails, so the config is **silently skipped** — no entry pushed, no `parseResult.error` set. The route counts the file as scanned, finds the template "missing" from `currentTemplateIds`, and on a later clean scan `markStale` flips the previously-good DB row to `stale`.
- **Root cause**: Field extraction reuses regex over `initializer.getText()` even though ts-morph AST is already available (`getExportedDeclarations` is used at :58); assumes all config fields are single-quoted string literals.
- **Impact**: Valid templates vanish from discovery results and get demoted to stale with no error surfaced to the user — looks like the template was deleted. Hard to diagnose because there's no error path.
- **Fix sketch**: Extract the three fields via the ts-morph AST (`getProperty('templateId')?.getInitializer()?.getLiteralValue()`), or at minimum push a `parseResult.error` when type says `TemplateConfig` but a required field can't be extracted, so it's marked `error` (kept) not silently stale.
- **Value**: effort 4 / impact 5 / risk 3

## 5. Scan path passed straight to `glob`/`stat` with no canonicalization — symlink + arbitrary-root read of any project's templates
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: Security / unbounded FS read
- **File**: src/app/api/template-discovery/route.ts:56-75 (→ scanner.ts:49-65 `glob({cwd: projectPath})`)
- **Scenario**: `POST /api/template-discovery {"projectPath":"C:/"}` (or any path/symlink). The only check is `stat(projectPath).isDirectory()`; the raw path becomes `glob`'s `cwd`. Every `src/templates/*/*.ts` under that root — including outside any registered project — is read (`fs.readFile` in parser:51), parsed, and its full source persisted into `discovered_templates.config_json`. `GET ?sourcePath=` then returns it.
- **Root cause**: Same trust assumption as Finding 1 — "path exists ⇒ allowed to scan it." No allowlist, no symlink-resolution boundary, no depth cap (the `*/*/*.ts` pattern walks two levels of arbitrary dirs).
- **Impact**: Information disclosure of arbitrary on-disk TypeScript source into the DB / API response; a crafted symlink farm makes the scan walk and read attacker-chosen trees.
- **Fix sketch**: Canonicalize (`fs.realpath`) and require the result be within a registered project root before scanning; pass `follow:false`/bounded depth to `glob`. Shares the allowlist helper from Finding 1's fix.
- **Value**: effort 3 / impact 5 / risk 4
