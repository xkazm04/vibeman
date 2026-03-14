# Stack Research

**Domain:** Autonomous development orchestration pipeline (brownfield Next.js app)
**Researched:** 2026-03-14
**Confidence:** HIGH (core stack already locked; research focused on new pipeline components)

---

## Context: What Is Already Locked

The project constraint is explicit: stay within the existing Next.js / TypeScript / SQLite / Zustand stack. This research does NOT re-evaluate those choices. It answers: **what additional libraries and patterns are needed to build the new Conductor pipeline?**

Existing locked dependencies relevant to the Conductor:
- `@anthropic-ai/claude-agent-sdk` ^0.2.59 — agent execution (already in package.json)
- `@anthropic-ai/sdk` ^0.78.0 — direct API calls (already in package.json)
- `ts-morph` ^27.0.2 — TypeScript AST analysis (already in package.json)
- `chokidar` ^5.0.0 — file watching (already in package.json)
- `better-sqlite3` ^12.6.2 — persistence (already in package.json)
- `glob` ^13.0.0 — file discovery (already in package.json)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/claude-agent-sdk` | ^0.2.59 (current: 0.2.74+) | Execute autonomous coding tasks per requirement spec | The SDK wraps Claude Code's full tool loop (Read, Edit, Bash, Glob, Grep). You get sessions, hooks, subagents, and MCP out of the box. No need to implement tool dispatch manually. Already in the project. |
| `ts-morph` | ^27.0.2 | Codebase analysis for Scout stage — extract exports, imports, dependency graph, detect dead code | Wraps the TypeScript Compiler API with a clean fluent interface. Already in the project. Generates the structural context that Scout needs to produce targeted backlog items. |
| `better-sqlite3` | ^12.6.2 | All pipeline state persistence | Synchronous SQLite fits the Node.js server thread model perfectly. No async overhead for DB writes in the orchestrator loop. Already in the project and migration system is mature. |
| TypeScript Compiler API (`typescript` pkg) | ^5.9.3 | Build validation via `tsc --noEmit` subprocess call | Invoking `tsc --noEmit` as a child process after execution is the most reliable build gate. The programmatic Compiler API is an option but subprocess invocation is simpler and avoids memory issues on large codebases. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `simple-git` | ^3.x (latest: 3.27+) | Programmatic git: diff changed files, commit on goal completion, read git status | Use for the commit step at pipeline end and for detecting which files changed during execution. Bundled TypeScript types, actively maintained (6M+ weekly downloads). |
| `glob` | ^13.0.0 | File pattern matching for Scout codebase scan | Already in project. Use it for discovering files by pattern during initial codebase analysis before ts-morph deep analysis. |
| `chokidar` | ^5.0.0 | Watch for file system changes during execute stage | Already in project. v5 is ESM-only, matches the project's Node 20+ requirement. Use to detect which files an agent session actually modified. |
| `uuid` | ^13.0.0 | Generate pipeline run IDs, batch IDs, requirement IDs | Already in project. No change needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` | Unit tests for pipeline stage logic | Already in project. Test stage functions in isolation with mock DB and mock agent responses. |
| `tsc --noEmit` (subprocess) | Build validation gate after execute stage | Invoke via `child_process.exec` or Node's `execFile`. Parse exit code: 0 = clean build, non-zero = type errors. Capture stderr for error details to feed into review stage. |

---

## Installation

No new dependencies required. The full stack for the Conductor redesign is already in `package.json`. The `simple-git` library is the only potential addition if direct git automation (commit on completion) is needed.

