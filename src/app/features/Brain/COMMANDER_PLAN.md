# Annette 2.0: Brain-Powered Conversational AI Control Layer

## Overview

**Annette 2.0** is the evolution of the original Annette voice assistant - rebuilt from scratch with the Brain behavioral learning system as its intelligence backbone. The legacy Annette code (LangGraph-based, never shipped) is fully replaced with a streamlined architecture.

Annette 2.0 can:

1. **Observe & Report**: Proactively inform the user about project state, brain insights, and pending actions
2. **Converse & Plan**: Multi-turn dialogue to discuss next steps, priorities, and strategies
3. **Execute & Orchestrate**: Directly trigger actions (generate directions, accept ideas, run reflections) through voice/text
4. **Learn & Adapt**: Use Brain behavioral context to personalize responses and grow smarter over time

**Key Principles**:
- `claude-haiku-4-5` as the orchestration LLM with native `tool_use` (fast, cost-effective, multi-tool capable)
- No external agent frameworks (LangGraph removed entirely)
- Brain context injected into every conversation turn
- Local-first audio cache for announcements (no cloud dependency)
- Database memory designed for scale - more brain data = better decisions

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        User Interface                                │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐     │
│  │ Voice Input  │    │ Text Input   │    │ Proactive Alerts   │     │
│  │ (ElevenLabs) │    │ (Chat UI)    │    │ (Local Audio Cache)│     │
│  └──────┬───────┘    └──────┬───────┘    └────────┬───────────┘     │
└─────────┼────────────────────┼─────────────────────┼────────────────┘
          │                    │                     │
          v                    v                     ^
┌─────────────────────────────────────────────────────────────────────┐
│                    Annette API Layer                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/annette/chat (POST)                                     │   │
│  │  - Receives user message (text or transcribed voice)          │   │
│  │  - Loads deep memory context from conversation + brain DB     │   │
│  │  - Calls claude-haiku-4-5 with tool_use                      │   │
│  │  - Executes tool calls against repositories (no HTTP)         │   │
│  │  - Returns response + cached/generated audio URL              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  /api/annette/stream (GET - SSE)                              │   │
│  │  - Proactive notifications from Brain events                  │   │
│  │  - Serves pre-cached audio clips for known event types        │   │
│  │  - Dynamic TTS generation for novel notifications             │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                                          ^
          v                                          │
┌─────────────────────────────────────────────────────────────────────┐
│                    Tool Registry (34 tools)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ Brain Tools│  │ Direction  │  │ Idea Tools │  │ Goal Tools │    │
│  │            │  │ Tools      │  │            │  │            │    │
│  ├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤    │
│  │getContext  │  │generate    │  │browse      │  │list        │    │
│  │getOutcomes │  │accept      │  │accept      │  │create      │    │
│  │reflect     │  │reject      │  │reject      │  │update      │    │
│  │getInsights │  │list        │  │generate    │  │evaluate    │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ Context    │  │ Task Tools │  │ Project    │  │ Standup    │    │
│  │ Tools      │  │            │  │ Tools      │  │ Tools      │    │
│  ├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤    │
│  │list        │  │queue       │  │getStructure│  │generate    │    │
│  │getDetail   │  │status      │  │scanFiles   │  │getHistory  │    │
│  │scan        │  │execute     │  │listProjects│  │automation  │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
          │
          v
┌─────────────────────────────────────────────────────────────────────┐
│              Brain System (Existing) + Deep Memory                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ Behavioral   │  │ Outcome      │  │ Reflection Agent     │      │
│  │ Signals      │  │ Tracker      │  │ (Claude Code)        │      │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐      │
│  │ Conversation │  │ Topic        │  │ Decision Memory      │      │
│  │ Summaries    │  │ Embeddings   │  │ (outcomes + prefs)   │      │
│  └──────────────┘  └──────────────┘  └──────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Design Decisions

### 1. claude-haiku-4-5 with Native `tool_use`

