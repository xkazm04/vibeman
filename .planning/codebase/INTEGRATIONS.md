# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**LLM Providers:**
- Anthropic Claude API
  - SDK: `@anthropic-ai/sdk` 0.78.0
  - Auth: `ANTHROPIC_API_KEY`
  - Client: `src/lib/llm/providers/anthropic-client.ts`
  - Models: `claude-4-5-sonnet`, `claude-haiku-4-5-20251001`
  - Circuit breaker with fallback chain support

- OpenAI API
  - SDK: Integrated but optional
  - Auth: `OPENAI_API_KEY`, `OPENAI_BASE_URL`
  - Client: `src/lib/llm/providers/openai-client.ts`

- Google Gemini API
  - Auth: `GEMINI_API_KEY`, `GEMINI_BASE_URL`
  - Client: `src/lib/llm/providers/gemini-client.ts`

- Groq API
  - Auth: `GROQ_API_KEY`, `GROQ_BASE_URL`
  - Client: `src/lib/llm/providers/groq-client.ts`

- Ollama (Local/Self-Hosted)
  - Base: `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
  - SDK: Custom client
  - Always available (no auth required)

**Agent Framework:**
- Anthropic Claude Agent SDK 0.2.59
  - SDK: `@anthropic-ai/claude-agent-sdk`
  - Integration: `src/lib/claude-terminal/` (CLI-like agent interface with tool use)
  - Use case: Autonomous task execution with tool integration

**GitHub Integration:**
- GitHub Copilot SDK 0.1.30
  - SDK: `@github/copilot-sdk`
  - Auth: Session-based with GitHub authentication
  - Client: `src/lib/copilot-sdk/client.ts`
  - Features: Session resume for context continuity, global persistence via `globalThis` for HMR survival
  - Models: Configurable via SDK

- GitHub API (via PAT)
  - Auth: `GITHUB_TOKEN` (personal access token)
  - Scopes: `project:read`, `project:write`
  - Client: `src/lib/github/client.ts`
  - Use: GitHub Projects roadmap sync
  - Config: `GITHUB_PROJECT_ID`, `GITHUB_PROJECT_OWNER`

**Model Context Protocol (MCP):**
- @modelcontextprotocol/sdk 1.27.1
  - Server: `src/mcp-server/` (standalone Node.js server)
  - Transport: stdio (process communication)
  - Tools registered:
    - `log_implementation` - Log work to database
    - `check_test_scenario` - Verify test scenarios
    - `capture_screenshot` - UI capture
    - `get_context` - Context details
    - `get_config` - Configuration retrieval
    - `get_memory` - Collective memory queries
    - `report_progress` - Structured progress reporting
    - `get_related_tasks` - Parallel task coordination
  - Communication: Vibeman MCP server connects to Claude Code via stdio

## Data Storage

**Databases:**
- SQLite (Primary)
  - Type: Embedded relational database
  - Connection: `src/app/db/connection.ts`
  - Driver: `src/app/db/drivers/sqlite.driver.ts` (via better-sqlite3 12.6.2)
  - Path: `DATABASE_URL` env var (default: `./database/vibeman.db`)
  - Migrations: `src/app/db/migrations/` (numbered migrations, tracked in `_migrations_applied`)
  - Repositories: `src/app/db/repositories/` pattern
  - Instrumentation: Query timing via `queryPatternCollector` for schema intelligence

- Supabase PostgreSQL (Optional Cloud Sync)
  - Type: Managed PostgreSQL via Supabase
  - REST API: `@supabase/supabase-js` 2.98.0
  - Auth:
    - Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - Server: `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `src/lib/supabase/client.ts`
  - Sync services:
    - `src/lib/supabase/project-sync.ts` (device-based claim pattern with optimistic locks)
    - `src/lib/supabase/external-requirements.ts` (external requirement pipelines)
  - Tables: `vibeman_projects`, `vibeman_requirements`, `sync_metadata`
  - RLS: Service role bypasses RLS for server-side operations
  - Connection pooling: Optional via `SUPABASE_POOLER_URL` (for external apps)

**File Storage:**
- Local filesystem only
  - Context paths secured via `src/lib/pathSecurity.ts`
  - File watching: `chokidar` 5.0.0 for real-time updates
  - Implementation: `src/lib/fileOperations.ts`

