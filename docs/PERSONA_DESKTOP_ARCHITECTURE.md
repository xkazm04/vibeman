# Personas — Platform Architecture

**Product**: Personas (formerly Vibeman Personas module)
**Repositories**: `personas-desktop`, `personas-web`, `personas-cloud` (formerly `dac-cloud`)
**Status**: Architecture Design
**Date**: 2026-02-16

---

## 1. Vision & Product Overview

Personas is an AI agent platform that lets users build, execute, and orchestrate intelligent agents powered by Claude Code CLI. Agents are defined in natural language, can access any API through tools, coordinate via an event bus, and operate locally or in the cloud 24/7.

### 1.1 Product Principles

1. **Desktop-first, cloud-optional** — Full feature set works offline on a user's machine. Cloud is a power upgrade, never a requirement.
2. **Local bus always available** — The event bus, orchestrator, and scheduler run locally without any cloud dependency. Agents coordinate on your machine out of the box.
3. **One-click cloud when ready** — When a user wants 24/7 operation, one click deploys the orchestrator and event bus to the cloud. Two paths: bring your own infrastructure keys, or use our managed infrastructure via subscription.
4. **No key exposure on managed plans** — Users on our managed infrastructure never handle cloud provider keys. They authenticate with Google OAuth, subscribe, and we provision everything. Their Claude subscription token is the only secret, encrypted end-to-end.
5. **Windows 11 first** — Desktop app is primarily designed for Windows 11, with macOS and Linux support following.

### 1.2 Three Applications

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PERSONAS PLATFORM                           │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  personas-web   │  │ personas-desktop │  │  personas-cloud   │  │
│  │                 │  │                  │  │                   │  │
│  │  Next.js 16     │  │  Tauri 2 + React │  │  Node.js services │  │
│  │                 │  │                  │  │                   │  │
│  │  - Registration │  │  - Full persona  │  │  - Orchestrator   │  │
│  │  - OAuth login  │  │    management    │  │  - Worker pool    │  │
│  │  - App download │  │  - Local exec    │  │  - Event bus      │  │
│  │  - Feature tour │  │  - Local bus     │  │    (Kafka)        │  │
│  │  - Subscription │  │  - Observability │  │  - Credential     │  │
│  │    management   │  │  - Cloud deploy  │  │    vault          │  │
│  │  - Blog/Docs    │  │  - Team canvas   │  │  - Token mgmt    │  │
│  │                 │  │  - Design engine │  │                   │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘  │
│           │                    │                      │             │
│           └────────────┬───────┴──────────────────────┘             │
│                        │                                            │
│              ┌─────────▼──────────┐                                 │
│              │     Supabase       │                                 │
│              │                    │                                 │
│              │  - Google OAuth    │                                 │
│              │  - User profiles   │                                 │
│              │  - Subscriptions   │                                 │
│              │  - License keys    │                                 │
│              └────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 User Journey

```
1. DISCOVER         → personas.dev (web app)
                       Feature presentation, demo videos

2. SIGN UP          → Google OAuth via Supabase
                       Account created, free tier activated

3. DOWNLOAD         → Download personas-desktop installer (.exe)
                       Guided onboarding: Claude CLI check, API key, first persona

4. BUILD LOCALLY    → Create personas, configure tools, test executions
                       Everything runs on local machine, local event bus

5. GO CLOUD         → One-click deploy from desktop app
   (optional)          Option A: BYOI — enter your Fly.io/DO keys
                       Option B: Managed — subscribe, we provision everything

6. OPERATE 24/7     → Agents run in cloud, stream output to desktop
                       Schedule triggers, webhook triggers, agent-to-agent events
```

---

## 2. System Architecture

### 2.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER'S WINDOWS 11 MACHINE                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    PERSONAS DESKTOP (Tauri 2.0)                    │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                   React 19 Webview                          │  │  │
│  │  │                                                             │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │  │  │
│  │  │  │ Zustand   │ │ React    │ │ Tailwind  │ │ Framer      │  │  │  │
│  │  │  │ Stores    │ │ Flow     │ │ CSS 4     │ │ Motion      │  │  │  │
│  │  │  └─────┬─────┘ └──────────┘ └───────────┘ └─────────────┘  │  │  │
│  │  │        │                                                    │  │  │
│  │  │  ┌─────▼──────────────────────────────────────────────────┐ │  │  │
│  │  │  │              Tauri IPC Bridge (invoke / listen)         │ │  │  │
│  │  │  └─────┬──────────────────────────────────────────────────┘ │  │  │
│  │  └────────┼────────────────────────────────────────────────────┘  │  │
│  │           │                                                       │  │
│  │  ┌────────▼────────────────────────────────────────────────────┐  │  │
│  │  │                    Rust Backend                              │  │  │
│  │  │                                                              │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │  │
│  │  │  │Execution │ │ Design   │ │ Local    │ │  Credential  │   │  │  │
│  │  │  │ Engine   │ │ Engine   │ │ Event    │ │    Vault     │   │  │  │
│  │  │  │          │ │(sidecar) │ │ Bus      │ │ (Stronghold) │   │  │  │
│  │  │  └────┬─────┘ └──────────┘ └────┬─────┘ └──────────────┘   │  │  │
│  │  │       │                         │                            │  │  │
│  │  │  ┌────▼─────┐            ┌──────▼──────┐  ┌─────────────┐  │  │  │
│  │  │  │ Claude   │            │  Scheduler  │  │ Cloud       │  │  │  │
│  │  │  │ CLI      │            │ (tokio)     │  │ Connector   │  │  │  │
│  │  │  │ Process  │            │             │  │ (HTTP/WS)   │  │  │  │
│  │  │  └──────────┘            └─────────────┘  └──────┬──────┘  │  │  │
│  │  │                                                   │         │  │  │
│  │  │  ┌────────────────────────────────────────────────┴──────┐  │  │  │
│  │  │  │              SQLite (rusqlite, WAL mode)              │  │  │  │
│  │  │  └──────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐        │  │
│  │  │ System Tray  │  │  Deep Links  │  │  Auto-Updater   │        │  │
│  │  │ (scheduler)  │  │  (OAuth)     │  │  (releases)     │        │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────┐                                       │
│  │  Supabase Auth SDK          │  ← Google OAuth session                │
│  │  (offline token cached)     │                                        │
│  └──────────────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘
            │
            │  HTTPS / WSS (when cloud connected)
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          PERSONAS CLOUD                                  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR (Node.js)                          │  │
│  │                                                                   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │ HTTP API │ │ Worker   │ │ Kafka    │ │ Cred     │            │  │
│  │  │          │ │ Pool     │ │ Bridge   │ │ Vault    │            │  │
│  │  └──────────┘ └────┬─────┘ └──────────┘ └──────────┘            │  │
│  │  ┌──────────┐      │       ┌──────────┐ ┌──────────┐            │  │
│  │  │ Token    │      │       │ Metrics  │ │ Deploy   │            │  │
│  │  │ Manager  │      │       │ Collector│ │ Manager  │            │  │
│  │  └──────────┘      │       └──────────┘ └──────────┘            │  │
│  └────────────────────┼─────────────────────────────────────────────┘  │
│                       │ WebSocket (JSON, TLS)                          │
│              ┌────────┼────────────────┐                               │
│              ▼        ▼                ▼                                │
│       ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│       │ Worker 1 │ │ Worker 2 │ │ Worker N │                          │
│       │Claude CLI│ │Claude CLI│ │ (burst)  │                          │
│       └──────────┘ └──────────┘ └──────────┘                          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    KAFKA (Upstash)                                 │  │
│  │  persona.exec.v1 │ persona.output.v1 │ persona.events.v1         │  │
│  │  persona.lifecycle.v1 │ persona.dlq.v1                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Patterns

