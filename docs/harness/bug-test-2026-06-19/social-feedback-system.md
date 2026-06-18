# Social Feedback System — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495741633_y8a1sl9
> Group: Social & Integrations
> Files read: ~14
> Total: 5 (Critical: 0, High: 2, Medium: 2, Low: 1)

> **CRITICAL MANIFEST DRIFT (unchanged since 2026-06-15).** Every source file this context
> claims still 404s. The entire `src/app/features/Social/` React module and all
> `src/app/api/social/*` routes (fetch/analyze/classify/sentiment/clusters/themes/customers/
> config/config-test/routing-rules/discovery/discovery-search/discovery-save/github) plus
> `social-config.repository.ts` and `social-discovery.repository.ts` were deleted in commit
> `3f81b889` ("headless-slim"). There is **no live sentiment/clustering/routing/SSRF code to
> hunt** — the LENS-1 attack surface described in the prompt does not exist in this tree.
>
> What HAS happened: the prior scan's 5 findings were largely *fixed*. The orphaned Tauri
> commands (`get_social_configs`/`get_social_discoveries`) were removed (`social_cmds.rs:12-15`
> now documents the removal); the dead `socialEncryptionSecret()`/`grokApiKey()` env getters
> with the hardcoded default secret are gone; the salvaged UI atoms now live at
> `src/components/ui/StatusBadge.tsx` + `AIProcessingPanel.tsx` and the HallOfFame showcase
> entries correctly point at them. **Finding #5 (context-map drift detection) was also built**
> — `auditContexts()` gained a `fileExists` resolver and `/api/contexts/audit` wires it through
> `validatePathWithinBase` + `existsSync` to emit `stale_context`/`missing_files` findings.
>
> Therefore the remaining high-value findings are all about the *successor* drift-audit surface
> (the only live code reachable from this context) and the still-uncorrected live `context_map.json`,
> NOT the deleted feature. Reported honestly rather than fabricating bugs in nonexistent code.

## 1. Drift-audit `fileExists` security guard + stale/partial branch has ZERO tests
- **Severity**: High
- **Lens**: test-mastery
- **Category**: untested-security-and-data-integrity-path
- **File**: src/lib/contexts/audit.ts:101-127 (+ caller src/app/api/contexts/audit/route.ts:36-42); no `src/lib/contexts/*.test.ts` exists
- **Scenario**: The drift detector is the single piece of live code that exists *because* of this dead context. Its highest-risk lines — the `validatePathWithinBase(filePath, projectPath) !== null` gate that decides whether a stored, user/LLM-controlled `files[]` string reaches `existsSync(path.resolve(projectPath, filePath))`, and the `missing.length === n` branch that distinguishes a fully-stale context from a partially-missing one — have no test anchoring their behavior. A future refactor that flips the guard's truthiness (`validatePathWithinBase` returns an *error string* when unsafe, `null` when safe — easy to invert) would turn the audit into an arbitrary-path filesystem probe (`existsSync` on any path), and nothing would fail.
- **Root cause**: The fix for prior-scan finding #5 shipped the drift logic + a path-traversal guard but no regression test; the helper's "non-null means reject" contract is non-obvious and unprotected.
- **Impact**: The drift guard (the only defense against a crafted/abs `files[]` entry causing out-of-project `existsSync` probing) and the stale-vs-partial classification (which downstream "prune dead context" UX depends on) can silently regress. This is the exact failure mode that let *this* context rot for a release.
- **Fix sketch**: Add `audit.test.ts`: (a) `fileExists` invoked only for in-base paths, `../../etc/passwd` and `C:\\Windows\\x` rejected before disk; (b) all-missing → exactly one `stale_context` + `staleContexts===1`; (c) partial-missing → `missing_files`, not stale; (d) `MAX_MISSING_EXAMPLES` cap + `+N more` suffix.
- **Value**: effort 3 / impact 7 / risk 2

