# Autonomous Evaluation Plan — Runs #7-#10

Baseline established after 6 runs. The skill now has:
- Infrastructure readiness check (Run #4 lesson)
- Goal judgment log with 2 entries (1 rejected, 1 accepted)
- Harness learnings with rich structural facts
- 44 tests, clean lint, multi-page app shell

## Evaluation Protocol

For each run (#7-#10):
1. Trigger `/vibeman` with no goal
2. Let Phase 2a autonomously select
3. Execute full pipeline
4. User evaluates: was the goal selection good? Was the scope right?
5. Record verdict in `goal-judgments.md`
6. If rejected: identify what the skill missed, update SKILL.md rule

## What we're testing

- Does the Improve Engine pick the right *next* thing?
- Does backlog ranking reflect user priorities?
- Is scope right (not too small, not too large)?
- Does the skill avoid repeating Run #4's mistake (features without infrastructure)?
- Does the judgment log actually improve selection over iterations?

## Current open follow-ups (candidate pool for Improve Engine)

From harness-learnings.md:
- PDF theming parity
- Confirmation dialogs for destructive actions
- DraftsPanel BroadcastChannel optimization
- Line items drag-to-reorder
- npm-audit findings

## Success criteria

After 4 autonomous runs, the skill should:
- Accept rate >= 75% (3/4 goals accepted)
- No infrastructure misses (Run #4 type errors)
- Backlog rankings should match user's stated priorities
- Scope should be right-sized (score >= 70 on every run)