```
┌──────────────────────────────────────────────────────────────┐
│                    COMMUNICATION MAP                          │
│                                                              │
│  Desktop ←→ Supabase     : HTTPS (auth, profile, license)   │
│  Desktop ←→ Orchestrator : HTTPS (execute, status, deploy)  │
│  Desktop ←→ Orchestrator : WSS   (output streaming)         │
│  Orchestrator ←→ Workers : WSS   (assign, output, events)   │
│  Orchestrator ←→ Kafka   : TCP   (event bus, execution q)   │
│  Web ←→ Supabase         : HTTPS (auth, subscription)       │
│  Web ←→ Stripe           : HTTPS (billing)                  │
│                                                              │
│  Desktop NEVER talks to Kafka directly.                      │
│  Desktop NEVER talks to Workers directly.                    │
│  Workers NEVER talk to Supabase.                             │
│  Web NEVER talks to Orchestrator.                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Desktop App — `personas-desktop`

### 3.1 Why Tauri 2.0 + React 19

| Factor | Decision driver |
|--------|----------------|
| **Component reuse** | ~95% of 58 React components port unchanged from Vibeman |
| **App footprint** | 8-15 MB installer vs 150-200 MB Electron |
| **Native feel** | OS-native window chrome, system tray, deep links, file dialogs |
| **Security** | No full Node.js in renderer. Rust backend with explicit IPC permissions |
| **CLI spawning** | Rust `tokio::process::Command` for Claude CLI with async stdout streaming |
| **SQLite** | `rusqlite` replaces `better-sqlite3` — same raw SQL, same WAL mode |
| **Crypto** | `tauri-plugin-stronghold` for credential vault, Rust `aes`/`pbkdf2` for data |
| **OAuth** | `tauri-plugin-deep-link` for Supabase Google OAuth callback |
| **Streaming** | Tauri events (`emit`/`listen`) replace SSE — bidirectional, no HTTP overhead |

### 3.2 Tauri Project Structure

```
personas-desktop/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/
│   │   └── default.json                 # IPC permission declarations
│   ├── icons/
│   ├── src/
│   │   ├── main.rs                      # App entry, plugin registration
│   │   ├── lib.rs                       # Command registration
│   │   │
│   │   ├── commands/                    # IPC handlers (replaces 60 API routes)
│   │   │   ├── mod.rs
│   │   │   ├── personas.rs              # CRUD
│   │   │   ├── executions.rs            # Execute + stream output
│   │   │   ├── design.rs                # Design analysis
│   │   │   ├── credentials.rs           # CRUD + healthcheck
│   │   │   ├── events.rs                # Event bus + subscriptions
│   │   │   ├── messages.rs              # Messaging
│   │   │   ├── teams.rs                 # Team canvas
│   │   │   ├── tools.rs                 # Tool definitions
│   │   │   ├── triggers.rs              # Trigger management
│   │   │   ├── observability.rs         # Metrics + versions
│   │   │   ├── groups.rs                # Persona groups
│   │   │   ├── memories.rs              # Persona memories
│   │   │   ├── healing.rs               # Healing issues
│   │   │   ├── auth.rs                  # Supabase OAuth bridge
│   │   │   └── cloud.rs                 # Cloud deployment control
│   │   │
│   │   ├── engine/                      # Core logic (replaces src/lib/personas/)
│   │   │   ├── mod.rs
│   │   │   ├── execution.rs             # Claude CLI spawn + stdout streaming
│   │   │   ├── prompt.rs                # Prompt assembly
│   │   │   ├── queue.rs                 # Execution queue (tokio::sync::Semaphore)
│   │   │   ├── scheduler.rs             # Trigger scheduler (tokio interval tasks)
│   │   │   ├── events.rs                # Local event bus (SQLite polling + dispatch)
│   │   │   ├── crypto.rs                # AES-256-CBC + PBKDF2 for data encryption
│   │   │   ├── delivery.rs              # Notification delivery (reqwest)
│   │   │   ├── healing.rs               # Auto-healing engine
│   │   │   └── templates.rs             # Credential/connector templates
│   │   │
│   │   ├── cloud/                       # Cloud integration layer
│   │   │   ├── mod.rs
│   │   │   ├── client.rs                # HTTP/WSS client to orchestrator
│   │   │   ├── deployer.rs              # BYOI deployment via provider APIs
│   │   │   ├── sync.rs                  # Execution result sync (cloud → local DB)
│   │   │   └── subscription.rs          # License validation via Supabase
│   │   │
│   │   ├── db/                          # Database layer
│   │   │   ├── mod.rs                   # Connection pool (r2d2 + rusqlite)
│   │   │   ├── migrations.rs            # Schema migrations (refinery)
│   │   │   ├── models.rs                # Struct definitions (22+ tables)
│   │   │   └── repos/                   # Repository pattern
│   │   │       ├── mod.rs
│   │   │       ├── personas.rs
│   │   │       ├── tools.rs
│   │   │       ├── triggers.rs
│   │   │       ├── executions.rs
│   │   │       ├── credentials.rs
│   │   │       ├── events.rs
│   │   │       ├── messages.rs
│   │   │       ├── teams.rs
│   │   │       ├── metrics.rs
│   │   │       ├── reviews.rs
│   │   │       ├── groups.rs
│   │   │       ├── memories.rs
│   │   │       └── healing.rs
│   │   │
│   │   └── sidecar/                     # Node.js sidecar for complex LLM logic
│   │       ├── mod.rs
│   │       └── design.rs                # Design engine bridge
│   │
│   ├── sidecars/                        # Bundled Node.js scripts
│   │   └── persona-engine/
│   │       ├── designEngine.js           # Compiled from TS (esbuild single-file)
│   │       ├── testRunner.js
│   │       ├── testEvaluator.js
│   │       └── package.json
│   │
│   └── resources/                       # Bundled assets
│       └── persona-tools/               # Tool scripts
│           ├── gmail/
│           ├── http/
│           └── ...
│
├── src/                                 # React 19 frontend (webview)
│   ├── main.tsx                         # Entry point
│   ├── App.tsx                          # Root component + router
│   ├── routes/                          # React Router pages
│   │   ├── Dashboard.tsx
│   │   ├── PersonaEditor.tsx
│   │   ├── ExecutionView.tsx
│   │   ├── DesignStudio.tsx
│   │   ├── TeamCanvas.tsx
│   │   ├── Observability.tsx
│   │   ├── Memories.tsx
│   │   ├── Settings.tsx
│   │   ├── CloudDeploy.tsx
│   │   └── Onboarding.tsx
│   │
│   ├── components/                      # Migrated from Vibeman (58 components)
│   │   ├── personas/                    # Persona management
│   │   ├── execution/                   # Execution & monitoring
│   │   ├── design/                      # Design & analysis
│   │   ├── credentials/                 # Credential management
│   │   ├── events/                      # Events & messaging
│   │   ├── team/                        # Team canvas
│   │   ├── realtime/                    # Real-time visualization
│   │   ├── observability/               # Metrics & healing
│   │   ├── cloud/                       # Cloud deployment UI
│   │   └── shared/                      # Common UI components
│   │
│   ├── hooks/                           # React hooks
│   │   ├── usePersonaExecution.ts
│   │   ├── useDesignAnalysis.ts
│   │   ├── useDesignReviews.ts
│   │   ├── useRealtimeEvents.ts
│   │   ├── useConnectorDiscovery.ts
│   │   └── useAuth.ts                   # Supabase auth hook
│   │
│   ├── stores/                          # Zustand stores
│   │   ├── personaStore.ts              # Main persona state (~1000 lines)
│   │   ├── authStore.ts                 # Auth + subscription state
│   │   └── cloudStore.ts                # Cloud deployment state
│   │
│   ├── api/                             # Tauri IPC client layer
│   │   ├── tauriApi.ts                  # invoke() wrappers (replaces personaApi.ts)
│   │   ├── cloudApi.ts                  # Cloud orchestrator HTTP client
│   │   └── supabaseClient.ts            # Supabase JS client
│   │
│   ├── lib/                             # Shared utilities
│   │   ├── types.ts                     # Frontend type definitions
│   │   └── designTypes.ts               # Design engine types
│   │
│   └── styles/
│       └── globals.css                  # Tailwind CSS 4
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts                       # Vite bundler for webview
└── index.html
```

### 3.3 Layer Mapping: Vibeman Next.js → Tauri Desktop

#### Frontend (Webview) — Minimal Changes

| Current (Next.js) | Target (Tauri) | Change required |
|---|---|---|
| 58 React components | Same components, same files | Remove `'use client'` directives |
| Tailwind CSS classes | Identical | None |
| Framer Motion animations | Identical | None |
| Recharts (analytics) | Identical | None |
| React Flow (team canvas) | Identical | None |
| Lucide React icons | Identical | None |
| react-markdown + rehype | Identical | None |
| Zustand personaStore (987 lines) | Identical store | Replace `fetch()` calls with `invoke()` |
| personaApi.ts (798 lines) | **Rewrite** → tauriApi.ts | `fetch('/api/...')` → `invoke('cmd_name', {...})` |
| SSE EventSource (5 streams) | **Replace** → Tauri `listen()` | ~5 streaming hooks rewritten |
| Next.js router (`useRouter`) | React Router v7 | Straightforward swap |
| Supabase client | Same `@supabase/supabase-js` | Works in webview unchanged |

**Estimated frontend changes**: ~900 lines rewritten (tauriApi + hooks + auth), ~28,000 lines unchanged.

#### API Layer — Eliminated

The 60 Next.js API routes are replaced by ~16 Rust `#[tauri::command]` modules. Each route's body (validation + DB call + response) becomes a Rust function. Request/response shapes stay identical — transported via IPC instead of HTTP.

