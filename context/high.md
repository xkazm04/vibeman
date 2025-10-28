# Project Strategic Architecture Brief  
**Project** – *LLM‑Powered Code Automation Platform*  
**Prepared for** – SW Engineers, Web developers, Vibe coders

---

## 1. Vision & Mission

**Vision** –  Productivity booster for full automation of software development lifecycle. Let LLM create features, analyze requirement, code and evaluate results 24/7.

**Mission** – *Create a modular, open‑source ecosystem that connects three core capabilities:  
1. **Requirement Management** – Visual, searchable, and structured view of objectives, contexts, and generated ideas.  
2. **LLM‑Enabled Code Generation** – Seamlessly invoke Claude Code as your background coding agent.  
3. **Automation & Execution** – A self‑healing pipeline that evaluates, prioritises, and implements ideas with real‑time status and metrics.*

---
## 2. Business Value
| Value Driver | Stakeholder Benefit | Success Indicator |
|--------------|---------------------|-------------------|
| **Productivity booster** | The app should generate 100x of human work related to the SW engineering during the same time period. | Possibility to implement 100 requirements per 24 hours in a production-grade quality  |
| **Requirement‑Centric Workflows** | Generated ideas and code are aligned with high level vision of the product  | All automatically generated improvements are in some way fulfilling values proposed in this document |
| **Techstack agnostic** | Platform operations are suitable for code generation in any stack (frontends in React/Next, backends in JS, Python frameworks, databases in noSQL, SQL, game development in C++)| Number of supported languages/frameworks = 10|
| **Open‑Source Flexibility** | Developers can fork or extend this platform | High quality of the code structure and its modularity - each module has its own guideline and easy to use rulles to contribute |
---
## 3. High‑Level Architecture
### 3.1 Layered Stack
1. **Presentation Layer** – **NextJS** multi-page app with **Tailwind** styling and heavy **Framer Motion** usage for dynamic visual feedback. **Zustand** for global state management, **Lucide React** for icons
2. **Domain Services** – Business logic orchestrated by LLMs coding tasks by **Claude Code**, **Vibeman** feature as the automation engine, **Tasker** for task queue, and **Idea** generator powered by multimodel LLM provider (OpenAI, Anthropic, Gemini, Ollama with gpt-oss:20b)  
3. **API Layer** – Thin wrappers around NextJS server-side functionality reused in client components, usually for manipulation with local files and local sqlite database
4. **Persistence Layer** – **SQLite + better‑sqlite3** with a *single* WALS‑enabled connection, exposing **Repository** APIs (`ideaRepository`, `scanRepository`).  

### 3.2 Core Data Model
| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| `goals` | Track personal/team objectives | `id, title, description, createdAt` | – |
| `contexts` | Metadata for goals | `id, goalId, name, value` | FK → `goals.id` |
| `scans` | Code‑scan sessions | `id, projectId, tokens, createdAt` | FK → `projects.id` |
| `ideas` | AI‑generated ideas | `id, projectId, title, createdAt` | FK → `projects.id` |

### 3.3 Workflow Overview
```
Stakeholder ➜ UI (React + Framer Motion)
    │
    ├─→ Action (Load/Run/Delete Requirements)
    │     │
    │     ├─ API Call (requirementApi.ts)
    │     ├─ Persistence (Repository)
    │     └─ Status Polling (getTaskStatus)
    │
    ├─→ Vibeman Automation
    │     │
    │     ├─ Evaluation → Generation → Execution
    │     └─ Real‑time status (AnimatePresence)
    │
    └─→ Database (SQLite)
          ├─ Connection (Singleton)
          ├─ Schema / Migrations
          └─ Repositories (idea, scan)
```

The platform is intentionally **client‑heavy** – all UI interactions are performed with `'use client'` to keep the experience responsive, while heavy‑lifting (database, LLM calls) remains server‑side via well‑defined APIs.
---

## 4. Strategic Recommendations

| Recommendation | Rationale | Next Actions |
|----------------|-----------|--------------|
| **Implement a Robust CI/CD Pipeline** | Guarantees schema migrations are applied automatically, and ensures unit/integration tests cover the database layer. | Add GitHub Actions that run `npm run db:up`, `npm test`, and deploy to staging. |
| **Scale Persistence to PostgreSQL** | SQLite is great for prototyping but may limit concurrent writes when scaling to multiple teams. | Abstract repository interfaces to support both SQLite and PostgreSQL drivers, enabling future migration. |
| **Establish a Governance Board** | Ensures consistent contribution standards across modules (`Claude`, `Tasker`, `Vibeman`, `Database`). | Define contribution guidelines, code‑review processes, and a quarterly architecture review cadence. |
| **Document API Contracts Publicly** | Enables third‑party extensions (e.g., custom LLM providers). | Publish OpenAPI/Swagger specs for all backend endpoints and keep them in sync with TypeScript types. |