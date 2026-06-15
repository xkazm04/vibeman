# Manager & Directions — Feature + UI Scan
> Context: Manager & Directions | Group: Core Development Engine
> Scanners: feature-scout 🔍 + ui-perfectionist 🎨 (combined)
> Total: 5 findings (3 feature / 2 ui) | Priority: 0crit/3high/2med/0low
> Files read: ~17

## 1. "Implement with AI" path is dead in the main review flow
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: functionality
- **File(s)**: src/app/features/Manager/ManagerLayout.tsx:261-270, src/app/features/Manager/components/ImplementationLogDetail.tsx:134, src/app/features/Manager/components/ImplementationProposalBridge.tsx:292-300
- **Current state**: The proposal bridge exposes an "Implement with AI" button gated behind `showImplementWithAI={!!onTriggerClaudeCode}`. `ImplementationLogDetail` only forwards `accepted-with-code` actions when `onTriggerClaudeCode` is supplied, otherwise it silently downgrades to `onRequirementCreated` (ImplementationLogDetail.tsx:42-46). But `ManagerLayout` renders `ImplementationLogDetail` without passing `onTriggerClaudeCode` at all (line 263-270), so the AI-implement button never renders and the whole code-trigger branch is dead in the primary Manager UI.
- **Opportunity**: Wire a real `onTriggerClaudeCode` handler in `ManagerLayout` that creates the requirement file from proposal content and kicks off a Claude Code session (the codebase already has `generateRequirementFile`/`acceptImplementation` in `@/lib/tools` and `/api/directions/generate` writes `.claude/commands/*.md`). `handleRequirementCreated` (line 128-131) is currently a documented no-op — give it teeth.
- **Value**: Restores the headline "review → one-click autonomous fix" loop that Vibeman is built around; right now the most valuable action on the review screen is invisible.
- **Effort**: 3
- **Implementation sketch**: In `ManagerLayout`, add `onTriggerClaudeCode={(name, content) => { writeRequirement(content); triggerClaudeCode(name); }}` to the `ImplementationLogDetail` JSX; reuse the requirement-write + session-trigger logic already present in NewTaskInputPanel/`@/lib/tools`; surface a toast in `handleRequirementCreated`.

## 2. Improvement proposals are static templates, not AI-generated
- **Lens**: 🔍 feature-scout
- **Priority**: high
- **Category**: feature
- **File(s)**: src/app/features/Manager/lib/proposalAdapter.ts:23-40, 89-107, 120-143
- **Current state**: `generateProposalsFromLog` always emits the same four boilerplate proposals (test / documentation / optimization / refactor) with fixed `rationaleTemplate` strings (proposalAdapter.ts:23-40). The "rationale" just concatenates the canned template with the log overview/bullets (generateRationale, lines 58-81). Every implementation log gets an identical, generic set of suggestions regardless of what actually changed — and the project already has `generateAdvisorSuggestion` + a full LLM advisor stack (`llmHelpers`, `promptTemplates.ts` ADVISOR_INSTRUCTIONS) used elsewhere in the same module.
- **Opportunity**: Replace (or augment) the template generator with an LLM call that reads the log's overview/bullets/diff and proposes 2-4 *specific* follow-ups ("add a debounce to the search handler in X", not "Optimize performance of Y"). Reuse the existing advisor prompt infrastructure so this is mostly wiring.
- **Value**: Turns a cosmetic suggestion carousel into genuinely useful next-step recommendations, directly feeding the autonomous-dev loop with high-signal requirements instead of generic filler.
- **Effort**: 4
- **Implementation sketch**: Add `generateProposalsFromLogAI(log, provider)` that posts to the existing advisor endpoint with a prompt built from `ADVISOR_INSTRUCTIONS`; in `ImplementationProposalBridge` (line 58) initialize proposals from the AI call with the template output as a synchronous fallback while the request resolves.