**Caching:**
- In-memory: Zustand stores with `persist` middleware
- Statement cache: `src/lib/db/PreparedStatementCache`
- React Query: `@tanstack/react-query` 5.90.21 for API caching

## Authentication & Identity

**Auth Provider:**
- GitHub OAuth (via Copilot SDK and GitHub API token)
  - Implementation: Session-based for Copilot, PAT-based for GitHub API
  - Config: `GITHUB_TOKEN` for personal access tokens

- Supabase Auth (Optional)
  - Implementation: Custom if needed (not currently observed)
  - Access methods: Anon key for client, service role for server

**Session Management:**
- CLI Sessions: 4 concurrent, multi-provider (claude, gemini, copilot, ollama)
  - Location: `src/lib/claude-terminal/session-manager.ts`
  - Persistence: Global state via `useClientProjectStore` (Zustand)

## Monitoring & Observability

**Error Tracking:**
- Internal: No external error tracking service detected
- Local: `src/lib/errorClassifier.ts` with error classification and healing analysis

**Logs:**
- Approach: Internal logger at `src/lib/logger.ts`
- Output: Structured to database and console
- API routes: Forbidden from using `console` directly (via ESLint); must use logger

**Performance Monitoring:**
- Query instrumentation: `src/lib/db/queryPatternCollector.ts` tracks query timing
- Stored in database: `query_patterns` table via schema intelligence engine
- Circuit breaker: `src/lib/llm/circuitBreaker.ts` tracks provider health

## CI/CD & Deployment

**Hosting:**
- Deployment: Next.js server (self-hosted or cloud platform)
- Package: Built with `next build`, started with `next start`

**CI Pipeline:**
- None explicitly detected
- Build validation: `npm run lint`, `npm run test` available locally
- Security: `npm audit` scripts for vulnerability scanning

**Scripts Available:**
```bash
npm run dev              # Next.js dev with Turbopack
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint checks
npm run test             # Vitest runner
npm run build:mcp        # Compile MCP server
npm run mcp-server       # Run MCP server
npm run security:audit   # Vulnerability check
```

## Environment Configuration

**Required env vars (min to run):**
- `DATABASE_URL` - SQLite path (or Supabase connection)
- At least one LLM API key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `GROQ_API_KEY`

**Optional integrations:**
- `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` - Cloud sync
- `GITHUB_TOKEN` + `GITHUB_PROJECT_ID` + `GITHUB_PROJECT_OWNER` - GitHub roadmap sync
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` - Bedrock voice
- `OLLAMA_BASE_URL` - Local LLM inference
- `INTERNAL_API_BASE_URL` - Internal LLM endpoint

**Secrets location:**
- `.env` file (local development, NOT committed)
- `.env.example` shows structure (safe to commit)
- Platform-specific: Environment variables on production host

## Webhooks & Callbacks

**Incoming:**
- MCP stdio transport (Claude Code ↔ Vibeman MCP server)
- API routes for conductor, external requirements, voice features
- No HTTP webhooks detected from external services

**Outgoing:**
- Supabase REST API calls from `src/lib/supabase/sync.ts`
- GitHub API calls via `src/lib/github/client.ts`
- LLM API requests (streaming and non-streaming)

**Real-time Communication:**
- Supabase real-time subscriptions (via `@supabase/supabase-js`)
- SSE (Server-Sent Events) for conductor status: `src/app/api/conductor/status`
- Polling via `src/hooks/usePolling` for updates

## Voice & Speech Integration

**AWS Bedrock:**
- Service: Nova Sonic model for TTS and STT
- SDK: `@aws-sdk/client-bedrock-runtime` 3.1004.0
- Endpoint: `src/app/api/voicebot/nova-sonic/route.ts`
- Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- Features: Bidirectional streaming, real-time transcription and synthesis
- Handler: `@smithy/node-http-handler` for Node.js HTTP

**Speech-to-Text:**
- Endpoint: `src/app/api/voicebot/speech-to-text/`

**Text-to-Speech:**
- Endpoint: `src/app/api/voicebot/text-to-speech/`

---

*Integration audit: 2026-03-14*