#### Backend Engines — Rust Native + Node Sidecar

**Rust native** (hot paths, security-sensitive):

| Engine | Rust module | Notes |
|--------|------------|-------|
| `executionEngine.ts` (774 LOC) | `engine::execution` | `tokio::process::Command` + async stdout streaming |
| `promptAssembler.ts` | `engine::prompt` | String building — straightforward port |
| `credentialCrypto.ts` | `engine::crypto` | `aes` + `pbkdf2` crates, or Stronghold vault |
| `executionQueue.ts` | `engine::queue` | `tokio::sync::Semaphore` for concurrency |
| `eventBus.ts` | `engine::events` | `tokio::time::interval` polling + `app.emit()` |
| `triggerScheduler.ts` | `engine::scheduler` | `tokio::spawn` + cron parsing |
| `messageDelivery.ts` | `engine::delivery` | `reqwest` for Slack/Telegram HTTP |
| `healingEngine.ts` | `engine::healing` | Error detection + auto-recovery |

**Node.js sidecar** (complex LLM logic, changes frequently):

| Engine | Sidecar script | Notes |
|--------|---------------|-------|
| `designEngine.ts` (1,152 LOC) | `designEngine.js` | Complex LLM prompt logic |
| `testRunner.ts` (530 LOC) | `testRunner.js` | Test execution framework |
| `testEvaluator.ts` (565 LOC) | `testEvaluator.js` | LLM-based test evaluation |
| `connectorDiscovery.ts` | Part of designEngine | Discovery logic |

#### Database Layer — Driver Swap

```
Current:  better-sqlite3 (Node native addon)
Target:   rusqlite + r2d2 connection pool (Rust native)
```

Same 22+ tables, same SQL, same WAL mode. Migrations ported to `refinery` crate.

### 3.4 Local Event Bus Architecture

The local event bus is the core value of the desktop app. It enables agent-to-agent communication without any cloud dependency.

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL EVENT BUS                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SQLite: persona_events table            │    │
│  │                                                     │    │
│  │  Events are INSERTed by:                            │    │
│  │  - Agent executions (emit_event protocol)           │    │
│  │  - Webhook triggers (HTTP → event)                  │    │
│  │  - Schedule triggers (cron → event)                 │    │
│  │  - User actions (UI → event)                        │    │
│  │                                                     │    │
│  │  Events are consumed by:                            │    │
│  │  - Subscription matcher (persona → execution)       │    │
│  │  - UI real-time feed (Tauri emit to webview)        │    │
│  │  - Notification delivery (Slack/Telegram/email)     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌───────────────────┐    ┌──────────────────────────┐     │
│  │ Polling Loop      │    │ Scheduler                │     │
│  │ (tokio interval)  │    │ (tokio cron tasks)       │     │
│  │                   │    │                          │     │
│  │ Every 2s:         │    │ Evaluates trigger rules: │     │
│  │ - Check pending   │    │ - Cron schedules         │     │
│  │   events          │    │ - Webhook matches        │     │
│  │ - Match subs      │    │ - Event subscriptions    │     │
│  │ - Dispatch to     │    │ - Fires executions       │     │
│  │   execution queue │    │                          │     │
│  └───────────────────┘    └──────────────────────────┘     │
│                                                             │
│  This runs entirely on the user's machine.                  │
│  No internet required. No cloud dependency.                 │
│  Agents coordinate through SQLite events.                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Streaming — Tauri Events Replace SSE

```rust
// Rust backend — emits execution output as Tauri events
app.emit("execution-output", ExecutionLine {
    execution_id: id.clone(),
    text: line,
    line_type: "assistant",
});
```

```typescript
// React frontend — listens to Tauri events (replaces EventSource)
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<ExecutionLine>('execution-output', (event) => {
  appendOutput(event.payload);
});
```

6 SSE streams to convert:
1. Execution output stream
2. Design analysis stream
3. Design review test stream
4. Connector discovery stream
5. Design feasibility test stream
6. Real-time event bus feed

### 3.6 Desktop IPC Pattern

```typescript
// src/api/tauriApi.ts — replaces personaApi.ts (798 lines)
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const tauriApi = {
  // Persona CRUD
  listPersonas: () => invoke<Persona[]>('list_personas'),
  getPersona: (id: string) => invoke<Persona>('get_persona', { id }),
  createPersona: (data: CreatePersonaInput) => invoke<Persona>('create_persona', { data }),
  updatePersona: (id: string, data: UpdatePersonaInput) =>
    invoke<Persona>('update_persona', { id, data }),
  deletePersona: (id: string) => invoke('delete_persona', { id }),

  // Execution
  executePersona: (id: string, input: object) =>
    invoke('execute_persona', { id, input }),
  cancelExecution: (id: string) => invoke('cancel_execution', { id }),

  // Streaming (replaces SSE)
  onExecutionOutput: (cb: (line: ExecutionLine) => void) =>
    listen<ExecutionLine>('execution-output', (e) => cb(e.payload)),
  onDesignOutput: (cb: (chunk: DesignChunk) => void) =>
    listen<DesignChunk>('design-output', (e) => cb(e.payload)),
  onEventBus: (cb: (event: PersonaEvent) => void) =>
    listen<PersonaEvent>('event-bus', (e) => cb(e.payload)),

  // Cloud (HTTP to orchestrator, not IPC)
  cloud: {
    deploy: (config: DeployConfig) => invoke('cloud_deploy', { config }),
    getStatus: () => invoke('cloud_status'),
    destroy: () => invoke('cloud_destroy'),
    executeRemote: (id: string, input: object) =>
      invoke('cloud_execute', { id, input }),
  },
};
```

### 3.7 Native Features

| Feature | Plugin / Approach | Purpose |
|---------|-------------------|---------|
| System tray | `tauri-plugin-positioner` | Scheduler status, quick-launch |
| Deep links | `tauri-plugin-deep-link` | `personas://oauth/callback` for Supabase OAuth |
| Auto-update | `tauri-plugin-updater` | GitHub Releases update channel |
| Notifications | `tauri-plugin-notification` | Execution alerts, event notifications |
| Credential vault | `tauri-plugin-stronghold` | Encrypted credential storage |
| Window state | `tauri-plugin-store` | Persist window size, position, sidebar width |
| File system | `tauri-plugin-fs` | Log file access, tool scripts |
| Shell | `tauri-plugin-shell` | Claude CLI + Node.js sidecar spawning |

### 3.8 Onboarding Flow

```
┌─────────────────────────────────────┐
│  1. Welcome Screen                  │
│     "Personas" branding + logo      │
│     [Sign in with Google]           │
│     └─ Supabase OAuth deep link     │
│                                     │
│  2. System Check                    │
│     ├── Claude CLI installed? ✓/✗   │
│     ├── API key configured? ✓/✗     │
│     ├── Node.js available? ✓/✗      │
│     └── [Auto-install missing deps] │
│                                     │
│  3. First Persona                   │
│     ├── Template gallery (8 presets)│
│     ├── Or "Design from scratch"    │
│     └── Quick test execution        │
│                                     │
│  4. Dashboard                       │
│     Full app with system tray icon  │
│     Local event bus running         │
│     Cloud deploy CTA (optional)     │
└─────────────────────────────────────┘
```

