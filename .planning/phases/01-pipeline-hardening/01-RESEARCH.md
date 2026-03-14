# Phase 1: Pipeline Hardening - Research

**Researched:** 2026-03-14
**Domain:** ts-morph AST parsing, React useEffect lifecycle, SQLite upsert/stale cleanup, cross-platform path normalization
**Confidence:** HIGH

## Summary

Phase 1 addresses four correctness bugs in the template discovery pipeline. All bugs are clearly visible in the existing source code, making this a high-confidence research phase -- the problems and solutions are well-defined.

The four issues are: (1) `parser.ts` creates a new `ts-morph Project` per file instead of reusing one across a scan batch, causing memory waste; (2) `TemplateDiscoveryPanel.tsx` has two `useEffect` hooks that trigger auto-scanning on project switch, causing infinite re-renders; (3) inline `.replace(/\\/g, '/')` calls scattered across template-discovery files instead of using the centralized `normalizePath()` from `pathUtils.ts`; (4) the `deleteStale` call in the API route runs even when parse failures occurred, potentially deleting valid templates whose files simply failed to parse.

**Primary recommendation:** Fix each bug in isolation with targeted changes -- lift ts-morph Project to batch level, remove auto-scan useEffects, replace inline path normalization, and gate stale cleanup on scan completeness.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Manual scan only -- remove auto-scan useEffect entirely
- User clicks "Scan" button to trigger scanning
- No scanning on project switch -- eliminates the infinite loop risk at the source
- Show scan progress with file count: "Scanning... 3/10 files"
- Mark as stale instead of deleting -- templates no longer found in scan get flagged as "stale" in DB
- User can see stale templates and manually clean up
- On partial parse failure: upsert the successfully parsed templates, flag failed ones with error state
- Never silently delete valid template records
- Inline error badges on failed template cards -- red badge with tooltip showing parse error details
- Toast notification after scan completes: "10 templates found, 3 errors" that auto-dismisses
- No persistent scan result banner -- toast is sufficient
- Use existing `normalizePath()` from `src/utils/pathUtils.ts` everywhere -- replace all inline `replace(/\\/g, '/')` calls in template-discovery files
- Store paths in database always with forward slashes -- normalize before any DB write
- Consistent cross-platform path handling

### Claude's Discretion
- ts-morph Project instance lifecycle (reuse strategy, disposal timing)
- Non-template projects handling (projects without `src/templates/`)
- Exact toast notification implementation
- Error badge visual design within existing dark theme
- Stale template visual indicator design

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | ts-morph Project instance reused across file scans instead of creating new per file | parser.ts line 43-49 creates `new Project()` per call; lift to `parseTemplateConfigs()` and pass down |
| PIPE-02 | useEffect auto-scan does not re-trigger infinitely on project switch | TemplateDiscoveryPanel.tsx lines 262-272 have two useEffects causing auto-scan; remove both, replace with manual-only |
| PIPE-03 | Path normalization centralized in single utility instead of fragmented locations | 6 inline `.replace(/\\/g, '/')` in template-discovery files; replace with `normalizePath()` from pathUtils.ts |
| PIPE-04 | Stale template cleanup skipped when scan partially fails (no silent data loss) | route.ts line 124-128 calls `deleteStale` with only successfully-parsed IDs, missing failed files' existing templates |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | (existing dep) | TypeScript AST parsing for template config extraction | Already in use, no change needed |
| better-sqlite3 | (existing dep) | SQLite database for template storage | Already in use, project standard |
| React 18+ | (existing dep) | UI components with hooks | Already in use |
| next | (existing dep) | API routes and server components | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | (existing dep) | State management | Already used for `useClientProjectStore` |
| lucide-react | (existing dep) | Icons for error badges and stale indicators | Already used in TemplateDiscoveryPanel |
| framer-motion | (existing dep) | AnimatePresence already in panel | Already used for template columns |

### Alternatives Considered
None -- this phase uses only existing dependencies. No new libraries needed.

## Architecture Patterns

### Recommended Changes Structure
```
src/
  lib/template-discovery/
    parser.ts              # MODIFY: accept Project instance, add error-per-file tracking
    scanner.ts             # MODIFY: use normalizePath() import
  app/api/template-discovery/
    route.ts               # MODIFY: create single Project, pass to parser; replace deleteStale with markStale; add progress tracking
  app/db/repositories/
    discovered-template.repository.ts  # MODIFY: add markStale(), add status/error columns support
  app/db/migrations/
    071_template_status.ts  # NEW: add status + parse_error columns to discovered_templates
  app/features/Integrations/sub_TemplateDiscovery/
    TemplateDiscoveryPanel.tsx  # MODIFY: remove auto-scan useEffects, add manual scan with progress
    lib/discoveryApi.ts         # MODIFY: use normalizePath() for path params
  utils/pathUtils.ts       # NO CHANGE: already has what we need
```

