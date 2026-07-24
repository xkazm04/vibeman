# Scan Memory — the vault contract

> Loaded by `/vibeman` Phase 1.5 (Recall) and Phase B8 / C6 (Persist). This file is the
> **schema + procedure**; it is not read during ordinary implementation work. If you are
> mid-wave fixing code, you do not need this file.

## Why this exists

Before this layer, every scan was a cold start. `ascent/docs/harness/` accumulated 17 scan
directories — `bug-ui-scan` alone ran five times over the same 44 contexts — and each run
re-derived the same ground, re-surfaced findings that had already been fixed, and re-proposed
ideas the user had already rejected. Two files in that tree (`SCAN-STATE.md`, `_SCAN-BRIEF.md`)
were invented mid-run by earlier sessions precisely because the skill had no coverage or
resume model. One of those runs died at 31/44 contexts and the next run started from context 1.

The fix is not "keep the reports" — the reports were always kept. The fix is a small, queryable
**index** that is read *at dispatch time* and injected into the scanner's prompt.

## The split: archive vs index

| | Lives in | Holds | Size |
|---|---|---|---|
| **Archive** | `PROJECT_PATH/docs/harness/<run>/` | full per-context findings reports, INDEX.md, wave summaries | MBs, grows forever |
| **Index** | `$VAULT/Scan/` | coverage heatmap, per-context finding ledger, pattern catalogue, run state | KBs, updated in place |

The archive is written once and mostly never re-read. The index is read at the *start* of every
run and rewritten at the end. Never duplicate report prose into the vault — the vault stores
one line per finding plus a pointer.

---

## Vault resolution

Probe in order; first hit wins. `<project>` is `PROJECT_NAME` from Phase 1, lowercased.

```bash
for base in "C:/Users/kazda/Documents/Obsidian" "C:/Users/mkdol/Documents/Obsidian"; do
  [ -d "$base" ] && VAULT_BASE="$base" && break
done
VAULT="$VAULT_BASE/<project>"          # e.g. .../Obsidian/ascent
```

- If `$VAULT_BASE` exists but `$VAULT` does not → **create it** (`mkdir -p "$VAULT/Scan"`). A
  sibling `Perfect/` folder in the same vault is expected; `/perfect` and `/vibeman` share the
  vault root and never write to each other's folder.
- If no Obsidian base exists at all → set `VAULT="$PROJECT_PATH/.vibeman"` (the tree below it is
  still `Scan/`, so the schema and every `coverage.mjs` call are unchanged). Announce the fallback
  once, and add `.vibeman/` to the target's `.gitignore` if it isn't there. **Never** write the
  vault into the Vibeman repo (see the working-directory discipline block in SKILL.md).

Record `$VAULT` for the whole run.

---

## Schema

```
$VAULT/Scan/
  Scan.md                    # HOME / Map-of-Content. Always current truth.
  config.md                  # per-project overlay: gates, baselines, taste, do-not-suggest
  coverage.md                # the heatmap: context × lens, staleness, yield
  contexts/<slug>.md         # one per context — the finding ledger (the important one)
  lenses/<lens>.md           # one per scan type — what this lens has learned here
  patterns.md                # durable cross-run pattern catalogue (was Pipeline B6.5, per-run)
  runs/<YYYY-MM-DD[-n]>.md   # immutable run record + live dispatch state + `next:` pointer
```

`<slug>` is the context slug already used for report filenames (kebab-case context name), so a
vault note and its archive reports share a name.

### Bootstrap (first run in a project)

Create the tree plus these seeds. Do not deep-read code during bootstrap — coverage is
populated by the run that follows.

**`Scan.md`**
```markdown
# <Project> — Scan Memory

Index for `/vibeman` scans. Archive of full reports: `docs/harness/` in the repo.

- **Contexts:** <N> in <M> groups · **Never scanned:** <N>
- **Open findings:** 0 · **Rejected (do-not-propose):** 0 · **Fixed on record:** 0
- **Last run:** — · **Next:** first scan; no coverage yet
- [[Scan/coverage|Coverage heatmap]] · [[Scan/patterns|Pattern catalogue]] · [[Scan/config|Config]]

## Pre-vault archive (not indexed)
<list of existing docs/harness/* dirs, if any — pointers only, never parsed>
```

**`config.md`**
```markdown
# Scan config — <Project>

## Gates
- typecheck: <cmd>            # e.g. npx tsc --noEmit   (baseline: <N> errors)
- tests: <cmd>                # e.g. npm run test       (baseline: <P>/<T>)
- lint: <cmd>
- build: <cmd>                # when the wave touches client/server boundary or config
- extra: <e.g. cargo check --features desktop, i18n:check>

## Run shape
- findings target per context: 5–7
- wave size (parallel scan subagents): 8
- fixes per implementation wave: 5–7
- session context budget: ~<N> contexts per scan session

## User taste
<one line per durable steer the user has given about what is worth reporting>

## Do-not-suggest
<capabilities deliberately removed or permanently out of scope — a finding proposing
 these is dropped before the user ever sees it>

## Skill improvement log
<2–4 bullets per run: what dragged, what the user overrode, what to change next time>
```