---

## 4. Web App — `personas-web`

### 4.1 Scope

The web app is intentionally minimal. It is a marketing site, authentication portal, and subscription management dashboard. It does NOT run personas, execute agents, or manage credentials.

### 4.2 Pages

| Route | Purpose | Auth required |
|-------|---------|---------------|
| `/` | Landing page — hero, value proposition, demo video | No |
| `/features` | Feature showcase with screenshots/animations | No |
| `/pricing` | Subscription tiers, comparison table | No |
| `/docs` | Documentation, tutorials, API reference | No |
| `/blog` | Product updates, use cases, tutorials | No |
| `/login` | Google OAuth via Supabase | No |
| `/dashboard` | Post-login: subscription status, download links | Yes |
| `/dashboard/subscription` | Manage subscription, billing history (Stripe portal) | Yes |
| `/dashboard/download` | Download desktop app for current OS | Yes |
| `/dashboard/api-keys` | Manage API keys for cloud orchestrator | Yes |

### 4.3 Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 | Static generation for marketing pages, server for dashboard |
| Auth | Supabase Auth | Google OAuth provider |
| Billing | Stripe | Checkout, portal, webhooks |
| Styling | Tailwind CSS 4 | Consistent with desktop app |
| Hosting | Vercel | Zero-config deployment |
| Analytics | PostHog or Plausible | Privacy-respecting analytics |
| CMS | MDX (blog/docs) | No external CMS dependency |

### 4.4 Project Structure

```
personas-web/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── features/page.tsx           # Feature showcase
│   │   ├── pricing/page.tsx            # Pricing tiers
│   │   ├── docs/                       # Documentation (MDX)
│   │   ├── blog/                       # Blog (MDX)
│   │   ├── login/page.tsx              # Google OAuth
│   │   ├── auth/callback/route.ts      # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── subscription/page.tsx   # Stripe portal
│   │   │   ├── download/page.tsx       # Desktop app download
│   │   │   └── api-keys/page.tsx       # API key management
│   │   └── api/
│   │       ├── webhooks/stripe/route.ts # Stripe webhooks
│   │       └── download/route.ts        # Signed download URLs
│   │
│   ├── components/
│   │   ├── marketing/                  # Landing page components
│   │   ├── dashboard/                  # Dashboard components
│   │   └── shared/                     # Header, footer, etc.
│   │
│   └── lib/
│       ├── supabase.ts                 # Supabase client (server + client)
│       └── stripe.ts                   # Stripe utilities
│
├── content/
│   ├── docs/                           # MDX documentation
│   └── blog/                           # MDX blog posts
│
├── public/
│   ├── screenshots/                    # Desktop app screenshots
│   └── videos/                         # Demo videos
│
├── package.json
├── next.config.ts
└── tailwind.config.ts
```

### 4.5 Supabase Integration (Web)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Server-side: manages subscriptions, generates download URLs
// Client-side: handles Google OAuth flow

// Tables in Supabase:
// - profiles (id, email, display_name, avatar_url, created_at)
// - subscriptions (id, user_id, stripe_customer_id, plan, status, limits)
// - api_keys (id, user_id, key_hash, name, created_at, last_used_at)
// - downloads (id, user_id, platform, version, downloaded_at)
```

---

## 5. Cloud Architecture — `personas-cloud`

### 5.1 Current State (Phases 1-2 Complete)

The cloud infrastructure (`dac-cloud`, to be renamed `personas-cloud`) already has working implementations of:

- **Orchestrator** (~1,200 LOC): HTTP API (11 endpoints), WebSocket worker pool, Kafka integration, OAuth token management, execution dispatching
- **Worker** (~600 LOC): WebSocket client with auto-reconnect, Claude CLI execution, stdout streaming, persona protocol parsing, credential cleanup
- **Shared** (~350 LOC): Protocol types, AES-256-GCM crypto, message definitions

### 5.2 Evolution for Personas Platform

The cloud layer needs these additions for the standalone product:

#### 5.2.1 Supabase Auth Validation

The orchestrator must validate that incoming requests come from authenticated Personas users with active subscriptions.

```
Desktop App                    Orchestrator                  Supabase
    │                              │                            │
    │  1. HTTP request with        │                            │
    │     Supabase JWT             │                            │
    │─────────────────────────────▶│                            │
    │                              │  2. Verify JWT             │
    │                              │─────────────────────────▶│
    │                              │  3. Check subscription     │
    │                              │◀─────────────────────────│
    │                              │                            │
    │                              │  4. Check plan limits      │
    │                              │     (events/executions     │
    │                              │      remaining)            │
    │                              │                            │
    │  5. Accept/reject            │                            │
    │◀─────────────────────────────│                            │
```

#### 5.2.2 Plan-Based Rate Limiting

```typescript
// Orchestrator enforces plan limits
interface PlanLimits {
  maxExecutionsPerMonth: number;    // e.g., 100 for Starter, 1000 for Pro
  maxEventsPerMonth: number;        // e.g., 500 for Starter, 10000 for Pro
  maxConcurrentWorkers: number;     // e.g., 1 for Starter, 3 for Pro
  maxExecutionTimeoutMs: number;    // e.g., 300000 for Starter, 900000 for Pro
  burstWorkersAllowed: boolean;     // false for Starter, true for Pro
}
```

#### 5.2.3 BYOI Deployment Mode

For users who bring their own infrastructure keys, the desktop app orchestrates deployment directly:

```
Desktop App (Rust cloud::deployer)
    │
    ├─ 1. User enters Fly.io API token
    │     (stored in Stronghold vault)
    │
    ├─ 2. Desktop provisions via Fly.io Machines API:
    │     - Create orchestrator machine
    │     - Set env vars (MASTER_KEY, WORKER_TOKEN, etc.)
    │     - Wait for health check
    │
    ├─ 3. Desktop provisions workers via DO/Fly API:
    │     - Create worker machine(s)
    │     - Set ORCHESTRATOR_URL pointing to step 2
    │     - Wait for WebSocket connection
    │
    ├─ 4. Desktop provisions Kafka topics:
    │     - Upstash REST API (user provides API key)
    │     - Create 5 topics
    │
    └─ 5. Desktop stores deployment config locally:
         - orchestrator_url
         - worker_count
         - kafka_config
         - All encrypted in Stronghold
```

#### 5.2.4 Managed Deployment Mode

For subscription users, deployment is fully managed:

```
Desktop App                    Personas API                  Cloud Infra
    │                         (personas-web)                     │
    │  1. Click "Deploy"           │                             │
    │     (sends Supabase JWT)     │                             │
    │─────────────────────────────▶│                             │
    │                              │  2. Validate subscription   │
    │                              │  3. Provision orchestrator  │
    │                              │─────────────────────────────▶│
    │                              │  4. Provision workers       │
    │                              │─────────────────────────────▶│
    │                              │  5. Provision Kafka         │
    │                              │─────────────────────────────▶│
    │                              │                             │
    │  6. Return orchestrator_url  │                             │
    │◀─────────────────────────────│                             │
    │                              │                             │
    │  7. Desktop connects         │                             │
    │     directly to orchestrator │                             │
    │─────────────────────────────────────────────────────────▶│