### Pattern 1: ts-morph Project Reuse
**What:** Create a single `Project` instance at the batch level and pass it to each file parse call.
**When to use:** Any time multiple files are parsed in one scan operation.
**Example:**
```typescript
// In route.ts POST handler -- create once for entire scan
import { Project } from 'ts-morph';

const tsMorphProject = new Project({
  compilerOptions: { allowJs: true, skipLibCheck: true },
  skipAddingFilesFromTsConfig: true,
});

// Pass to each parse call
for (const discoveredFile of scanResult.files) {
  const parseResult = await parseTemplateConfig(discoveredFile.filePath, tsMorphProject);
  // ... handle result
}

// In parser.ts -- accept optional Project param
export async function parseTemplateConfig(
  filePath: string,
  project?: Project
): Promise<ParseResult> {
  const proj = project ?? new Project({ /* defaults */ });
  const sourceFile = proj.addSourceFileAtPath(filePath);
  // ... parse ...
  // IMPORTANT: remove the source file after parsing to avoid memory accumulation
  proj.removeSourceFile(sourceFile);
  return result;
}
```

### Pattern 2: Mark-as-Stale Instead of Delete
**What:** Replace `deleteStale()` with `markStale()` that sets a status column instead of deleting rows.
**When to use:** After a scan completes, mark templates not found in scan results as stale.
**Example:**
```typescript
// New repository method
markStale: (sourcePath: string, currentTemplateIds: string[]): number => {
  const db = getDatabase();
  if (currentTemplateIds.length === 0) {
    // If scan found zero templates, do NOT mark all as stale
    // This prevents accidental mass-staleing on scan failure
    return 0;
  }
  const placeholders = currentTemplateIds.map(() => '?').join(', ');
  const stmt = db.prepare(`
    UPDATE discovered_templates
    SET status = 'stale', updated_at = ?
    WHERE source_project_path = ?
      AND template_id NOT IN (${placeholders})
      AND status != 'stale'
  `);
  return stmt.run(getCurrentTimestamp(), sourcePath, ...currentTemplateIds).changes;
}
```

### Pattern 3: Manual-Only Scan Trigger
**What:** Remove both auto-scan useEffects. Load cached templates on mount/project-change, but only scan when user clicks button.
**When to use:** Replacing the current auto-scan behavior.
**Example:**
```typescript
// REMOVE these two useEffects:
// useEffect(() => { loadTemplates(); }, [loadTemplates]);        // line 262-264
// useEffect(() => { if (projectPath...) handleScan(); }, ...);  // line 267-272

// REPLACE with: load cached templates on project change (no scan)
useEffect(() => {
  loadTemplates();
  // Reset scan state when project changes
  setScanStatus('idle');
  setScanResult(null);
}, [loadTemplates]);

// Scan only happens via handleScan() triggered by button click
```

### Pattern 4: Scan Progress Tracking
**What:** Track file-level progress during scanning to show "Scanning... 3/10 files".
**When to use:** During the POST scan operation.
**Example:**
```typescript
// Option A: Return progress via streaming (complex, overkill for <20 files)
// Option B: Track client-side by breaking scan into per-file API calls (adds latency)
// RECOMMENDED Option C: Set total count before scan, update on completion
const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);

// In handleScan, we know file count from the discover step
// But since discovery + parse happen in one API call, simplest approach:
// Show indeterminate progress during scan, show results in toast after
```

### Anti-Patterns to Avoid
- **Creating ts-morph Project per file:** Each `new Project()` allocates a TypeScript compiler instance. Creating 10 of these in sequence wastes memory and slows the scan.
- **Using useEffect for side-effects triggered by user action:** Scanning is a user action, not a render effect. UseEffect for this causes cascading re-renders.
- **Deleting DB rows based on partial scan results:** If 3/10 files fail to parse, `deleteStale` with only 7 IDs deletes the 3 templates from failed files -- silent data loss.
- **Inline path normalization:** Every `.replace(/\\/g, '/')` is a bug waiting to happen if one location is missed. Use the centralized utility.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Path normalization | Inline `.replace(/\\/g, '/')` | `normalizePath()` from `src/utils/pathUtils.ts` | Already exists, tested, handles edge cases |
| Toast notifications | Custom notification system | `toast` from `@/stores/messageStore` | Already exists with success/error/warning/info types |
| Content hashing | Custom hash function | `computeContentHash()` from parser.ts | Already exists, uses SHA-256 |
| DB upsert logic | Custom INSERT OR REPLACE | `discoveredTemplateRepository.upsert()` | Already handles change detection |

## Common Pitfalls

