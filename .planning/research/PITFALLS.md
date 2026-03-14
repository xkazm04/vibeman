# Pitfalls Research

**Domain:** Template discovery and research integration for a Next.js development platform
**Researched:** 2026-03-14
**Confidence:** HIGH (based on direct codebase analysis of existing implementation)

## Critical Pitfalls

### Pitfall 1: ts-morph creates a new Project per file, leaking memory on repeated scans

**What goes wrong:**
The current `parseTemplateConfig()` in `src/lib/template-discovery/parser.ts` creates a new `ts-morph Project` instance for every single file (line 43). ts-morph's `Project` holds an in-memory TypeScript language service. On repeated scans (auto-scan triggers on project change, plus manual rescan), these accumulate since Node's GC cannot immediately reclaim the language service instances. With Next.js API routes running in a long-lived server process, this leads to growing memory consumption over time.

**Why it happens:**
The parser was built for "scan once" usage. The auto-scan on project change in the UI (TemplateDiscoveryPanel lines 267-272) means the parser runs more frequently than anticipated. Each invocation allocates a fresh compiler host.

**How to avoid:**
- Reuse a single `ts-morph Project` instance across all files in a scan batch. The `parseTemplateConfigs()` function exists but does not actually reuse the project -- fix it to create one Project, add all source files, then iterate.
- Alternatively, skip ts-morph entirely for this use case. The parser already falls back to regex for extracting `templateId`, `templateName`, and `description` (lines 78-80). The AST is only used to find exports typed as `TemplateConfig`. A regex-based approach scanning for `export const ... : TemplateConfig` would be sufficient for the known 10-template corpus and avoids the ts-morph dependency entirely.

**Warning signs:**
- Next.js dev server memory usage climbing after multiple project switches
- `heap out of memory` errors during development
- Scan times increasing on repeated runs

**Phase to address:**
Phase 1 (Template Discovery) -- before auto-scan is enabled, decide whether to keep ts-morph or replace with regex. Do not ship auto-scan with per-file Project instantiation.

---

### Pitfall 2: Auto-scan triggers infinite re-render loops via useEffect dependency chains

**What goes wrong:**
The `TemplateDiscoveryPanel` has two useEffects that interact: one calls `loadTemplates()` on `projectPath` change (line 263), another calls `handleScan()` on `projectPath` change (line 268). `handleScan` internally calls `loadTemplates` after completion. If `loadTemplates` or `handleScan` are recreated on each render (e.g., a dependency changes that triggers the callback identity to change), these effects can chain-fire causing repeated API calls or UI flicker.

**Why it happens:**
The `useCallback` for `handleScan` depends on `[projectPath, loadTemplates]` and `loadTemplates` depends on `[projectPath]`. React 19 strict mode double-invokes effects. If the store-derived `projectPath` value is not referentially stable across renders, the dependency chain triggers repeatedly.

**How to avoid:**
- Guard the auto-scan effect with a debounce (300ms) to prevent rapid-fire scanning when project selection is changing.
- Use `useRef` to store the scan function instead of `useCallback` to break the dependency chain.
- Consolidate into a single effect: load templates first, if none found or stale, then scan.

**Warning signs:**
- Network tab showing repeated POST to `/api/template-discovery` on page load
- "Scanning..." indicator flickering
- Console showing multiple "Scanning project for templates..." messages

**Phase to address:**
Phase 1 (Template Discovery) -- fix before shipping auto-scan behavior.

---

### Pitfall 3: config_json stores raw TypeScript source text, not actual JSON

**What goes wrong:**
The `config_json` column in `discovered_templates` stores the raw TypeScript initializer text from `varDecl.getInitializer().getText()`. This is TypeScript object literal syntax (with trailing commas, unquoted keys, template literals, spread operators, function references), not valid JSON. Any downstream code that calls `JSON.parse(template.config_json)` will fail. The `promptGenerator.ts` currently treats it as opaque text for interpolation, which works but means the rich structured data (searchAngles, findingTypes, perspectives) is inaccessible for UI display.

**Why it happens:**
The parser extracts the AST initializer text because converting a TS object literal with complex nested structures (arrays of objects, function references, enum values) to JSON is non-trivial. The column name `config_json` is misleading.

