# Goals & Daily Standup — Feature + UI Scan
> Context: Goals & Daily Standup | Group: Core Development Engine
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3f feature / 2ui ui) | Priority: 1crit/2high/2med/0low
> Files read: ~14

## 1. Rich "Daily Mission Briefing" predictive standup is built but never rendered
- **Lens**: 🔍 feature-scout
- **Priority**: critical
- **Category**: feature
- **File(s)**: src/app/features/DailyStandup/components/PredictiveStandup.tsx:105; src/app/features/Goals/GoalsLayout.tsx:20-21 (only StandupHistoryTimeline + SprintPlannerPanel imported); src/app/api/standup/predict/route.ts
- **Current state**: `PredictiveStandup` is a fully built, API-backed component (Daily Mission Briefing, recommended task order with morning/afternoon slots, predicted blockers with confidence %, goal-transition action buttons that call `/api/goals/lifecycle`, context decay rings). It is exported but `grep` shows zero render sites anywhere in the app — the standup toggle in GoalsLayout only switches between History and SprintPlanner. The single most actionable, prescriptive surface in the whole context is dark.
- **Opportunity**: Add a third toggle state (`'briefing'`) to `AnalyticsPanels` (GoalsLayout.tsx:140-208) that renders `<PredictiveStandup projectId={projectId} />`, with a `Radar`/`Sparkles` icon button beside the existing History/Sprint toggles.
- **Value**: Surfaces the only "what should I do next" view (task ordering, at-risk goals, preventable blockers) that already exists — turning Goals from a retrospective board into the prescriptive daily command center the context is named for.
- **Effort**: 2
- **Implementation sketch**: In GoalsLayout `AnalyticsPanels`, widen `standupView` union to `'history' | 'sprint' | 'briefing'`; add a `Radar` toggle button and a third branch rendering `PredictiveStandup`. Component is self-fetching, so no prop plumbing beyond `projectId`.

## 2. No UI path to generate a standup — endpoint is unreachable from the app
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/api/standup/generate/route.ts:14 (POST handler); src/app/features/DailyStandup/components/StandupHistoryTimeline.tsx:404-405 (empty state literally says "Generate a standup to see trends here")
- **Current state**: `/api/standup/generate` (the unified retrospective+predictive pipeline) exists and is rate-limited, but a grep across `src/app/features` finds NO client caller. The history timeline's empty state instructs users to "Generate a standup," yet there is no button anywhere to do so. Standups can only appear via external/automated callers the UI never triggers, so for most users the timeline stays permanently empty.
- **Opportunity**: Add a "Generate today's standup" button to the Standup History panel header (and/or empty state) that POSTs `{ projectId, periodType: 'daily' }` to `/api/standup/generate`, then refetches history.
- **Value**: Closes the loop on a complete, already-built backend feature that is currently inert; gives users the daily AI summary the context promises instead of a dead-end empty state.
- **Effort**: 2
- **Implementation sketch**: In `StandupHistoryTimeline`, add a `generating` state + button calling `fetch('/api/standup/generate', {method:'POST', body: JSON.stringify({projectId, periodType:'daily'})})`; on success re-run `fetchHistory()`. Wire the same handler into the empty-state CTA.

## 3. AI Goal Suggestions ("Generate Goals") is unreachable from the main Goals dashboard
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/features/Goals/sub_GoalModal/components/GoalCandidatesModal.tsx:33; src/app/features/Goals/GoalsLayout.tsx:404-427 (header only has manual "+" add button); only other caller: src/app/features/Onboarding/sub_GoalDrawer/GoalReviewer.tsx:241
- **Current state**: `GoalCandidatesModal` (LLM scans repo/tech-debt/ideas/todos and proposes accept/tweak/reject goal candidates via `/api/goals/generate-candidates`) is only mounted inside the Onboarding goal drawer. The day-to-day Goals dashboard exposes solely a manual "+" create button, so after onboarding the AI candidate flow is effectively gone — the autonomous-suggestion capability is invisible during normal use.
- **Opportunity**: Add a `Sparkles` "AI Suggestions" button to the Active Goals header (next to `+` / check-in, GoalsLayout.tsx:404) that opens `GoalCandidatesModal`, refreshing the goal list on `onGoalCreated`.
- **Value**: Makes continuous AI-driven goal generation a first-class, always-available action, matching Vibeman's autonomous-dev-orchestration direction instead of burying it in first-run onboarding.
- **Effort**: 2
- **Implementation sketch**: Import `GoalCandidatesModal` into GoalsLayout; add `const [showCandidates, setShowCandidates] = useState(false)`; add a header button; render `<GoalCandidatesModal isOpen={showCandidates} onClose={...} onGoalCreated={refreshGoals} />`.