**Model**: `claude-haiku-4-5` - fast responses (~200ms), cost-effective for frequent conversational interactions, full tool_use support.

**Why not a larger model**: Annette's tools provide the data - the model just needs to orchestrate and format. Haiku 4.5 handles tool dispatch and natural language synthesis efficiently. The intelligence comes from Brain data, not model size.

**How**: Each API call sends conversation history + tool definitions to Haiku. The model responds with text or tool_use blocks. Server executes tool calls and loops back for final response. Max 10 tool calls per turn.

### 2. Local Audio Cache System

**Why**: This app stays local forever. We can leverage the filesystem for instant audio playback without API latency.

**How it works**:
```
database/audio-cache/
├── announcements/           # Pre-generated event type audio
│   ├── reflection_complete.mp3
│   ├── implementation_success.mp3
│   ├── implementation_failed.mp3
│   ├── revert_detected.mp3
│   ├── threshold_approaching.mp3
│   └── pattern_warning.mp3
├── dynamic/                 # Runtime-generated TTS clips (LRU cache)
│   ├── {content_hash}.mp3   # Hashed by message content
│   └── ...
└── cache-index.json         # Metadata: hash → file, created_at, last_used, size
```

**Cache Strategy**:
- **Static announcements**: Pre-generated on first run via ElevenLabs TTS. Known event templates with fixed phrases.
- **Dynamic cache**: For novel responses, generate TTS → save to `dynamic/` folder with content hash as filename.
- **LRU eviction**: When dynamic cache exceeds 500MB, evict least-recently-used clips.
- **Cache hit path**: Hash response text → check `cache-index.json` → serve file directly (zero API latency).
- **Cache miss path**: Generate via ElevenLabs → save to disk → update index → serve.

### 3. Brain Context as System Prompt

Every Annette interaction includes:
- Current behavioral context (~500 tokens) from Brain
- Recent outcomes summary
- Reflection insights (if available)
- Current project state (active goals, pending directions)
- **Deep memory summary** (see Database Memory section)

### 4. Proactive Notifications via SSE + Cached Audio

Annette proactively alerts with pre-cached audio when:
- A reflection completes with new insights → plays `reflection_complete.mp3`
- An implementation outcome is recorded → plays `implementation_success/failed.mp3`
- Brain detects concerning patterns → plays `pattern_warning.mp3`
- Threshold for reflection approaching → plays `threshold_approaching.mp3`

For custom/novel notifications, dynamic TTS is generated and cached for future reuse.

---

## Database Memory Design (Scale-First)

### Philosophy

The power of Annette grows with the Brain database. As more signals, outcomes, and reflections accumulate, Annette should surface increasingly precise and relevant insights. The memory system is designed for:

1. **Depth**: Long-running conversations that reference weeks/months of history
2. **Relevance**: Surface the right context at the right time without loading everything
3. **Efficiency**: Token budget management even with thousands of messages in history

### Memory Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Immediate Context (last 10 messages)               │
│ - Full message content in conversation history              │
│ - Always included in Claude prompt                          │
│ - ~2000 tokens                                              │
└─────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Session Summary (current session, older messages)  │
│ - Compressed summaries of earlier conversation turns        │
│ - Key decisions, tool results, user preferences extracted   │
│ - Generated by Haiku when messages exceed window            │
│ - ~500 tokens                                               │
└─────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Cross-Session Memory (previous sessions)           │
│ - Topic-indexed summaries from past conversations           │
│ - Stored in annette_memory_topics table                     │
│ - Retrieved by topic similarity when relevant               │
│ - ~300 tokens (top 3 relevant topics)                       │
└─────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Brain Knowledge (accumulated learning)             │
│ - Behavioral context (current focus, trends, patterns)      │
│ - Outcome statistics (success rates, revert patterns)       │
│ - Reflection insights (learned preferences, warnings)       │
│ - Decision history (what was accepted/rejected and why)     │
│ - ~500 tokens (summarized from potentially thousands)       │
└─────────────────────────────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: Long-Term Preferences (user profile)               │
│ - Extracted user preferences from all interactions          │
│ - Communication style preferences                           │
│ - Topic interests and expertise areas                       │
│ - Scheduling patterns (when user is most productive)        │
│ - ~200 tokens (compact key-value format)                    │
└─────────────────────────────────────────────────────────────┘

