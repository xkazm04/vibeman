# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase, type-safe client and server code
- JavaScript (ES2020) - Runtime target, configuration files, Node scripts
- TSX - React components with embedded TypeScript

**Secondary:**
- SQL - SQLite schema, Supabase PostgreSQL
- Markdown - Documentation and content

## Runtime

**Environment:**
- Node.js (version managed via `.nvmrc` if present; project uses modern features from ES2020)

**Package Manager:**
- npm (assumed from `package-lock.json` pattern)
- Lockfile: Present (referenced in package.json overrides)

## Frameworks

**Core:**
- Next.js 16.1.6 (App Router) - Full-stack React framework with Turbopack bundler
- React 19.2.4 - UI component framework
- React DOM 19.2.4 - DOM rendering

**Testing:**
- Vitest 4.0.18 - Unit/integration test runner
- @vitest/coverage-v8 4.0.18 - Code coverage reporting
- fast-check 4.5.3 - Property-based testing

**Build/Dev:**
- Next.js Turbopack - Development and production bundler (enabled via `turbopack: {}` in `next.config.ts`)
- TypeScript 5.9.3 - Compilation and type checking
- ts-node 10.9.2 - TypeScript execution for scripts
- ESLint 9.39.3 - Code linting with Next.js config
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- @tailwindcss/postcss 4.2.1 - PostCSS plugin for Tailwind

## Key Dependencies

**Critical:**
- better-sqlite3 12.6.2 - Local SQLite database for primary data store
- @supabase/supabase-js 2.98.0 - Cloud PostgreSQL sync via REST API
- zustand 5.0.11 - Lightweight state management with persist middleware
- @tanstack/react-query 5.90.21 - Server state synchronization and caching

**AI/LLM:**
- @anthropic-ai/sdk 0.78.0 - Anthropic Claude API client
- @anthropic-ai/claude-agent-sdk 0.2.59 - Claude Agent framework for agentic workflows
- @github/copilot-sdk 0.1.30 - GitHub Copilot SDK for tool execution
- @modelcontextprotocol/sdk 1.27.1 - Model Context Protocol for Claude Code integration (MCP server in `src/mcp-server/`)

**AWS:**
- @aws-sdk/client-bedrock-runtime 3.1004.0 - AWS Bedrock for voice (Nova Sonic TTS/STT)
- @aws-sdk/credential-providers 3.1004.0 - AWS credential handling
- @smithy/node-http-handler 4.4.14 - Node.js HTTP handler for AWS SDK

**UI Components:**
- lucide-react 0.577.0 - Icon library
- framer-motion 12.35.0 - Animation library
- recharts 3.8.0 - React charting library
- @monaco-editor/react 4.7.0 - Monaco code editor integration
- @uiw/react-md-editor 4.0.11 - Markdown editor
- react-window 2.2.7 - Virtualized list rendering
- sonner 2.0.7 - Toast notification library
- focus-trap-react 12.0.0 - Accessibility focus management
- dompurify 3.3.2 - HTML sanitization

**Data Visualization & Flow:**
- d3 7.9.0 - Data visualization library
- @xyflow/react 12.10.1 - React node/edge diagram component
- @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0 - Drag-and-drop functionality

**Content Processing:**
- react-markdown 10.1.0 - Markdown rendering
- remark-gfm 4.0.1 - GitHub Flavored Markdown plugin
- rehype-highlight 7.0.2 - Syntax highlighting

**Code Analysis:**
- ts-morph 27.0.2 - TypeScript AST manipulation for code analysis
- glob 13.0.0 - File pattern matching
- minimatch 10.2.4 - Glob pattern matching utilities

**File System & Monitoring:**
- chokidar 5.0.0 - File system watcher for development and real-time updates
- playwright-core 1.58.2 - Browser automation (for testing/screenshots)

**Utilities:**
- uuid 13.0.0 - UUID generation
- clsx 2.1.1 - Conditional className construction
- tailwind-merge 3.5.0 - Tailwind CSS class merging

## Configuration

**Environment:**
- Next.js App Router configuration: `next.config.ts`
- TypeScript compiler: `tsconfig.json` with path alias `@/*` → `./src/*`
- ESLint: `eslint.config.mjs` (ES modules) with Next.js core web vitals and TypeScript rules
- Database driver: Configurable via `DB_DRIVER` env var (currently SQLite via better-sqlite3)
- Vitest: `vitest.config.ts` with sequential single-fork pool (required for SQLite concurrency)

**Key Environment Variables (from .env.example):**
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase server-side key (secret)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase client key (public)
- `DATABASE_URL` - Local SQLite database path (default: `./database/vibeman.db`)
- `DB_DRIVER` - Database driver selection (default: `sqlite`)
- `GITHUB_TOKEN` - GitHub personal access token (optional)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials for Bedrock (optional)
- `OLLAMA_BASE_URL` - Local Ollama instance URL (optional, default: `http://localhost:11434`)
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` - Alternative LLM provider keys (optional)

**Build:**
- Turbopack bundling enabled in dev (`next dev --turbopack`)
- Module Federation for dynamic remote loading (webpack config in `next.config.ts`)
- Security headers via CSP, X-Frame-Options, etc. (configured in `next.config.ts`)
- Server-external packages: `ts-morph`, `@github/copilot-sdk` (avoid bundling)

## Platform Requirements

**Development:**
- Node.js (ES2020+ support)
- npm or equivalent package manager
- SQLite3 native bindings (compiled via better-sqlite3)
- Optionally: Ollama for local LLM inference

**Production:**
- Node.js runtime (Next.js server)
- SQLite3 support or Supabase cloud PostgreSQL
- AWS Bedrock access (if voice features enabled)
- Anthropic/OpenAI/Gemini API keys for LLM features

---

*Stack analysis: 2026-03-14*