```bash
# Only if commit-on-completion feature is implemented:
npm install simple-git
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@anthropic-ai/claude-agent-sdk` for execution | Raw `@anthropic-ai/sdk` with manual tool loop | Never for this project — the Agent SDK already handles the tool loop, sessions, and context management. Manual tool loop is 200+ lines of infrastructure the SDK provides for free. |
| `ts-morph` for AST analysis | `@typescript-eslint/parser` + tree-sitter | Only if you need lint-rule-style analysis or cross-language parsing. ts-morph is purpose-built for TypeScript structural analysis and already installed. |
| `simple-git` for git operations | `isomorphic-git` | Only if you need browser-compatible git (not needed here — server-only). simple-git has a simpler API and is better suited for server-side scripting. |
| `tsc --noEmit` subprocess for build validation | TypeScript Compiler API programmatic invocation | Use programmatic API only if you need incremental type checking or deep diagnostic access. Subprocess is simpler, more reliable, and reflects what the user sees in their terminal. |
| Custom DAG scheduler (plain TypeScript) | BullMQ, Temporal, ts-dag | External schedulers add Redis/infrastructure dependencies. With max 4 concurrent sessions and local-only operation, a plain `Promise.all` + dependency graph resolved in-process is sufficient and has zero new dependencies. |
| SQLite (`better-sqlite3`) for all state | Redis, in-memory Map | Redis adds infrastructure for a single-user local tool. `globalThis` Map covers in-process state; SQLite covers persistence across restarts. Already implemented correctly. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain / LangGraph | Massive abstraction layer over what the Claude Agent SDK already does natively. Adds ~50 transitive deps, slow release cycle, leaky abstractions. You lose direct control over agent sessions. | `@anthropic-ai/claude-agent-sdk` directly |
| OpenAI Agents SDK / Swarm | Anthropic-specific project — using competing vendor's orchestration SDK is unnecessary complexity. | `@anthropic-ai/claude-agent-sdk` |
| BullMQ | Requires Redis. Adds infrastructure for a single-user local tool with max 4 concurrent jobs. | Plain `Promise.all` with custom dependency ordering |
| Temporal | Full workflow engine designed for distributed, multi-tenant systems. Complete overkill for a local 4-session pipeline. | State machine in `conductorOrchestrator.ts` (existing pattern) |
| `nodegit` / `libgit2` bindings | Native binary dependency, platform-specific build issues on Windows (the target platform). | `simple-git` (pure Node.js CLI wrapper, no native bindings) |
| External vector database (Pinecone, Weaviate) | Over-engineered for Brain pattern storage. SQLite FTS5 or even simple text search covers the Brain lookup use case at this scale. | SQLite with FTS5 for semantic search if needed |
| Streaming SSE for agent output to UI | Complex to maintain across HMR restarts. The existing polling pattern (`usePolling`) is already in place and proven. | `usePolling` hook (existing) |

---

## Stack Patterns by Variant

**For Scout stage (codebase analysis):**
- Use `ts-morph` to extract: exported symbols, import graph, file size, last-modified timestamps
- Use `glob` for initial file discovery with `.gitignore` awareness
- Use `chokidar` only if you need reactive re-scanning; for one-shot analysis, prefer `glob` + `ts-morph` batch scan
- Feed the structural map into the LLM prompt as structured context, not raw file contents

