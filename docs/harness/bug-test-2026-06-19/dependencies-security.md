# Dependencies & Security — Bug-Hunter + Test-Mastery Scan
> Context: ctx_1770495720939_r50fwcd
> Group: Analysis & Quality
> Files read: ~9
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

> **Manifest drift (read first):** All 17 files in this context's manifest were deleted in commit `9653fcbc` ("feat(cleanup): remove dead routes and never-used features (D10 audit)") — the entire `src/app/features/Depndencies/` module, all 7 `src/app/api/dependencies/*` routes, `src/app/api/security/*`, `src/lib/dependency_database.ts`, and `security-patch.repository.ts` are gone. None exist on disk. The findings below are re-anchored to the **surviving live code** that still delivers this context's promised value: the `security_scan` quality gate (`src/app/api/lifecycle/quality-gate/route.ts`), the orphaned `src/lib/registry/versionFetcher.ts`, the still-migrated `security_scans/patches/prs` tables, and the `security_protector` scan agent. A prior 2026-06-15 feature scan flagged the gate's blanket-pass-on-error bug; that specific bug is now **fixed** (the non-zero-exit path fails closed). The bugs below are the ones that remain.

## 1. Every quality gate (incl. security scan) ignores `projectId` and runs against vibeman itself, not the target project
- **Severity**: Critical
- **Lens**: bug-hunter
- **Category**: correctness / wrong-target (success theater)
- **File**: src/app/api/lifecycle/quality-gate/route.ts:34, 240 (and 106, 131, 153, 184, 277 — every `execAsync`)
- **Scenario**: POST `{ gate: 'security_scan', projectId: 'proj_X' }`. `projectId` is destructured at line 34 but never passed to `runGate`/`runSecurityScan`, and no `execAsync` call receives a `cwd`. `npm audit --json` therefore runs in vibeman's own CWD. The gate reports vibeman's vulnerability status (and type-check / build / coverage status) regardless of which project the caller asked about.
- **Root cause**: Design assumption that the lifecycle gate runs in-process for "the project" — but vibeman is a multi-project orchestrator; the project path must be resolved from `projectId` and threaded as `cwd`. The gate was written as if there were only one repo.
- **Impact**: Security gate result is meaningless per-project — a target project with critical CVEs passes if vibeman is clean (false PASS), or a clean project fails because vibeman has a finding (false FAIL). Same wrong-target defect poisons `build`, `coverage`, `type_check`. This silently green-lights lifecycle promotion of vulnerable projects.
- **Fix sketch**: Resolve project path from `projectId` (projects repo) at the top of `runGate`; require it for these gates; pass `{ cwd: projectPath, timeout }` to every `execAsync`. Reject with 400 if `projectId` is missing/unknown rather than auditing the wrong tree.
- **Value**: effort 3 / impact 10 / risk 8

## 2. Security gate's zero-exit success path still fails OPEN on unparseable audit output
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: silent failure / success theater
- **File**: src/app/api/lifecycle/quality-gate/route.ts:240-245 (line 244) + evaluateAuditResult:218-236
- **Scenario**: When `npm audit` exits **zero** (no vulns, or it bailed early) but stdout isn't clean JSON — e.g. an npm notice/deprecation line prepended to the JSON, or (given finding #1's wrong CWD) "no lockfile found" plain-text — `JSON.parse` throws and line 244 returns `passed: true` "audit output not JSON". Separately, if JSON parses but lacks `metadata.vulnerabilities`, `evaluateAuditResult` treats missing high/critical as `0` and passes.
- **Root cause**: The recently-hardened **error** path (lines 246-272) fails closed, but the **success** path was left asymmetric — it assumes "exit 0 ⇒ safe even if I can't read the report." Unparseable output means the scan's result is unknown, which is not the same as clean.
- **Impact**: A security gate that can't actually read its own scan output still reports PASS. This is the exact "security scan reporting clean on error" anti-pattern the lens calls out, surviving on the zero-exit branch.
- **Fix sketch**: On the success branch, if `JSON.parse` fails OR the parsed object has no `metadata.vulnerabilities`, return the same fail-closed `status: 'no_tests'` result the error branch uses — never `passed: true` without an evaluated report.
- **Value**: effort 1 / impact 8 / risk 6

