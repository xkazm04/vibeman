# API_ENDPOINTS.md
This document summarizes API endpoints implemented in the Vibeman codebase (Next.js app router under src/app/api). Endpoints are grouped by domain. Each entry includes the route path, the source file, a brief use case, the supported HTTP methods (detected from the code), and whether it’s suitable as a tool for an internal LLM bot managing this app.


## LLM and provider metadata

### /api/llm/generate
  - File: src/app/api/llm/generate/route.ts
  - Methods: POST
  - Use: Unified text generation via the internal LLM manager
  - Tool suitability: No - Used by Ollama client

### /api/kiro/llm-providers
  - File: src/app/api/kiro/llm-providers/route.ts
  - Methods: GET
  - Use: Check availability/configuration of LLM providers
  - Tool suitability: No

### /api/llm/health
  - File: src/app/api/llm/health/route.ts
  - Methods: GET
  - Use: Health check for LLM subsystem
  - Tool suitability: No (read-only)

### /api/llm/models
  - File: src/app/api/llm/models/route.ts
  - Methods: GET
  - Use: List available models
  - Tool suitability: No (read-only)

### Kiro orchestration and utilities

- /api/kiro/ai-project-background
  - File: src/app/api/kiro/ai-project-background/route.ts
  - Methods: POST
  - Use: Background project analysis
  - Tool suitability: **Yes** - Caution (writes generated data)

### /api/kiro/ai-project-review
  - File: src/app/api/kiro/ai-project-review/route.ts
  - Methods: POST
  - Use: Run AI review over a project
  - Tool suitability: **Yes - Caution (expensive and may enqueue work)**

### /api/kiro/events
  - File: src/app/api/kiro/events/route.ts
  - Methods: GET, POST, DELETE
  - Use: CRUD for internal event log (SQLite)
  - Tool suitability: **Yes for GET/POST; Caution for DELETE**

### /api/kiro/events/counts
  - File: src/app/api/kiro/events/counts/route.ts
  - Methods: GET
  - Use: Aggregated event counts by type/project
  - Tool suitability: No (read-only)

### /api/kiro/events/clear
  - File: src/app/api/kiro/events/clear/route.ts
  - Methods: DELETE
  - Use: Clear events for a project
  - Tool suitability: Caution (destructive)

### /api/kiro/folder-structure
  - File: src/app/api/kiro/folder-structure/route.ts
  - Methods: GET
  - Use: Analyze or return project folder structure
  - Tool suitability: **Yes (read-only)**

### /api/kiro/generate-context
  - File: src/app/api/kiro/generate-context/route.ts
  - Methods: POST
  - Use: Create context bundles for files
  - Tool suitability: **Yes (writes context artifacts)**

### /api/kiro/generate-context-background
  - File: src/app/api/kiro/generate-context-background/route.ts
  - Methods: POST
  - Use: Background generation of contexts
  - Tool suitability: **Yes (enqueues work/writes)**

### /api/kiro/background-tasks
  - File: src/app/api/kiro/background-tasks/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Manage background tasks (list/create/update/delete)
  - Tool suitability: **Yes for GET; Caution for POST/PUT/DELETE (queue control)**

### /api/kiro/background-tasks/queue
  - File: src/app/api/kiro/background-tasks/queue/route.ts
  - Methods: GET, POST
  - Use: Control queue processing (start/stop/config)
  - Tool suitability: **Yes Caution (affects system-wide processing)**

### - /api/kiro/start-queue
  - File: src/app/api/kiro/start-queue/route.ts
  - Methods: POST
  - Use: Convenience endpoint to start the background queue
  - Tool suitability: **Yes (bounded, intended entrypoint)**

### - /api/kiro/migrate-database
  - File: src/app/api/kiro/migrate-database/route.ts
  - Methods: POST
  - Use: Initialize/upgrade background task DB schema
  - Tool suitability: Caution (schema changes)

## Disk services
### /api/disk/read-file
  - File: src/app/api/disk/read-file/route.ts
  - Methods: POST
  - Use: Read a file from disk
  - Tool suitability: **Yes (read-only)**

### /api/disk/save-file
  - File: src/app/api/kiro/save-file/route.ts
  - Methods: POST
  - Use: Write/update a file on disk
  - Tool suitability: **Yes Caution (file write)**

### /api/disk/save-context-file
  - File: src/app/api/kiro/save-context-file/route.ts
  - Methods: POST
  - Use: Write a generated context file
  - Tool suitability: **Yes Caution (file write)**