**How to avoid:**
- Rename the column concept to `config_source` or `config_raw` in the type definition to signal it is not parseable JSON.
- For structured access, extract the specific fields needed (searchAngles count, perspectives list, depth guidance) during parsing and store them as separate columns or a validated JSON subset.
- Do NOT attempt to `eval()` or `new Function()` the TypeScript source to get a runtime object -- this is a security and reliability hazard.

**Warning signs:**
- `SyntaxError: Unexpected token` when trying to parse config_json
- Template detail views showing raw TypeScript syntax to users
- Variable interpolation producing broken output when config contains template literals

**Phase to address:**
Phase 1 (Template Discovery) -- decide the storage format before the DB schema is locked in. Either extract structured metadata during parsing or accept raw source and name accordingly.

---

### Pitfall 4: Path normalization inconsistencies between Windows and POSIX

**What goes wrong:**
The codebase has multiple places doing `path.replace(/\\/g, '/')` -- in the API route (line 69), in the scanner (lines 67, 81), in the repository query (TemplateDiscoveryPanel line 77), and in the glob patterns. But `source_project_path` is the key used for upsert matching and stale template deletion. If one code path normalizes and another does not, templates become orphaned (scan writes with normalized path, query uses unnormalized path, returns empty results).

**Why it happens:**
Windows paths use backslashes. The project stores paths from the active project store which may use either format. Different layers normalize independently without a single canonical source.

**How to avoid:**
- Create a single `normalizePath(p: string): string` utility used everywhere -- scanner, parser, repository, API route, and UI code.
- Normalize in the repository layer (lowest level) so all storage and queries use the same format regardless of what callers pass.
- Add a check in the upsert that normalizes `source_project_path` before comparison.

**Warning signs:**
- Templates discovered but not showing in the UI list
- Re-scan always showing "created" instead of "unchanged" for existing templates
- `deleteStale` removing all templates on every scan

**Phase to address:**
Phase 1 (Template Discovery) -- this is a data integrity issue. Fix the normalization before any templates are stored in production.

---

### Pitfall 5: Stale template cleanup deletes too much on partial scan failure

**What goes wrong:**
After scanning, `deleteStale()` in the API route (line 125) removes templates whose IDs are not in the current scan results. If the scan partially fails (e.g., 3 of 10 files parse successfully due to a ts-morph error), it deletes the 7 "missing" templates that were actually just unparseable.

**Why it happens:**
The stale cleanup runs unconditionally after scanning, regardless of whether all files were successfully parsed.

**How to avoid:**
- Only run stale cleanup if the scan completed without errors (`errors.length === 0`).
- Or: only delete stale templates if the number of successfully parsed templates is above a threshold (e.g., > 50% of previously stored templates for that project path).
- Log a warning when stale cleanup would delete more templates than were found in the current scan.

**Warning signs:**
- Template count dropping after a scan that had parse errors
- Templates disappearing and reappearing between scans
- Error messages in the scan result alongside a reduced template count

**Phase to address:**
Phase 1 (Template Discovery) -- add the safety check before stale cleanup is operational.

---

### Pitfall 6: Scanning wrong projects (not the res project)

**What goes wrong:**
The scanner looks for `src/templates/*/*.ts` in any project. If the active project in Vibeman is not the res project (e.g., it is Vibeman itself, or some other project with a `src/templates/` folder), the scanner will find files, attempt to parse them for `TemplateConfig` exports, and either fail silently or store garbage data. The auto-scan on project change makes this especially likely -- every project switch triggers a scan.

**Why it happens:**
The UI scans whatever project is active in the header selector. There is no validation that the project actually contains res-style TemplateConfig exports.

**How to avoid:**
- Add a "template project" flag to the project record, so only designated projects trigger auto-scan.
- Or: store a per-project "last scan found templates" flag and only auto-scan projects that previously yielded results.
- Show a clear "No template configs found in this project" message (not an error) for non-template projects.
- Current implementation handles empty results gracefully, but the unnecessary file system access and network requests are wasteful.

**Warning signs:**
- "0 templates discovered" toast on every project switch for non-res projects
- Unnecessary file system access on project change
- User confusion about why scanning their React app finds nothing

**Phase to address:**
Phase 2 (Research Variable UI) -- add project designation or manual-scan-only mode.

