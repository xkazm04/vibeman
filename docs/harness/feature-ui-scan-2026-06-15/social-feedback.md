# Social Feedback System — Feature + UI Scan
> Context: Social Feedback System | Group: Social & Integrations
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/2high/3med/0low
> Files read: ~12

> **CRITICAL MANIFEST DRIFT.** Every file listed for this context in `_contexts.json`
> (`ctx_1770495741633_y8a1sl9`) has been **deleted from the working tree**. The entire
> `src/app/features/Social/` React module (~60 components) and all `src/app/api/social/*`
> routes were removed in commit `3f81b889` ("headless-slim") with earlier deletions in
> `9653fcbc` ("D10 audit"). No `Social` feature dir, no `api/social` dir, no
> `social-config.repository.ts`, no `social-config.types.ts` exist today.
> What survives is a trail of **orphaned references** to the deleted module. Because no
> live source remains, all 5 findings are grounded in the *surviving remnants* and the
> drift itself, not in the (nonexistent) feature. This is the highest-signal outcome the
> scan can produce for this context.

## 1. Orphaned Tauri commands query dropped SQLite tables (will fail at runtime)
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src-tauri/src/commands/social_cmds.rs:16-45, src-tauri/src/lib.rs:133-135, src-tauri/src/commands/mod.rs:12
- **Current state**: `get_social_configs` and `get_social_discoveries` are still registered Tauri commands. They run `SELECT * FROM social_configs` / `social_discoveries`, but those tables no longer exist — `schema.ts` has zero `social` matches and migration helpers `migrateSocialChannelConfigs/...` (index.ts:4200-4202) are now empty `/* already applied */` stubs. No TS code invokes these commands (zero callers in `src/`). They are a dead IPC surface that throws "no such table" if ever called.
- **Opportunity**: Remove the two `social_*` commands from `social_cmds.rs`, drop their entries from `lib.rs:134-135` invoke_handler, and delete the now-stub migrations m047-m049 to make the schema honest.
- **Value**: Eliminates a runtime-error footgun and ~30 lines of misleading dead IPC; keeps the Rust/SQLite contract truthful, which matters for the desktop build's reliability.
- **Effort**: 1
- **Implementation sketch**: Delete `get_social_configs`/`get_social_discoveries` fns; remove their two lines from the `tauri::generate_handler![]` block in lib.rs; collapse the three social migration stubs. `cargo check` to confirm no other references.

