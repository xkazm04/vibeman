# Setup Guide

Local development setup for Vibeman. This app runs entirely on localhost — no cloud infrastructure required.

## Prerequisites

| Requirement | Minimum | Recommended | Notes |
|-------------|---------|-------------|-------|
| **Node.js** | 18.18+ | 22 LTS | Required by Next.js 16. Check with `node -v` |
| **npm** | 9+ | 10+ | Ships with Node.js |
| **Git** | 2.x | Latest | For cloning and version control |
| **Python** | 3.x | 3.12+ | Required by `better-sqlite3` native compilation |
| **C++ build tools** | — | — | See [platform-specific instructions](#platform-specific-build-tools) below |

### Platform-Specific Build Tools

`better-sqlite3` is a native Node.js addon that compiles C++ during `npm install`. You need a working C++ toolchain:

**Windows:**
```bash
npm install -g windows-build-tools
# Or install Visual Studio Build Tools with the "Desktop development with C++" workload
```

**macOS:**
```bash
xcode-select --install
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install build-essential python3
```

### Optional: CLI Providers

To use AI-powered task execution, install at least one CLI tool:

| Provider | Install | Docs |
|----------|---------|------|
| Claude CLI | `npm install -g @anthropic-ai/claude-code` | [claude.ai/code](https://claude.ai/code) |
| Gemini CLI | `npm install -g @anthropic-ai/gemini-cli` | [ai.google.dev](https://ai.google.dev) |
| Ollama | Download from [ollama.com](https://ollama.com) | Local models, no API key needed |

These are only needed for the TaskRunner and Conductor features. The rest of the app (goals, ideas, scans, brain) works with just API keys.

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/xkazm04/vibeman.git
cd vibeman

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env.local

# 4. Edit .env.local with your API keys (see Configuration below)

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

On first start, the SQLite database is created automatically at `database/goals.db`. No manual database setup is required.

## Configuration

All environment variables are documented in `.env.example`. Copy it to `.env.local` and uncomment/fill in the values you need.

Environment access is centralized through `src/lib/config/envConfig.ts` — never read `process.env` directly.

### Minimum Configuration

The app starts with zero configuration. For AI features, set at least one LLM provider key in `.env.local`:

```bash
# Pick one (or more):
ANTHROPIC_API_KEY=sk-ant-xxx     # Recommended — used by most features
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx
```

That's it. Everything else has sensible defaults.

### Configuration Tiers

**Tier 1 — Core (recommended):**

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Claude API for idea generation, analysis, conductor | *none* |
| `OPENAI_API_KEY` | OpenAI models as alternative/fallback | *none* |
| `GEMINI_API_KEY` | Gemini models as alternative/fallback | *none* |
| `OLLAMA_BASE_URL` | Local Ollama instance | `http://localhost:11434` |

**Tier 2 — Database (optional, has defaults):**

| Variable | Purpose | Default |
|----------|---------|---------|
| `DB_PATH` | SQLite database file location | `./database/goals.db` |
| `DB_WAL_MODE` | Enable WAL for concurrent reads | `true` |
| `HOT_WRITES_DB_PATH` | Separate DB for high-frequency writes | Auto-derived from `DB_PATH` |

**Tier 3 — Cloud sync (optional):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for multi-device sync |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GITHUB_TOKEN` | GitHub PAT for project board sync |
| `GITHUB_PROJECT_OWNER` | GitHub username/org owning the project |

**Tier 4 — Optional services:**

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | Voice assistant (Annette) |
| `LEONARDO_API_KEY` | AI image generation |
| `BROWSERBASE_API_KEY` | Remote browser testing |
| `GROK_API_KEY` | Grok/xAI provider |
| `GROQ_API_KEY` | Groq provider (fast inference) |

See `.env.example` for the full annotated list with all available variables.

## Quick Start

```bash
# Start dev server (Turbopack)
npm run dev

# In another terminal — verify it's working:
curl http://localhost:3000/api/health

# Run tests
npm test

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build && npm start
```

### First Steps in the App

1. Open http://localhost:3000
2. Create a project pointing to a local code repository
3. Run a codebase scan to generate improvement ideas
4. Review ideas in the Tinder-style evaluator
5. Promote accepted ideas to goals
6. Use TaskRunner or Conductor to execute goals via CLI providers

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests (Vitest) |
| `npx tsc --noEmit` | Type-check without emitting |
| `npm run build:mcp` | Build the MCP server |
| `npm run mcp-server` | Run the MCP server |
| `npm run security:audit` | Run npm audit (prod deps only) |

## Project Structure

```
vibeman/
├── src/
│   ├── app/
│   │   ├── api/            # Next.js API routes (70+ endpoint groups)
│   │   ├── db/             # Database layer (SQLite, migrations, repositories)
│   │   └── features/       # Feature modules (23 self-contained features)
│   ├── lib/                # Shared libraries (LLM, config, validation)
│   ├── stores/             # Zustand stores (45+)
│   ├── hooks/              # Shared React hooks
│   └── components/         # Shared UI components
├── database/               # SQLite database files (auto-created)
├── .env.example            # Environment variable template
├── DEVELOPMENT.md          # Architecture deep-dive
└── SETUP.md                # This file
```

## Troubleshooting

### `npm install` fails with native module errors

`better-sqlite3` requires C++ build tools. See [Platform-Specific Build Tools](#platform-specific-build-tools) above.

If you're on Windows and still getting errors after installing build tools:
```bash
# Clear npm cache and rebuild
npm cache clean --force
rm -rf node_modules
npm install
```

### Database errors on startup

The database auto-creates on first run. If you see migration errors:

```bash
# Delete the database and let it recreate
rm -rf database/
npm run dev
```

Migrations are idempotent — they safely re-run on fresh databases.

### "ANTHROPIC_API_KEY is not set" or similar warnings

The app starts without API keys, but AI features won't work. Set at least one LLM provider key in `.env.local`. These warnings are informational, not fatal.

### Port 3000 already in use

```bash
# Find what's using port 3000
# macOS/Linux:
lsof -i :3000
# Windows:
netstat -ano | findstr :3000

# Or start on a different port:
PORT=3001 npm run dev
```

### TypeScript errors after pulling changes

```bash
# Rebuild node_modules if types are stale
rm -rf node_modules/.cache
npx tsc --noEmit
```

### CLI provider not found (claude/gemini command not found)

CLI providers must be installed globally. The app spawns them as subprocesses:

```bash
# Verify installation
which claude    # or: where claude (Windows)
which gemini

# If missing, install globally
npm install -g @anthropic-ai/claude-code
```

### Hot-reload not working

Turbopack is enabled by default with `npm run dev`. If changes aren't picked up:
1. Check that you're editing files inside `src/`
2. Try stopping and restarting the dev server
3. Clear the Next.js cache: `rm -rf .next`

### SQLite "database is locked" errors

This usually means another process has the database open. Ensure only one instance of the dev server is running. WAL mode (enabled by default) prevents most locking issues.

### Tests failing with database errors

Tests use an in-memory SQLite database and run sequentially (`singleFork: true` in vitest config). If tests fail:

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run a specific test file
npm test -- src/path/to/test.test.ts
```
