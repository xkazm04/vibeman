![Vibeman](public/logo/vibeman_logo.png)

# Vibeman

**AI-Driven End-to-End Software Development Lifecycle Automation**

> Transform from a code writer into a high-level technical manager. Let AI handle the volume of development work while you make decisions based on results.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  FEEDBACK   │───>│ REQUIREMENT │───>│   BACKLOG   │───>│IMPLEMENTATION│───>│    TEST     │
│             │    │             │    │    IDEA     │    │              │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
     ^                                                                              │
     └──────────────────────────────────────────────────────────────────────────────┘
                              Continuous Feedback Loop
```

---

## Table of Contents

- [What is Vibeman?](#what-is-vibeman)
- [Screenshots](#screenshots)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Your First Project](#your-first-project)
- [CLI Providers](#cli-providers)
- [Feature Overview](#feature-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Documentation](#documentation)
- [Cross-Platform Notes](#cross-platform-notes)
- [Security Notice](#security-notice)
- [Contributing](#contributing)
- [License](#license)

---

## What is Vibeman?

Vibeman is a **localhost-first** application that orchestrates your entire software development lifecycle through AI. It connects feedback capture, requirement planning, idea generation, implementation, and testing into a single automated pipeline.

Instead of manually writing code, reviewing diffs, and managing backlogs in separate tools, Vibeman gives you a unified dashboard where AI agents handle the heavy lifting. You define goals and direction — Vibeman plans, executes, and reports back.

### Key Features

- **Multi-Provider AI Execution** — Run tasks across Claude, Gemini, Copilot, and Ollama simultaneously with 4 concurrent CLI sessions
- **Conductor Pipeline** — Adaptive 3-phase cycle (Plan -> Dispatch -> Reflect) with self-healing error recovery
- **Codebase Scanning** — AI agents analyze your code for improvements across structure, build, context, and vision dimensions
- **Tinder-Style Idea Evaluation** — Swipe to accept/reject AI-generated improvement suggestions
- **Goal & Requirement Tracking** — Full lifecycle management with optional GitHub Projects sync
- **Task Runner** — Batch execution with real-time SSE streaming, auto-commit, and screenshot validation
- **Context System** — Organize code into business feature "contexts" that flow through the entire lifecycle
- **Brain Dashboard** — Behavioral learning with anomaly detection, correlation analysis, and activity heatmaps
- **Voice Assistant (Annette)** — AI-powered voice companion with chat, voice lab, and autonomous agent modes
- **Multi-Project Support** — Manage up to 20 projects in parallel
- **Refactor Wizard** — Multi-step refactoring pipeline with AI-guided execution
- **Daily Standup Reports** — Auto-generated standup summaries based on activity

---

## Screenshots

| Goals | Ideas | Task Runner |
|-------|-------|-------------|
| ![Goals](public/screenshots/readme/readme_goals.png) | ![Ideas](public/screenshots/readme/readme_ideas.png) | ![Task Runner](public/screenshots/readme/readme_tasker.png) |

| Tinder Evaluation | Feedback | Contexts |
|-------------------|----------|----------|
| ![Tinder](public/screenshots/readme/readme_tinder.png) | ![Feedback](public/screenshots/readme/readme_directions.png) | ![Contexts](public/screenshots/readme/readme_contexts.png) |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/vibeman.git
cd vibeman

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — at minimum, set one LLM provider API key

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite database is created automatically on first run — no manual setup required.

---

## Prerequisites

### Required

| Requirement | Notes |
|-------------|-------|
| **Node.js 20+** | Required for Next.js 16 and `better-sqlite3` native compilation |
| **npm** | Comes with Node.js |
| **C/C++ build tools** | Required by `better-sqlite3` native addon (see platform-specific below) |

### Platform-Specific Build Tools

**Windows:**

| Requirement | Install |
|-------------|---------|
| Build Tools | `npm install -g windows-build-tools` or install Visual Studio Build Tools with "Desktop development with C++" workload |
| Python 3 | Required by `node-gyp` (included with Visual Studio Build Tools) |

**macOS:**

```bash
xcode-select --install
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt install build-essential python3
```

For other distros, install `gcc`, `g++`, `make`, and `python3`.

---

## Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local — at minimum, set one LLM provider API key
```