## 2. HallOfFame showcase advertises source paths to deleted Social files
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: maintenance
- **File(s)**: src/app/features/HallOfFame/lib/showcaseRegistry.ts:1234-1240, 1262-1269; src/app/features/HallOfFame/components/PreviewModal.tsx:199
- **Current state**: The component gallery still ships two "SocialLayout" entries — `SLABadge` and `AIProcessingPanel` — whose `codeSnippet` says `import { SLABadge } from '@/app/features/Social/components/sla/SLABadge'` and whose `sourcePath` is `src/app/features/Social/components/sla/SLABadge.tsx`. Those files were deleted. PreviewModal.tsx:199 renders `{component.sourcePath}` verbatim to the user, so the gallery literally displays (and the copyable snippet imports) a path that no longer resolves. The inline previews (`SLABadgePreview`, `AIProcessingPanelPreview` in FeaturePreviews.tsx:755+) are self-contained re-implementations, so the cards still *render* — masking that the advertised source is dead.
- **Opportunity**: Either (a) re-point `sourcePath`/`codeSnippet` to where these reusable atoms should live now (they are good components — see finding #4), or (b) remove the two registry entries + their preview mappings if Social is gone for good.
- **Value**: A component showcase whose "copy import" / "view source" lies erodes trust in the whole design-system tool; fixing it restores the gallery's core promise (browse → copy a working import).
- **Effort**: 1
- **Implementation sketch**: Grep `@/app/features/Social` in `showcaseRegistry.ts`; for each of the 2 entries, update `sourcePath`+`codeSnippet` to the new home, or delete the entry and its `*Preview` export from `previews/index.ts:71-72`.

## 3. Dead Social env-config getters with hardcoded default secret
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/lib/config/envConfig.ts:325-333
- **Current state**: `envConfig.socialEncryptionSecret()` and `grokApiKey()` survive under a "Social & Discovery" section, but have **zero callers** anywhere in `src/` (only their own definitions match). `socialEncryptionSecret` even bakes in a fallback literal `'vibeman-social-config-2024'` — a dead default secret advertised in a config surface users may copy into `.env`.
- **Opportunity**: Remove the orphaned getters (and the "Social & Discovery" comment block) so the centralized env config reflects only live consumers; drop `SOCIAL_ENCRYPTION_SECRET`/`GROK_API_KEY` from any `.env.example` if present.
- **Value**: Keeps the validated-config layer (a deliberate architectural investment) free of phantom keys, so new contributors don't wire up secrets for a feature that doesn't exist.
- **Effort**: 1
- **Implementation sketch**: Delete lines 325-333; grep repo + `.env*` for `GROK_API_KEY`/`SOCIAL_ENCRYPTION_SECRET` to confirm no live use before removing.

## 4. Salvage the orphaned Social UI atoms into the shared design system
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: ui
- **File(s)**: src/app/features/HallOfFame/components/previews/FeaturePreviews.tsx:755-840 (SLABadgePreview, AIProcessingPanelPreview)
- **Current state**: The deleted Social module contained genuinely reusable, polished atoms — an SLA/status badge with pulse animation across 4 severities and an AI-processing panel with 4 gradient states. Their *only* surviving form is the self-contained preview re-implementations in FeaturePreviews.tsx (which still animate correctly). Vibeman has many other surfaces that need a status-severity badge (scan-queue states, build-fixer, debt health, task status) and an "AI is processing" affordance (context generation, blueprint scans, ideas eval) — these are currently re-rolled per feature.
- **Opportunity**: Promote `SLABadge` (ok/warning/critical/overdue) and `AIProcessingPanel` (idle/processing/success/error) into `src/components/ui/` as canonical primitives, sourced from the surviving preview code, and re-point the showcase entries (finding #2) at them.
- **Value**: Recovers two well-designed, animation-complete primitives from the deletion and standardizes status + AI-progress affordances that are reinvented across Scan Queue, Build Fixer, and Context Generation — directly serving visual consistency.
- **Effort**: 2
- **Implementation sketch**: Extract the JSX/style maps from `SLABadgePreview`/`AIProcessingPanelPreview` into `src/components/ui/StatusBadge.tsx` and `AIProcessingPanel.tsx` with typed props; swap ad-hoc status pills in scan-queue/build-fixer UIs to the new primitive incrementally.

## 5. Self-validate context manifests against the filesystem to surface drift
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: feature
- **File(s)**: docs/harness/feature-ui-scan-2026-06-15/_contexts.json:420-445 (this context); src/app/api/contexts/route.ts; src/app/features/Context/lib/contextUtils.ts
- **Current state**: This context's manifest lists 17 file paths, **100% of which 404** against the working tree, yet nothing flagged it. Vibeman's core primitive is organizing code into contexts (`contexts` table + Context feature), and its health-scan flow scans contexts — but there is no guard that a context's `files[]` still exist. Stale manifests silently feed bad scope to every downstream consumer (health scans, idea scanners, this audit harness).
- **Opportunity**: Add a lightweight "context file integrity" check — on context load or health scan, resolve each `files[]` entry against disk (glob for dir entries like `src/app/features/Social/`), and surface a "N missing files / stale context" badge with a one-click "prune missing paths" action.
- **Value**: Prevents exactly this failure mode (an entire deleted feature lingering as a tracked context) from corrupting every scan and orchestration that trusts the manifest — high leverage for an autonomous-dev tool whose decisions are only as good as its context map.
- **Effort**: 3
- **Implementation sketch**: In the contexts API/health path, run `fs.existsSync`/glob over each `files[]` entry, store a `missingFiles` count on the context, render it in `ContextHealthIndicator`, and add a `pruneMissingFiles` mutation that strips dead paths.