Total system prompt budget: ~3500 tokens + 34 tool definitions
```

### Scaling Behavior

| Brain Data Size | Annette Capability |
|----------------|-------------------|
| 0-50 signals | Cold start: basic project status, suggests bootstrapping |
| 50-200 signals | Pattern detection begins: identifies active areas, basic preferences |
| 200-1000 signals | Deep awareness: predicts next actions, personalized suggestions |
| 1000+ signals | Expert companion: historical patterns, trend analysis, proactive optimization |
| Multiple reflections | Accumulated wisdom: refined preferences, proven strategies, anti-patterns |

### Memory Compaction Process

When brain data grows large, a periodic compaction runs:
1. **Signal aggregation**: Raw signals → per-context activity scores (daily/weekly)
2. **Outcome rollup**: Individual outcomes → success rates per context/direction-type
3. **Preference extraction**: Accept/reject patterns → explicit preference statements
4. **Topic clustering**: Similar conversation topics → merged summaries

This ensures the token budget stays constant regardless of data volume.

---

## Database Schema

### `annette_sessions`
```sql
CREATE TABLE annette_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT,                          -- Auto-generated from first message
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'archived'
  message_count INTEGER DEFAULT 0,
  summary TEXT,                        -- Compressed session summary (Layer 2)
  topics TEXT,                         -- JSON array of discussed topics
  last_activity_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### `annette_messages`
```sql
CREATE TABLE annette_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,                  -- 'user' | 'assistant' | 'tool_result'
  content TEXT NOT NULL,               -- Message text or JSON for tool results
  tool_calls TEXT,                     -- JSON array of tool calls (if assistant)
  tool_name TEXT,                      -- Tool name (if tool_result)
  tokens_used INTEGER,
  brain_context_snapshot TEXT,         -- Brain state at time of message (for replay)
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES annette_sessions(id)
);
```