### /api/disk/save-contexts-batch
  - File: src/app/api/kiro/save-contexts-batch/route.ts
  - Methods: POST
  - Use: Batch write multiple context files/records
  - Tool suitability: **Yes Caution (bulk writes)**

## Projects and server lifecycle

### - /api/projects
  - File: src/app/api/projects/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Project registry operations (list/manage)
  - Tool suitability: **Yes for reads; Caution for writes**

### - /api/projects/directories
  - File: src/app/api/projects/directories/route.ts
  - Methods: GET
  - Use: Enumerate or validate project directories
  - Tool suitability: Yes (read-only)

### - /api/projects/ports
  - File: src/app/api/projects/ports/route.ts
  - Methods: GET
  - Use: List used ports from projects DB
  - Tool suitability: Yes (read-only)

### - /api/server/start
  - File: src/app/api/server/start/route.ts
  - Methods: POST
  - Use: Start a registered project’s dev server via processManager
  - Tool suitability: Caution (spawns processes)

### - /api/server/stop
  - File: src/app/api/server/stop/route.ts
  - Methods: POST
  - Use: Stop a running project server
  - Tool suitability: Caution (kills processes)

### - /api/server/status
  - File: src/app/api/server/status/route.ts
  - Methods: GET
  - Use: Get statuses for all tracked processes
  - Tool suitability: Yes (read-only)

### - /api/server/logs/[id]
  - File: src/app/api/server/logs/[id]/route.ts
  - Methods: GET
  - Use: Fetch recent logs for a tracked process
  - Tool suitability: Yes (read-only)

### - /api/server/debug
  - File: src/app/api/server/debug/route.ts
  - Methods: GET
  - Use: Debug/diagnostic index for server tools
  - Tool suitability: Yes (read-only)

### - /api/server/debug/scan-ports
  - File: src/app/api/server/debug/scan-ports/route.ts
  - Methods: POST
  - Use: Scan for in-use ports
  - Tool suitability: Yes (read-only)

### - /api/server/debug/port/[port]
  - File: src/app/api/server/debug/port/[port]/route.ts
  - Methods: GET
  - Use: Inspect a specific port and possibly its PID
  - Tool suitability: Yes (read-only)

### - /api/server/debug/kill-process
  - File: src/app/api/server/debug/kill-process/route.ts
  - Methods: POST
  - Use: Attempt to kill a process by PID
  - Tool suitability: Caution (destructive)

### - /api/server/git/clone
  - File: src/app/api/server/git/clone/route.ts
  - Methods: POST
  - Use: Clone a repository into a target path
  - Tool suitability: Caution (filesystem/network side effects)

### - /api/server/git/pull
  - File: src/app/api/server/git/pull/route.ts
  - Methods: POST
  - Use: Pull latest changes for a repo
  - Tool suitability: Caution (modifies working copy)

### - /api/server/git/status
  - File: src/app/api/server/git/status/route.ts
  - Methods: POST
  - Use: Check repo status (branch, changes) via server
  - Tool suitability: Yes (read-only against repo)

## Backlog, requirements, reviewer, tasks

### - /api/backlog
  - File: src/app/api/backlog/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Backlog index/dispatch (see subroutes for actions)
  - Tool suitability: **Yes for reads; Caution for writes**

### - /api/backlog/generate-task
  - File: src/app/api/backlog/generate-task/route.ts
  - Methods: POST
  - Use: Generate a backlog task (AI-assisted)
  - Tool suitability: **Caution (creates records)**

### - /api/backlog/process-coding-task
  - File: src/app/api/backlog/process-coding-task/route.ts
  - Methods: POST
  - Use: Process a coding task (long-running, AI)
  - Tool suitability: **Yes Caution (enqueues/executes work)**

### - /api/backlog/start-coding
  - File: src/app/api/backlog/start-coding/route.ts
  - Methods: POST
  - Use: Kick off a coding session/task
  - Tool suitability: **Yes Caution (starts work)**

### - /api/backlog/update-task
  - File: src/app/api/backlog/update-task/route.ts
  - Methods: PUT, DELETE
  - Use: Update backlog task fields/status
  - Tool suitability: **Yes Caution (writes data)**

### - /api/backlog/test
  - File: src/app/api/backlog/test/route.ts
  - Methods: POST
  - Use: Test utilities for backlog flows
  - Tool suitability: No (test-only)

### - /api/backlog/debug
  - File: src/app/api/backlog/debug/route.ts
  - Methods: GET
  - Use: Debug utilities for backlog
  - Tool suitability: No (debug-only)