### Pitfall 1: ts-morph Source File Accumulation
**What goes wrong:** Even with a reused Project, adding source files without removing them causes the Project's internal file map to grow unboundedly.
**Why it happens:** `project.addSourceFileAtPath()` adds to internal state. If never removed, parsing 100 files means 100 source files held in memory.
**How to avoid:** Call `project.removeSourceFile(sourceFile)` after extracting configs from each file.
**Warning signs:** Memory usage grows linearly with number of files scanned.

### Pitfall 2: useCallback Dependency Chains Causing Re-renders
**What goes wrong:** `handleScan` depends on `projectPath` and `loadTemplates`. `loadTemplates` depends on `projectPath`. If `loadTemplates` identity changes, `handleScan` identity changes, which can trigger useEffect.
**Why it happens:** React recreates callbacks when dependencies change. Chained dependencies amplify this.
**How to avoid:** By removing the auto-scan useEffect entirely (per user decision), this chain is broken. The remaining `loadTemplates` useEffect is safe because it only fetches cached data.
**Warning signs:** Console shows repeated API calls on project switch.

### Pitfall 3: Empty currentTemplateIds Array in markStale
**What goes wrong:** If ALL files fail to parse, `currentTemplateIds` is empty. The current `deleteStale` with empty array deletes ALL templates for the project.
**Why it happens:** Line 217-219 of repository: `if (currentTemplateIds.length === 0) { return deleteBySourcePath(sourcePath); }`.
**How to avoid:** Change the guard: if `currentTemplateIds` is empty AND there were parse errors, skip stale marking entirely. Only mark stale when the scan is fully successful or the successfully-parsed set is non-empty.
**Warning signs:** All templates disappear after a scan where every file had parse errors.

### Pitfall 4: Path Normalization Before DB Lookup
**What goes wrong:** `getBySourcePath('C:\\Users\\...')` returns no results because DB stores `'C:/Users/...'`.
**Why it happens:** Windows paths use backslashes by default. If normalization is missed before a DB query, the lookup fails silently.
**How to avoid:** Normalize paths at the API boundary (route handler entry point) before any DB operations.
**Warning signs:** Templates appear to not exist after scanning, or duplicates appear with different path formats.

### Pitfall 5: Migration Column Defaults
**What goes wrong:** Adding `status` column without a default breaks existing rows.
**Why it happens:** `ALTER TABLE ADD COLUMN` without `DEFAULT` leaves existing rows with NULL.
**How to avoid:** Always use `DEFAULT 'active'` (or similar) when adding columns. Per project CLAUDE.md pattern: new columns MUST be nullable or have defaults.
**Warning signs:** Query errors or unexpected NULLs after migration.

## Code Examples

### Current Bug: ts-morph Project per File (parser.ts:43-49)
```typescript
// BUG: Creates new Project() for EVERY file in the scan
export async function parseTemplateConfig(filePath: string): Promise<ParseResult> {
  // ...
  const project = new Project({  // <-- NEW instance each call
    compilerOptions: { allowJs: true, skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFile = project.addSourceFileAtPath(filePath);
  // ...
}
```

### Current Bug: Auto-scan useEffects (TemplateDiscoveryPanel.tsx:262-272)
```typescript
// BUG: Two useEffects that cascade on project switch
useEffect(() => {
  loadTemplates();  // Triggers on loadTemplates identity change
}, [loadTemplates]);

useEffect(() => {
  if (projectPath && projectPath !== lastScannedProjectRef.current) {
    lastScannedProjectRef.current = projectPath;
    handleScan();  // Auto-scans on EVERY project switch
  }
}, [projectPath, handleScan]);
```

### Current Bug: Stale Deletion on Partial Failure (route.ts:123-128)
```typescript
// BUG: currentTemplateIds only contains SUCCESSFULLY parsed templates
// Failed files' existing templates get deleted as "stale"
const currentTemplateIds = templates.map(t => t.templateId);
const deletedCount = discoveredTemplateRepository.deleteStale(normalizedPath, currentTemplateIds);
```

### Current Bug: Inline Path Normalization (6 locations in template-discovery)
```typescript
// In route.ts:69
const normalizedPath = projectPath.replace(/\\/g, '/');
// In route.ts:100
file_path: parseResult.filePath.replace(/\\/g, '/'),
// In scanner.ts:31, 67, 81
const normalized = relativePath.replace(/\\/g, '/');
// In TemplateDiscoveryPanel.tsx:77
const data = await getTemplates(projectPath.replace(/\\/g, '/'));
```

### Migration Example: Add Status Column
```typescript
// 071_template_status.ts
import { once } from './migration.utils';

export const m071_template_status = once('m071', (db) => {
  db.exec(`
    ALTER TABLE discovered_templates
    ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  `);
  db.exec(`
    ALTER TABLE discovered_templates
    ADD COLUMN parse_error TEXT DEFAULT NULL
  `);
});
```

