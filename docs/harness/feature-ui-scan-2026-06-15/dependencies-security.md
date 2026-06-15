# Dependencies & Security — Feature + UI Scan
> Context: Dependencies & Security | Group: Analysis & Quality
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (4f feature / 1ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~12

## ⚠️ Context manifest drift (read first)
This context is **fully stale**. Every one of the 17 files in the manifest for `ctx_1770495720939_r50fwcd` has been deleted. Commit `9653fcbc` ("feat(cleanup): remove dead routes and never-used features (D10 audit)") removed the entire `src/app/features/Depndencies/` module, all `src/app/api/dependencies/*` routes (7 routes), `src/app/api/security/*`, and `src/app/db/repositories/security-patch.repository.ts` — 63 files, 8,681 deletions.

What actually **survives** and re-anchors this context:
- `src/app/api/lifecycle/quality-gate/route.ts` — a `security_scan` quality gate that shells out to `npm audit`.
- `src/lib/registry/versionFetcher.ts` — NPM/PyPI latest-version fetcher (now orphaned — both documented callers deleted).
- `src/app/db/migrations/index.ts:863-959` — still **creates** `security_scans`, `security_patches`, `security_prs` tables, now with no repository/route reading or writing them.
- `src/lib/prompts/registry/agents/security-protector.ts` + `src/app/features/Ideas/lib/agentRegistry.ts:139` — the `security_protector` scan agent (live in the Ideas engine).

All 5 findings below are grounded in this surviving code and aim to **re-deliver this context's promised value (dependency tracking + security scanning + PR generation) through Vibeman's existing autonomous primitives** rather than resurrect the deleted bespoke module.

## 1. `security_scan` quality gate silently passes on real vulnerabilities
- **Lens**: 🔍 feature-scout
- **Priority**: crit
- **Category**: functionality
- **File(s)**: src/app/api/lifecycle/quality-gate/route.ts:215-256 (catch at 248-256)
- **Current state**: `runSecurityScan` runs `npm audit --json`. `npm audit` exits non-zero whenever ANY vulnerability exists, which throws out of `execAsync` straight into the catch block — which unconditionally returns `passed: true` ("Security scan completed with warnings"). So a project with critical/high CVEs passes the gate; the `highVulns > 0 || criticalVulns > 0` check at line 235 is only reached in the rare case audit exits zero AND returns parseable JSON. The gate is effectively a no-op against real findings.
- **Opportunity**: Parse `stdout` from the *error* object (npm audit always writes JSON to stdout even on non-zero exit), then apply the severity threshold to that parsed result instead of blanket-passing in the catch.
- **Value**: Turns a security gate that currently green-lights everything into one that actually blocks lifecycle promotion on critical/high CVEs — core to the "continuous security monitoring" this context promises.
- **Effort**: 2
- **Implementation sketch**: In the catch block, read `execError.stdout`, `JSON.parse` it, reuse the same `highVulns`/`criticalVulns` extraction and threshold return as the success path. Only fall back to `passed: true` when stdout is genuinely empty/unparseable. Extract the severity-evaluation into one helper called from both paths.

## 2. Orphaned security_scans / security_patches / security_prs schema with no reader or writer
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/db/migrations/index.ts:863-959
- **Current state**: The migration still creates three richly-modeled tables — `security_scans` (severity counts + a 9-state status machine: pending → analyzing → patch_generated → pr_created → tests_running → merged), `security_patches` (package/current/fixed version, ai_analysis, patch_proposal), and `security_prs` (pr_number, branch, merge_status). The repository and every route that populated them were deleted in `9653fcbc`, so these tables are created on every fresh DB and never read or written.
- **Opportunity**: Re-wire the surviving `runSecurityScan` gate to persist its `npm audit` results into `security_scans`/`security_patches`, giving Vibeman a historical vulnerability ledger again. The schema already encodes the full automated remediation lifecycle the deleted feature implemented — re-using it avoids a new migration.
- **Value**: Restores the context's promised "dependency version tracking + continuous security monitoring" with trend history, at a fraction of the original effort since the data model already exists. Without this the tables are dead weight migrated forever.
- **Effort**: 3
- **Implementation sketch**: Add a thin `security-scan.repository.ts` with `recordScan(projectId, auditMetadata)` + `listScans(projectId)`; call it from `runSecurityScan` after parsing audit JSON; map each vuln advisory into a `security_patches` row. Surface history via a small read route reusing the existing indexes.

## 3. No automated security-remediation PR — manual gap vs. the autonomous-dev direction
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/lifecycle/quality-gate/route.ts:215; src/lib/registry/versionFetcher.ts:67; src/app/db/migrations/index.ts:935-959 (security_prs table)
- **Current state**: When the gate detects vulnerabilities it just returns `passed: false` with a count. The deleted module used to generate a patch + PR (the `security_prs` table proves the intended flow), but nothing now closes that loop. `versionFetcher.fetchRegistryVersions` (which can compute the safe upgrade target) sits orphaned with no callers.
- **Opportunity**: On a failing security gate, auto-create a remediation requirement/task: use `npm audit fix` (or `versionFetcher` to find the fixed version) on a branch, run the existing gates, and open a PR — mirroring how build-fixer turns build errors into requirements. This is the exact "security vulnerability scanning with PR generation" the context description names.
- **Value**: Converts a manual "you have 4 critical CVEs, good luck" dead-end into an autonomous fix proposal, which is squarely Vibeman's orchestration thesis and re-uses the already-migrated `security_prs` state machine.
- **Effort**: 4
- **Implementation sketch**: Add a `requirementCreator`-style helper (pattern: `src/app/api/build-fixer/lib/requirementCreator.ts`) that takes parsed audit output, calls `executeCommand('npm', ['audit','fix'], ...)` in a worktree, and emits a TaskRunner requirement; persist branch/PR into `security_prs`.

## 4. Security scan bypasses the hardened command sandbox (uses raw `exec`)
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/api/lifecycle/quality-gate/route.ts:7-18,218,261; src/lib/command/executeCommand.ts:209-231
- **Current state**: Every gate (`security_scan`, `build`, `coverage`, etc.) uses `promisify(exec)` with full-string shell commands. The codebase already ships `executeCommand` (`src/lib/command/executeCommand.ts`) with argument validation, retries, `acceptNonZero`, and an explicit `npm audit --json` example in its docstring (lines 203-207) — the sandbox was built for exactly this call but the gate route never adopted it.
- **Opportunity**: Migrate the gate runners to `executeCommand('npm', ['audit','--json'], { cwd, acceptNonZero: true })`. `acceptNonZero` directly fixes the non-zero-exit problem from finding #1 while removing string-concatenation shell exposure.
- **Value**: Consistent, validated, retry-capable command execution across quality gates; eliminates a parallel un-sandboxed exec path and de-risks future gate additions.
- **Effort**: 2
- **Implementation sketch**: Replace each `execAsync('...')` with `executeCommand(cmd, argsArray, { cwd: projectPath, timeout, acceptNonZero: true })`; drop the `promisify(exec)` import; read `result.stdout`/`result.exitCode` instead of catching.

## 5. Lifecycle config exposes `security_scan`/`coverage` gates with no readiness or empty-state feedback
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: ui
- **File(s)**: src/app/features/Ideas/sub_Lifecycle/components/LifecycleConfigPanel.tsx:45 (option list); src/app/api/lifecycle/quality-gate/route.ts:197-204,259-291
- **Current state**: `LifecycleConfigPanel` lets users select gates including "Security Scan" and "Coverage" from a flat option list. But the route returns a distinct `status: 'no_tests'` / "not configured" result when the project lacks a test/coverage runner (lines 197-204, 282-290). That nuance never surfaces in the UI — a user enabling "Security Scan" or "Coverage" gets no indication of whether their project can actually satisfy it, so a gate can sit permanently red with no explanation.
- **Opportunity**: Render per-gate readiness in the config panel: badge each selectable gate (Ready / Not configured) and, when a gate result carries `status: 'no_tests'`, show its `warning` text inline instead of a bare fail. Add a hover tooltip explaining what each gate runs (e.g. "runs `npm audit`").
- **Value**: Prevents users from silently enabling gates their project can never pass; the existing `warning`/`status` payload is already produced server-side, so this is purely surfacing data that's being discarded.
- **Effort**: 2
- **Implementation sketch**: Extend the gate option objects with a `requiresScript` hint; on panel mount probe `package.json` scripts (reuse disk/glob route) to compute readiness badges; when a gate result includes `details.status === 'no_tests'`, render `details.warning` as an inline amber note rather than a generic failure.
