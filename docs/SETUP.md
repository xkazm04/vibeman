# Developer Setup Guide

Step-by-step instructions for setting up Vibeman for local development.

---

## Prerequisites

### Required

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 20+ | Required for Next.js 16 and `better-sqlite3` native compilation |
| **npm** | 10+ | Comes with Node.js |
| **Git** | 2.30+ | For cloning and version control features |
| **C/C++ build tools** | — | Required by `better-sqlite3` native addon (see below) |

### Platform-Specific Build Tools

<details>
<summary><strong>Windows</strong></summary>

Install Visual Studio Build Tools with the **"Desktop development with C++"** workload:

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. In the installer, select **"Desktop development with C++"**
3. This includes the required C++ compiler and Python 3

Alternatively:

```bash
npm install -g windows-build-tools
```

</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
xcode-select --install
```

</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt install build-essential python3
```

For other distros, install `gcc`, `g++`, `make`, and `python3`.

</details>

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/vibeman.git
cd vibeman
```

---

## 2. Install Dependencies

```bash
npm install
```

This compiles the `better-sqlite3` native addon. If this step fails, see [Troubleshooting: `better-sqlite3` build failure](TROUBLESHOOTING.md#better-sqlite3-build-failure).

---

## 3. Configure Environment

```bash
cp .env.example .env.local
```

Open `.env.local` and configure **at least one LLM provider API key**:

```env
# Recommended: Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or any of these alternatives:
# OPENAI_API_KEY=sk-your-key-here
# GEMINI_API_KEY=your-key-here
# GROQ_API_KEY=your-key-here
```

For local-only usage with no API key, you can use **Ollama** (free, runs locally):

```bash
# Install Ollama: https://ollama.com/download
ollama serve
ollama pull qwen3.5:cloud
```

The default `OLLAMA_BASE_URL=http://localhost:11434` in `.env.example` is already set.

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | At least one LLM key | — | Anthropic Claude API key |
| `OPENAI_API_KEY` | | — | OpenAI API key |
| `GEMINI_API_KEY` | | — | Google Gemini API key |
| `GROQ_API_KEY` | | — | Groq API key |
| `OLLAMA_BASE_URL` | | `http://localhost:11434` | Ollama server URL |
| `DB_PATH` | No | `./database/goals.db` | SQLite database file path |
| `DB_WAL_MODE` | No | `true` | Enable WAL mode for better concurrency |
| `PORT` | No | `3000` | Next.js server port |
| `LOG_LEVEL` | No | `info` | Logging level: `debug`, `info`, `warn`, `error` |

See [docs/ENVIRONMENT.md](ENVIRONMENT.md) for the complete variable reference including optional integrations (Supabase, GitHub Projects, voice assistant, etc.).

---

## 4. Database Setup

**No manual setup required.** The SQLite database is created automatically on first server start at `./database/goals.db`.

Migrations run automatically via the tracking table `_migrations_applied`. Each migration executes exactly once.

### Manual Database Reset

To start fresh, delete the database file:

```bash
rm -f database/goals.db
```

The database and all tables will be recreated on next server start.

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `./database/goals.db` | Location of the SQLite database file |
| `DB_WAL_MODE` | `true` | WAL mode improves read concurrency. Set to `false` only if you hit file-locking issues on network drives |
| `HOT_WRITES_DB_PATH` | Auto-derived | Separate DB instance for high-frequency writes (optional) |

---

## 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app will:
1. Create the `database/` directory if it doesn't exist
2. Initialize the SQLite database
3. Run all pending migrations
4. Start the Next.js dev server with Turbopack

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack (hot reload) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run test suite (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run build:mcp` | Compile MCP server |
| `npm run security:audit` | Run dependency security audit |

---

## 6. Running Tests

Tests use [Vitest](https://vitest.dev/) with a separate test database (`./database/test.db`).

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest --watch

# Run tests with coverage
npx vitest --coverage

# Run a specific test file
npx vitest run tests/api/goals/route.test.ts
```

Tests run sequentially (single fork) to avoid SQLite concurrency issues. The test database is isolated from your development database.

### Test Structure

```
tests/
├── setup/
│   ├── global-setup.ts       # Runs before all tests (DB init)
│   ├── test-database.ts      # Test DB utilities
│   └── factories/            # Mock data generators
└── api/                      # API route tests
    ├── goals/
    ├── ideas/
    ├── conductor/
    └── ...
```

---

## 7. Optional: CLI Providers

The Task Runner dispatches work to AI CLI tools. Install only what you need:

### Claude Code CLI (Primary)

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

### Gemini CLI

```bash
npm install -g @google/gemini-cli
gemini --version
# Run 'gemini' once interactively to complete OAuth login, or set GEMINI_API_KEY
```

### Ollama

```bash
# Install from https://ollama.com/download
ollama serve
ollama pull qwen3.5:cloud
```

---

## 8. Optional: Integrations

### Supabase (Cloud Sync)

For multi-device sync, add Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### GitHub Projects (Roadmap Sync)

```env
GITHUB_TOKEN=ghp_your-token
GITHUB_PROJECT_ID=PVT_your-project-id
GITHUB_PROJECT_OWNER=your-username
GITHUB_PROJECT_NUMBER=1
```

Use the `/api/goals/github-sync` discover endpoint to find status field IDs.

---

## Verifying Your Setup

Run this checklist after setup:

```bash
# 1. Dependencies installed
node -v          # Should be 20+
npm -v           # Should be 10+

# 2. Environment configured
cat .env.local   # Should have at least one API key

# 3. Dev server starts
npm run dev      # Should start on http://localhost:3000

# 4. Tests pass
npm test         # All tests should pass

# 5. TypeScript compiles
npx tsc --noEmit # No type errors

# 6. Lint passes
npm run lint     # No lint errors
```

---

## Next Steps

- Read [docs/API.md](API.md) for the API endpoint reference
- Read [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you hit any issues
- Read [docs/FEATURES.md](FEATURES.md) for feature documentation
- Read [docs/ENVIRONMENT.md](ENVIRONMENT.md) for the full environment variable reference