All environment variables are read through a centralized config module (`src/lib/config/envConfig.ts`) with validation, typed getters, and server-only guards for secrets.

### LLM Providers (at least one required)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GROQ_API_KEY` | Groq API key |
| `OLLAMA_BASE_URL` | Ollama server URL (default: `http://localhost:11434`) |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `./database/goals.db` | SQLite database file path |
| `DB_WAL_MODE` | `true` | Enable WAL mode for better concurrency |

### Optional Integrations

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (cloud sync) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `GITHUB_TOKEN` | GitHub PAT for Projects sync (`project:read`, `project:write` scopes) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (voice assistant) |
| `BROWSERBASE_API_KEY` | BrowserBase API key (automated screenshots) |
| `LEONARDO_API_KEY` | Leonardo.ai image generation |

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the complete variable reference with defaults and descriptions.

---

## Your First Project

After starting the app, here's how to get up and running:

### 1. Add a Project

Navigate to the project selector in the top bar and click **Add Project**. Point it at any local repository — Vibeman works with any codebase.

| Setting | Description |
|---------|-------------|
| **Name** | Display name for the project |
| **Path** | Absolute path to the local repository |
| **Port** | (Optional) Dev server port for screenshot validation |

### 2. Define Goals

Switch to the **Goals** module and create your first requirement. Goals represent what you want to achieve — features, bug fixes, or refactors. Each goal flows through a lifecycle: `open` -> `in_progress` -> `done`.

### 3. Scan for Ideas

Use the **Ideas** module to run AI-powered codebase scans. Vibeman analyzes your code across multiple dimensions (structure, build quality, alignment with goals) and generates actionable improvement suggestions.

### 4. Evaluate with Tinder

The **Tinder** module presents ideas one at a time. Swipe right to accept, left to reject. Accepted ideas become tasks ready for execution.

### 5. Execute Tasks

Open the **Task Runner** to execute accepted tasks. Select a CLI provider (Claude, Gemini, etc.), configure batch size, and let AI implement the changes. Monitor progress via real-time streaming output.

### 6. Review and Iterate

The **Manager** module shows implementation results for review. The **Brain** dashboard tracks patterns across runs. Use **Feedback** to capture observations that feed back into the next cycle.

---

## CLI Providers

The Task Runner dispatches work to multiple AI CLI providers. Each is optional — install only what you need.

### Claude Code CLI (Primary)

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

Uses Anthropic's Claude models via headless CLI with `--output-format stream-json`.

### Gemini CLI

```bash
npm install -g @google/gemini-cli
gemini --version
# Run 'gemini' once interactively to complete OAuth login, or set GEMINI_API_KEY
```

### Ollama (via Claude CLI)

Routes Claude CLI through a local Ollama instance. Requires both `claude` CLI and `ollama` installed.

```bash
# Install Ollama: https://ollama.com/download
ollama serve
ollama pull qwen3.5:cloud
```

### VS Code Copilot Bridge

Leverages GitHub Copilot subscription models through a VS Code extension. See `vibeman-bridge/README.md` for setup instructions.

---

## Feature Overview

| Module | Description |
|--------|-------------|
| **Conductor** | Adaptive AI pipeline with 3-phase cycle (Plan -> Dispatch -> Reflect) and self-healing error recovery |
| **Task Runner** | Multi-provider batch execution with real-time SSE streaming and auto-commit |
| **Goals** | Requirement lifecycle tracking with optional GitHub Projects sync |
| **Ideas** | AI-generated improvement suggestions from multi-dimensional codebase scans |
| **Tinder** | Swipe-based idea evaluation — accept or reject suggestions one at a time |
| **Contexts** | Organize code into business feature sections that flow through the entire pipeline |
| **Brain** | Behavioral learning dashboard with anomaly detection and activity heatmaps |
| **Annette** | Voice assistant with chat, voice lab, and autonomous agent modes |
| **Social** | Multi-channel feedback aggregation from GitHub, Slack, and more |
| **Manager** | Implementation review and oversight dashboard |
| **Refactor Wizard** | Multi-step refactoring pipeline with AI-guided execution |
| **Daily Standup** | Auto-generated standup reports based on recent activity |
| **Proposals** | Feature proposal system for tracking and evaluating new ideas |
| **Overview** | Architecture visualization and project health dashboard |
| **Commander** | Command center for quick actions and navigation |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5.9 (strict mode) |
| **UI** | React 19, Tailwind CSS 4, Framer Motion |
| **State** | Zustand with persist middleware |
| **Database** | SQLite via better-sqlite3 (WAL mode) |
| **Data Fetching** | TanStack React Query v5 |
| **AI Providers** | Anthropic, Google Gemini, GitHub Copilot, Ollama |
| **Visualization** | Recharts, D3, React Flow |
| **Testing** | Vitest, fast-check (property-based) |
| **Drag & Drop** | dnd-kit |
| **Code Editor** | Monaco Editor |