## 3. No tests for the security pass/fail decision — the core security invariant is unguarded
- **Severity**: High
- **Lens**: test-mastery
- **Category**: missing-coverage (highest blast radius)
- **File**: src/app/api/lifecycle/quality-gate/route.ts:218-273 (`evaluateAuditResult`, `runSecurityScan`) — zero `*.test.ts`/`*.spec.ts` references found anywhere
- **Scenario**: Glob/grep for any test referencing `quality-gate`, `runSecurityScan`, `evaluateAuditResult`, or `npm audit` returns **no files**. The function that decides whether a project is secure enough to promote has no assertions. The fail-closed hardening on the error path (the fix for the prior scan's critical finding) can silently regress to fail-open with no test to catch it.
- **Root cause**: Security-gate logic was treated as glue code; the invariant "high/critical ⇒ fail, unevaluable ⇒ fail-closed, clean ⇒ pass" was never encoded as a test.
- **Impact**: Any refactor of the catch/parse logic (a one-line revert) silently re-opens the blanket-pass hole with green CI. This is the single highest-leverage test gap in the context.
- **Fix sketch**: Add `quality-gate.test.ts` mocking `execAsync` to (a) reject-with-stdout-JSON containing high/critical ⇒ `passed:false`; (b) reject with empty stdout ⇒ `passed:false` + `status:'no_tests'`; (c) resolve with clean JSON ⇒ `passed:true`; (d) resolve with non-JSON ⇒ must NOT pass (locks finding #2). 4 assertions, pure-mock, anchors the real invariant.
- **Value**: effort 2 / impact 9 / risk 2

## 4. `versionFetcher.ts` (safe-upgrade-target source) is orphaned and completely untested
- **Severity**: Medium
- **Lens**: test-mastery
- **Category**: missing-coverage / dead-but-load-bearing
- **File**: src/lib/registry/versionFetcher.ts:31-89 (`fetchLatestVersion`, `fetchRegistryVersions`, `getRegistryUrl`)
- **Scenario**: Both documented callers ("registry-versions API route and the dependency scan route", per its header) were deleted in `9653fcbc`; grep finds no remaining `src/` importer and no test file. The NPM `dist-tags.latest` / PyPI `info.version` parsing — the logic that would compute an upgrade target — has zero assertions, including the `!response.ok ⇒ throw` and the `version: null` swallow-on-error branches.
- **Root cause**: When the dependency module was removed, this shared helper was left behind without callers or tests; whoever re-wires security remediation (the doc'd opportunity) will build on unverified version-parsing.
- **Impact**: If reused, wrong/null upgrade targets flow into patch generation with nothing catching a registry-shape change or a swallowed network error. Also pure dead weight if not reused.
- **Fix sketch**: Either delete it, or add `versionFetcher.test.ts` mocking `fetch`: assert NPM picks `dist-tags.latest`, PyPI picks `info.version`, non-OK response throws, and `fetchRegistryVersions` maps a thrown package to `null` without failing the batch.
- **Value**: effort 2 / impact 5 / risk 2

## 5. Security-scan outer catch in `runGate` discards the fail-closed `status`, collapsing it to a generic failure
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: error-handling / lost signal
- **File**: src/app/api/lifecycle/quality-gate/route.ts:92-101 (outer catch) vs 263-272 (inner fail-closed result)
- **Scenario**: `runSecurityScan`'s inner error handling returns a structured `{ passed:false, details:{ status:'no_tests', warning:'…missing lockfile/registry…' } }`. But if anything throws *outside* that try (e.g. an unexpected error before/after, or a thrown non-Error), `runGate`'s catch at 92-101 returns a flat `{ passed:false, message:'Gate security_scan failed: …' }` with no `status`/`warning`. The UI can't distinguish "scan ran and found vulns" from "scan couldn't run" — the two have very different remediation.
- **Root cause**: Two parallel error layers produce divergent result shapes; the outer layer was written generically and doesn't preserve the gate-specific "unrunnable" signal the inner layer introduced.
- **Impact**: A permanently-red security gate with no explanation (a real-CVE fail looks identical to a no-lockfile fail), undermining the readiness feedback the prior scan recommended and making the gate's output non-actionable.
- **Fix sketch**: Have the inner gate functions own all error handling (already done for security) and make `runGate`'s catch attach `details.status:'error'` distinct from `'no_tests'`, or re-throw structured results so the shape is preserved end-to-end.
- **Value**: effort 2 / impact 4 / risk 3
