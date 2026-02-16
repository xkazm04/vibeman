# Persona Desktop App — Architecture Overview

**Target Stack**: Tauri 2.0 + React 19 + Tailwind CSS 4 + SQLite
**Codename**: Persona Studio
**Status**: Planning (pre-migration)

---

## 1. Why Tauri + React

| Factor | Decision driver |
|--------|----------------|
| **Tailwind/JSX reuse** | ~95% of 48 React components port unchanged — same className strings, same JSX |
| **App footprint** | 8-15 MB installer vs 150-200 MB Electron. Sub-second cold start |
| **Native feel** | OS-native window chrome, system tray, deep links, file dialogs |
| **Security** | No full Node.js in renderer. Rust backend with explicit IPC permissions |
| **Claude CLI** | Rust `std::process::Command` maps directly to current `child_process.spawn()` pattern |
| **SQLite** | `tauri-plugin-sql` (libsql) replaces `better-sqlite3` — same raw SQL, same WAL mode |
| **Crypto** | Rust `aes`/`pbkdf2` crates replace Node `crypto`. Or `tauri-plugin-stronghold` for vault |
| **OAuth** | `tauri-plugin-deep-link` replaces temp HTTP server — cleaner, no port conflicts |
| **Streaming** | Tauri events (`emit`/`listen`) replace SSE — bidirectional, no HTTP overhead |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri Shell (Rust)                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  React 19 Webview                     │  │
│  │                                                       │  │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────────────┐  │  │
│  │  │ Zustand  │  │  React   │  │  Tailwind CSS 4     │  │  │
│  │  │ Stores   │  │  Flow    │  │  + Framer Motion    │  │  │
│  │  └────┬─────┘  └──────────┘  └─────────────────────┘  │  │
│  │       │                                                │  │
│  │  ┌────▼────────────────────────────────────────────┐   │  │
│  │  │          Tauri IPC Bridge (invoke/listen)        │   │  │
│  │  └────┬────────────────────────────────────────────┘   │  │
│  └───────┼────────────────────────────────────────────────┘  │
│          │                                                   │
│  ┌───────▼────────────────────────────────────────────────┐  │
│  │                Rust Backend Commands                    │  │
│  │                                                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐  │  │
│  │  │Execution │ │ Design   │ │ Event  │ │ Credential │  │  │
│  │  │ Engine   │ │ Engine   │ │  Bus   │ │   Vault    │  │  │
│  │  └────┬─────┘ └────┬─────┘ └───┬────┘ └─────┬──────┘  │  │
│  │       │             │           │             │         │  │
│  │  ┌────▼─────────────▼───────────▼─────────────▼─────┐  │  │
│  │  │              SQLite (rusqlite / libsql)           │  │  │
│  │  │              + Encrypted Credential Store         │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │          Claude CLI (spawned subprocess)          │  │  │
│  │  │          + Tool Scripts (bundled assets)          │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ System Tray  │  │  Deep Links  │  │  Auto-Updater   │   │
│  │ (scheduler)  │  │  (OAuth)     │  │  (releases)     │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Layer Mapping: Next.js → Tauri

### 3.1 Frontend (Webview) — Minimal Changes

| Current (Next.js) | Target (Tauri) | Change required |
|---|---|---|
| 48 React components in `features/Personas/` | Same components, same files | Remove Next.js `'use client'` directives |
| Tailwind CSS classes | Identical | None — webview renders standard CSS |
| Framer Motion animations | Identical | None |
| Recharts (analytics) | Identical | None |
| React Flow (team canvas) | Identical | None |
| Lucide React icons | Identical | None |
| react-markdown + rehype | Identical | None |
| Zustand personaStore (842 lines) | Identical store | Replace `fetch()` calls with `invoke()` |
| personaApi.ts (698 lines) | **Rewrite** → tauriApi.ts | `fetch('/api/...')` → `invoke('cmd_name', {...})` |
| SSE EventSource connections | **Replace** → Tauri `listen()` | ~5 streaming hooks rewritten |
| Next.js router (`useRouter`) | React Router or TanStack Router | Straightforward swap |

**Estimated frontend changes**: ~700 lines rewritten (personaApi + hooks), ~14,000 lines unchanged.

### 3.2 API Layer — Eliminated