**`coverage.md`**
```markdown
# Coverage — <Project>

One row per context. `lens@date` = last scan of that context with that lens.
Yield = findings actioned / findings surfaced, across the last 3 scans of the context.

| Context | Group | Files | Lenses scanned | Last scan | @SHA | Open | Fixed | Rej | Yield |
|---|---|---:|---|---|---|---:|---:|---:|---|
_No contexts scanned yet._
```

**`patterns.md`**
```markdown
# Pattern catalogue — <Project>

Durable bug/UX/architecture shapes found here, so future scans grep proactively instead of
re-deriving. Promote a pattern after it is observed in **2+ contexts**.

| # | Pattern | When it bites | Fix shape | Seen in |
|---|---|---|---|---|
_No patterns yet._
```

**`lenses/<lens>.md`** — created on first use of a lens:
```markdown
---
lens: bug-hunter
runs: 0
---
# Lens memory — bug-hunter on <Project>

## What this lens has learned here
<durable observations: which categories are productive here, which are noise>

## Categories with zero yield (deprioritize)
<category — N findings surfaced, 0 actioned, across runs X, Y>

## Prompt adjustments carried forward
<additions to the role prompt that paid off — e.g. "this repo is at 0 tsc errors, do not
 report compiler-level issues">
```

---

## The context ledger — `contexts/<slug>.md`

This is the file that does the work. Every finding that has ever been *decided on* lives here
as exactly one line. Report prose stays in the archive.

```markdown
---
context: Backlog Management
slug: backlog-management
group: Delivery
files: 14
scans:
  - { date: 2026-07-09, lens: "bug-hunter+ui", sha: e4f5g6h, surfaced: 7, actioned: 5 }
  - { date: 2026-06-25, lens: "bug-hunter+ui", sha: a1b2c3d, surfaced: 5, actioned: 5 }
next_id: 13
---

# Backlog Management — finding ledger

## Fixed
- `#03` **crit** · bug · Promote-to-initiative creates unlimited duplicate initiatives — seen 2026-06-25 · fixed 2026-06-26 `9a1c4e2`
- `#07` **high** · bug · Inline owner reassignment remounts the row, discarding the open PR link — seen 2026-07-09 · fixed 2026-07-11 `bb2d901`

## Rejected — do NOT re-propose
- `#05` **med** · ui · Extract a shared Button primitive — 2026-07-09
  > user: "design-system rewrite is out of scope until Q4"

## Open / deferred — confirm-or-retire, never re-file as new
- `#11` **low** · ui · `EmptyState` renders block ReactNode inside a `<p>` — open since 2026-07-09, deferred (low severity, no user impact reported)

## Known clean — traced and healthy, do not re-spend budget
- optimistic-update rollback path — bug-hunter 2026-07-09
- keyboard focus management after row edit — ui 2026-07-11 (fixed then re-verified)

## Notes
<free prose: context-map drift, files that moved, structural facts specific to this context>
```

### Finding identity

- IDs are `#NN`, **unique within the context**, allocated from the note's `next_id` frontmatter.
- An ID is **permanent**. When a finding moves `Open → Fixed`, the bullet moves between sections
  and keeps its number. Never renumber, never reuse.
- A new scan's finding **matches an existing ledger row** when the target file matches AND the
  title/root-cause describes the same defect. Match on meaning, not string equality — the two
  ascent scans phrased the same `global-error` defect three different ways across three months.
  On a match: update the existing row (bump the date, add evidence), never append a duplicate.
- Severity in the ledger is the *highest* severity ever assigned to that finding.

### Status meanings

| Status | Means | Effect on the next scan |
|---|---|---|
| Fixed | shipped, commit recorded | do not re-report; re-verify only if the file changed since |
| Rejected | the user said no, with a reason | **hard suppression** — never re-propose, in any lens |
| Open / deferred | real, not yet fixed | confirm-or-retire; does not consume the new-findings budget |
| Known clean | traced, found healthy | do not re-spend budget on this path |

---

## The prior-coverage digest

This is the payoff. Phase B3 builds one digest per context and **pastes it verbatim into that
context's scanner subagent prompt**, above the role prompt. `tools/coverage.mjs digest` emits it.

```
## PRIOR COVERAGE FOR THIS CONTEXT — read before you scan

Scanned before: bug-hunter 2026-06-25 (@a1b2c3d, 5 findings) · bug+ui 2026-07-09 (@e4f5g6h, 7 findings)
Changed since the last scan: 3 of 14 files — src/x.ts, src/y.tsx, src/z.ts
  → The other 11 files are byte-identical to a scan that already ran this lens. Weight your
    budget toward the changed files and toward paths listed as neither fixed nor clean below.

ALREADY FIXED — do NOT re-report:
  #03 crit  Promote-to-initiative creates unlimited duplicate initiatives   (fixed 9a1c4e2)
  #07 high  Inline owner reassignment remounts the row, dropping the PR link (fixed bb2d901)

REJECTED BY THE USER — do NOT re-propose, in any framing:
  #05 med   Extract a shared Button primitive
            reason: "design-system rewrite is out of scope until Q4"

OPEN / DEFERRED — confirm-or-retire; these do NOT count against your findings target:
  #11 low   EmptyState renders block ReactNode inside a <p>
            → If still present, reply `CONFIRM #11`. If gone, reply `RETIRE #11`.
              Either way, do not file it as a new finding.

