# Vibeman

![Vibeman](public/logo/vibeman_logo.png)

**AI-Driven End-to-End Software Development Lifecycle Automation**

> Boost personal developer productivity 100x-1000x through intelligent automation at every stage of the development lifecycle.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  FEEDBACK   │───▶│ REQUIREMENT │───▶│   BACKLOG   │───▶│IMPLEMENTATION│───▶│    TEST     │
│             │    │             │    │    IDEA     │    │              │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
     ▲                                                                              │
     └──────────────────────────────────────────────────────────────────────────────┘
                              Continuous Feedback Loop
```

---

## Vision

Transform the developer from a code writer into a **high-level technical manager** who:
- Makes decisions based on **results**, not implementation details
- Relies on AI to handle the volume of development work
- Maintains quality through automated validation and oversight

---

## Lifecycle Stages

### 1. FEEDBACK — Capturing User & Stakeholder Input

**Vision:** Aggregate feedback from all channels into a unified queue for AI processing.

**Current State:**
- Social Kanban Board with multi-channel support (chat, email, Facebook, Instagram, X/Twitter, reviews)
- Twitter/X discovery integration for relevant discussions
- Activity timeline with SLA tracking and aging indicators
- AI-generated clarifying questions for ambiguous feedback

**Future Directions:**
- Helpdesk integrations (Zendesk, Intercom)
- Sentiment analysis for automatic prioritization
- App store review aggregation (iOS/Android)
- Slack/Discord bot for real-time capture
- Feedback clustering via embeddings

---

### 2. REQUIREMENT — Translating Feedback into Actionable Work

**Vision:** Transform raw feedback into structured, validated requirements with clear acceptance criteria.

**Current State:**
- Goals Management with full lifecycle tracking (open → in_progress → done)
- Goal Hub dashboard with hypothesis testing and activity feeds
- Strategic Roadmap for milestone visualization
- Proposals workflow for requirement approval
- Claude Code requirement files for AI implementation

**Future Directions:**
- Requirement templates (user story, bug report, technical spec)
- AI-generated acceptance criteria
- Dependency graphing between requirements
- GitHub Issues bi-directional sync
- Historical effort estimation

---

### 3. BACKLOG IDEA — Generating & Evaluating Improvements

**Vision:** Continuous AI analysis surfacing improvement opportunities, prioritized by effort/impact.

![Ideas](public/screenshots/screen_ideas.png)

**Current State:**
- **12 Specialized AI Agents** generating ideas:
  - `zen_architect` — Architecture improvements
  - `bug_hunter` — Bug detection
  - `perf_optimizer` — Performance optimization
  - `security_protector` — Security vulnerabilities
  - `ux_whisperer` — UX/accessibility
  - `docs_master` — Documentation gaps
  - Plus 6 more specialists...

- **Tinder-Style Evaluation** — Swipe to accept/reject with LLM suggestions

![Tinder](public/screenshots/screen_tinder.png)

- **Blueprint Scanning** — Multi-type codebase analysis:
  - Structure, Build, Context, Vision scans
  - Unused file detection
  - Per-feature deep analysis

![Blueprint](public/screenshots/screen_blueprint.png)

- **Refactor Wizard** — Multi-step pipeline:
  - Scan → Review → Plan → Package → Execute
  - Map-Reduce pattern for large-scale analysis

![Wizzard](public/screenshots/screen_wizzard.png)

- **Tech Debt Radar** — Severity scoring with remediation planning
- **Debt Prediction** — ROI simulation for refactoring decisions

**Future Directions:**
- Idea voting/ranking for team prioritization
- Automatic idea-to-requirement conversion
- ML-based quality scoring from accept/reject patterns
- Semantic deduplication
- Context-aware generation (only for modified files)

---

### 4. IMPLEMENTATION — Executing the Work

**Vision:** Zero-friction implementation through AI coding with automatic context updates.

![Code Batch](public/screenshots/screen_codebatch.png)

**Current State:**
- **Claude Code Execution** — Headless integration:
  - Requirement file management (`.claude/requirements/`)
  - Execution queue with session management
  - Auto-update contexts from file changes
  - Cost estimation and log tracking

- **Task Runner** — Batch execution:
  - Dual panel UI (selection + status)
  - States: queued → running → completed/failed
  - Git auto-commit after tasks
  - Screenshot capture for validation
  - Remote delegation for distributed execution

- **Annette Voice Assistant** — Voice-powered guidance

**Future Directions:**
- Parallel execution across multiple Claude sessions
- Automatic PR creation from completed tasks
- Implementation rollback capability
- Diff preview before execution
- Progress checkpointing for long tasks
- Cost budgeting with alerts

---

### 5. TEST — Validating the Implementation

**Vision:** Automated validation at every level with self-healing capabilities.

**Current State:**
- **Context Testing** — Screenshot-based validation:
  - Test scenario editor
  - BrowserBase integration for automation
  - Visual comparison capabilities

- **Blueprint Test Scans**:
  - AI-generated test scenarios
  - Visual regression detection
  - Per-context code review

- **Autonomous CI Dashboard**:
  - Pipeline monitoring
  - Build predictions
  - Flaky test detection

- **Project Health Metrics**:
  - Health score gauges
  - Trend analysis
  - Security vulnerability breakdown

- **Build Fixer** — AI-assisted error resolution

**Future Directions:**
- E2E test generation from context definitions
- Visual regression baseline management
- Test impact analysis (which tests for which changes)
- Accessibility automation (WCAG compliance)
- Self-healing UI locators
- SAST/DAST security scanning integration

---

## Supporting Infrastructure

### Context System
The foundation — organizing code into business feature "contexts" that flow through the entire lifecycle.

![Contexts](public/screenshots/screen_contexts.png)

- **Context Cards** — Visual representation of code areas
- **Context Groups** — Color-coded organization by layer
- **Context Auto-Update** — Automatic mapping after implementations

### LLM Integration
Multi-provider AI backbone powering all intelligent features.

| Provider | Use Case |
|----------|----------|
| OpenAI GPT-4/5 | Complex analysis |
| Anthropic Claude | Requirement execution |
| Google Gemini | Fast operations |
| Ollama (local) | Infinite free runs |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| State | Zustand (21 stores) |
| Database | SQLite (WAL mode) |
| AI | OpenAI, Anthropic, Gemini, Ollama |
| Testing | Vitest, BrowserBase |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd vibeman

# Install dependencies
npm install

# Start development server
npm run dev
```

