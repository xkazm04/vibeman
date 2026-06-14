# Manager & Directions — bug-hunter + ui-perfectionist scan

> Context: Manager & Directions
> Total: 5 findings (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. "Accept with Code" button is identical to plain "Accept" — code path never differs
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: dead-action / wrong-behavior
- **File**: src/app/features/Proposals/components/DirectionCarousel.tsx:334 and :344
- **Scenario**: A user reviewing a direction sees two distinct right-side buttons: a purple `<Code>` button titled "Accept with Code" and a green `<Check>` button titled "Accept". Both `onClick` handlers call the exact same `actions.accept()`. The carousel hook exposes a separate `acceptWithCode` action (useCarousel.ts:93 / useProposals.ts:121) with its own `onAcceptWithCode` callback and a different delay, but `DirectionCarousel` never wires it up — it only receives `onAccept`/`onReject` props (lines 19-22) and has no `onAcceptWithCode` at all.
- **Root cause**: The "Accept with Code" affordance was added to the UI but the distinct behavior (trigger Claude Code execution vs. just mark accepted) was never plumbed through `DirectionCarousel`'s props or the parent.
- **Impact**: A prominent, visually-distinct action silently does the wrong thing. Users who deliberately pick "Accept with Code" expecting an implementation session get the same result as a plain accept — success theater. The "Accept with Code" route exists conceptually (ImplementationProposalBridge has `accepted-with-code`) so the omission is a real regression, not a non-feature.
- **Fix sketch**: Add an `onAcceptWithCode` prop to `DirectionCarouselProps`, pass it into `useCarousel`'s `onAcceptWithCode`, and change the `<Code>` button's `onClick` to `actions.acceptWithCode()`. If "with code" isn't supported yet, remove the second button to avoid the lie.

## 2. ProposalPanel always renders three hardcoded mock proposals
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: success-theater / stale-data
- **File**: src/app/features/Proposals/components/ProposalPanel.tsx:19-27
- **Scenario**: `ProposalPanel` calls `useProposals()` with **no arguments**. In `useProposals` (useProposals.ts:54), `usingRealData` is `directionProposals.length > 0`, but `options?.directions` is `undefined`, so `directionProposals` is always `[]` and `usingRealData` is always `false`. The panel therefore renders the three hardcoded `mockProposals` ("Implement automated testing pipeline…", "Optimize database queries…", "Refactor component architecture…", useProposals.ts:22-44) for every project, and `acceptProposal`/`declineProposal` fire `undefined` callbacks (the real-data branch is skipped).
- **Root cause**: `ProposalPanel` was never updated to receive/forward real directions and accept/decline handlers; the mock fallback masks the missing wiring instead of failing loudly.
- **Impact**: If `ProposalPanel` is mounted anywhere user-facing, it shows fabricated proposals that look real, and accepting them does nothing (no API call). This is the worst kind of silent failure — the UI looks functional. At minimum it is dead/misleading code shipping in a feature module.
- **Fix sketch**: Have `ProposalPanel` accept `directions` + `onAccept/onAcceptWithCode/onDecline` props and pass them to `useProposals`. If the panel is unused/superseded by `DirectionCarousel`, delete it and its mock data rather than leaving a mock-only component exported from the barrel.

## 3. proposalAdapter call passes projectPath where contextDescription is expected
- **Severity**: High
- **Lens**: bug-hunter
- **Category**: argument-misuse / data-leak-into-text
- **File**: src/app/features/Manager/components/ImplementationProposalBridge.tsx:56 and :65 (vs. proposalAdapter.ts:120-143)
- **Scenario**: `generateProposalsFromLog(implementationLog, projectPath)` is called in two places. The adapter's second parameter is `contextDescription` (proposalAdapter.ts:122), and when present it is appended verbatim to every proposal's rationale as `"\n\nAdditional context: ${contextDescription}"` (line 132). So a Windows path like `C:\Users\kazda\kiro\vibeman` gets injected into the proposal body the user reads and into the requirement file content generated from it.
- **Root cause**: Parameter mismatch — the caller treats arg 2 as "project path for context" but the adapter treats it as a human-readable context description. No type error because both are `string`.
- **Impact**: Every generated improvement proposal shows a raw filesystem path as "Additional context," and if accepted, that path is written into the requirement markdown — leaking the local absolute path and producing nonsensical, lower-quality requirements fed to Claude Code.
- **Fix sketch**: Drop the second argument (`generateProposalsFromLog(implementationLog)`) or pass a real context description (e.g., `implementationLog.context_name`). Do not pass `projectPath` here.

## 4. getDirectionPair returns A/B by label but loads incomplete/orphaned pairs as full pairs elsewhere
- **Severity**: Medium
- **Lens**: bug-hunter
- **Category**: state-corruption / partial-write
- **File**: src/app/db/repositories/direction.repository.ts:662-675 (getDirectionPair) and the create flow in src/app/api/directions/route.ts:53-87
- **Scenario**: Paired directions are created by Claude Code via **two independent POST requests** (generate/route.ts:301-339 instructs two separate `curl` calls sharing a `pair_id`). If the second POST fails, times out, or the session is interrupted, the DB holds a single direction with a `pair_id` and `pair_label:'A'` and no sibling. `getDirectionPair` (line 662) then returns `{ directionA: <row>, directionB: null }`. Consumers that assume both halves exist (e.g. the pair DELETE route reads `pair.directionA?.project_id || pair.directionB?.project_id`, pair/[pairId]/route.ts:20 — safe; but `acceptPairedDirection` and the carousel's "Alternative" panel, DirectionCarousel.tsx:134-135, silently render nothing for the missing sibling) get a half-pair with no signal that it's broken.
- **Root cause**: Pair creation is non-atomic (two HTTP calls, no transaction) but reads assume atomicity. There is no validation that exactly two rows share a `pair_id` before treating them as a pair.
- **Impact**: Orphaned half-pairs accumulate. `getPendingDirectionsGrouped` (line 720) does demote `length !== 2` to singles, but `getDirectionPair`/`acceptPairedDirection` do not — accepting a half-pair "rejects the other" against zero rows, and the user can never see/triage the lone variant as part of a comparison.
- **Fix sketch**: Add a `pair_index` row count check (or a single batch endpoint that writes both variants in one transaction). In `getDirectionPair`, surface `isComplete: results.length === 2` so callers can handle orphans explicitly.

## 5. Map view "All Changes" panel shows full grid but always hints "Select a group to filter"
- **Severity**: Medium
- **Lens**: ui-perfectionist
- **Category**: empty-state / confusing-copy
- **File**: src/app/features/Manager/ManagerLayout.tsx:223-236
- **Scenario**: In Map view with no group selected, `filteredLogs` equals the full `implementationLogs` list (filteredLogs memo, lines 98-103, only filters when `selectedGroupId` is set). The right panel header reads "All Changes" and the count shows the real total, and the card grid renders all logs. But the empty-branch copy (line 233) — only reached when `filteredLogs.length === 0` — says "Select a group to filter" when `selectedGroupId` is null. So when a project genuinely has zero untested logs, the Map view tells the user to "Select a group to filter" even though grouping is irrelevant and there is simply nothing to review. (Note: ManagerLayout only renders content when `implementationLogs.length > 0` at line 170, so this empty branch fires specifically when a selected group has items elsewhere but the all-view filter still yields zero — an inconsistent, misleading instruction.)
- **Root cause**: The empty-state message conflates two distinct states ("no data at all" vs. "pick a group") into one string keyed only on `selectedGroupId`.
- **Impact**: Misleading guidance in the Map view; users are told to take an action ("Select a group") that won't surface any changes, eroding trust in the panel. Minor but it is a polish/UX-clarity defect in a primary view.
- **Fix sketch**: Differentiate copy: when `selectedGroupId` is null and `filteredLogs.length === 0`, show "No changes to review" (mirroring the global empty state) instead of "Select a group to filter"; reserve the group prompt for when a group is selected but empty.
