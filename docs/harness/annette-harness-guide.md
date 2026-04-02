# Annette Harness Guide — Run Report

## Execution Summary

**Date:** 2026-04-01
**Scope:** Transform Annette from Haiku chat bot to CLI-based project companion
**Result:** All verification gates passing, 6 tiers complete

| Gate | Status |
|------|--------|
| TypeScript (`tsc --noEmit`) | 0 errors |
| Tests (`vitest run`) | 61/61 files, 694/694 tests |
| Build (`next build`) | Compiled successfully |

---

## Tier 0 — CLI Conversation Engine

### What Changed
Replaced direct Anthropic Messages API (Haiku, 4096 tokens) with Claude Agent SDK sessions for deep, quality-first processing.

### Files Created
- **`src/lib/annette/cliOrchestrator.ts`** — New CLI-based orchestrator using `@anthropic-ai/claude-agent-sdk`:
  - `orchestrateCLI()` accepts same `OrchestratorInput`, returns same `OrchestratorOutput`
  - Runs in `plan` permission mode (reads auto-approved, writes controlled)
  - Configurable model (default Sonnet), maxTurns (15), timeout (5 min)
  - Builds rich contextual preamble: brain context + recalled memories + conversation history
  - System prompt appended to Claude Code's built-in prompt via `{ type: 'preset', preset: 'claude_code', append: ... }`
  - Iterates async message stream, collecting text and tool uses

### Files Modified
- **`src/app/api/annette/chat/route.ts`** — Added `mode: 'api' | 'cli'` (defaults to `'cli'`), routes to appropriate orchestrator
- **`src/lib/annette/systemPrompt.ts`** — Added CLI mode instructions (file reading, codebase search, architecture analysis)

---

## Tier 1 — Deep Module Integration Tools

### What Changed
Expanded from 41 to 57 tools across 3 new categories + enhanced brain tools.

### New Tool Categories

**Scanning (3 tools):**
- `trigger_idea_scan` — Trigger scans with agent type validation against AGENT_REGISTRY
- `list_scan_agents` — List all 30 agent types with optional category filter
- `get_scan_results` — Query scan history enriched with per-scan idea counts

**Triage (4 tools):**
- `get_pending_triage` — Fetch pending ideas/directions with filtering
- `triage_item` — Accept/reject single item with reasoning
- `bulk_triage` — Process array of triage decisions with per-item error handling
- `get_triage_stats` — Comprehensive pending/accepted/rejected counts

**Task Runner (3 tools):**
- `list_active_sessions` — List Claude terminal sessions with status/cost/token data
- `get_runner_execution_status` — Detailed execution status for specific session
- `create_requirement` — Create development requirement for CLI execution

**Brain Enhancements (2 tools):**
- `get_project_health` — Comprehensive health: behavioral context, outcomes, directions, insights, strengths/weaknesses
- `get_learning_timeline` — Reflections and insights within configurable date window

### Files Created
- `src/lib/annette/tools/scanning.ts`
- `src/lib/annette/tools/triage.ts`
- `src/lib/annette/tools/taskRunner.ts`

### Files Modified
- `src/lib/annette/tools/brain.ts` — Added 2 tools
- `src/lib/annette/toolDefinitions.ts` — Added 3 categories + 12 tool definitions
- `src/lib/annette/toolRegistry.ts` — Added 3 lazy module loaders

---

## Tier 2 — Codebase Intelligence

### What Changed
Added 4 tools for honest project analysis and backlog generation outside of idea scans.

### Tools Created
- `analyze_codebase_structure` — File structure, directory sizes, config detection, dependency counts
- `generate_backlog_items` — Prioritized backlog from goals, ideas, contexts, insights
- `assess_project_health` — Honest strengths/weaknesses with test ratio, strict mode, CI, git status
- `get_dependency_analysis` — Package.json analysis, framework groups, security flags, version warnings

### Files Created
- `src/lib/annette/tools/codebaseIntel.ts`