## 2. `validatePathWithinBase` (the audit's traversal gate) is untested and has an absolute-path footgun
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: path-traversal / SSRF-adjacent (filesystem probe)
- **File**: src/lib/pathSecurity.ts:47-58; no `pathSecurity.test.ts` exists
- **Scenario**: `validatePathWithinBase` does `path.resolve(baseDir, filePath)`. When `filePath` is **absolute**, `path.resolve` discards `baseDir` entirely and returns `filePath` — so an absolute `files[]` entry like `C:\Windows\win.ini` or `/etc/shadow` is "validated" purely by the `startsWith(resolvedBase + sep)` prefix check. That check is correct here (absolute escapes are caught), but the function does NOT reject absolute paths up front and shares this helper with `validateFilePathArray` and other write-capable callers where the prefix check is the *only* thing preventing escape. One caller that compares case-insensitively on Windows, or normalizes differently, re-opens traversal. No test pins "absolute path outside base → error", "absolute path *inside* base → ok", or the `/project-evil` vs `/project` partial-prefix case the code comment claims to defend.
- **Root cause**: Security-critical, multi-caller helper relies entirely on a `path.resolve` + string-prefix invariant that is only documented in a comment, never asserted.
- **Impact**: A regression in this one helper silently weakens every path-scoping caller across the app (audit disk-probe, file save, context file resolution). Highest blast radius of anything in-scope.
- **Fix sketch**: Add `pathSecurity.test.ts` covering absolute-in/absolute-out/`..`-escape/partial-prefix/`baseDir`-equality cases; consider explicitly rejecting `path.isAbsolute(filePath)` in `validatePathWithinBase` so the contract doesn't depend on `resolve` semantics.
- **Value**: effort 2 / impact 7 / risk 2

## 3. Live `context_map.json` still tracks the fully-deleted Social feature
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: stale-manifest / scan-scope-poisoning
- **File**: context_map.json:814-825+ (ctx_1770495741633_y8a1sl9, ~17 dead `src/app/features/Social/**` + `src/app/api/social/**` paths)
- **Scenario**: The drift-audit feature (finding #1) can now *detect* this context as `stale_context`, but nothing has *acted* on it — the live `context_map.json` (and the harness `_contexts.json`) still list 17 paths, 100% of which are gone. Every scan, health pass, idea scanner, and audit harness that trusts the manifest keeps wasting budget on a phantom feature (this very scan included).
- **Root cause**: Drift *detection* shipped; drift *remediation* (prune/auto-archive of a context whose every file is missing) did not, and no one ran the audit + pruned this entry.
- **Impact**: Recurring wasted scan/LLM budget and misleading context-map totals; the dead context will keep re-appearing in every future Pipeline-B run.
- **Fix sketch**: Run `/api/contexts/audit` for this project, then delete ctx_1770495741633_y8a1sl9 (a confirmed `stale_context`) from `context_map.json`; add a one-click "prune stale context" action driven by the existing `stale_context` finding code.
- **Value**: effort 1 / impact 5 / risk 1

## 4. `/api/contexts/audit` skips disk-drift checks for projects with no `path` — silent blind spot
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: silent-failure / success-theater
- **File**: src/app/api/contexts/audit/route.ts:35-42
- **Scenario**: `fileExists` is built only when `projectDb.getProject(projectId)?.path` is truthy; otherwise it is `undefined` and `auditContexts` skips ALL disk checks. A project with a missing/blank `path` row therefore reports `missingFiles: 0`, `staleContexts: 0`, and `ok` may be `true` — a clean bill of health that actually means "drift detection was silently disabled." The UI badge (`ContextAuditPanel` totals) shows `0 stale` indistinguishably from "verified zero stale".
- **Root cause**: Absent project path is treated as "skip the check" rather than "cannot verify"; the response carries no `diskChecked` flag, so the UI can't tell verified-clean from not-checked.
- **Impact**: Drift can hide indefinitely for any path-less project; the audit gives false assurance — the same success-theater pattern flagged across prior waves.
- **Fix sketch**: Return a `diskChecked: boolean` in the report; when false, render the stale/missing badges as "—" / "not verified" instead of `0`; optionally `info`-level finding "disk drift unchecked (project path unknown)".
- **Value**: effort 2 / impact 5 / risk 1

## 5. Harmless `// --- SocialLayout Components ---` labels are the last drift breadcrumbs
- **Severity**: Low
- **Lens**: bug-hunter
- **Category**: maintenance / dead-label
- **File**: src/app/features/HallOfFame/lib/showcaseRegistry.ts:1207, components/previews/index.ts:71, components/PreviewModal.tsx:144, components/FeaturedHero.tsx:110/204/370
- **Scenario**: After the salvage, the two showcase entries correctly import from `@/components/ui/StatusBadge` + `AIProcessingPanel`, but six `// SocialLayout` comment labels survive across the HallOfFame files. They mislead a future reader into thinking a `Social` module still backs these atoms (it doesn't — they're now generic `data-display`/`advanced` primitives).
- **Root cause**: Comment labels weren't renamed when the underlying components were re-homed out of the deleted Social module.
- **Impact**: Cosmetic only; minor confusion / grep noise for `Social` that keeps this dead context "alive" in searches.
- **Fix sketch**: Rename the six `SocialLayout` comment labels to e.g. `Status & AI-Progress` (or drop them); purely a readability cleanup.
- **Value**: effort 1 / impact 2 / risk 1