The 52 Next.js API routes disappear entirely. Their logic moves into Rust `#[tauri::command]` functions that call the same underlying operations:

```
// Current: 52 API route files
src/app/api/personas/route.ts           → cmd_list_personas()
src/app/api/personas/[id]/route.ts      → cmd_get_persona(id)
src/app/api/personas/[id]/execute/      → cmd_execute_persona(id)
src/app/api/personas/[id]/design/       → cmd_start_design(id, input)
...
```

Each route's body (validation + DB call + response) becomes a Rust function. The request/response shape stays identical — just transported via IPC instead of HTTP.

### 3.3 Backend Engines — Rust Rewrite or Node Sidecar

Two strategies, can be mixed:

#### Strategy A: Rust Native (recommended for hot paths)

| Engine | Rust equivalent | Notes |
|--------|----------------|-------|
| `executionEngine.ts` | `engine::execution` | `Command::new("claude")` + async stdout streaming |
| `promptAssembler.ts` | `engine::prompt` | String building — straightforward port |
| `credentialCrypto.ts` | `engine::crypto` | `aes` + `pbkdf2` crates, or `tauri-plugin-stronghold` |
| `executionQueue.ts` | `engine::queue` | `tokio::sync::Semaphore` for concurrency |
| `eventBus.ts` | `engine::events` | `tokio::time::interval` polling + `app.emit()` |
| `triggerScheduler.ts` | `engine::scheduler` | `tokio::spawn` + cron parsing |
| `messageDelivery.ts` | `engine::delivery` | `reqwest` for Slack/Telegram HTTP |
| `googleOAuth.ts` | `tauri-plugin-deep-link` | OS-registered URL scheme, no HTTP server |

#### Strategy B: Node.js Sidecar (for complex/changing logic)

Tauri can bundle a Node.js binary and run TypeScript engines as a subprocess:

```rust
// In Rust
let sidecar = app.shell().sidecar("persona-engine").unwrap();
let (mut rx, child) = sidecar.args(["design", "--persona-id", id]).spawn().unwrap();
```

This lets you keep `designEngine.ts`, `testRunner.ts`, `testEvaluator.ts` etc. as-is during initial migration, then incrementally port to Rust. Best for the testing framework (2,500+ lines) where velocity matters more than performance.

**Recommended split**:
- **Rust native**: execution, prompt, crypto, queue, scheduler, delivery (hot paths, security-sensitive)
- **Node sidecar**: design engine, testing framework, connector discovery (complex LLM logic, changes frequently)

### 3.4 Database Layer — Driver Swap

```
Current:  better-sqlite3 (Node native addon)
Target:   rusqlite or tauri-plugin-sql (Rust native)
```

| Current pattern | Target pattern |
|---|---|
| `db.prepare(sql).all(params)` | `conn.prepare(sql)?.query_map(params, \|row\| ...)` |
| `db.prepare(sql).run(params)` | `conn.execute(sql, params)` |
| Repository pattern (11 sub-repos) | Same pattern, Rust structs |
| WAL mode | Same — `PRAGMA journal_mode=WAL` |
| Migrations in `migrations/index.ts` | `tauri-plugin-sql` migrations or `refinery` crate |

The 19 tables and their schemas remain identical. SQL statements copy verbatim.

### 3.5 Streaming — Tauri Events Replace SSE

```
// Current: SSE via ReadableStream
// Server
new ReadableStream({ start(controller) {
  controller.enqueue(`data: ${JSON.stringify(line)}\n\n`);
}})

// Client
const es = new EventSource(`/api/personas/executions/${id}/stream`);
es.onmessage = (e) => appendOutput(JSON.parse(e.data));
```

```
// Target: Tauri events
// Rust backend
app.emit("execution-output", ExecutionLine { id, text, type_ });

// React frontend
import { listen } from '@tauri-apps/api/event';
const unlisten = await listen('execution-output', (event) => {
  appendOutput(event.payload);
});
```

5 SSE streams to convert:
1. Execution output stream
2. Design analysis stream
3. Design review test stream
4. Connector discovery stream
5. Design feasibility test stream

---

## 4. Rust Backend Structure