### `annette_memory_topics`
```sql
CREATE TABLE annette_memory_topics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  topic TEXT NOT NULL,                 -- Topic label (e.g., "TaskRunner optimization")
  summary TEXT NOT NULL,              -- Compressed knowledge about this topic
  source_sessions TEXT,               -- JSON array of session IDs that contributed
  relevance_score REAL DEFAULT 1.0,   -- Decays over time, boosted on access
  last_accessed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### `annette_user_preferences`
```sql
CREATE TABLE annette_user_preferences (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  preference_key TEXT NOT NULL,       -- e.g., 'preferred_direction_scope'
  preference_value TEXT NOT NULL,     -- e.g., 'small_focused'
  confidence REAL DEFAULT 0.5,        -- 0-1, increases with confirming signals
  source TEXT,                         -- 'explicit' | 'inferred' | 'reflection'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, preference_key)
);
```

### `annette_audio_cache`
```sql
CREATE TABLE annette_audio_cache (
  id TEXT PRIMARY KEY,
  content_hash TEXT NOT NULL UNIQUE,  -- SHA256 of text content
  file_path TEXT NOT NULL,            -- Relative path in database/audio-cache/
  text_content TEXT NOT NULL,         -- Original text (for debugging/regeneration)
  duration_ms INTEGER,                -- Audio duration
  file_size_bytes INTEGER,
  category TEXT DEFAULT 'dynamic',    -- 'announcement' | 'dynamic'
  last_used_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

---

## Tool Registry Design

### Tool Categories & Definitions

Each tool calls repository/service code directly (no HTTP round-trip - localhost advantage).

#### Brain Tools (6 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `get_behavioral_context` | `behavioralContext.compute()` | Current focus, trends, patterns |
| `get_outcomes` | `outcomeRepository.getRecent()` | Recent implementation results |
| `get_reflection_status` | `reflectionRepository.getStatus()` | Reflection trigger info |
| `trigger_reflection` | `reflectionAgent.trigger()` | Start manual reflection |
| `get_signals` | `signalRepository.query()` | Raw behavioral signals |
| `get_insights` | `reflectionRepository.getInsights()` | Learning insights |

#### Direction Tools (5 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `generate_directions` | Direction generation pipeline | Create new directions |
| `list_directions` | `directionDb.getByProject()` | Browse existing directions |
| `get_direction_detail` | `directionDb.getById()` | Single direction info |
| `accept_direction` | Direction accept flow | Accept and queue |
| `reject_direction` | `directionDb.delete()` | Reject direction |

#### Idea Tools (5 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `browse_ideas` | `ideaDb.getNextPending()` | Get next idea to review |
| `accept_idea` | Idea accept flow | Accept idea |
| `reject_idea` | Idea reject flow | Reject idea |
| `generate_ideas` | Idea generation pipeline | Trigger idea generation |
| `get_idea_stats` | `ideaDb.getStats()` | Idea statistics |

#### Goal Tools (4 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `list_goals` | `goalDb.getGoalsByProject()` | All project goals |
| `create_goal` | `goalDb.createGoal()` | Create new goal |
| `update_goal` | `goalDb.updateGoal()` | Update status/details |
| `generate_goal_candidates` | Goal generation pipeline | AI-generated goals |

#### Context Tools (4 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `list_contexts` | `contextDb.getContextsByProject()` | All contexts for project |
| `get_context_detail` | `contextDb.getContextById()` | Detailed context info |
| `scan_contexts` | Context scan pipeline | Trigger context scan |
| `generate_description` | LLM description generator | AI context description |

#### Task/Execution Tools (4 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `get_queue_status` | `scanQueueDb.getItems()` | Current queue items |
| `queue_requirement` | Requirement queue system | Queue a requirement |
| `get_execution_status` | `claudeCodeManager.getStatus()` | Running executions |
| `get_implementation_logs` | `implementationLogDb.getRecent()` | Recent logs |

#### Project Tools (3 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `get_project_structure` | File system scanner | File tree |
| `list_projects` | `projectDb.getAllProjects()` | All projects |
| `get_project_files` | File system reader | Project files |

#### Standup/Reporting Tools (3 tools)
| Tool | Maps To | Purpose |
|------|---------|---------|
| `generate_standup` | Standup generation pipeline | AI standup report |
| `get_standup_history` | `standupDb.getHistory()` | Past standups |
| `run_automation` | Standup automation runner | Run standup automation |

**Total: 34 tools**

---

## Conversation State Machine

```
┌─────────┐     user message     ┌──────────┐
│  IDLE   │ ──────────────────> │ THINKING │
└─────────┘                      └────┬─────┘
     ^                                │
     │                    ┌───────────┴───────────┐
     │                    │                       │
     │              text response           tool_use block
     │                    │                       │
     │                    v                       v
     │            ┌──────────────┐      ┌──────────────┐
     │            │  RESPONDING  │      │  EXECUTING   │
     │            └──────┬───────┘      └──────┬───────┘
     │                   │                     │
     │                   │              tool result
     │                   │                     │
     │                   v                     v
     │            ┌──────────────┐      ┌──────────────┐
     └────────────│   DONE       │      │  LOOPING     │──┐
                  └──────────────┘      └──────────────┘  │
                                               │          │
                                               └──────────┘
                                          (more tool calls)
```

**Session Management**:
- Sessions persist in database with full message history
- Deep memory layers loaded progressively (not all at once)
- Session summary generated when messages exceed token window
- Cross-session topics retrieved by relevance scoring
- Brain context snapshot stored with each message for replay capability

---

## Proactive Notification System

### Event Sources

| Event | Trigger | Audio | Notification Content |
|-------|---------|-------|---------------------|
| Reflection complete | Brain reflection finishes | `reflection_complete.mp3` | "I've learned X new patterns..." |
| Outcome success | Direction implemented successfully | `implementation_success.mp3` | "Direction completed - 5 files changed" |
| Outcome failure | Implementation fails | `implementation_failed.mp3` | "Implementation encountered issues" |
| Revert detected | Git revert found | `revert_detected.mp3` | "Last implementation was reverted" |
| Threshold approaching | 18+ decisions | `threshold_approaching.mp3` | "Reflection coming soon (18/20)" |
| Pattern warning | Brain detects trend | `pattern_warning.mp3` | "3 of 5 recent implementations reverted" |

### SSE Stream Format

```typescript
interface AnnetteNotification {
  id: string;
  type: 'insight' | 'outcome' | 'warning' | 'suggestion' | 'status';
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  audioUrl: string | null;    // Local file path to cached audio
  actionable: boolean;
  suggestedAction?: {
    tool: string;
    description: string;
  };
  timestamp: string;
}
```

### Throttling Rules
- Max 1 notification per 5 minutes (low priority)
- Max 1 per minute (medium priority)
- Immediate for high priority (failures, reverts)
- User can mute for N minutes

---

## Legacy Code Deletion

Delete the entire legacy Annette codebase (never shipped, replaced by this design):

### Directories to Delete (rm -rf)
- `src/app/features/Annette/` - All components, hooks, libs, prompts, tools (40+ files)
- `src/app/annette/` - Chat dialog, LangGraph helpers, UI components
- `src/app/api/annette/` - All 6 legacy API routes

### Files to Delete
- `src/stores/annetteActionsStore.ts` - Legacy store

### References to Clean
- Remove Annette imports from `TopBar.tsx`
- Remove Annette case from `page.tsx` module switch
- Remove `'annette'` from `AppModule` type if present

**Total: ~50+ files removed**

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/annette/orchestrator.ts` | Core orchestration: message → brain context → claude-haiku-4-5 → tool dispatch → response |
| `src/lib/annette/toolRegistry.ts` | Tool definitions (Anthropic tool_use format) + execution dispatch |
| `src/lib/annette/tools/brain.ts` | Brain tool implementations |
| `src/lib/annette/tools/directions.ts` | Direction tool implementations |
| `src/lib/annette/tools/ideas.ts` | Idea tool implementations |
| `src/lib/annette/tools/goals.ts` | Goal tool implementations |
| `src/lib/annette/tools/contexts.ts` | Context tool implementations |
| `src/lib/annette/tools/tasks.ts` | Task/execution tool implementations |
| `src/lib/annette/tools/projects.ts` | Project tool implementations |
| `src/lib/annette/tools/standup.ts` | Standup tool implementations |
| `src/lib/annette/brainInjector.ts` | Formats brain context + deep memory for system prompt |
| `src/lib/annette/memoryManager.ts` | 5-layer memory: immediate, session, cross-session, brain, preferences |
| `src/lib/annette/audioCache.ts` | Local filesystem audio cache with LRU eviction |
| `src/lib/annette/notificationEngine.ts` | SSE notification generation + throttling + audio selection |
| `src/lib/annette/systemPrompt.ts` | Annette personality + instructions template |
| `src/app/api/annette/chat/route.ts` | Main chat endpoint (POST) - replaces legacy |
| `src/app/api/annette/stream/route.ts` | SSE notification stream (GET) |
| `src/app/api/annette/sessions/route.ts` | Session management (GET/POST/DELETE) |
| `src/app/api/annette/voice/route.ts` | Voice transcription + TTS with cache |
| `src/app/api/annette/audio/route.ts` | Serve cached audio files |
| `src/app/db/migrations/055_annette_v2.ts` | Schema: sessions, messages, memory_topics, preferences, audio_cache |
| `src/app/db/models/annette.types.ts` | TypeScript interfaces |
| `src/app/db/repositories/annette.repository.ts` | Session + message + memory CRUD |
| `src/app/features/Annette/AnnetteLayout.tsx` | Main UI: chat panel + notification area |
| `src/app/features/Annette/components/ChatPanel.tsx` | Message display + input |
| `src/app/features/Annette/components/VoiceButton.tsx` | Microphone toggle + waveform |
| `src/app/features/Annette/components/NotificationToast.tsx` | Proactive alert display |
| `src/app/features/Annette/components/ToolCallDisplay.tsx` | Shows tool executions inline |
| `src/app/features/Annette/components/MemoryIndicator.tsx` | Shows active memory layers |
| `src/app/features/Annette/index.ts` | Feature exports |
| `src/stores/annetteStore.ts` | UI state: messages, sessions, recording, notifications |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/stores/onboardingStore.ts` | Ensure `'annette'` in `AppModule` type |
| `src/components/Navigation/TopBar.tsx` | Update Annette navigation item |
| `src/app/page.tsx` | Update Annette case to load new AnnetteLayout |
| `src/app/db/index.ts` | Export annette repository |
| `src/app/db/migrations/index.ts` | Register migration 055 |
| `src/components/lazy/DeferredWidgets.tsx` | Add Annette floating widget option |

---

## System Prompt Template

```markdown
You are Annette, the intelligent development companion for Vibeman.

## Your Identity
You are the brain-powered voice of the development platform. You have deep awareness of the
user's project state, behavioral patterns, implementation history, and learned preferences
through the Brain system. You grow smarter with every interaction.

## Your Capabilities
- Report on project status, brain insights, and development patterns
- Generate and manage directions (improvement suggestions)
- Browse, accept, or reject ideas from the idea generation system
- Manage goals and track progress
- Trigger brain reflections and review learning insights
- Queue requirements for Claude Code execution
- Generate standup reports and run automation

## Current Brain Context
{brain_behavioral_context}

## Deep Memory
{session_summary}
{relevant_topics}
{user_preferences}

## Conversation Style
- Be concise but informative - you are a voice assistant first
- Proactively suggest next actions based on brain patterns
- Reference specific data (success rates, recent outcomes, trending areas)
- When the user asks "what should I work on next?", use brain context to prioritize
- Acknowledge completed actions with specific details
- Warn about concerning patterns (reverts, failures) diplomatically
- Remember past conversations and reference them naturally

## Important Rules
- Always confirm destructive actions before executing
- When generating directions/ideas, report what was generated
- Use brain context AND conversation history to personalize suggestions
- If brain has no data yet, explain the cold-start and suggest bootstrapping actions
- Reference past decisions when they're relevant to current context
```

---

## Implementation Phases

### Phase 1: Delete Legacy + Core Orchestration
1. Delete all legacy Annette code (directories listed above)
2. Create `src/lib/annette/orchestrator.ts` - claude-haiku-4-5 tool_use loop
3. Create `src/lib/annette/toolRegistry.ts` - Tool definitions
4. Create `src/lib/annette/systemPrompt.ts` - Template builder
5. Create `src/lib/annette/brainInjector.ts` - Brain context formatting
6. Create `src/app/api/annette/chat/route.ts` - Main endpoint
7. **Verify**: POST a text message, get Haiku response with brain awareness

### Phase 2: Tool Implementations
1. Create all tool files in `src/lib/annette/tools/`
2. Wire each tool to its corresponding repository/service
3. Test multi-tool conversations (e.g., "Show me my goals and generate a direction")
4. **Verify**: Multi-turn conversation with tool execution

### Phase 3: Deep Memory System
1. Create migration `055_annette_v2.ts` with all tables
2. Create `annette.repository.ts` with memory queries
3. Create `src/lib/annette/memoryManager.ts` - 5-layer memory system
4. Implement session summarization (Layer 2)
5. Implement cross-session topic extraction (Layer 3)
6. Implement preference learning (Layer 5)
7. **Verify**: Resume conversation across sessions with context preserved

### Phase 4: Local Audio Cache + Notifications
1. Create `database/audio-cache/` folder structure
2. Create `src/lib/annette/audioCache.ts` - filesystem cache manager
3. Generate initial announcement audio clips via ElevenLabs
4. Create `src/lib/annette/notificationEngine.ts` - SSE + audio
5. Create `src/app/api/annette/stream/route.ts` (SSE)
6. Hook into Brain signal collection (post-signal notifications)
7. **Verify**: Accept a direction → hear cached announcement audio

### Phase 5: UI & Voice Polish
1. Create Annette UI components (chat panel, voice button, toasts, memory indicator)
2. Create `src/stores/annetteStore.ts`
3. Wire voice input (ElevenLabs STT) and output (cached TTS)
4. Update TopBar navigation
5. Add floating widget option
6. **Verify**: Full voice conversation with tool execution, cached audio, and deep memory

---

## Example Conversations

### "What should I work on next?"
```
User: What should I work on next?

Annette: Based on your patterns from the last 7 days:

Your most active area is **TaskRunner** (12 file changes, 5 implementations).
You have an 80% success rate on recent directions.

I'd suggest:
1. **Continue TaskRunner momentum** - there are 2 pending directions in that area
2. **Address the scan queue reliability** - 2 implementations there were reverted
3. **Consider running a reflection** - you're at 18/20 decisions for auto-trigger

Last time we talked about TaskRunner, you mentioned wanting to add retry logic.
Want me to generate directions for that?
```

### Deep Memory in Action
```
User: Generate directions for TaskRunner

Annette: [Calls generate_directions with TaskRunner context]

I've generated 3 new directions:

1. **Add retry logic for failed batch items** - This aligns with what you mentioned
   in our last conversation about reliability
2. **Implement progress persistence across page reloads** - Your Brain data shows
   you've been working on UX polish this week
3. **Add execution time estimates** - Uses your historical completion patterns

Based on your preference for small, focused changes (learned from 15 past decisions),
I'd recommend starting with #1. Shall I accept it?
```

---

## Verification Plan

### Phase 1
```bash
# Verify legacy code deleted
ls src/app/features/Annette/  # Should show only new files
ls src/app/annette/            # Should not exist

# Test chat endpoint
curl -X POST http://localhost:3000/api/annette/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is my current project status?", "projectId": "xxx"}'

# Verify: Response uses claude-haiku-4-5
# Verify: Response includes brain context awareness
```

### Phase 2
```bash
# Test multi-tool conversation
curl -X POST http://localhost:3000/api/annette/chat \
  -d '{"message": "Show me my goals and suggest a direction", "projectId": "xxx"}'

# Verify: Multiple tool calls executed
# Verify: Response synthesizes tool results naturally
```

### Phase 3
```bash
# Test deep memory
# 1. Send message mentioning "retry logic"
# 2. Start new session
# 3. Ask about TaskRunner
# Verify: Annette references the retry logic topic from previous session
```

### Phase 4
```bash
# Verify audio cache
ls database/audio-cache/announcements/  # Should have pre-generated clips

# Test SSE stream
curl -N http://localhost:3000/api/annette/stream?projectId=xxx

# Accept a direction → verify cached audio notification
```

### Phase 5
```bash
# Navigate to Annette UI
# Test voice input/output with cached audio
# Verify memory indicator shows active layers
# Verify: Full conversational flow with personality
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tool call loops | Max 10 tool calls per conversation turn |
| Token overflow | 5-layer memory with fixed token budgets per layer |
| Memory bloat | Periodic compaction + LRU for topics |
| Audio cache disk usage | 500MB cap with LRU eviction |
| Stale brain context | Refresh at start of each turn |
| Notification spam | Throttling rules + user mute control |
| Haiku hallucinations | Tools provide real data, model just orchestrates |
| Cold start | Graceful degradation: each layer works independently |
