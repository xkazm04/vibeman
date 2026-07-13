---
name: perfect
description: Session-after-session product perfection loop for Vibeman. The strongest available model (Fable) directs — it walks the repo's context map context-by-context, proposes 5 challenged, high-value directions per context (features, design elevations, significant optimizations), gates them with the user until 10 are accepted, then orchestrates one Opus builder subagent per context in isolated worktrees while making every review/merge decision itself. All state lives in a linked Obsidian vault so any future session resumes the loop exactly where the last one stopped. Invoke with `/perfect [init|propose|build|status|reflect] [context-name]`.
---

# Perfect — the direction-and-delivery loop

> One model is best at *judgment* — seeing what would make a product excellent, challenging its own ideas, reviewing diffs ruthlessly. Cheaper strong models are great at *execution* inside a well-scoped brief. `/perfect` wires the two together in a permanent loop: **Fable directs, Opus builds, the vault remembers.** Each session moves the product measurably closer to the best UX, architecture, and feature quality it can have; no session ever starts from zero.

## The product

Vibeman (`C:/Users/kazda/kiro/vibeman`) — a local-first AI dev-orchestration tool: Next.js 15 App Router + React 19 + TypeScript + Tailwind + Zustand 5, local SQLite (better-sqlite3) with numbered migrations, an MCP server (`src/mcp-server/`), and an optional Tauri shell (`src-tauri/`). Feature modules live under `src/app/features/*`, API routes under `src/app/api/*`, shared logic under `src/lib/*`.

## Roles — Director and Builders

