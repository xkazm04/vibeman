# CLAUDE.md

Guidance for Claude Code working with the Vibeman codebase.

## Project Overview

**Vibeman** – *LLM‑Powered Code Automation Platform*

A modular, open-source ecosystem for full automation of software development lifecycle. Core capabilities:
- **Requirement Management** – Visual, searchable, and structured view of objectives and generated ideas
- **LLM‑Enabled Code Generation** – Seamlessly invoke Claude Code as your background coding agent
- **Automation & Execution** – Self-healing pipeline that evaluates, prioritizes, and implements ideas with real-time status

**Vision**: Productivity booster for full automation of SDLC. Generate 100x of human work related to SW engineering during the same time period.

## Common Commands

### Development
```bash
npm run dev
npm run build
npm run test
```

## Architecture Overview

### Layered Stack
1. **Presentation** – Next.js multi-page app, Tailwind + Framer Motion, Zustand state, Lucide React icons
2. **Domain Services** – Claude Code tasks, Vibeman automation engine, Tasker for queues, Idea generator
3. **API Layer** – Thin wrappers around Next.js server functions for file/database manipulation
4. **Persistence** – SQLite + better-sqlite3 (single WALS-enabled connection), Repository APIs

## Important Conventions

### UI Component Practices

**All interactive elements MUST**:
- Use `data-testid` attribute for automated testing selectors on click actions
- Example: `<button data-testid="goal-delete-btn">Delete</button>`

**Design Quality**:
- Reference `vibeman/.claude/skills/compact-ui-design.md` for high-quality visual outputs
- Follow Compact UI Design principles: space efficiency, visual hierarchy, consistent typography
- Implement Framer Motion animations for modals, lists, buttons, and expand/collapse interactions
- Use Blueprint design system for control panels: grid patterns, illuminated buttons, hand-written typography
- Apply consistent spacing scale, color palette (cyan/blue accents), and component patterns