## 3. Direction hypothesis assertions are generated and validated server-side but never surfaced in UI
- **Lens**: 🔍 feature-scout
- **Priority**: med
- **Category**: user_benefit
- **File(s)**: src/app/api/directions/[id]/validate/route.ts:23-56, src/app/api/directions/generate/route.ts:174-176, src/app/db/repositories/direction-outcome.repository.ts:118-159
- **Current state**: The generate prompt instructs Claude to attach machine-verifiable `hypothesis_assertions` to every direction (generate/route.ts:174-176), `direction_outcomes` records execution results (lines_added, files_changed, was_reverted, etc.), and `/api/directions/[id]/validate` runs `validateAssertions` against the outcome. A repo-wide grep shows **zero `.tsx` consumers** of `/validate`, `hasAssertions`, or `validateAssertions` — the entire "did this direction deliver what it promised?" feedback loop is invisible to users.
- **Opportunity**: Surface assertion pass/fail on accepted directions (a "Hypothesis: 3/4 checks passed" badge + expandable list) in the Manager/Proposals review surfaces, and optionally auto-call `/validate` after an outcome is recorded.
- **Value**: Closes the strategic-direction accountability loop — users see whether AI-implemented directions actually met their own success criteria, which is the differentiator the prompt invests heavily in.
- **Effort**: 3
- **Implementation sketch**: Add a `DirectionValidationBadge` that GETs `/api/directions/[id]/validate`, render it in `DirectionCarousel`'s accepted/outcome view (DirectionCarousel.tsx) and on accepted direction detail; trigger a validate call from the outcome-completion handler.

## 4. Manager header stats use dynamic Tailwind color classes that get purged
- **Lens**: 🎨 ui-perfectionist
- **Priority**: med
- **Category**: maintenance
- **File(s)**: src/app/features/Manager/components/ManagerHeader.tsx:174-184
- **Current state**: The inline stats build class names by interpolation: `` className={`text-lg font-bold text-${stat.color}-400 font-mono`} `` with `color` values `'cyan' | 'emerald' | 'amber' | 'purple'` (lines 174-184). Tailwind cannot see `text-cyan-400` etc. as literal strings at build time, so these classes are JIT-purged unless they happen to appear elsewhere — the four stat numbers can silently render with no color (inheriting gray), defeating the intended visual hierarchy/at-a-glance scanning of the stat row.
- **Opportunity**: Map each stat to a complete, statically-analyzable class string so the colors reliably render and the hierarchy reads.
- **Value**: Reliable color-coded stats restore the quick visual scan ("how many across projects / with context"); also removes a class of "works in dev, breaks in prod build" bugs.
- **Effort**: 1
- **Implementation sketch**: Change the stat objects to carry a full class, e.g. `{ label:'Total', value, cls:'text-cyan-400' }`, and use `className={\`text-lg font-bold font-mono ${stat.cls}\`}`; safe-list nothing dynamic.

## 5. Implementation log cards/modal/grid have no loading or per-card busy states for accept actions
- **Lens**: 🎨 ui-perfectionist
- **Priority**: high
- **Category**: ui
- **File(s)**: src/app/features/Manager/ManagerLayout.tsx:105-121, src/app/features/Manager/components/UserInputPanel.tsx:61-83, src/app/features/Manager/components/ManagerCardGrid.tsx:33-49
- **Current state**: `handleAccept` (ManagerLayout.tsx:105-121) awaits `acceptImplementation` then optimistically removes the card, but the Accept/Propose buttons in `UserInputPanel` (lines 67-82) have no `disabled`/spinner state during the in-flight request — unlike the directions carousel which has full `isProcessing` + `Loader2` affordances. A slow accept lets users double-click Accept or hit Propose mid-request, and the card grid shows no skeleton while `loading` (ManagerLayout only shows a single centered spinner for the whole page, line 153-160). The detail modal's Accept likewise gives no feedback until the card vanishes.
- **Opportunity**: Add a local `isAccepting` state to `UserInputPanel`/`ImplementationLogDetail` that disables both buttons and shows a spinner on Accept (mirroring `DirectionCarousel`'s pattern), and render lightweight card skeletons in `ManagerCardGrid` during initial load.
- **Value**: Prevents duplicate-accept races and dead-feeling clicks on the highest-frequency action in the module; brings Manager up to the interaction-feedback bar already set by the Directions carousel.
- **Effort**: 2
- **Implementation sketch**: In `UserInputPanel`, wrap `onAccept` in `const [busy,setBusy]=useState(false)`, set around the await, and pass `disabled={busy}` + conditional `<Loader2 className="animate-spin"/>` to both buttons; add a `count`-based skeleton branch to `ManagerCardGrid` keyed off a new `loading` prop.