- **Director (the main session — Fable, or the strongest model available).** Owns everything that is judgment: opportunity-scoring contexts, drafting directions, adversarially challenging them before the user ever sees them, running the acceptance gate, writing builder briefs, answering builders' product questions mid-flight, reviewing every diff, deciding merge/redo/drop, running the repo gates, committing, and writing the vault. The Director **never delegates a decision** to a builder and never rubber-stamps a builder's diff.
- **Builders (Opus subagents, `model: "opus"`, one per context).** Each receives a tight brief (direction specs + acceptance criteria + the context's `filePaths` scope + repo-convention digest) and implements in its **own worktree**. Builders return a structured report; when they hit a genuine product ambiguity they **return the question instead of guessing** — the Director answers via `SendMessage` and the builder continues.
- **Scouts (Explore subagents, cheap).** Produce the per-context current-state brief the Director synthesizes directions from. Never used for judgment.

## The Obsidian vault — durable loop state

Resolve the vault root (first hit wins), then use `$VAULT/Perfect/`:

```bash
for v in "C:/Users/kazda/Documents/Obsidian/vibeman" "C:/Users/mkdol/Documents/Obsidian/vibeman"; do
  [ -d "$v" ] && VAULT="$v" && break
done
# First run: create C:/Users/kazda/Documents/Obsidian/vibeman if the Obsidian folder exists;
# portable fallback: <repo>/.perfect/ (same schema — still an Obsidian-openable folder).
```

```
Perfect/
  Perfect.md               # HOME / Map-of-Content — always reflects current truth:
                           #   mission, the scored context QUEUE with the CURSOR,
                           #   the ACCEPTED POOL (n/10), shipped ledger headline, link to last session
  config.md                # per-repo overlay: gates to run, worktree recipe, wave size,
                           #   direction sizing rules, cooldown, ## User taste, + ## Skill improvement log
  contexts/<name>.md       # one per context-map context (long-lived, updated in place)
  directions/<slug>.md     # one per direction (long-lived; the atom of the whole loop)
  sessions/<YYYY-MM-DD[-n]>.md  # immutable run records, each ends with a `next:` pointer
```

**Context note** (`contexts/<name>.md`):
```markdown
---
name: <context-map name>        type: perfect/context
group: <group>                  category: ui|api|lib|data|config
opportunity: <0-10>             # value reach × headroom × strategic fit (Director's judgment)
last_proposed: <YYYY-MM-DD|never>   cooldown_until: <date|—>
directions: ["[[<slug>]]", …]
---
## Current state   (scout brief digest + file:line evidence — refreshed each proposal pass)
## Direction history   (proposed / accepted / REJECTED-and-why — rejections are memory too)
## Shipped   (direction → commit SHA → observed effect)
```

**Direction note** (`directions/<slug>.md`):
```markdown
---
slug: <kebab, stable>           type: perfect/direction
context: "[[<context-name>]]"   lens: feature|ux|optimization|robustness|wildcard
status: proposed | accepted | building | shipped | failed | dropped | rejected
size: S|M|L                     # must fit ONE builder session (≲15 files, no cross-context schema break)
proposed: <date>  accepted: <date|—>  shipped: <date|—>  commit: <sha|—>
---
## What & why   (the user value, one paragraph, no fluff)
## Evidence   (file:line of the gap/opportunity in today's code)
## Acceptance criteria   (3-6 checkable bullets — the builder's contract AND the review checklist)
## Risks / non-goals
## Build record   (builder report digest, review verdict, gate results — filled during build)
```

**Session note**: phases run, contexts covered, accept/reject tallies, build outcomes with SHAs, deltas, and **`next: <the exact resumption instruction for the following session>`**.

Vault hygiene: slugs are stable; **update notes, never duplicate**. Subagents may fail to write files in some harnesses — after any parallel phase the Director MUST `ls` the target dir and **backfill missing notes from the agents' returned content** before trusting "written".

## The context map

The authoritative map is **`context-map.json` (hyphen) at the repo root** — DB-derived, auto-written on mutation. Schema: `groups[].contexts[]` with `name`, `description`, `filePaths`, `apiRoutes`, `pinned`; plus `index` and `summary`. The legacy underscore `context_map.json` is deprecated — ignore it.

Refresh when the Vibeman dev server is running (usually :3000; vibeman's own projectId is `c32769af-72ed-4764-bd27-550d46f14bc5`):
```bash
curl -s "http://localhost:3000/api/contexts/export?projectId=c32769af-72ed-4764-bd27-550d46f14bc5&write=true"
```
Known drift: context contents were last regenerated well before recent refactors — treat `filePaths` as a starting scope, and trust the scout's read of actual code over the map's description. Files outside every context are fair game for the closest context's builder if the direction requires them (note it in the brief).

## The loop — a vault-driven state machine

Every invocation starts the same way; the vault decides which phase runs.

### Phase 0 — Recall & register
1. Read `Perfect.md` (+ last session's `next:` pointer). If missing → run **init** (below).
2. Read `context-map.json`; diff against `contexts/*` — new contexts get notes + a queue slot, removed ones get archived (`status: retired` in frontmatter).
3. Repo rituals: read `.claude/active-runs.md` if present (create it on first use), surface overlaps with other sessions, append this session's entry. Scan MEMORY.md signals that veto directions (e.g. removed modules — standup automation, goal hub, Copilot SDK, Gemini provider were deliberately deleted; don't re-suggest).
4. Announce the resumption point in one sentence, then go where the state machine points: pool < 10 → **Propose**; pool ≥ 10 (or user said `build`) → **Build**.

### Init (first run only)
1. Scaffold the vault tree + `config.md` (record: gates = `npx tsc --noEmit` (baseline **0 errors** — keep it there), `npm run test` (vitest), `npm run build` on waves that touch client/server boundaries or config, `cargo check` in `src-tauri/` only when Rust touched; wave size = 3; cooldown = 2 rounds).
2. Score every context 0-10 for **opportunity** = user-facing reach × headroom (distance from "perfect", judged from context-map metadata, `docs/*`, and memory) × strategic fit (active arcs in memory). Write the ranked **queue** into `Perfect.md` with the cursor at the top. Don't deep-read code yet — scoring is refined per-context at proposal time.
3. Write session note; proceed straight into Propose.

### Phase P — Propose (context by context, until the pool holds 10)
Loop while `pool < 10` and the user hasn't said stop:

1. **Cursor** = highest-opportunity context not on cooldown. **Prefetch**: before presenting context *k*, launch the scout for context *k+1* in the background.
2. **Scout** (Explore, "very thorough", read-only): given the context's `filePaths` and `apiRoutes` → return a current-state brief: what exists, what's rough, dead ends, UX seams, perf smells, with `file:line` evidence.
3. **Draft 5 directions** — one per lens by default: **feature** (new user value), **ux** (design/flow elevation), **optimization** (perf/cost/significant simplification), **robustness** (failure modes, observability, architecture), **wildcard** (the non-obvious idea a great PM would pitch). Each sized to ONE builder session; a bigger vision ships as its phase-1 slice.
   **Weight the slate by `config.md → ## User taste`** — the lens spread is a starting point, not a quota. Default depth is the *engine*, not the chrome: for any context with backend/algorithmic substance (scanners, brain signals, execution engine, queries), most directions should be architecture-level (data model, algorithms, lifecycle, prompt/scan paths, cost structure); UI surfacing appears at most once-twice unless the user steers otherwise. Scout prompts must match this depth (trace the full pipeline, not just the components). Watch for the repo's known **"built-but-unwired" theme** — a direction that *wires* an existing dormant capability often beats building anew.
4. **Challenge before presenting** (the Director argues against itself; a direction that fails any check is replaced, not presented):
   - Does it already exist in code? (scout evidence, not assumption)
   - Was it already proposed/rejected/shipped? (check `contexts/<name>.md` history + memory)
   - Does it conflict with an active arc or a "removed, don't re-suggest" memory?
   - Is the value claim concrete — can I name the user moment it improves?
   - Can one Opus session genuinely ship it behind the acceptance criteria?
5. **Present** the 5 in chat — numbered, each: title · lens · size · one-paragraph why · evidence · acceptance criteria. Then gate with **AskUserQuestion (multiSelect)** — the tool caps options at 4 per question, so use TWO questions in one call: Q1 = directions 1–3, Q2 = directions 4–5 (labels = `N · short title`, description = one-line value claim + size). The user can annotate via "Other" (e.g. `edit 2: …`, `stop`); selecting nothing in both = none accepted.
6. Record outcomes in the vault (rejected ones too, with the user's implied reason — rejections steer future proposals). Accepted → `directions/<slug>.md` with `status: accepted`, pool counter++, context gets `cooldown_until`. Update `Perfect.md` after every context, not at session end — a killed session must lose nothing.
7. **A `none` gate that carries a steer** (the user says what they wanted instead) is a re-scout order, not a rejection of the context: promote the steer to `config.md → ## User taste` if it generalizes, re-scout at the steered depth/angle, and re-propose the SAME context once before advancing the cursor. Never re-present any rejected direction.

### Phase B — Build (one Opus builder per context, Fable decides everything)
1. **Wave plan**: group the pool's accepted directions by context → one builder per context, ≤ `config.wave_size` (default 3) concurrent, and **≤ 3 directions per builder brief** (a 4-direction brief exceeds one agent-session budget — split a bigger context into two sequential builders). Present the wave plan in one screen; on user go (or when invoked as `/perfect build`), execute.
2. **Worktree per builder** — prepared by the Director, NOT via Agent-tool isolation (those worktrees lack `node_modules`):
   ```bash
   git worktree add .claude/worktrees/perfect-<ctx> -b worktree-perfect-<ctx>
   cmd //c mklink //J ".claude\\worktrees\\perfect-<ctx>\\node_modules" "..\\..\\..\\node_modules"   # junction, NOT copy
   # Caveat: a junctioned node_modules is fine for tsc/vitest but NOT for `next build` — run builds from the main checkout after merge, or npm install in the worktree if a builder must build.
   ```
3. **Brief** each builder (see template below); launch with `model: "opus"`, `subagent_type: "general-purpose"`, all briefs in one message so they run concurrently.
4. **Mid-flight decisions**: a builder returning `DECISION NEEDED: …` gets an answer from the Director via `SendMessage` — product calls, trade-offs, and scope cuts are Fable's alone. A builder that stops without its final report gets one `SendMessage` nudge.
   **Builder-death recovery (session limits WILL kill builders):** the instant a builder dies, `git add -A && git commit --no-verify` a `wip(…)` snapshot **inside its worktree** (isolated tree — add-all is safe there; never-lose-work beats commit hygiene). Then the Director either finishes the work inline (review the WIP diff, complete gaps, split into per-direction commits along file boundaries — same-file hunks may share a commit if the message says so) or re-briefs a fresh builder after the limit resets with "continue from the WIP commit".
5. **Review — the Director earns its title here.** Per builder branch: `git diff master...worktree-perfect-<ctx>` and review against each direction's acceptance criteria, repo conventions (api-helpers responses, `logger` not console, `withObservability` on new routes, zustand `useShallow`, migration numbering, globalThis singletons for HMR-surviving state), and taste. Verdict per direction: **merge** / **redo with notes** (SendMessage, builder fixes in place) / **drop** (`status: failed`, reason recorded). Never merge on "tests pass" alone — read the diff.
   **Docs-vs-code check:** when a diff documents a behavior (contract text, formula, doc comment), grep for the code that implements it before merging — a contract describing behavior the code doesn't have is worse than nothing.
6. **Merge serially**: per direction, `git merge --squash` (or cherry-pick) → ONE atomic commit on master, message `feat(<context>): <direction title>` + `Co-Authored-By` footer. Stage per-file, verify `git diff --cached --stat` matches intent (foreign pre-staged files → `git restore --staged` them). Run the config gates on master after each merge; a red gate is fixed inline before the next merge.
   **Concurrent-session DIRTY files blocking a pick:** never stash, never wait — commit around them: stage `HEAD + your changes` directly into the index (`git hash-object -w` + `git update-index --cacheinfo`, content built by `git merge-file`), and write `their-working-copy + your changes` to disk — their uncommitted work stays theirs.
   **Shared append-files** (barrel `index.ts` exports, shared UI registries, `Record<ScanType>` maps): NEVER wholesale-`checkout` a branch's version across sequential picks — it clobbers earlier picks' additions (tsc catches it too late). Patch-union (`git diff branch~..branch -- file | git apply --3way`) or hand-merge the appends, always. This repo's barrels are a known contention point between parallel writers — prefer one-builder-per-wave when directions share barrels.
7. **Doc-sync in the same turn**: user-visible changes update the mapped `docs/*` page when one exists (e.g. `docs/FEATURES.md`).
8. **Cleanup**: per worktree — `cmd //c rmdir` the node_modules **junction FIRST**, then `git worktree remove`, then delete the branch once its commits are on master.

### Phase W — Wrap (every session, even interrupted ones)
1. Update every touched vault note; write the session note with the **`next:` pointer** (e.g. `next: propose — cursor at brain-behavioral-signals, pool 7/10` or `next: build wave 2 — taskrunner + ideas-system remain`).
2. `Perfect.md` headline refreshed: pool count, queue cursor, shipped-total, last-session link.
3. Move the `.claude/active-runs.md` entry to Recently completed with SHAs.
4. **Reflect on the skill itself**: 2-4 bullets in `config.md → ## Skill improvement log` — what dragged, what the user overrode, what the next round should change. This log is the input for the between-rounds skill revision.

## Direction quality bar (what earns a slot in the 5)

- **Value-first**: names the user moment it improves; "nice refactor" is not a direction unless it unlocks something.
- **Evidence-backed**: cites today's code (`file:line`), not vibes.
- **One-session-shippable**: ≲15 files, no cross-context schema breaks; else slice it.
- **Novel to the vault**: not shipped, not pending, not previously rejected (unless the world changed — say so).
- **Lens-diverse**: default one per lens; substituting a second entry in one lens requires the Director to say why.

## Builder brief template

```
You are an Opus builder for the `<context>` context of Vibeman, a local-first AI
dev-orchestration tool (Next.js 15 App Router + React 19 + TS + Tailwind + Zustand 5;
local SQLite via better-sqlite3; MCP server in src/mcp-server/).
Work ONLY in this worktree: <abs path>. Your scope is this context's files:
<filePaths from context-map.json>. Touching other contexts requires DECISION NEEDED.

Implement these accepted directions, one atomic commit each, message `feat(<context>): <title>`:
<per direction: What & why · Acceptance criteria · Evidence file:line · Risks/non-goals>

COMMIT EACH DIRECTION THE MOMENT IT IS DONE AND VERIFIED — never batch commits
for the end of the session. An interrupted session must lose at most the
direction in progress, not everything.

FOREGROUND ONLY: run every compile/test as a blocking foreground command and
wait for it — NEVER spawn a background run and "wait for the notification"
(you will idle forever and the Director has to nudge you).

Repo law (non-negotiable):
- API routes: use src/lib/api-helpers (createErrorResponse, notFoundResponse,
  validateRequiredFields), wrap handlers with withObservability, log via @/lib/logger
  (never console.*), record brain signals via signalCollector where siblings do.
- DB: repositories/queries live in src/lib/queries/* — follow the existing query-object
  pattern; schema changes go through the next numbered migration, never inline DDL.
- State: zustand stores with useShallow for selective subscriptions; anything that must
  survive Next.js HMR (buffers, processes, event bus) uses the globalThis singleton pattern.
- UI: follow the feature-module layout of src/app/features/<Module>/ (Layout + components/ +
  sub_* folders); reuse existing shared components and Tailwind idioms from neighboring
  files — never hand-roll a spinner/modal/toast a sibling already has. Read
  .claude/compact-ui-design.md before substantial UI work.
- Circular imports (executionEngine↔eventBus↔executionQueue territory): use the
  established require() deferral pattern, don't restructure.
- Verify before claiming done: npx tsc --noEmit MUST stay at 0 errors, run targeted
  vitest (npm run test -- <pattern>), and drive the actual flow when the dev server
  is available; report what you COULD NOT verify honestly.

If a product decision is ambiguous, STOP that direction and return `DECISION NEEDED: <question>`
with your recommendation — never guess. Final report format:
per direction → status (done|blocked|decision-needed), commits, files, verification evidence, open risks.
```

## Modes

- **`/perfect`** — resume the loop wherever the vault says it stopped (the default; covers init on first run).
- **`/perfect propose [context]`** — force a proposal pass (optionally jump the cursor to a named context).
- **`/perfect build`** — build now with the current pool even if < 10.
- **`/perfect status`** — read-only: queue, cursor, pool, in-flight builds, shipped ledger, last session. No agents.
- **`/perfect reflect`** — read `config.md → Skill improvement log` + last sessions and propose concrete edits to THIS skill file.

## Guardrails

- **Never stash, never `git add -A` on the main checkout** — per-file staging, staged-count check before every commit; other sessions' work is sacred (add-all is permitted only inside a builder's isolated worktree for WIP snapshots).
- **Cost discipline**: scouts are Explore-tier; Opus is spent only on accepted work; the Director never re-runs a scout whose brief is < 1 round old (it's in the context note).
- **Honest ledger**: a direction only reaches `shipped` with gates green AND the Director having read the diff; anything else is `failed` with a reason. No silent drops — every accepted direction's fate is recorded.
- **Interruptibility is a feature**: write the vault incrementally (after every context in P, after every merge in B) so a killed session resumes losslessly.
- **The user is the product owner**: the gate is theirs; the Director challenges but never overrides a rejection, and repeated rejections of a lens/context recalibrate the queue scores.