```

### 5.3 Credential Security for Managed Plans

On managed infrastructure, users never handle cloud provider keys. Their only secrets are:
- **Google account** (OAuth, never stored by us)
- **Claude subscription token** (encrypted end-to-end, injected per-execution)
- **3rd-party credentials** (encrypted with deployment master key, only decrypted in worker memory during execution)

```
┌─────────────────────────────────────────────────────────────┐
│              CREDENTIAL SECURITY MODEL                       │
│                                                             │
│  USER'S SECRETS:                                            │
│  ├── Google OAuth → Supabase handles, we get JWT only       │
│  ├── Claude token → encrypted in transit (TLS),             │
│  │                  encrypted at rest (AES-256-GCM),        │
│  │                  decrypted only in worker memory          │
│  └── 3rd-party creds → same encryption chain                │
│                                                             │
│  MANAGED INFRA SECRETS (user never sees):                   │
│  ├── Fly.io API token → our account                         │
│  ├── DO API token → our account                             │
│  ├── Kafka credentials → our Upstash account                │
│  └── Master encryption key → per-deployment, in Fly secrets │
│                                                             │
│  ISOLATION:                                                 │
│  ├── Each user gets isolated orchestrator namespace          │
│  ├── Workers are single-tenant (one user per worker pool)   │
│  ├── Kafka topics namespaced per deployment                 │
│  └── No credential data written to disk on workers          │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Cloud Project Structure (Evolution)

```
personas-cloud/                          # Renamed from dac-cloud
├── packages/
│   ├── shared/                          # (existing) Shared types + crypto
│   │   └── src/
│   │       ├── protocol.ts
│   │       ├── crypto.ts
│   │       ├── types.ts
│   │       └── plans.ts                 # NEW: Plan definitions + limits
│   │
│   ├── orchestrator/                    # (existing) Orchestration service
│   │   └── src/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── auth.ts                  # MODIFIED: Add Supabase JWT validation
│   │       ├── httpApi.ts
│   │       ├── dispatcher.ts
│   │       ├── workerPool.ts
│   │       ├── kafka.ts
│   │       ├── tokenManager.ts
│   │       ├── oauth.ts
│   │       ├── rateLimiter.ts           # NEW: Plan-based rate limiting
│   │       └── metering.ts             # NEW: Usage metering for billing
│   │
│   └── worker/                          # (existing) Worker process
│       └── src/
│           ├── index.ts
│           ├── config.ts
│           ├── connection.ts
│           ├── executor.ts
│           ├── parser.ts
│           └── cleanup.ts
│
├── infra/                               # Infrastructure automation
│   ├── deploy.ts                        # Provisioning script
│   ├── destroy.ts                       # Teardown script
│   └── templates/
│       ├── fly.toml                     # Fly.io machine config
│       └── docker-compose.yml           # Local development
│
├── package.json
├── turbo.json
└── tsconfig.base.json
```

---

## 6. Authentication & Identity

### 6.1 Unified Auth via Supabase

Both the web app and desktop app use Supabase with Google OAuth as the identity provider. This gives users a single account across the entire platform.

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTH FLOW: WEB APP                          │
│                                                              │
│  User clicks "Sign in with Google"                           │
│       │                                                      │
│       ▼                                                      │
│  Supabase Auth redirects to Google consent screen            │
│       │                                                      │
│       ▼                                                      │
│  Google returns auth code to Supabase callback               │
│       │                                                      │
│       ▼                                                      │
│  Supabase creates/updates user, returns JWT                  │
│       │                                                      │
│       ▼                                                      │
│  Web app stores session in cookie (httpOnly, secure)         │
│  Dashboard accessible                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    AUTH FLOW: DESKTOP APP                      │
│                                                              │
│  User clicks "Sign in with Google" in Tauri app              │
│       │                                                      │
│       ▼                                                      │
│  Tauri opens system browser with Supabase OAuth URL          │
│       │                                                      │
│       ▼                                                      │
│  User completes Google consent in browser                    │
│       │                                                      │
│       ▼                                                      │
│  Supabase redirects to personas://auth/callback              │
│       │                                                      │
│       ▼                                                      │
│  tauri-plugin-deep-link receives callback with tokens        │
│       │                                                      │
│       ▼                                                      │
│  Rust backend stores refresh token in Stronghold vault       │
│  Access token used for API calls                             │
│  User profile displayed in app header                        │
│                                                              │
│  OFFLINE MODE:                                               │
│  If no internet, app works fully with cached auth.           │
│  All local features available. Cloud features greyed out.    │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Supabase Schema

```sql
-- Supabase (cloud database, shared between web and desktop)

-- Auto-created by Supabase Auth
-- auth.users (id, email, ...)

-- Custom tables
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
    -- 'free' | 'starter' | 'pro' | 'team'
  status TEXT NOT NULL DEFAULT 'active',
    -- 'active' | 'past_due' | 'cancelled' | 'trialing'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  executions_used INTEGER DEFAULT 0,
  events_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE cloud_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deployment_type TEXT NOT NULL DEFAULT 'managed',
    -- 'managed' | 'byoi'
  orchestrator_url TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning',
    -- 'provisioning' | 'running' | 'stopped' | 'error' | 'destroyed'
  worker_count INTEGER DEFAULT 0,
  region TEXT DEFAULT 'nyc1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['execute', 'read'],
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own deployments" ON cloud_deployments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own api_keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
```

---

## 7. Subscription & Billing

### 7.1 Tier Model

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PRICING TIERS                                 │
│                                                                      │
│  FREE (Desktop Only)                                                 │
│  ├── Unlimited local personas                                        │
│  ├── Unlimited local executions                                      │
│  ├── Local event bus + scheduler                                     │
│  ├── Full observability                                              │
│  ├── Team canvas (local)                                             │
│  ├── Design engine                                                   │
│  └── No cloud features                                               │
│  Price: $0/month                                                     │
│                                                                      │
│  STARTER (Cloud)                                                     │
│  ├── Everything in Free                                              │
│  ├── 1 cloud worker                                                  │
│  ├── 100 cloud executions/month                                      │
│  ├── 500 cloud events/month                                          │
│  ├── 5-minute max execution timeout                                  │
│  ├── No burst workers                                                │
│  └── Email support                                                   │
│  Price: $9/month                                                     │
│                                                                      │
│  PRO (Cloud)                                                         │
│  ├── Everything in Starter                                           │
│  ├── 3 cloud workers                                                 │
│  ├── 1,000 cloud executions/month                                    │
│  ├── 10,000 cloud events/month                                       │
│  ├── 15-minute max execution timeout                                 │
│  ├── Burst workers (auto-scale)                                      │
│  ├── Priority support                                                │
│  └── Advanced observability                                          │
│  Price: $29/month                                                    │
│                                                                      │
│  TEAM (Cloud)                                                        │
│  ├── Everything in Pro                                               │
│  ├── 5 cloud workers                                                 │
│  ├── 5,000 cloud executions/month                                    │
│  ├── 50,000 cloud events/month                                       │
│  ├── 30-minute max execution timeout                                 │
│  ├── Team credential sharing                                         │
│  ├── Team member invitations                                         │
│  └── Dedicated support                                               │
│  Price: $79/month                                                    │
│                                                                      │
│  BYOI (Self-Hosted Cloud)                                            │
│  ├── Everything in Free                                              │
│  ├── Deploy to your own infrastructure                               │
│  ├── Your own Fly.io / DO / AWS keys                                 │
│  ├── Your own Kafka instance                                         │
│  ├── No limits (your infrastructure, your limits)                    │
│  ├── Community support                                               │
│  └── Full control                                                    │
│  Price: $0/month (you pay your own infra costs)                      │
│                                                                      │
│  NOTE: All tiers require user's own Claude subscription              │
│  (Pro/Max). We never touch their Anthropic bill.                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Billing Flow

```
Desktop App                  Web App                    Stripe
    │                           │                         │
    │  1. User clicks           │                         │
    │     "Upgrade to Pro"      │                         │
    │                           │                         │
    │  2. Opens web browser     │                         │
    │     to /dashboard/        │                         │
    │     subscription          │                         │
    │─────────────────────────▶│                         │
    │                           │  3. Create Checkout     │
    │                           │     Session             │
    │                           │────────────────────────▶│
    │                           │                         │
    │                           │  4. User pays           │
    │                           │◀────────────────────────│
    │                           │                         │
    │                           │  5. Webhook:            │
    │                           │     subscription.active │
    │                           │◀────────────────────────│
    │                           │                         │
    │                           │  6. Update Supabase     │
    │                           │     subscriptions table │
    │                           │                         │
    │  7. Desktop detects       │                         │
    │     subscription change   │                         │
    │     (polls Supabase)      │                         │
    │                           │                         │
    │  8. Cloud features        │                         │
    │     unlocked              │                         │
```