---

### Pitfall 7: Generated files land in wrong location or create naming collisions

**What goes wrong:**
The generate route writes to `{targetProjectPath}/.claude/commands/{templateId}-{slug}.md` via `createRequirement` from `claudeCodeManager`. The slug function takes only the first 5 words and strips non-alphanumeric characters. Similar queries produce near-duplicate filenames. Also, the `.claude/commands/` path is hardcoded and may not match the target project's conventions.

**Why it happens:**
The `createRequirement` function was built for a specific Claude Code workflow. The slug algorithm does not include any uniqueness guarantee (no timestamp, no hash).

**How to avoid:**
- Include a timestamp or short hash in the filename: `{templateId}-{slug}-{timestamp}.md`.
- Make the output directory configurable per template project, stored alongside the `source_project_path`.
- Show the exact file path in the UI before generation, not just after.

**Warning signs:**
- Overwrite confirmations appearing unexpectedly for different queries
- Multiple similar-named files accumulating in `.claude/commands/`
- User cannot find generated files

**Phase to address:**
Phase 2 (Research Variable UI / EXEC requirements) -- when building the generation flow.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing raw TS source as `config_json` | Avoids complex TS-to-JSON conversion | Cannot programmatically access template structure; misleading column name | MVP only -- extract structured fields in Phase 2 |
| Per-file ts-morph Project instantiation | Simple implementation | Memory leaks on repeated scans | Never in production with auto-scan enabled |
| Regex fallback for field extraction after AST parsing | Gets the job done for known templates | Brittle if template format changes (multiline strings, computed properties) | Acceptable if template format is stable and owned |
| `confirm()` for overwrite dialog | Quick implementation | Blocks main thread; not styled consistently with app theme | MVP only -- replace with modal in Phase 4 |
| Hardcoded `.claude/commands/` output path | Works for res project | Breaks for projects with different conventions | Only if res is the sole target permanently |
| Duplicate content hash computation | Parser computes hash, repository recomputes | Wasted CPU cycles; potential inconsistency if algorithms differ | Acceptable at current scale, fix when optimizing |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ts-morph in Next.js API routes | Importing ts-morph in client-side code (it requires Node.js fs module) | Use `import 'server-only'` guard (already done correctly); verify with bundle analysis |
| Active project store | Assuming project path is always available and valid | Handle null/undefined project, validate path exists before scan, show clear empty state |
| Cross-project file writes | Writing to foreign project without checking write permissions | Verify write access before generation; handle EACCES with user-friendly message |
| SQLite content hash | Computing hash differently in two places (parser uses file content, repository uses config_json) | Compute once in parser, pass through; repository should trust the provided hash |
| glob on Windows | Using backslash patterns with glob library | Always use forward slashes in glob patterns; normalize before globbing |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Auto-scan on every project switch | Multiple simultaneous scans, wasted API calls | Debounce 300ms; cancel in-flight scan on project change; skip non-template projects | With 5+ projects being switched rapidly |
| ts-morph parsing many files | Scan takes 10+ seconds, UI hangs on "scanning" | Add progress reporting; cache results by content hash; batch parse with single Project | At 50+ template files |
| Storing full config source in SQLite | DB size grows, query performance degrades | Acceptable for 10-50 templates; for 200+, store only metadata | At 200+ templates |
| No request cancellation | Old scan result overwrites newer scan if responses arrive out of order | Use AbortController; compare projectPath in response handler to current state | When switching projects during active scan |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting arbitrary project paths from client | Path traversal: user could scan `/etc/` or `C:\Windows\System32` | Validate path is under known project roots; reject paths with `..` segments |
| Writing generated files to user-specified paths | Arbitrary file write via crafted `targetProjectPath` | Restrict write targets to known project directories registered in the app |
| Executing foreign TypeScript via import/require | Arbitrary code execution in Vibeman's Node.js process | Never import/require foreign project files; use static analysis only (current approach is correct) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Auto-scan noise for non-template projects | Confusing "0 templates" on every project switch | Only auto-scan designated template projects; manual scan for others |
| `confirm()` for overwrite | Jarring, unstyled, no file preview | In-app modal showing existing file content vs new content |
| CLI command shown only after generation | Must generate before knowing the command | Show command template alongside the template selector, before generation |
| No staleness indicator | User does not know if templates changed since last scan | Show "last scanned" timestamp; highlight changed templates on rescan |
| State lost on navigation | User fills query, navigates away, loses work | Persist last-used template and project in Zustand with persist middleware |
| Error message says "run migrations" | Non-technical users confused | Auto-detect missing tables at startup; show one-click setup action |

