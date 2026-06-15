# Reflector & Executive Analysis — Feature + UI Scan
> Context: Reflector & Executive Analysis | Group: Intelligence Layer
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 0crit/3high/2med/0low
> Files read: ~14

## 1. Actionable AI insights have nowhere to go — no "Promote to Direction/Idea" action
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/reflector/sub_Reflection/components/ExecutiveSummary.tsx:347-355 (AIInsightCard `suggestedAction`), src/app/features/reflector/sub_Reflection/components/analytics/AnalyticsStudio.tsx:420-426, src/app/db/repositories/executive-analysis.repository.ts:38-49
- **Current state**: Every AI insight carries `actionable: boolean` and a `suggestedAction` string (validated in `executive-analysis/[analysisId]/complete/route.ts:92`), and the KPI bar even counts "Actionable: N" (AnalyticsStudio.tsx:362). But `suggestedAction` is rendered as a read-only sentence with an arrow icon. There is no path from an executive insight back into vibeman's execution loop — no "Create Direction", "Queue Idea", or "Send to TaskRunner" button anywhere in the Reflector.
- **Opportunity**: Add a "Promote to Direction" / "Create Idea" button on each `actionable` insight (and on AI recommendations) that POSTs to the existing `/api/directions` or `/api/ideas` endpoints, pre-filling title/description from `insight.title` + `suggestedAction` + `evidence`, tagged with the source `analysisId`.
- **Value**: Closes the loop between the Intelligence Layer's analysis and the autonomous-dev pipeline — the entire point of vibeman. Today executive analysis is a dead-end report; users must manually re-type recommendations into the Manager. This turns reflection directly into queued work.
- **Effort**: 3
- **Implementation sketch**: In `AIInsightCard`, when `insight.actionable`, render a button → `POST /api/directions` (or `/api/ideas`) with `{ title, description: suggestedAction, evidence, sourceAnalysisId }`; show inline success state and disable after promote; persist promoted-insight IDs so the button reflects "Already promoted" on reload.

## 2. Cross-project architecture analysis is invisible in the Reflector — only lives in Overview
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/reflector/ReflectorLayout.tsx:11-15,66-67 (tabs), src/app/features/reflector/components/ReflectorViewTabs.tsx:20-25, src/app/features/reflector/sub_Dependencies/CrossContextDashboard.tsx:31 (uses idea-based `/api/ideas/cross-context-graph`), src/app/api/architecture/relationships/route.ts:38-61
- **Current state**: This context *owns* the architecture analysis API (`/api/architecture/analyze`, `/relationships`) and the cross-project-architecture repository, but the only consumer of `architecture/analyze` is `Overview/sub_WorkspaceArchitecture/ArchitectureAnalysisPanel.tsx`. The Reflector's "Context Graph" tab (`CrossContextDashboard`) renders a *different*, idea-derived graph from `/api/ideas/cross-context-graph` and never reads `/api/architecture/relationships`. The strategic cross-project map the Reflector is supposed to produce is unreachable from the Intelligence Layer UI.
- **Opportunity**: Add a "Cross-Project Architecture" view to `ReflectorViewTabs` that renders the workspace relationship graph from `/api/architecture/relationships?workspaceId=…` plus a trigger for `/api/architecture/analyze` and its latest narrative/patterns/recommendations.
- **Value**: Surfaces the executive-level architecture mapping the context is named for, in the place users go for reflection. Avoids two divergent "context graph" concepts and makes the already-built architecture agent discoverable.
- **Effort**: 3
- **Implementation sketch**: Add `cross_project` to the `ViewMode` union + TABS; create a small `CrossProjectArchitectureDashboard` that GETs `/api/architecture/relationships` (+ `/analyze?workspaceId` for latest narrative) and reuses the existing `CrossContextGraph` renderer; wire a trigger button mirroring `ArchitectureAnalysisPanel`.