```
src-tauri/
├── Cargo.toml
├── tauri.conf.json
├── capabilities/                    # IPC permission declarations
│   └── default.json
├── icons/
├── src/
│   ├── main.rs                     # App entry, plugin registration
│   ├── lib.rs                      # Command registration
│   │
│   ├── commands/                   # IPC command handlers (replaces API routes)
│   │   ├── mod.rs
│   │   ├── personas.rs             # CRUD
│   │   ├── executions.rs           # Execute + stream
│   │   ├── design.rs               # Design analysis
│   │   ├── credentials.rs          # CRUD + healthcheck
│   │   ├── events.rs               # Event bus + subscriptions
│   │   ├── messages.rs             # Messaging
│   │   ├── teams.rs                # Team canvas
│   │   ├── tools.rs                # Tool definitions
│   │   ├── triggers.rs             # Trigger management
│   │   ├── observability.rs        # Metrics + versions
│   │   └── oauth.rs                # Google OAuth via deep link
│   │
│   ├── engine/                     # Core logic (replaces src/lib/personas/)
│   │   ├── mod.rs
│   │   ├── execution.rs            # Claude CLI spawning + stdout parsing
│   │   ├── prompt.rs               # Prompt assembly
│   │   ├── queue.rs                # Execution queue with semaphore
│   │   ├── scheduler.rs            # Trigger scheduler (tokio tasks)
│   │   ├── events.rs               # Event bus (polling + dispatch)
│   │   ├── crypto.rs               # AES-256-CBC + PBKDF2
│   │   ├── delivery.rs             # Notification delivery (reqwest)
│   │   └── templates.rs            # Credential/connector templates
│   │
│   ├── db/                         # Database layer
│   │   ├── mod.rs                  # Connection pool (r2d2 + rusqlite)
│   │   ├── migrations.rs           # Schema migrations (refinery)
│   │   ├── models.rs               # Struct definitions (19 tables)
│   │   └── repos/                  # Repository pattern
│   │       ├── mod.rs
│   │       ├── personas.rs
│   │       ├── tools.rs
│   │       ├── triggers.rs
│   │       ├── executions.rs
│   │       ├── credentials.rs
│   │       ├── events.rs
│   │       ├── messages.rs
│   │       ├── teams.rs
│   │       ├── metrics.rs
│   │       └── reviews.rs
│   │
│   └── sidecar/                    # Node.js sidecar management
│       ├── mod.rs
│       └── design.rs               # Design engine sidecar bridge
│
├── sidecars/                       # Bundled Node.js scripts
│   └── persona-engine/
│       ├── designEngine.js          # Compiled from TS
│       ├── testRunner.js
│       └── package.json
│
└── resources/                      # Bundled assets
    └── persona-tools/              # Tool scripts (Gmail, HTTP, etc.)
        ├── gmail/
        ├── http/
        └── ...
```

---

## 5. Migration Phases

### Phase 0: Pre-Migration Prep (do in Next.js)

While still developing in Next.js, prepare the codebase for migration:

- [ ] Extract `personaApi.ts` into a transport-agnostic interface
  ```typescript
  // Define abstract API contract
  interface PersonaTransport {
    listPersonas(): Promise<Persona[]>;
    getPersona(id: string): Promise<Persona>;
    executePersona(id: string, input: Record<string, unknown>): Promise<void>;
    // ... all 52 endpoints as methods
  }

  // Current implementation
  class FetchTransport implements PersonaTransport { ... }
  // Future Tauri implementation
  class TauriTransport implements PersonaTransport { ... }
  ```
- [ ] Isolate SSE hooks behind an abstract streaming interface
- [ ] Move all `'use client'` components to a shared package (no Next.js imports)
- [ ] Ensure all SQL is in repository files (no inline queries in routes)
- [ ] Document all `globalThis` singletons — these become Rust `static` or Tauri state

### Phase 1: Scaffold Tauri App

- [ ] `npm create tauri-app` with React + TypeScript template
- [ ] Configure `tauri.conf.json` (window size, title, permissions)
- [ ] Set up Tailwind CSS 4 in webview
- [ ] Install shared dependencies (framer-motion, recharts, react-flow, lucide, zustand)
- [ ] Configure React Router (replaces Next.js file-based routing)
- [ ] Set up `tauri-plugin-sql` with SQLite + WAL
- [ ] Run existing migrations via Rust migration runner

