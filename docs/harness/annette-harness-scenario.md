# Annette Harness Scenario — CLI-Based Project Companion

## Vision
Transform Annette from a Claude Haiku chat bot into a Claude CLI-based intelligent project companion focused on quality processing of each user request. User reads responses or hears them via ElevenLabs TTS.

## Architectural Shift
- **FROM**: Anthropic Messages API (Haiku, 4096 tokens, fast-but-shallow)
- **TO**: Claude CLI sessions via claude-terminal (Opus/Sonnet, deep processing, quality-first)
- **TTS**: ElevenLabs text-to-speech for spoken responses (accepts delays for quality)

## Target Capabilities
1. Overview & generate idea scans (Ideas module)
2. Automate/help with idea triage (tinder module)
3. Manage multiple development batches (TaskRunner module)
4. Store & reuse project experience (Brain module)
5. Analyze codebase & generate backlog outside idea scans
6. Honest conversation about project strengths & weaknesses

## Tier Architecture

### Tier 0 — CLI Conversation Engine (Foundation)
| Area | Description |
|------|-------------|
| cli-orchestrator | Replace Haiku API calls with Claude CLI session-based conversation |
| conversation-context | Maintain conversation thread across CLI invocations |
| response-parser | Parse CLI output into structured chat messages |

### Tier 1 — Deep Module Integration Tools (depends: Tier 0)
| Area | Description |
|------|-------------|
| ideas-tools | Trigger scans, list agents, get scan results, analyze findings |
| triage-tools | Present pending items, accept/reject with reasoning, bulk operations |
| taskrunner-tools | Create batches, monitor execution, session management |
| brain-tools | Query insights, record learnings, behavioral patterns, reflections |

### Tier 2 — Codebase Intelligence (depends: Tier 1)
| Area | Description |
|------|-------------|
| codebase-analysis | Analyze file structure, dependencies, architecture |
| backlog-generator | Generate backlog items from codebase analysis (outside scans) |
| strengths-weaknesses | Honest project health assessment tool |

### Tier 3 — Voice & TTS Layer (depends: Tier 0)
| Area | Description |
|------|-------------|
| elevenlabs-tts | ElevenLabs text-to-speech integration |
| response-formatting | Format responses for TTS readability |

### Tier 4 — Chat UI Adaptation (depends: Tier 0, Tier 3)
| Area | Description |
|------|-------------|
| chat-ui-cli | Update chat interface for CLI-based conversation flow |
| progress-streaming | Show CLI processing progress in chat |

### Tier 5 — E2E Tests (depends: all)
| Area | Description |
|------|-------------|
| e2e-conversation | Test basic conversation flow in browser |
| e2e-scan-trigger | Test triggering idea scan via chat |
| e2e-triage | Test idea triage interaction |
| e2e-task-management | Test task execution monitoring |

## Verification Gates
- `npx tsc --noEmit` — 0 TypeScript errors
- `npx vitest run` — All tests passing
- `npx next build` — Clean build
- `npx playwright test` — E2E tests passing