KNOWN CLEAN — traced and healthy, do not re-spend budget:
  optimistic-update rollback path (2026-07-09) · keyboard focus after row edit (2026-07-11)

KNOWN PATTERNS in this project — grep for these shapes proactively:
  P4 silent-success-theater · P7 optimistic-update-without-rollback · P9 stale-closure-during-async

Your findings target is for NEW ground only.
```

Rules:
- Cap the digest at ~60 lines. If a context has more than ~12 fixed rows, collapse the oldest
  into a single count line (`+9 older fixed findings — see contexts/<slug>.md`).
- **Never omit the rejected block.** Re-proposing a rejected idea is the single most expensive
  failure mode; it costs the user's trust, not just tokens.
- If a context has no ledger yet, the digest is one line: `No prior coverage — first scan of
  this context.` (plus pre-vault archive pointers if any exist, marked *not indexed*).

### Subagent reply contract addition

Scanner subagents must add two lines to their terse reply so the orchestrator can update the
ledger without reading the report:

```
Confirmed open: #11
Retired: (none)
```

---

## Staleness and context selection

With 44 contexts and a session that realistically covers ~20, "scan everything" guarantees a
dead session and an arbitrary cut (that is exactly how ascent's 2026-07-16 run died at 31/44).
Rank instead:

`tools/coverage.mjs plan` implements this; do not recompute it by hand.

```
staleness =  1.0 · lens_gap                       # 1 if never scanned with this lens, else 0
          +  0.6 · min(days_since / 60, 1)
          +  1.2 · churn_count / (total_files + 4)  # additive smoothing, see below
          +  0.4 · min(open_findings / 5, 1)
          +  0.3 · min(total_files / 25, 1)         # reach
          -  0.8 · yield_decay                      # cooldown
```

- **`churn_count`** is `git diff --name-only <last_same_lens_sha>..HEAD` intersected with the
  context's `filePaths`. A context whose files have not changed since a same-lens scan is
  **near-zero value to re-scan** — this term is why the whole system pays for itself.
  For a context never scanned with this lens there is no SHA, so churn falls back to
  `git log --since=90.days --name-only`. Without that fallback every never-scanned context
  scores identically and the ranking degenerates to context-map order, which carries no
  information (observed on the first vibeman dry run: 15 contexts tied at 2.80).
- **The `+4` smoothing is load-bearing.** With a raw ratio, a 3-file context that churned
  completely outranks an 18-file context at 61% churn — a noisy small denominator masquerading
  as a strong signal. Smoothing puts the 18-file context ahead, which is the right call for
  value-per-session.
- **`yield_decay`** = 1 when the last two scans of the context surfaced ≥4 findings and actioned
  under 15% of them. Such a context is unproductive regardless of how stale it looks.
- Present the ranked table, take the top N that fit `config.md → session context budget`, and
  **name the skipped contexts explicitly** — a silent cap reads as full coverage. `plan --budget N`
  prints the skip list for exactly this reason.

---

## Write-back discipline

Write **incrementally**, never only at the end. A killed session must lose at most the work in
flight — the failure this whole design exists to prevent.

| Moment | Write |
|---|---|
| after Phase 1.5 recall | `runs/<date>.md` created with plan + `next:` |
| after each scan wave returns | dispatch state in the run note (returned / failed / pending) |
| after the INDEX is built | ledger rows appended for every new finding (status `open`) |
| after the approval gate | rejected rows moved to Rejected **with the user's reason** |
| after **each fix commit** | that row moved to Fixed with its SHA |
| after each wave verification | `coverage.md` row for every touched context |
| at session end | `Scan.md` headline, `patterns.md`, `lenses/<lens>.md`, `config.md` log, `next:` |

Rejection reasons are the highest-value bytes in the vault. If the user rejects without a
reason, ask once, batched, at the gate — one question for all rejections, `skip` allowed.

---

## Hygiene

- **Update notes, never duplicate them.** Slugs are stable. Two notes for one context is the
  failure that killed the usefulness of `harness-learnings.md`.
- **The vault is not a report.** If a line would only ever be read by a human doing archaeology,
  it belongs in the archive. The vault holds what the *next dispatch* needs.
- **Subagents do not write the vault.** They return terse replies; the orchestrator writes. If a
  parallel phase claims to have written notes, `ls` the directory before believing it.
- **The vault is not in git.** It is machine-local. Anything a future contributor needs in the
  repo (structural facts, conventions) still goes to `docs/harness/harness-learnings.md` — the
  vault links to it, does not replace it.
- **Do not parse the pre-vault archive.** Older `docs/harness/*` dirs are listed in `Scan.md` as
  pointers only. If a scanner has budget and a context has no ledger, it may read one prior
  report — but this is opportunistic, not a backfill.