### Phase 2: Port Frontend

- [ ] Copy all 48 Persona components into webview `src/`
- [ ] Replace `personaApi.ts` with `tauriApi.ts` (`invoke()` calls)
- [ ] Replace 5 SSE hooks with `listen()` event handlers
- [ ] Replace `next/navigation` with React Router
- [ ] Verify Tailwind classes render identically
- [ ] Wire up Zustand store (unchanged)

### Phase 3: Implement Rust Backend

- [ ] Database repos (19 tables) — rusqlite + r2d2 pool
- [ ] IPC command handlers (52 endpoints → ~12 command modules)
- [ ] Execution engine — Claude CLI spawn + stream events
- [ ] Prompt assembler — string builder port
- [ ] Credential crypto — AES-256-CBC via `aes`/`pbkdf2` crates
- [ ] Execution queue — tokio semaphore
- [ ] Trigger scheduler — tokio interval tasks
- [ ] Event bus — polling + dispatch + subscription matching
- [ ] Message delivery — reqwest HTTP client

### Phase 4: Sidecar Integration

- [ ] Bundle Node.js binary for design engine sidecar
- [ ] Compile designEngine.ts → designEngine.js (esbuild single-file)
- [ ] Compile testing framework → testRunner.js
- [ ] Wire Rust ↔ sidecar communication (stdin/stdout JSON)

### Phase 5: Native Features

- [ ] System tray with scheduler status indicator
- [ ] `tauri-plugin-deep-link` for Google OAuth (`personastudio://oauth/callback`)
- [ ] `tauri-plugin-updater` for auto-updates (GitHub Releases)
- [ ] `tauri-plugin-notification` for execution completion alerts
- [ ] `tauri-plugin-stronghold` evaluation (replace file-based credential encryption)
- [ ] Window state persistence (size, position, sidebar width)

### Phase 6: Distribution

- [ ] CI pipeline: GitHub Actions with `tauri-action` (builds .exe, .dmg, .AppImage)
- [ ] Code signing (Windows Authenticode, macOS notarization)
- [ ] Auto-update manifest (JSON hosted on GitHub Releases)
- [ ] Installer onboarding wizard (Claude CLI detection, API key setup)

---

## 6. Key Technical Decisions

### 6.1 CLI Spawning in Rust

```rust
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

#[tauri::command]
async fn execute_persona(
    app: tauri::AppHandle,
    id: String,
    prompt: String,
) -> Result<(), String> {
    let mut child = Command::new("claude")
        .args(["-p", "-", "--output-format", "stream-json"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    // Write prompt to stdin
    if let Some(mut stdin) = child.stdin.take() {
        tokio::io::AsyncWriteExt::write_all(&mut stdin, prompt.as_bytes()).await.ok();
    }

    // Stream stdout lines as Tauri events
    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Some(line) = lines.next_line().await.map_err(|e| e.to_string())? {
            app.emit("execution-output", &ExecutionLine {
                execution_id: id.clone(),
                text: line,
            }).ok();
        }
    }

    Ok(())
}
```

### 6.2 Frontend IPC Pattern

```typescript
// tauriApi.ts — replaces personaApi.ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const tauriApi = {
  listPersonas: () => invoke<Persona[]>('list_personas'),
  getPersona: (id: string) => invoke<Persona>('get_persona', { id }),
  executePersona: (id: string, input: object) =>
    invoke('execute_persona', { id, input }),

  // Streaming — replaces SSE EventSource
  onExecutionOutput: (cb: (line: ExecutionLine) => void) =>
    listen<ExecutionLine>('execution-output', (e) => cb(e.payload)),
};
```

### 6.3 OAuth via Deep Links

```
// Register URL scheme in tauri.conf.json
{ "plugins": { "deep-link": { "desktop": { "schemes": ["personastudio"] } } } }

// Google OAuth redirect_uri: personastudio://oauth/callback
// Rust handler receives the code directly — no HTTP server needed
```

### 6.4 Database Connection

```rust
use rusqlite::Connection;
use r2d2_sqlite::SqliteConnectionManager;

fn init_db(app_dir: &Path) -> Pool<SqliteConnectionManager> {
    let db_path = app_dir.join("personas.db");
    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|c| {
            c.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        });
    r2d2::Pool::new(manager).unwrap()
}
```