### Toast Pattern (existing in project)
```typescript
import { toast } from '@/stores/messageStore';

// After scan completes:
toast.success(
  'Scan Complete',
  `${successCount} templates found, ${errorCount} errors`
);
// Or on error:
toast.error('Scan Failed', error.message);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `deleteStale()` removes rows | `markStale()` sets status column | This phase | No data loss on partial scans |
| Auto-scan on project switch | Manual scan button only | This phase | Eliminates infinite re-render bug |
| New ts-morph Project per file | Single Project reused across batch | This phase | Memory stays constant during scan |
| Inline `.replace(/\\/g, '/')` | Centralized `normalizePath()` | This phase | Single source of truth for path handling |

## Open Questions

1. **Scan progress granularity**
   - What we know: User wants "Scanning... 3/10 files" progress display. The current API does discovery + parsing in a single POST call.
   - What's unclear: Whether to split into two API calls (discover then parse-per-file) or use SSE/streaming for progress, or simply show indeterminate spinner during API call and file count in the toast result.
   - Recommendation: Keep single API call (simpler). Show "Scanning..." indeterminate state during the call, then show results in toast. The scan of ~10 files takes <2 seconds -- progress bar adds complexity for minimal UX gain. If the user insists on per-file progress, use Server-Sent Events.

2. **Non-template projects**
   - What we know: Some projects won't have `src/templates/`. User left this to Claude's discretion.
   - What's unclear: Should we show an info message, skip silently, or disable the scan button?
   - Recommendation: After scan finds 0 files, show a toast info message: "No template files found in src/templates/". Keep the scan button always enabled -- the user might want to re-scan after adding templates.

3. **Stale template visual indicator**
   - What we know: Stale templates should be visible with some indicator. Error badges use red.
   - What's unclear: Exact visual treatment for stale vs error vs active states.
   - Recommendation: Use muted/dimmed card with a yellow "Stale" badge (similar pattern to error's red badge). Include a small "Remove" action on stale cards for manual cleanup.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | ts-morph Project reused across file scans | unit | `npx vitest run tests/unit/template-discovery/parser.test.ts -x` | No - Wave 0 |
| PIPE-02 | No auto-scan useEffect on project switch | unit | `npx vitest run tests/unit/template-discovery/panel.test.ts -x` | No - Wave 0 |
| PIPE-03 | All template-discovery files use normalizePath() | unit | `npx vitest run tests/unit/template-discovery/path-normalization.test.ts -x` | No - Wave 0 |
| PIPE-04 | Stale cleanup skipped on partial failure | unit | `npx vitest run tests/unit/template-discovery/stale-cleanup.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit/template-discovery/ -x`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/template-discovery/parser.test.ts` -- covers PIPE-01 (Project reuse, sourceFile cleanup)
- [ ] `tests/unit/template-discovery/stale-cleanup.test.ts` -- covers PIPE-04 (markStale behavior, empty array guard)
- [ ] `tests/unit/template-discovery/path-normalization.test.ts` -- covers PIPE-03 (verify normalizePath usage)
- [ ] `tests/unit/template-discovery/` directory -- needs creation

Note: PIPE-02 (useEffect removal) is best verified by code review and manual testing rather than unit test, since testing React hooks with useEffect removal requires a full component test environment. A simple smoke test that the component renders without triggering scans would suffice.

## Sources

### Primary (HIGH confidence)
- Direct source code analysis of `src/lib/template-discovery/parser.ts` (lines 43-49 -- Project creation bug)
- Direct source code analysis of `src/app/features/Integrations/sub_TemplateDiscovery/TemplateDiscoveryPanel.tsx` (lines 262-272 -- useEffect bug)
- Direct source code analysis of `src/app/api/template-discovery/route.ts` (lines 123-128 -- deleteStale bug)
- Direct source code analysis of `src/app/db/repositories/discovered-template.repository.ts` (lines 214-232 -- deleteStale implementation)
- Direct source code analysis of `src/utils/pathUtils.ts` -- existing normalizePath utility
- `src/stores/messageStore.ts` -- existing toast API

### Secondary (MEDIUM confidence)
- ts-morph memory management: Project.removeSourceFile() is standard practice for long-lived Project instances (verified in ts-morph documentation patterns)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all dependencies already in project, no new libraries needed
- Architecture: HIGH - bugs are clearly identified with specific line numbers, fixes are straightforward
- Pitfalls: HIGH - pitfalls derived from direct code analysis of actual bugs
- Validation: MEDIUM - test files need creation, testing React component behavior (PIPE-02) is harder to automate

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain, no external dependency changes expected)