## "Looks Done But Isn't" Checklist

- [ ] **Template parsing:** Verify templates with multiline descriptions parse correctly -- regex `description:\s*['"]([^'"]+)['"]` fails on template literals or concatenated strings
- [ ] **Path normalization:** Verify the same project scanned from different path formats (backslash vs forward slash, trailing slash vs not) produces the same DB records, not duplicates
- [ ] **Stale template cleanup:** Verify that renaming a template in the source project causes the old record to be deleted and a new one created, not orphaned
- [ ] **Content hash stability:** Verify CRLF vs LF line endings on Windows do not cause false "updated" results on every scan
- [ ] **Category extraction:** Verify nested folder structures (`templates/research/v2/file.ts`) produce sensible categories
- [ ] **Generation history FK:** Verify history records survive template deletion -- FK constraint was fixed in migration 069 but verify no cascade delete
- [ ] **Partial scan failure:** Verify that a parse error on one file does not prevent processing of other files
- [ ] **Bundle size:** Verify ts-morph is not included in the client-side JavaScript bundle -- check with `next build` and inspect chunk sizes

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate templates from path normalization | LOW | Delete all templates for affected source path; fix normalization; rescan |
| Memory leak from ts-morph | LOW | Restart Next.js dev server; implement Project reuse or switch to regex |
| Corrupt config_json data | LOW | Delete affected templates from DB; rescan source project; no data loss since source is read-only |
| Generated files in wrong location | LOW | Manually move files; update output path configuration |
| Auto-scan infinite loop | LOW | Remove auto-scan useEffect; add debounce; re-enable |
| Stale cleanup deleted valid templates | LOW | Rescan project; templates will be re-created from source files |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| ts-morph memory leak | Phase 1: Template Discovery | Run scan 10 times in succession, check memory does not grow |
| useEffect re-render loop | Phase 1: Template Discovery | Switch projects 5 times rapidly, verify only 5 scan requests (not 20+) in network tab |
| config_json is not JSON | Phase 1: Template Discovery | Attempt `JSON.parse()` on stored config_json; if it fails, rename column/type |
| Path normalization | Phase 1: Template Discovery | Scan same project with backslash and forward-slash paths, verify single set of DB records |
| Stale cleanup over-deletion | Phase 1: Template Discovery | Simulate parse failure on 1 file, verify other templates are not deleted |
| Wrong project scanning | Phase 2: Research Variable UI | Switch to non-template project, verify graceful "no templates" state without network requests |
| File output path conflicts | Phase 2: Research Variable UI | Generate 3 requirements for same template with similar queries, verify unique filenames |
| No error boundary | Phase 4: UI Redesign | Kill DB connection, navigate to Integrations, verify fallback UI appears (not blank page) |

## Sources

- Direct codebase analysis: `src/lib/template-discovery/parser.ts` (ts-morph per-file instantiation, regex fallback)
- Direct codebase analysis: `src/lib/template-discovery/scanner.ts` (glob patterns, path normalization)
- Direct codebase analysis: `src/app/features/Integrations/sub_TemplateDiscovery/TemplateDiscoveryPanel.tsx` (useEffect chains, auto-scan)
- Direct codebase analysis: `src/app/api/template-discovery/route.ts` (stale cleanup, path normalization)
- Direct codebase analysis: `src/app/api/template-discovery/generate/route.ts` (slug generation, hardcoded output path)
- Direct codebase analysis: `src/app/db/repositories/discovered-template.repository.ts` (upsert logic, duplicate hash computation)
- Project constraints: `.planning/PROJECT.md` (out-of-scope items, TemplateConfig structure)
- Vibeman migration system: 53 existing migrations, `_migrations_applied` tracking pattern

---
*Pitfalls research for: Template Discovery & Research Integration (Vibeman v2.0)*
*Researched: 2026-03-14*