---

## 7. Dependency Map

### Tauri Plugins

| Plugin | Replaces | Purpose |
|--------|----------|---------|
| `tauri-plugin-sql` | better-sqlite3 | SQLite with WAL mode |
| `tauri-plugin-shell` | child_process | Claude CLI + sidecar spawning |
| `tauri-plugin-deep-link` | http.createServer | OAuth callback handling |
| `tauri-plugin-updater` | — | Auto-update from GitHub Releases |
| `tauri-plugin-notification` | — | Native OS notifications |
| `tauri-plugin-stronghold` | crypto (AES) | Encrypted credential vault |
| `tauri-plugin-fs` | fs | Log file read/write |
| `tauri-plugin-store` | — | Persistent key-value (window state) |

### Rust Crates

| Crate | Purpose |
|-------|---------|
| `rusqlite` + `r2d2` | SQLite connection pool |
| `refinery` | Database migrations |
| `serde` + `serde_json` | Serialization (IPC + DB) |
| `tokio` | Async runtime (CLI spawn, scheduler, event bus) |
| `reqwest` | HTTP client (Slack/Telegram delivery, healthchecks) |
| `aes` + `cbc` + `pbkdf2` | Credential encryption (if not using Stronghold) |
| `uuid` | ID generation |
| `chrono` | Timestamp handling |
| `cron` | Trigger schedule parsing |

### Frontend (unchanged from Next.js)

| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `zustand` | State management |
| `framer-motion` | Animations |
| `recharts` | Analytics charts |
| `@xyflow/react` | Team canvas |
| `react-markdown` + `remark-gfm` + `rehype-highlight` | Markdown rendering |
| `lucide-react` | Icons |
| `tailwindcss` | Styling |
| `react-router-dom` | Routing (replaces Next.js router) |

---

## 8. Onboarding Flow

First-run experience for new users:

```
┌─────────────────────────────────────┐
│  1. Welcome Screen                  │
│     "Persona Studio" branding       │
│     System requirements check       │
│     ├── Claude CLI installed?       │
│     ├── API key configured?         │
│     └── Node.js available? (sidecar)│
│                                     │
│  2. Setup Assistant                 │
│     ├── Auto-detect Claude CLI path │
│     ├── API key input + validation  │
│     ├── Choose data directory       │
│     └── Optional: import from       │
│         existing Vibeman SQLite DB  │
│                                     │
│  3. First Persona                   │
│     ├── Template gallery (8 presets)│
│     ├── Or "Design from scratch"    │
│     └── Quick test execution        │
│                                     │
│  4. Dashboard                       │
│     Full app with system tray icon  │
└─────────────────────────────────────┘
```

---

## 9. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rust learning curve | Medium | Use Node sidecar for complex logic initially; port incrementally |
| `@xyflow/react` webview perf | Low | React Flow works fine in webviews; test with 50+ nodes |
| Claude CLI not in PATH | Medium | Onboarding wizard auto-detects; allow manual path config |
| Cross-platform file paths | Medium | Use Rust `PathBuf` everywhere; Tauri resolves app dirs |
| SQLite migration compat | Low | Same SQL dialect; test migration replay on fresh DB |
| Google OAuth deep link registration | Medium | Fallback to localhost HTTP server if deep link fails |
| Sidecar Node.js bundling | Medium | esbuild single-file compile; test on all 3 platforms |
| Auto-updater code signing | Medium | Required for macOS; Windows optional but recommended |

---

## 10. Success Criteria

Before declaring migration complete:

- [ ] All 48 React components render identically to Next.js version
- [ ] All 19 database tables created and migrated
- [ ] Claude CLI execution works with stdout streaming to UI
- [ ] Design engine produces same output quality (sidecar or native)
- [ ] Event bus triggers work (schedule, webhook, subscription)
- [ ] Credential encryption/decryption round-trips correctly
- [ ] Google OAuth flow completes (deep link or fallback)
- [ ] System tray shows scheduler status
- [ ] Auto-updater fetches and installs updates
- [ ] Installer runs clean on Windows, macOS, Linux
- [ ] Cold start < 2 seconds
- [ ] Memory usage < 100 MB idle