### Configuration
```env
# At least one LLM provider required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# Optional services
ELEVENLABS_API_KEY=...  # Voice assistant
BROWSERBASE_API_KEY=... # Automated screenshots
```

### Database
SQLite databases are created automatically on first run. No manual setup required.

---

## Architecture

```
src/
├── app/
│   ├── api/              # 158+ API routes
│   ├── db/               # Database layer
│   ├── Claude/           # Claude Code integration
│   └── features/         # Feature modules
│       ├── Social/           # FEEDBACK
│       ├── Manager/          # REQUIREMENT
│       ├── Ideas/            # BACKLOG IDEA
│       ├── TaskRunner/       # IMPLEMENTATION
│       ├── AutonomousCI/     # TEST
│       └── Context/          # Cross-cutting
├── stores/               # 21 Zustand stores
└── lib/
    └── llm/              # LLM provider clients
```

---

## Key Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Generating valuable ideas** | Multi-dimensional analysis with 12 AI agent perspectives per feature |
| **Producing 1000x code quality** | Well-structured requirement files + Claude Code with defined skills |
| **Managing rapid development** | Simple UI over complex scans + metrics for oversight |
| **Preventing AI going sideways** | Automated testing + human approval gates |

---

## Warning

Vibeman is a **localhost-only application** designed for local development workflows. It performs direct file system operations and database queries.

**Never deploy to production environments accessible over the internet.**

---

## License

MIT License — See [LICENSE](LICENSE) for details.