## 4. Standup visual-language helpers are triplicated and already drifting (trend labels mismatch)
- **Lens**: 🎨 ui-perfectionist
- **Priority**: medium
- **Category**: maintenance
- **File(s)**: src/app/features/DailyStandup/components/PredictiveStandup.tsx:40-59; src/app/features/DailyStandup/components/SprintPlannerPanel.tsx:30-58 (comment: "mirrored from PredictiveStandup"); src/app/features/DailyStandup/components/StandupHistoryTimeline.tsx:102-118
- **Current state**: `trendIcon`, `slotIcon`, `complexityBadge`/`complexityClass`, and the burnout/risk color maps are copy-pasted across all three standup components, and they have already diverged: PredictiveStandup's `trendIcon` keys on `accelerating`/`decelerating`/`slowing` while StandupHistoryTimeline keys on `increasing`/`decreasing`, and complexity styling exists as both a map (`complexityBadge`) and an if-chain (`complexityClass`). This guarantees inconsistent trend arrows/colors between the History and Briefing/Sprint views the user toggles between in one panel.
- **Opportunity**: Extract a shared `standupVisuals.tsx` (or `lib/standup/visuals`) exporting `trendIcon`, `slotIcon`, `complexityBadge`, `burnoutColor/Bg`, `riskColor/Bg` with one canonical trend vocabulary, and import it in all three.
- **Value**: Guarantees a single, consistent visual language across the History ↔ Sprint ↔ Briefing toggle (same arrow/color means the same thing), and removes ~120 lines of drift-prone duplication.
- **Effort**: 2
- **Implementation sketch**: Create `src/app/features/DailyStandup/lib/standupVisuals.tsx` with the union-typed helpers; normalize trend terms (map legacy `increasing`/`decreasing` to `accelerating`/`decelerating`); replace local copies in the three components with imports.

## 5. GoalEmptyState ignores the design-token palette used by the rest of the Goals dashboard
- **Lens**: 🎨 ui-perfectionist
- **Priority**: medium
- **Category**: ui
- **File(s)**: src/app/features/Goals/components/GoalEmptyState.tsx:88-196 (`text-gray-200/300/400/500`, `bg-gray-800/50`, `border-gray-700/50`, hardcoded `from-gray-900/80`); contrast with GoalsLayout.tsx:95-99 & GoalEmptyState's sibling list using `text-muted-foreground`, `text-foreground`, `bg-white/[0.03]`, `border-white/5`, `primary`
- **Current state**: The empty state — the very first thing a user sees in a fresh project — renders in raw Tailwind grays and a hardcoded `bg-gray-900` fade, while every surrounding panel (GlassCard, goal list items, check-in modal) uses the theme tokens. The "fade gradient overlay" is also `absolute` inside a non-`relative` parent (line 136), so it anchors to the wrong box. Result: the empty state visibly clashes with the themed dashboard and the fade renders in the wrong place.
- **Opportunity**: Swap `gray-*` for the theme tokens (`muted-foreground`, `foreground`, `white/[0.0x]`, `primary`) and either remove the stray fade overlay or give its wrapper `relative`; align the CTA with the `primary` accent used elsewhere.
- **Value**: A consistent, on-brand first impression for new projects and correct gradient rendering — the onboarding moment that most shapes perceived polish.
- **Effort**: 1
- **Implementation sketch**: Replace `text-gray-200/300/400/500`→`text-foreground`/`text-muted-foreground`, `bg-gray-800/50`/`border-gray-700/50`→`bg-white/[0.03]`/`border-white/5`, blue CTA→`primary`; add `relative` to the example-goals wrapper (line 103) or delete the overlay at line 136.