---

## 8. Cloud Deployment from Desktop

### 8.1 One-Click Deploy UI

```
┌─────────────────────────────────────────────────────────────┐
│  Cloud Deployment                                [Settings] │
│                                                             │
│  ┌─ Mode ──────────────────────────────────────────────────┐│
│  │  ○ Managed (Recommended)                                ││
│  │    We handle infrastructure. Your Pro plan:             ││
│  │    3 workers, 1000 executions/mo                        ││
│  │                                                         ││
│  │  ○ Bring Your Own Infrastructure                        ││
│  │    Use your own cloud provider keys.                    ││
│  │    No limits. You control the infra.                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Claude Subscription ───────────────────────────────────┐│
│  │  Status: ● Connected (Pro plan)                         ││
│  │  Token expires: 2027-02-13                              ││
│  │  [Refresh] [Disconnect]                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Status ────────────────────────────────────────────────┐│
│  │  Orchestrator: ● Running (fly.io, iad)                  ││
│  │  Workers: 2/3 online (1 idle, 1 executing)              ││
│  │  Event bus: ● Connected (Kafka, 142 events today)       ││
│  │  Uptime: 14d 7h 23m                                     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Usage This Month ──────────────────────────────────────┐│
│  │  Executions: 347 / 1,000          ████████░░░░ 34.7%    ││
│  │  Events:     2,841 / 10,000       ███░░░░░░░░░ 28.4%    ││
│  │  Avg duration: 42s                                      ││
│  │  Total cost (Claude): ~$12.40                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Workers ───────────────────────────────────────────────┐│
│  │  worker-1  ● idle       iad   shared-cpu-1x / 512MB     ││
│  │  worker-2  ● executing  iad   shared-cpu-1x / 512MB     ││
│  │            └─ "Email Triage Agent" (1m 42s)             ││
│  │  worker-3  ○ offline    iad   (burst, auto-destroyed)   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [⏸ Pause Deployment]  [🗑 Destroy Deployment]              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 BYOI Configuration Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Bring Your Own Infrastructure                              │
│                                                             │
│  ┌─ Cloud Provider ────────────────────────────────────────┐│
│  │  Provider:  [Fly.io ▼]                                  ││
│  │  API Token: [••••••••••••••••••••]  [Test Connection]   ││
│  │  Region:    [iad (Virginia) ▼]                          ││
│  │                                                         ││
│  │  ⓘ Your API token is encrypted locally using            ││
│  │    Stronghold vault. It never leaves your machine       ││
│  │    except to provision infrastructure.                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Message Bus ───────────────────────────────────────────┐│
│  │  Provider:  [Upstash Kafka ▼]                           ││
│  │  REST URL:  [https://...upstash.io]                     ││
│  │  Username:  [••••••••]                                  ││
│  │  Password:  [••••••••••••••••]       [Test Connection]  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─ Workers ───────────────────────────────────────────────┐│
│  │  Count:     [2 ▼]                                       ││
│  │  Size:      [shared-cpu-1x, 512MB ▼]                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Estimated monthly cost: ~$14/mo                            │
│  (Fly.io: $8 + Upstash: $2 + DO workers: $4)              │
│                                                             │
│  [Deploy Now]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Data Flow & Execution Modes

### 9.1 Local Execution (Default)

```
User clicks "Execute"
    │
    ▼
Zustand store → invoke('execute_persona', { id, input })
    │
    ▼
Rust engine::execution
    │
    ├── Assemble prompt (engine::prompt)
    ├── Decrypt credentials (engine::crypto)
    ├── Set env vars (CLAUDE_CODE_OAUTH_TOKEN, tool creds)
    │
    ▼
tokio::process::Command::new("claude")
    .args(["-p", "-", "--output-format", "stream-json"])
    .stdin(prompt)
    │
    ├── stdout → app.emit("execution-output", line)
    │              → React hook → UI update
    │
    ├── Parse persona protocols:
    │   ├── manual_review → store in DB, notify UI
    │   ├── persona_action → local event bus → trigger other persona
    │   ├── emit_event → local event bus → match subscriptions
    │   └── user_message → store in DB, notify UI
    │
    ▼
Execution complete
    ├── Store result in SQLite
    ├── Update observability metrics
    └── Trigger healing if failed
```

### 9.2 Cloud Execution

```
User clicks "Execute (Cloud)"
    │
    ▼
Zustand store → invoke('cloud_execute', { id, input })
    │
    ▼
Rust cloud::client
    │
    ├── Assemble prompt (engine::prompt)
    ├── HTTP POST to orchestrator /api/execute
    │   Headers: Authorization: Bearer <supabase-jwt>
    │   Body: { personaId, prompt, credentialIds, config }
    │
    ▼
Orchestrator
    ├── Validate JWT + check subscription limits
    ├── Produce to Kafka persona.exec.v1
    ├── Assign to idle worker via WebSocket
    │
    ▼
Worker
    ├── Receive assignment
    ├── Inject env vars (Claude token, credentials)
    ├── Spawn Claude CLI
    ├── Stream stdout → orchestrator → Kafka persona.output.v1
    │
    ▼
Desktop (cloud::client)
    ├── WSS connection to orchestrator
    ├── Receive output chunks in real-time
    ├── app.emit("execution-output", line)
    │     → same React hook → same UI update
    │
    ▼
Execution complete
    ├── Orchestrator records metrics
    ├── Desktop stores result in local SQLite
    ├── Events routed through Kafka → local event bus sync
    └── Usage counter incremented in Supabase
