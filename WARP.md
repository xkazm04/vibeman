# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project: Vibeman (Next.js 15 + TypeScript)

Commands you’ll use most

- Install deps
  - npm install

- Develop (Next.js with Turbopack)
  - npm run dev
  - By default runs on http://localhost:3000

- Build and serve production
  - npm run build
  - npm run start

- Lint
  - npm run lint
  - Lint a single file: npx next lint --file "src/path/to/File.tsx"

- TypeScript checks
  - Build runs type-checks. For a standalone check without emitting files: npx tsc --noEmit

- Environment variables (set in PowerShell during a session)
  - $env:NEXT_PUBLIC_BASE_URL = "http://localhost:3000"
  - Optional LLM keys if you intend to use remote providers:
    - $env:OPENAI_API_KEY = "{{OPENAI_API_KEY}}"
    - $env:ANTHROPIC_API_KEY = "{{ANTHROPIC_API_KEY}}"
    - $env:GEMINI_API_KEY = "{{GEMINI_API_KEY}}"

Testing status and how to run checks

- JavaScript test runner (Jest/Vitest) is not configured in this repo. There are, however, API endpoints and feature toggles you can exercise directly during development.
- Useful API checks while the dev server is running:
  - Check available LLM providers: curl http://localhost:3000/api/kiro/llm-providers
  - Generate via internal LLM API (defaults to Ollama if no remote keys):
    - curl -X POST http://localhost:3000/api/llm/generate -H "Content-Type: application/json" -d '{"prompt":"Hello from Vibeman"}'
  - File-scanner test run (client UI exists under Projects > File Scanner):
    - curl -X POST http://localhost:3000/api/file-scanner -H "Content-Type: application/json" -d '{"action":"test-scan"}'
  - Events test data (if Supabase is configured):
    - Insert a sample event: curl -X POST http://localhost:3000/api/events/test
    - Fetch recent events: curl http://localhost:3000/api/events/test

Data and background systems

- SQLite databases are created automatically in database/ at first use via better-sqlite3. Key stores include:
  - projects.db (project registry, ports, run scripts)
  - background_tasks.db (queued AI and automation tasks, plus queue settings)
  - goals.db, backlog.db (planning artifacts)
  - events.db (activity log powering the events views)

- Background task queue
  - The queue is persisted in background_tasks.db with a singleton settings row (task_queue_settings).
  - Start queue processing (delegates to the queue management endpoint):
    - curl -X POST http://localhost:3000/api/kiro/start-queue
  - Inspect tasks / counts / queue settings:
    - curl http://localhost:3000/api/kiro/background-tasks
  - Create a background task (example payload):
    - curl -X POST http://localhost:3000/api/kiro/background-tasks -H "Content-Type: application/json" -d '{"projectId":"my-proj","projectName":"My Project","projectPath":"C:/path/to/project","taskType":"docs"}'
  - Run background task DB migration (updates table schema if needed):
    - curl -X POST http://localhost:3000/api/kiro/migrate-database

- Process management for external dev servers
  - The server management API wraps a process manager that spawns and tracks project processes (ports, status, logs) cross-platform.
  - Start: curl -X POST http://localhost:3000/api/server/start -H "Content-Type: application/json" -d '{"projectId":"<id-from-projects.db>"}'
  - Stop: curl -X POST http://localhost:3000/api/server/stop -H "Content-Type: application/json" -d '{"projectId":"<id>"}'
  - Status for all: curl http://localhost:3000/api/server/status
  - Used ports: curl http://localhost:3000/api/projects/ports

LLM stack overview

- Unified LLM client in src/lib/llm provides a common interface across providers (OpenAI, Anthropic, Gemini, Ollama, and an internal /api/llm entrypoint). It supports:
  - Provider availability checks and fallbacks
  - Key storage in browser localStorage (client-side UI)
  - Progress and event logging hooks
- Key endpoints:
  - POST /api/llm/generate — internal generation pipeline
  - GET /api/kiro/llm-providers — availability snapshot based on env and live checks
- Local-only operation works with Ollama (no remote API keys required) when running the UI features that call into LLMs configured to default to Ollama.

Annette voicebot prototype

- Path: src/app/annette (UI) and src/app/api/annette/langgraph (server orchestration)
- Prerequisites: Local Ollama on localhost:11434 with gpt-oss:20b pulled.
  - ollama pull gpt-oss:20b
  - ollama serve
- Use: Run the dev server, then open /annette to execute the demo flow. The UI includes dependency checks and pipeline logs.

High-level architecture (big picture)

- App/UI layer (Next.js app router)
  - src/app/ contains application surfaces such as coder/, projects/, reviewer/, runner/, event views, background tasks UI, and the Annette prototype.
  - Shared UI under src/components/ (Monaco editors, markdown, modals, navigation) and state stores in src/stores/ (Zustand).
  - React Query setup for client data access lives under src/lib/queryClient.ts and hooks/ directories.

- API layer (Next.js route handlers under src/app/api)
  - Kiro namespace exposes orchestration endpoints for goals/contexts/files, background tasks, database migrations, and LLM provider metadata.
  - LLM endpoints under /api/llm wrap the unified LLM manager for text generation and health.
  - Project and server management endpoints manage an OS process registry for external dev servers (start/stop/status, ports) and basic Git utilities.
  - File scanner endpoints coordinate LLM-backed project scans and expose results to the UI.

- Persistence and services (src/lib)
  - Database modules (better-sqlite3) create and migrate SQLite files on-demand (projects, background tasks, goals/backlog, events).
  - processManager.ts centralizes process spawn/kill/status and log buffering with Windows-aware PID/port resolution.
  - gitManager.ts wraps Git operations used by the server endpoints.
  - scanner/ provides the client driver and types for LLM-based file/code scanning.
  - services/ encapsulates higher-level file/context generation flows.

- Data flow
  - UI triggers actions (create background task, start/stop servers, generate LLM content) via API routes.
  - API routes persist state to SQLite and/or dispatch long-running work to the background task queue.
  - UI subscribes to changes (React Query polling, optional Supabase realtime in hooks) and renders events, progress, and results.

Notes for future agents

- No Jest/Vitest test runner is configured. To validate behavior, prefer exercising API endpoints and inspecting resulting SQLite state and UI.
- When dealing with OS process control on Windows in this repo, the APIs already handle platform specifics—call the provided /api/server/* endpoints rather than spawning processes directly.
- Databases are local files under database/ and are created on first use; migrations occur automatically in initialization paths and via the migrate-database endpoint when necessary.