### Files Modified
- `src/lib/annette/toolDefinitions.ts` — Added `codebaseIntel` category + 4 tools
- `src/lib/annette/toolRegistry.ts` — Added loader

---

## Tier 3 — ElevenLabs TTS

### What Changed
Added ElevenLabs as TTS provider with speech-optimized text formatting.

### Files Created
- **`src/lib/annette/tts/elevenlabs.ts`** — ElevenLabs client:
  - `synthesizeSpeech(text, config?)` — Calls ElevenLabs API, returns audio Buffer
  - `formatForSpeech(text)` — Strips markdown, code blocks, quick_options tags, URLs
  - Configurable voice, model, stability, similarity boost
- **`src/app/api/annette/tts/route.ts`** — `POST /api/annette/tts` endpoint returning audio/mpeg

### Files Modified
- **`src/stores/annette/voiceStore.ts`** — Added `ttsProvider: 'openai' | 'elevenlabs'` (default elevenlabs), `elevenlabsVoiceId`, and setters

---

## Tier 4 — Chat UI Adaptation

### What Changed
Updated chat interface for CLI-mode: mode toggle, processing timer, TTS playback.

### Files Created
- **`src/app/features/Annette/components/ConversationModeToggle.tsx`** — Fast/Deep toggle (cyan/violet)
- **`src/app/features/Annette/components/ProcessingIndicator.tsx`** — Elapsed time counter during processing
- **`src/app/features/Annette/components/TTSButton.tsx`** — Speak button routing to correct TTS provider

### Files Modified
- **`src/stores/annette/chatStore.ts`** — Added `conversationMode`, `processingStartedAt`, `setConversationMode`; updated `sendMessage` to include mode
- **`src/stores/annette/types.ts`** — Added `ChatSettings` interface

---

## Tier 5 — E2E Tests

### What Changed
Created Playwright E2E test suites covering all major Annette use cases.

### Files Created
- **`e2e/annette/annette-chat.spec.ts`** — 17 tests:
  - Chat interface detection (input, send button, message log)
  - Commander tab bar navigation
  - Empty state display
  - Header elements (audio toggle, clear chat, notifications)
  - Message sending and response display
  - Processing indicator during wait
  - Quick options rendering and clicking
  - Enter key submission
  - Input disabled during loading
  - Error banner display/dismiss
  - Context indicator bar

- **`e2e/annette/annette-tools.spec.ts`** — 7 tests:
  - Trigger idea scan via natural language
  - Show triage items
  - Report project health
  - Show active tasks
  - Tool calls display
  - Consecutive conversation messages
  - Clear chat reset

---

## Architecture Summary

```
User Message
    ↓
[Chat Store] → POST /api/annette/chat { mode: 'cli' }
    ↓
[CLI Orchestrator]
    ├── Memory Recall (contextualRecaller)
    ├── Brain Context (brainInjector)
    ├── Rapport Model (rapportEngine)
    ↓
[Claude Agent SDK query()] ← Plan permission mode
    ├── Built-in Claude Code tools (Read, Edit, Bash, etc.)
    ├── Annette tools (57 tools, 13 categories):
    │   ├── scanning: trigger scans, list agents, get results
    │   ├── triage: pending items, accept/reject, bulk ops, stats
    │   ├── taskrunner: sessions, execution status, requirements
    │   ├── codebaseIntel: structure, backlog, health, dependencies
    │   ├── brain: context, health, timeline, insights, reflections
    │   └── [existing]: directions, ideas, goals, contexts, tasks, projects, standup, analysis
    ↓
[Response + Quick Options]
    ↓
[Optional TTS] → ElevenLabs or OpenAI
    ↓
[Chat UI] ← ConversationModeToggle + ProcessingIndicator + TTSButton
```

## Total New Files: 13
## Total Modified Files: 10
## New Tool Count: 16 (41 → 57)
## New E2E Tests: 24