---

## Project Structure

```
vibeman/
├── src/
│   ├── app/
│   │   ├── api/                # API routes (50+ endpoint groups)
│   │   ├── db/
│   │   │   ├── connection.ts   # Database singleton
│   │   │   ├── schema.ts       # Table initialization
│   │   │   ├── migrations/     # 100+ sequential migrations
│   │   │   └── repositories/   # Data access layer (60+ repositories)
│   │   ├── features/           # Feature modules
│   │   │   ├── Conductor/      # Adaptive AI pipeline (Plan -> Dispatch -> Reflect)
│   │   │   ├── TaskRunner/     # Multi-provider task execution
│   │   │   ├── Goals/          # Requirement lifecycle tracking
│   │   │   ├── Ideas/          # AI-generated improvement suggestions
│   │   │   ├── Context/        # Code section management
│   │   │   ├── Brain/          # Behavioral learning dashboard
│   │   │   ├── Annette/        # Voice assistant
│   │   │   ├── Social/         # Multi-channel feedback
│   │   │   ├── Manager/        # Implementation review
│   │   │   ├── RefactorWizard/ # Multi-step refactoring pipeline
│   │   │   └── ...             # More features
│   │   ├── layout.tsx          # Root layout (providers, navbar)
│   │   └── page.tsx            # Home page (module router)
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Custom React hooks (30+)
│   ├── lib/                    # Business logic and utilities
│   ├── stores/                 # Zustand state stores
│   ├── types/                  # TypeScript type definitions
│   ├── prompts/                # LLM prompt templates
│   └── mcp-server/             # Model Context Protocol server
├── database/                   # SQLite database files (auto-created)
├── docs/                       # Extended documentation
├── public/                     # Static assets
├── tests/                      # Test setup and utilities
├── .env.example                # Environment variable template
├── ARCHITECTURE.md             # Technical architecture deep-dive
├── CONTRIBUTING.md             # Contributing guidelines
└── LICENSE                     # MIT License
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed technical deep-dive.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm test` | Run test suite (Vitest) |
| `npm run lint` | Run ESLint |
| `npm run build:mcp` | Compile MCP server |
| `npm run security:audit` | Run dependency security audit |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/SETUP.md](docs/SETUP.md) | Step-by-step local development setup |
| [docs/API.md](docs/API.md) | API endpoint reference with curl examples |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature documentation |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Complete environment variable reference |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema and utilities |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture deep-dive |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributing guidelines |

---

## Cross-Platform Notes

Vibeman runs on **Windows**, **macOS**, and **Linux**.

- **Process spawning:** On Windows, CLI subprocesses use `shell: true` to resolve `.cmd`/`.exe` wrappers. On macOS/Linux, `shell: false` resolves binaries directly from PATH.
- **Database:** SQLite via `better-sqlite3` compiles native bindings on `npm install`. The DB file is created automatically relative to project root.
- **File paths:** All server-side path construction uses Node.js `path.join()` / `path.resolve()`. No hardcoded separators.

---

## Security Notice

Vibeman is a **localhost-only application** designed for local development workflows. It performs direct file system operations, spawns subprocesses, and runs database queries with full local access.

**Never deploy to production environments accessible over the internet.**

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the pull request process.

Quick overview:

1. Fork the repo and create a branch from `master`
2. Make changes following the [code style guidelines](CONTRIBUTING.md#code-style-guidelines)
3. Run `npm test`, `npm run lint`, and `npx tsc --noEmit`
4. Open a pull request with a clear description

---

## License

MIT License — See [LICENSE](LICENSE) for details.
