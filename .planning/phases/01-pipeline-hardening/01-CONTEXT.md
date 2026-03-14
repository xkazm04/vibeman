# Phase 1: Pipeline Hardening - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix scanning correctness bugs: ts-morph memory leaks, useEffect infinite re-renders, path normalization fragmentation, and stale template cleanup safety. No new features — this phase makes the existing pipeline reliable before building on it.

</domain>

<decisions>
## Implementation Decisions

### Scan trigger behavior
- Manual scan only — remove auto-scan useEffect entirely
- User clicks "Scan" button to trigger scanning
- No scanning on project switch — eliminates the infinite loop risk at the source
- Show scan progress with file count: "Scanning... 3/10 files"

### Non-template projects
- Claude's discretion — pick the best approach for handling projects without `src/templates/`

### Stale cleanup policy
- Mark as stale instead of deleting — templates no longer found in scan get flagged as "stale" in DB
- User can see stale templates and manually clean up
- On partial parse failure: upsert the successfully parsed templates, flag failed ones with error state
- Never silently delete valid template records

### Error visibility
- Inline error badges on failed template cards — red badge with tooltip showing parse error details
- Toast notification after scan completes: "10 templates found, 3 errors" that auto-dismisses
- No persistent scan result banner — toast is sufficient

### Path handling
- Use existing `normalizePath()` from `src/utils/pathUtils.ts` everywhere — replace all 6 inline `replace(/\\/g, '/')` calls
- Store paths in database always with forward slashes — normalize before any DB write
- Consistent cross-platform path handling

### Claude's Discretion
- ts-morph Project instance lifecycle (reuse strategy, disposal timing)
- Exact toast notification implementation
- Error badge visual design within existing dark theme
- Stale template visual indicator design

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/utils/pathUtils.ts`: `normalizePath()`, `pathsMatch()`, `joinPath()` — should replace all inline path normalization
- `src/app/db/repositories/discovered-template.repository.ts`: `upsert`, `upsertMany`, `deleteStale`, `getBySourcePath` — needs `markStale` and error state support added
- `src/lib/template-discovery/scanner.ts`: `discoverTemplateFiles()` — working, needs path normalization via pathUtils
- `src/lib/template-discovery/parser.ts`: `parseTemplateConfig()`, `parseTemplateConfigs()` — needs ts-morph Project reuse fix

### Established Patterns
- Repository pattern for all DB access (`src/app/db/repositories/`)
- `useCallback` + `useEffect` for data loading in panels
- Toast notifications exist in the app (standard pattern)
- `server-only` imports for filesystem operations

### Integration Points
- `POST /api/template-discovery` (route.ts:123-128) — stale cleanup logic lives here, needs safety fix
- `TemplateDiscoveryPanel.tsx:262-272` — two useEffects to remove/simplify for manual-only scanning
- `parser.ts:43-49` — ts-morph Project creation to lift and reuse
- 6 locations with inline path normalization to replace with pathUtils import

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard bug-fix and hardening approaches apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-pipeline-hardening*
*Context gathered: 2026-03-14*