## 3. Analysis history is collected but never shown — no way to compare runs over time
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: feature
- **File(s)**: src/app/db/repositories/executive-analysis.repository.ts:127-132 (`getHistory`), src/app/api/reflector/executive-analysis/route.ts:29-33 (`mode=history`), src/stores/reflectorStore.ts:139-183 (`fetchAnalysisStatus` only ever keeps `lastCompleted`)
- **Current state**: The repository implements `getHistory(projectId, limit)` and the GET route exposes `mode=history`, but no Reflector component ever calls it (grep for `history`/`getHistory` in `features/reflector/**/*.tsx` → no matches). The store only tracks `lastAnalysis`. Each new run silently overwrites the prior insights in the UI; longitudinal value (did insights improve? did a recommendation get acted on?) is thrown away.
- **Opportunity**: Add a collapsible "Analysis History" list in the AI Analysis tab that fetches `mode=history`, lets the user click a past run to view its narrative/insights, and shows run timestamps + ideas/directions analyzed counts.
- **Value**: Executive analysis becomes a trackable record instead of a volatile snapshot — users can see how the project's health narrative evolves and re-open prior recommendations they haven't yet implemented.
- **Effort**: 2
- **Implementation sketch**: Extend `reflectorStore` with `history: DbExecutiveAnalysis[]` + `fetchHistory(projectId)` calling `?mode=history`; render a timestamped list in the `ai_analysis` tab; selecting a row parses its `ai_insights`/`ai_narrative` JSON into the existing `AIAnalysisContent` view.

## 4. Analytics Studio temporal heatmap is fabricated data, not real activity
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: functionality
- **File(s)**: src/app/features/reflector/sub_Reflection/components/analytics/AnalyticsStudio.tsx:59-75 (`dailyCounts` synthesized via `Math.round((totalIdeas / 80) * dayWeight * recency)`), passed to `TemporalHeatmap` at 269-272
- **Current state**: The "Activity Heatmap" panel presents a 16-week calendar of idea-generation density, but the per-day counts are invented from a decay formula seeded only by `totalIdeas`, with an artificial weekend dampener. It looks like real historical activity and will mislead any user reading it for cadence/trend signals — a UX-harmful chart, not a cosmetic issue.
- **Opportunity**: Drive the heatmap from real `idea.created_at` timestamps. The reflector already loads ideas elsewhere; add a real daily-count aggregation (server or client) and feed actual values, or hide the panel when real daily data is unavailable rather than faking it.
- **Value**: Restores trust in the Intelligence Layer's visualizations — a fabricated trend in an "executive analytics studio" undermines every adjacent real metric. Accurate cadence data also helps users see scanning gaps.
- **Effort**: 2
- **Implementation sketch**: Add a lightweight `/api/ideas/daily-counts?projectId&contextId&days=112` (GROUP BY date(created_at)) or reuse the weekly stats source; replace the synthetic `dailyCounts` useMemo with the fetched series; render empty-state if zero rows.

## 5. Three near-identical JSON download implementations should share one exporter
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/features/reflector/components/ExportButton.tsx:56-66 (`downloadFile`) & 22-38 (`buildJsonExportData`), src/app/features/reflector/sub_Reflection/components/analytics/AnalyticsStudio.tsx:130-170 (hand-rolled Blob/anchor/`URL.revokeObjectURL` + filename stamp)
- **Current state**: `ExportButton` has a clean reusable `downloadFile` helper and dated-filename convention, but `AnalyticsStudio.handleExport` reimplements the exact Blob → anchor → click → revoke dance inline with its own `analytics-report-<date>.json` naming. The two exports diverge in filename format and neither shares loading/success feedback, so the studio export gives no confirmation toast or disabled state while `ExportButton` shows a checkmark.
- **Opportunity**: Extract a single `downloadJson(data, filenameBase)` util (and the `-YYYY-MM-DD` stamp) into a shared lib; have both call sites use it, and reuse `ExportButton`'s success-checkmark affordance for the studio export.
- **Value**: Consistent download UX (same filename pattern, same success feedback) and one place to fix bugs like missing `revokeObjectURL` or special-char filenames; reduces drift as more panels gain export.
- **Effort**: 2
- **Implementation sketch**: Create `src/lib/export/downloadJson.ts` exporting `downloadFile` + `downloadJson(obj, base)`; refactor `ExportButton.downloadFile` and `AnalyticsStudio.handleExport` to import it; add the same `success` state pattern to the studio Export button.