```

### 9.3 Local ↔ Cloud Event Bus Bridging

When cloud is connected, the local event bus and cloud Kafka event bus are bridged:

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENT BUS BRIDGING                         │
│                                                             │
│  LOCAL (SQLite)                    CLOUD (Kafka)            │
│                                                             │
│  Local agent emits event           Cloud agent emits event  │
│       │                                 │                   │
│       ▼                                 ▼                   │
│  Store in persona_events          Kafka persona.events.v1   │
│       │                                 │                   │
│       ├─────── Bridge ──────────────────┤                   │
│       │  (Rust cloud::sync)             │                   │
│       │                                 │                   │
│       ▼                                 ▼                   │
│  Match local subscriptions        Orchestrator routes to    │
│  Execute matching personas        cloud worker              │
│                                                             │
│  Events flow both directions:                               │
│  - Local event → cloud subscription = cloud execution       │
│  - Cloud event → local subscription = local execution       │
│  - Cloud event → cloud subscription = cloud execution       │
│  - Local event → local subscription = local execution       │
│                                                             │
│  When cloud is disconnected:                                │
│  - Events queue locally in SQLite                           │
│  - On reconnect, pending events sync to cloud               │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Security Model

### 10.1 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: USER AUTHENTICATION                                │
│  Google OAuth via Supabase. JWT tokens for API calls.        │
│  No passwords stored. Session refresh via Supabase SDK.      │
│  Desktop caches auth in Stronghold for offline use.          │
│                                                              │
│  LAYER 2: TRANSPORT ENCRYPTION                               │
│  All external communication over TLS 1.3.                    │
│  Desktop ↔ Orchestrator: HTTPS + WSS.                        │
│  Orchestrator ↔ Workers: WSS.                                │
│  Kafka: SASL/SSL.                                            │
│                                                              │
│  LAYER 3: LOCAL CREDENTIAL VAULT                             │
│  Desktop: tauri-plugin-stronghold (encrypted vault).         │
│  API keys, Claude tokens, infra keys stored encrypted.       │
│  Vault locked with OS keychain integration.                  │
│                                                              │
│  LAYER 4: CLOUD CREDENTIAL ENCRYPTION AT REST                │
│  Claude subscription token: AES-256-GCM, deployment key.    │
│  3rd-party credentials: AES-256-GCM, per-credential IV.     │
│  Master key in Fly.io secrets (not on disk).                 │
│                                                              │
│  LAYER 5: CREDENTIAL ISOLATION IN EXECUTION                  │
│  Worker receives credentials as env vars (memory only).      │
│  One execution at a time per worker.                         │
│  Env vars cleared immediately after execution.               │
│  No credential data written to disk on workers.              │
│                                                              │
│  LAYER 6: PLAN-BASED RATE LIMITING                           │
│  Orchestrator enforces execution/event limits per plan.      │
│  Prevents abuse of managed infrastructure.                   │
│  BYOI users have no limits (their infra, their problem).    │
│                                                              │
│  LAYER 7: ROW LEVEL SECURITY (Supabase)                      │
│  Users can only access their own profiles, subscriptions,    │
│  deployments, and API keys via RLS policies.                 │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Threat Model

| Threat | Severity | Mitigation |
|--------|----------|------------|
| Stolen Supabase JWT | Medium | Short-lived tokens (1h), refresh rotation, device binding |
| Compromised desktop machine | High | Stronghold vault encrypted with OS keychain. Credentials not in plaintext |
| Stolen cloud API key | Medium | Key scoping, rate limiting, revocation via dashboard |
| Compromised worker | Medium | Worker holds short-lived env vars only. No refresh token. Orchestrator can kill instantly |
| Compromised orchestrator | High | Credentials encrypted at rest. Master key in Fly secrets. Per-deployment isolation |
| Man-in-the-middle | Low | TLS 1.3 on all connections. Certificate pinning optional |
| Claude token theft | Medium | Token scoped to `claude_code` sessions. User can revoke at claude.ai |
| Credential exfiltration via prompt | Low | Credentials are env vars, not in prompt. Output monitoring for `echo $VAR` patterns |
| Subscription fraud | Low | JWT validation + Supabase RLS + Stripe webhook verification |

---

## 11. Migration Plan — Vibeman → Personas

### Phase 0: Pre-Migration Prep (in Vibeman)

- [ ] Extract `personaApi.ts` into transport-agnostic interface
- [ ] Isolate SSE hooks behind abstract streaming interface
- [ ] Remove all `'use client'` / Next.js-specific imports from Persona components
- [ ] Ensure all SQL in repository files (no inline queries)
- [ ] Document `globalThis` singletons (become Rust `static` or Tauri state)
- [ ] Set up Supabase project with Google OAuth provider
- [ ] Create Supabase schema (profiles, subscriptions, deployments, api_keys)
- [ ] Configure Stripe products and pricing

### Phase 1: Repository Setup

- [ ] Create `C:\Users\kazim\dac\personas\` directory
- [ ] Init `personas-desktop` (Tauri 2.0 + React 19 + Tailwind CSS 4)
- [ ] Init `personas-web` (Next.js 16 + Supabase + Stripe)
- [ ] Move `dac-cloud` → `personas-cloud` (rename, update package names)
- [ ] Configure shared Supabase client across all three repos
- [ ] Set up CI/CD (GitHub Actions) for each repo

### Phase 2: Desktop App Foundation

- [ ] Scaffold Tauri app with React + TypeScript + Vite
- [ ] Configure Tailwind CSS 4 in webview
- [ ] Install shared dependencies (framer-motion, recharts, react-flow, lucide, zustand)
- [ ] Set up React Router v7
- [ ] Set up `rusqlite` + `r2d2` + WAL mode
- [ ] Port database migrations (22+ tables via `refinery`)
- [ ] Implement Supabase auth flow with deep links

### Phase 3: Desktop Frontend Port

- [ ] Copy all 58 Persona components into `src/components/`
- [ ] Create `tauriApi.ts` with `invoke()` wrappers
- [ ] Replace 6 SSE hooks with `listen()` event handlers
- [ ] Replace `next/navigation` with React Router
- [ ] Wire up Zustand stores (personaStore, authStore, cloudStore)
- [ ] Verify all Tailwind classes render identically

### Phase 4: Desktop Rust Backend

- [ ] Database repos (22+ tables) — rusqlite + r2d2 pool
- [ ] IPC command handlers (60 routes → ~16 command modules)
- [ ] Execution engine — Claude CLI spawn + stream events
- [ ] Prompt assembler — string builder port
- [ ] Local event bus — SQLite polling + subscription matching + dispatch
- [ ] Trigger scheduler — tokio interval tasks
- [ ] Credential vault — Stronghold integration
- [ ] Execution queue — tokio semaphore
- [ ] Message delivery — reqwest HTTP client
- [ ] Healing engine — error detection + recovery

### Phase 5: Desktop Sidecar + Design Engine

- [ ] Bundle Node.js binary for design engine sidecar
- [ ] Compile designEngine.ts → designEngine.js (esbuild single-file)
- [ ] Compile testing framework → testRunner.js + testEvaluator.js
- [ ] Wire Rust ↔ sidecar communication (stdin/stdout JSON)

### Phase 6: Desktop Native Features

- [ ] System tray with scheduler status indicator
- [ ] `tauri-plugin-deep-link` for Supabase OAuth (`personas://auth/callback`)
- [ ] `tauri-plugin-updater` for auto-updates (GitHub Releases)
- [ ] `tauri-plugin-notification` for execution completion alerts
- [ ] Window state persistence (size, position, sidebar width)

### Phase 7: Cloud Integration in Desktop

- [ ] Implement `cloud::client` module (HTTP + WSS to orchestrator)
- [ ] Implement `cloud::deployer` for BYOI mode (Fly.io/DO API calls)
- [ ] Implement `cloud::subscription` for managed mode (Supabase JWT)
- [ ] Implement `cloud::sync` for event bus bridging
- [ ] Build Cloud Deploy Panel UI
- [ ] Build BYOI Configuration Panel UI

### Phase 8: Web App

- [ ] Build landing page with feature showcase
- [ ] Build pricing page with tier comparison
- [ ] Implement Google OAuth login
- [ ] Implement Stripe checkout for subscription tiers
- [ ] Build dashboard (subscription status, download links, API keys)
- [ ] Build documentation pages (MDX)
- [ ] Deploy to Vercel

### Phase 9: Cloud Evolution

- [ ] Add Supabase JWT validation to orchestrator auth
- [ ] Add plan-based rate limiting to orchestrator
- [ ] Add usage metering (Supabase subscription updates)
- [ ] Implement managed deployment provisioning API
- [ ] Test BYOI and managed flows end-to-end

### Phase 10: Distribution

- [ ] CI pipeline: GitHub Actions with `tauri-action` (builds .exe, .dmg, .AppImage)
- [ ] Code signing (Windows Authenticode, macOS notarization)
- [ ] Auto-update manifest (GitHub Releases or custom update server)
- [ ] Installer onboarding wizard (Claude CLI detection, API key setup)
- [ ] Beta program launch

---

## 12. Repository Layout

```
C:\Users\kazim\dac\personas\
├── personas-desktop/         # Tauri 2.0 desktop application
│   ├── src-tauri/            # Rust backend
│   ├── src/                  # React 19 frontend
│   ├── package.json
│   └── ...
│
├── personas-web/             # Next.js 16 web application
│   ├── src/                  # Pages, components, API
│   ├── content/              # MDX docs/blog
│   ├── package.json
│   └── ...
│
└── personas-cloud/           # Cloud services (renamed from dac-cloud)
    ├── packages/
    │   ├── shared/           # Shared types + crypto
    │   ├── orchestrator/     # Orchestration service
    │   └── worker/           # Worker process
    ├── infra/                # Infrastructure automation
    ├── package.json
    └── ...
```

---

## 13. Technology Stack Summary

### Desktop App (`personas-desktop`)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Shell | Tauri 2.0 | Native app shell, IPC, plugins |
| Frontend | React 19 | UI components |
| Styling | Tailwind CSS 4 | CSS framework |
| Animation | Framer Motion | Transitions, animations |
| Charts | Recharts | Analytics visualization |
| Canvas | @xyflow/react | Team canvas |
| Icons | Lucide React | Icon library |
| State | Zustand | State management |
| Routing | React Router v7 | Page navigation |
| Bundler | Vite | Frontend build |
| Backend | Rust (tokio) | Async runtime, CLI spawning |
| Database | rusqlite + r2d2 | SQLite with connection pool |
| Migrations | refinery | Schema versioning |
| Crypto | aes + pbkdf2 crates | Data encryption |
| Vault | tauri-plugin-stronghold | Credential storage |
| HTTP | reqwest | Cloud API + delivery |
| Auth | @supabase/supabase-js | Google OAuth |