### - /api/requirements/create
  - File: src/app/api/requirements/create/route.ts
  - Methods: POST
  - Use: Create requirement specs/records
  - Tool suitability: **Yes Caution (writes data)**

### - /api/requirements/status
  - File: src/app/api/requirements/status/route.ts
  - Methods: GET
  - Use: Check/return requirement processing status
  - Tool suitability: **Yes (read-only)**

### - /api/reviewer/pending-files
  - File: src/app/api/reviewer/pending-files/route.ts
  - Methods: GET
  - Use: List files awaiting review
  - Tool suitability: **Yes (read-only)**

- /api/reviewer/pending-count
  - File: src/app/api/reviewer/pending-count/route.ts
  - Methods: GET
  - Use: Count of pending review sessions/files
  - Tool suitability: Yes (read-only)

- /api/reviewer/pending-sessions
  - File: src/app/api/reviewer/pending-sessions/route.ts
  - Methods: GET
  - Use: List pending review sessions
  - Tool suitability: Yes (read-only)

### - /api/reviewer/accept-file
  - File: src/app/api/reviewer/accept-file/route.ts
  - Methods: POST
  - Use: Accept a reviewed file
  - Tool suitability: Caution (state change)

### - /api/reviewer/reject-file
  - File: src/app/api/reviewer/reject-file/route.ts
  - Methods: POST
  - Use: Reject a reviewed file
  - Tool suitability: Caution (state change)

### - /api/reviewer/decline-session
  - File: src/app/api/reviewer/decline-session/route.ts
  - Methods: POST
  - Use: Decline a review session
  - Tool suitability: Caution (state change)

### - /api/tasks/add
  - File: src/app/api/tasks/add/route.ts
  - Methods: POST
  - Use: Add a unit of work/task
  - Tool suitability: **Caution (creates records)**

## Contexts, goals, structure

### - /api/contexts
  - File: src/app/api/contexts/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Manage contexts (list/create/update)
  - Tool suitability: **Yes for reads; Caution for writes**

### - /api/context-groups
  - File: src/app/api/context-groups/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Manage context groups/categories
  - Tool suitability: **Yes for reads; Caution for writes**

### - /api/goals
  - File: src/app/api/goals/route.ts
  - Methods: GET, POST, PUT, DELETE
  - Use: Manage development goals
  - Tool suitability: **Yes for reads; Caution for writes**

### - /api/project/structure
  - File: src/app/api/project/structure/route.ts
  - Methods: POST
  - Use: Return inferred project structure
  - Tool suitability: Yes (read-only)

## File scanning and fixing

### - /api/file-scanner
  - File: src/app/api/file-scanner/route.ts
  - Methods: GET, POST
  - Use: List/scan code files, coordinate LLM-based scan/rewrite
  - Tool suitability: Caution (may write files depending on action)

### - /api/file-fixer
  - File: src/app/api/file-fixer/route.ts
  - Methods: GET, POST
  - Use: Attempt to fix build errors via LLM
  - Tool suitability: Caution (writes files)

Events (Supabase test harness)

- /api/events/test
  - File: src/app/api/events/test/route.ts
  - Methods: GET, POST
  - Use: Insert/fetch sample flow events via Supabase for demos/tests
  - Tool suitability: No for prod use; Yes for local demos

Annette voicebot prototype

- /api/annette/langgraph
  - File: src/app/api/annette/langgraph/route.ts
  - Methods: POST
  - Use: Orchestrate Annette voicebot pipeline (tool selection + Ollama)
  - Tool suitability: Caution (invokes tools/LLM; demo flow)

Voicebot utilities

- /api/voicebot/speech-to-text
  - File: src/app/api/voicebot/speech-to-text/route.ts
  - Methods: POST
  - Use: STT integration endpoint (e.g., ElevenLabs)
  - Tool suitability: Caution (external API usage)

- /api/voicebot/text-to-speech
  - File: src/app/api/voicebot/text-to-speech/route.ts
  - Methods: POST
  - Use: TTS integration endpoint
  - Tool suitability: Caution (external API usage)

Notes

- Paths reflect Next.js app router mapping: src/app/api/<segments>/route.ts => /api/<segments>.
- Some endpoints have multiple HTTP methods; consult the source for exact method support when integrating as tools.
- “Caution” endpoints are appropriate for an internal LLM if guarded by explicit user intent and project safeguards (e.g., dry-run flags, background tasks, or review gates).