**For Execute stage (parallel sessions):**
- Use `@anthropic-ai/claude-agent-sdk` `query()` with `allowedTools: ["Read", "Edit", "Write", "Bash", "Glob", "Grep"]`
- Enforce domain isolation by setting `cwd` to the project root but including file path restrictions in the system prompt
- Use `hooks.PostToolUse` with an `Edit|Write` matcher to track which files each session modifies
- Run up to 4 concurrent `query()` streams via `Promise.allSettled` — never `Promise.all` (don't fail the whole batch on one task failure)

**For Build Validation gate:**
- Invoke `tsc --noEmit --project path/to/tsconfig.json` as a subprocess
- Parse exit code and stderr
- If non-zero: capture error lines, classify by file, pass to Review stage for LLM analysis
- Do NOT attempt to fix TS errors automatically in the same pipeline cycle — log them as findings and let the next cycle address them

**For Commit stage:**
- Use `simple-git` to: (1) get changed files list, (2) stage changed files selectively, (3) create commit with structured message
- Only commit when all of: build passes, review stage approves, user checkpoint (if configured) is cleared

**For DAG dependency resolution (Batch stage):**
- Implement as plain TypeScript: topological sort (Kahn's algorithm) over the dependency graph
- No external library needed — the graph has at most ~10 nodes (max batch size from config)
- Priority: tasks with no dependents execute first; tasks with shared file dependencies are serialized

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/claude-agent-sdk` ^0.2.59 | `next` ^16.1.6, Node 20+ | SDK requires Claude Code to be installed on the machine. On Windows, ensure `claude` is in PATH. |
| `ts-morph` ^27.0.2 | `typescript` ^5.9.3 | ts-morph 27.x targets TypeScript 5.x. Do not use ts-morph to analyze files with TypeScript 7 features if/when the project migrates. |
| `chokidar` ^5.0.0 | Node 20+ (ESM-only) | v5 is ESM-only. The existing Next.js project handles this correctly already. |
| `simple-git` ^3.x | Node 16+, Windows 11 | Wraps system git binary. Requires git installed on PATH — safe assumption for a developer tool. |
| `better-sqlite3` ^12.6.2 | Node 20+, Windows 11 | Synchronous API is correct for server-side Next.js API routes. Do not use in browser bundles. |

---

## Key Architecture Decisions Informed by Stack

**1. Agent SDK sessions as the execution primitive.**
The Claude Agent SDK `query()` function is the correct abstraction for each Conductor task. It provides: session continuity (the agent remembers what it read), built-in tool execution, hooks for file change tracking, and automatic context management. Each requirement spec maps to one `query()` call with the spec content as the prompt.

**2. ts-morph for Scout, not the Agent SDK.**
The Scout stage's codebase analysis should be done with `ts-morph` programmatically, not by asking an LLM to "look at the codebase." ts-morph gives deterministic, fast, structured output (import graph, exported symbols, file sizes). The LLM's role in Scout is to interpret this structural data and generate backlog items — not to discover the structure itself.

**3. No new infrastructure.**
The entire Conductor pipeline can be rebuilt using only what is already installed. The one optional addition is `simple-git` for the commit-on-completion feature. Every other capability (analysis, execution, storage, validation) is covered by existing dependencies.

**4. AbortController remains the cancellation primitive.**
The existing `AbortController` pattern in `conductorOrchestrator.ts` is correct. The Claude Agent SDK respects signal abort — pass `abortSignal` to the `query()` options. This gives clean cancellation without process killing.

---

## Sources

- [Anthropic Agent SDK Official Docs](https://platform.claude.com/docs/en/agent-sdk/overview) — verified capabilities, tool list, session API, hooks, subagents (HIGH confidence)
- [Anthropic Engineering: Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — design philosophy and long-running agent patterns (HIGH confidence)
- [ts-morph GitHub](https://github.com/dsherret/ts-morph) — v27.0.2 confirmed current, TypeScript 5.x compatible (HIGH confidence)
- [simple-git npm](https://www.npmjs.com/package/simple-git) — TypeScript bundled types, v3.x, 6M+ weekly downloads (HIGH confidence)
- [chokidar GitHub](https://github.com/paulmillr/chokidar) — v5.0.0 is ESM-only, Node 20+ required (HIGH confidence)
- [Praetorian: Deterministic AI Orchestration Architecture](https://www.praetorian.com/blog/deterministic-ai-orchestration-a-platform-architecture-for-autonomous-development/) — five-layer architecture pattern for autonomous dev (MEDIUM confidence — practitioner blog)
- [Simon Willison: Parallel coding agent lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/) — domain isolation patterns in practice (MEDIUM confidence)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) — programmatic type checking approach (HIGH confidence)
- [LLM-Based Multi-Agent Systems for Software Engineering (ACM)](https://dl.acm.org/doi/10.1145/3712003) — literature review on multi-agent coordination patterns (MEDIUM confidence)

---

*Stack research for: Vibeman Conductor pipeline redesign (autonomous development orchestration)*
*Researched: 2026-03-14*