### Web App (`personas-web`)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 | SSG + SSR |
| Styling | Tailwind CSS 4 | CSS framework |
| Auth | Supabase Auth | Google OAuth |
| Billing | Stripe | Subscriptions |
| Content | MDX | Docs + blog |
| Hosting | Vercel | Deployment |
| Analytics | PostHog | Usage analytics |

### Cloud (`personas-cloud`)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 22 | Services |
| Language | TypeScript 5.7 | Type safety |
| WebSocket | ws | Worker communication |
| Message queue | KafkaJS + Upstash | Event bus + execution queue |
| Logging | Pino | Structured logging |
| Crypto | Node crypto (AES-256-GCM) | Credential encryption |
| Auth | Supabase JWT verification | Request validation |
| Container | Docker | Deployment |
| Orchestrator host | Fly.io | Low-cost hosting |
| Worker host | Fly.io / DigitalOcean | Compute |

---

## 14. Key Technical Decisions

### 14.1 Why Desktop Talks to Orchestrator Directly (Not Kafka)

The desktop app communicates with the cloud orchestrator via HTTP/WSS, never directly with Kafka. This is intentional:

1. **Simplicity** — Desktop doesn't need KafkaJS dependency (large, complex)
2. **Security** — Kafka credentials never leave the cloud infrastructure
3. **Firewall-friendly** — HTTPS/WSS work through corporate firewalls; Kafka TCP often doesn't
4. **Rate limiting** — Orchestrator enforces plan limits before messages reach Kafka
5. **Stateful streaming** — WSS provides bidirectional streaming the desktop already needs

### 14.2 Why Local Event Bus Uses SQLite Polling (Not In-Memory)

The local event bus polls a SQLite table instead of using an in-memory pub/sub:

1. **Persistence** — Events survive app crashes and restarts
2. **History** — Full event audit trail for observability
3. **Cloud sync** — Pending events can be synced to cloud on reconnect
4. **Simplicity** — Same pattern as the existing Vibeman implementation

### 14.3 Why Supabase Instead of Custom Auth

1. **Google OAuth out of the box** — No OAuth implementation needed
2. **JWT tokens** — Standard, verifiable by orchestrator without Supabase roundtrip
3. **Row Level Security** — Data isolation built into the database
4. **Shared identity** — Same user across web, desktop, and cloud
5. **Free tier** — 50,000 monthly active users, sufficient for launch

### 14.4 Why BYOI Uses Desktop as Deployer (Not a Web Service)

For BYOI users, the desktop app provisions infrastructure directly using the user's cloud provider API keys. The web app is NOT involved. This is because:

1. **Key security** — Cloud provider keys never leave the user's machine
2. **No intermediary** — No man-in-the-middle for sensitive operations
3. **Offline capable** — User can deploy even if our web service is down
4. **Trust model** — User trusts their own machine, not our servers

---

## 15. Opportunities & Architectural Insights

### 15.1 Event Bus as Core Differentiator

The event bus is what makes Personas fundamentally different from other agent platforms. While competitors offer isolated agent execution, Personas enables:

- **Agent-to-agent coordination** — One agent's output triggers another agent
- **Cross-domain orchestration** — Email agent triggers Slack agent triggers GitHub agent
- **Event-driven scheduling** — Beyond cron, agents react to real-world events
- **Observability** — Full event audit trail shows exactly how agents coordinate

The local-first event bus means this works without cloud. Cloud adds persistence, 24/7 operation, and multi-device access.

### 15.2 Progressive Enhancement Model

The product follows a progressive enhancement model that maximizes free-tier value:

```
Level 0: Free Desktop
├── Full agent authoring
├── Full local execution
├── Full local event bus
├── Full observability
└── Value: Complete agent platform, no cost

Level 1: BYOI Cloud (Free Software)
├── Everything in Level 0
├── 24/7 cloud execution
├── Your infrastructure, your control
└── Value: Production agents, infra-only cost

Level 2: Managed Cloud (Subscription)
├── Everything in Level 0
├── 24/7 cloud execution
├── We handle infrastructure
├── No keys to manage
└── Value: Production agents, zero ops
```

This model avoids the typical SaaS trap of gating core features behind paywalls. The free tier is genuinely useful — cloud is a convenience upgrade for users who need always-on operation.

### 15.3 Future Opportunities

1. **Persona Marketplace** — Users share persona templates (definitions only, not credentials or data). Community-driven agent recipes.

2. **Persona Composition** — Visual drag-and-drop editor (React Flow-based) for composing multi-agent workflows. Think n8n but with intelligent agents instead of fixed functions.

3. **Mobile Companion** — Lightweight mobile app for monitoring cloud agents, approving manual reviews, and receiving notifications. No execution — just observation and control.

4. **API Gateway** — Expose personas as API endpoints. External systems can trigger agent execution via HTTP. Enables integration with Zapier, n8n, Power Automate.

5. **Execution Replay** — Full recording and replay of agent executions for debugging, training, and demonstration purposes.

6. **Multi-LLM Support** — While currently Claude Code-focused, the architecture supports swapping the execution backend to other LLM CLIs or APIs.

---

## 16. Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Rust learning curve | Medium | High | Use Node sidecar for complex logic initially; port incrementally |
| Tauri webview rendering differences | Low | Medium | Test all 58 components; Tailwind renders standard CSS |
| Claude CLI not in PATH (Windows) | Medium | High | Onboarding wizard auto-detects; allow manual path config |
| Supabase free tier limits | Low | Low | 50K MAU generous; upgrade before hitting limits |
| Stripe integration complexity | Medium | Medium | Use Stripe Checkout (hosted), minimal custom code |
| Cross-platform file paths | Medium | Medium | Use Rust `PathBuf`; Tauri resolves app dirs per OS |
| SQLite migration compat (Vibeman → Personas) | Low | Low | Same SQL dialect; offer import wizard |
| Google OAuth deep link on Windows | Medium | Medium | Test thoroughly; fallback to localhost HTTP callback |
| Node.js sidecar bundling size | Medium | Medium | esbuild single-file; tree-shake aggressively |
| Auto-updater code signing cost | Medium | Low | Required for macOS; Windows optional but recommended |
| Kafka message ordering | Low | Low | Key-based ordering sufficient; no strict global ordering needed |
| BYOI deployment failures | Medium | Medium | Clear error messages; manual fallback instructions |
| Subscription churn | Medium | Medium | Generous free tier ensures value before upgrade pressure |

---

## 17. Success Criteria

### Desktop App v1.0

- [ ] All 58 React components render identically to Vibeman
- [ ] All 22+ database tables created and migrated
- [ ] Claude CLI execution works with stdout streaming to UI
- [ ] Local event bus handles agent-to-agent communication
- [ ] Trigger scheduler runs cron + webhook + subscription triggers
- [ ] Design engine produces same output quality (sidecar)
- [ ] Credential vault encrypts/decrypts round-trip correctly
- [ ] Google OAuth via Supabase completes (deep link)
- [ ] System tray shows scheduler status
- [ ] Auto-updater fetches and installs updates
- [ ] Installer runs clean on Windows 11
- [ ] Cold start < 2 seconds
- [ ] Memory usage < 100 MB idle

### Web App v1.0

- [ ] Landing page with feature showcase
- [ ] Google OAuth login works
- [ ] Stripe subscription checkout works
- [ ] Dashboard shows subscription status + download links
- [ ] API key management works
- [ ] Documentation pages render MDX content

### Cloud v1.0

- [ ] Supabase JWT validation in orchestrator
- [ ] Plan-based rate limiting enforced
- [ ] Managed deployment provisioning works end-to-end
- [ ] BYOI deployment from desktop works end-to-end
- [ ] Usage metering updates Supabase subscription table
- [ ] Event bus bridging (local ↔ cloud) works

### Integration

- [ ] Free user: full local experience, no cloud prompts
- [ ] BYOI user: deploys from desktop, agents run 24/7
- [ ] Managed user: one-click deploy, agents run 24/7, usage tracked
- [ ] Events flow between local and cloud agents seamlessly
- [ ] Subscription upgrade in web → cloud features unlock in desktop
