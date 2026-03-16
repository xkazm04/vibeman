# Environment Configuration

Vibeman uses a centralized environment configuration module at `src/lib/config/envConfig.ts`. All environment variable reads go through this module, which provides:

- **Typed getters** with proper defaults
- **Server-only guards** that throw if a secret is accidentally accessed on the client
- **Validation** (blank strings treated as undefined, integer parsing, boolean coercion)

## Quick Start

```bash
cp .env.example .env.local
# Edit .env.local — set at least one LLM provider API key
```

Next.js automatically loads `.env.local` (highest priority), `.env.development`, and `.env` (lowest priority). See the [Next.js env docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) for full precedence rules.

## Variable Reference

### LLM Providers (at least one required)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for Claude models |
| `ANTHROPIC_BASE_URL` | No | — | Custom Anthropic endpoint |
| `OPENAI_API_KEY` | No | — | OpenAI API key |
| `OPENAI_BASE_URL` | No | — | Custom OpenAI endpoint |
| `GEMINI_API_KEY` | No | — | Google Gemini API key |
| `GEMINI_BASE_URL` | No | `https://generativelanguage.googleapis.com/v1beta` | Gemini endpoint |
| `GROQ_API_KEY` | No | — | Groq API key |
| `GROQ_BASE_URL` | No | — | Custom Groq endpoint |
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Local Ollama server URL |
| `INTERNAL_API_BASE_URL` | No | — | Internal/custom LLM endpoint |

At least one provider must be configured for AI features to work. Ollama requires no API key — just run `ollama serve`.

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PATH` | No | `./database/goals.db` | SQLite database file path |
| `DB_WAL_MODE` | No | `true` | Enable WAL mode (`false` to disable) |
| `HOT_WRITES_DB_PATH` | No | auto-derived | Separate DB for hot-writes optimization |

The database file is created automatically on first run. No manual setup needed.

### App URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL (client-safe) |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | Public API URL (client-safe) |
| `NEXT_PUBLIC_BASE_URL` | No | `http://localhost:3000` | Base URL for server-side fetches |
| `VIBEMAN_API_URL` | No | falls back to `NEXT_PUBLIC_API_URL` | Server-side API URL override |
| `PORT` | No | `3000` | Next.js server port |

### Supabase (optional — cloud sync)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | — | Supabase anonymous key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | — | Service role key (server-only, bypasses RLS) |
| `REMOTE_SUPABASE_URL` | No | — | Remote Supabase for multi-device broker |
| `REMOTE_SUPABASE_ANON_KEY` | No | — | Remote Supabase anon key |
| `REMOTE_SUPABASE_SERVICE_ROLE_KEY` | No | — | Remote Supabase service role key |

### GitHub Integration (optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | No | — | PAT with `project:read`, `project:write` scopes |
| `GITHUB_PROJECT_ID` | No | — | GitHub Project global ID (e.g., `PVT_xxx`) |
| `GITHUB_PROJECT_OWNER` | No | — | Project owner username or org |
| `GITHUB_PROJECT_NUMBER` | No | — | Project number (visible in URL) |
| `GITHUB_STATUS_FIELD_ID` | No | — | Status field ID |
| `GITHUB_TARGET_DATE_FIELD_ID` | No | — | Target date field ID |
| `GITHUB_STATUS_TODO_ID` | No | — | Status option ID for "Todo" |
| `GITHUB_STATUS_IN_PROGRESS_ID` | No | — | Status option ID for "In Progress" |
| `GITHUB_STATUS_DONE_ID` | No | — | Status option ID for "Done" |
| `GITHUB_OWNER` | No | — | Repo owner for social features |
| `GITHUB_REPO` | No | — | Repo name for social features |

Use the `/api/goals/github-sync` discover endpoint to find field and status IDs.

### Voice Assistant (optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | No | — | ElevenLabs TTS/STT API key |
| `AWS_NOVA_ACCESS_KEY_ID` | No | — | AWS access key for Bedrock Nova Sonic |
| `AWS_NOVA_SECRET_ACCESS_KEY` | No | — | AWS secret key |
| `AWS_NOVA_REGION` | No | `eu-north-1` | AWS region for Bedrock |

### Other Services (all optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LEONARDO_API_KEY` | No | — | Leonardo.ai image generation |
| `BROWSERBASE_API_KEY` | No | — | Browserbase remote browser testing |
| `BROWSERBASE_PROJECT_ID` | No | — | Browserbase project ID |
| `GROK_API_KEY` | No | — | Grok/xAI API key (also accepts `XAI_API_KEY`) |
| `SOCIAL_ENCRYPTION_SECRET` | No | auto-generated | Encryption secret for social credentials |

### Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OBSERVABILITY_ENABLED` | No | `true` | Enable API call tracking |
| `VIBEMAN_PROJECT_ID` | No | auto-generated | Project ID for observability dashboard |
| `VIBEMAN_URL` | No | — | Instance URL for observability onboarding |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |

### MCP Server (set by MCP host)

These are set automatically when Vibeman runs as an MCP server — you typically do not set them manually.

| Variable | Default | Description |
|----------|---------|-------------|
| `VIBEMAN_BASE_URL` | `http://localhost:3000` | Vibeman API base URL |
| `VIBEMAN_PROJECT_ID` | — | Project ID for MCP operations |
| `VIBEMAN_CONTEXT_ID` | — | Context ID for context-specific tools |
| `VIBEMAN_TASK_ID` | — | Task ID for progress reporting |
| `VIBEMAN_PROJECT_PORT` | — | Dev server port |
| `VIBEMAN_RUN_SCRIPT` | — | Dev server start command |

### Cloud Execution (future)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXECUTION_MODE` | No | `local` | `local` or `cloud` |
| `CLOUD_ORCHESTRATOR_URL` | No | — | DAC Cloud orchestrator URL |
| `CLOUD_API_KEY` | No | — | Cloud API key |

## Usage in Code

Import and call the getter:

```typescript
import { env } from '@/lib/config/envConfig';

// Server-side API key (throws on client)
const key = env.anthropicApiKey();

// Client-safe variable
const url = env.appUrl();

// Boolean check
if (env.isProduction()) { ... }

// Conditional feature
if (env.isGitHubConfigured()) { ... }
```

### Adding a New Variable

1. Add a getter to `src/lib/config/envConfig.ts`
2. Use `serverOnly()` for secrets that must not leak to the browser
3. Add to `.env.example` with a comment
4. Document in this file

## Security Notes

- Variables prefixed with `NEXT_PUBLIC_` are embedded in the client bundle — never put secrets there
- All other variables are server-only; the `serverOnly()` guard in envConfig enforces this at runtime
- `.env.local` is gitignored by default — never commit real credentials
