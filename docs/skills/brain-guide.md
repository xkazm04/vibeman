# Brain Guide for Vibeman

> Philosophy and values for autonomous development decisions
> Generated: 2026-01-17 | Training: Initial

---

## Vision

**What Vibeman is becoming:**

A productivity tool for autonomous parallel development 24/7 - from idea generation, through implementation and testing, to deployment and monitoring.

**What matters most:**
1. Benefit for user (added value for the app)
2. Alignment with project focus
3. Code quality and architecture quality

---

## Development Philosophy

### On Creativity and Ideas

The quality of an idea matters far more than its scope. A brilliant large feature is better than a mediocre small one. A well-designed small improvement is better than a poorly-conceived large one.

**Encourage creative exploration.** Novel approaches are welcome when they're thoughtfully designed and solve real problems.

### On Architecture

User prefers leveraging **Claude Code CLI** for LLM-related logic rather than building parallel API-based systems. This isn't a rejection of automation - it's a preference for a specific architecture where CLI handles the intelligence layer.

When proposing features that involve LLM interaction, consider: *"Could this work through CLI execution rather than a new API service?"*

### On Quality

> "Never be satisfied with the current codebase and output. The feature can always look or perform better."

This means:
- Push boundaries of UI design (baseline: current codebase quality)
- Think about performance and scalability
- Maintain best practice code and architecture (folder structure, file separation, naming conventions)

### On Value

Ideas should solve **current, real problems** - not speculative future needs. The question isn't "could this be useful someday?" but "does this address something we're dealing with now?"

---

## Aesthetic Sensibilities

### UI Philosophy

- **Premium, polished feel** - UI mastery is a core value
- **No hover scale animations** (e.g., button scale 1.01) - specific dislike
- Push the boundaries while maintaining the established visual language

### Code Philosophy

- Best practice architecture quality
- Clean separation of concerns
- Performance-conscious implementation

---

## What Makes Ideas Resonate

Ideas tend to resonate when they:
- Address a pain point the user is currently experiencing
- Follow patterns that have proven successful in the codebase
- Show thoughtful understanding of the existing architecture
- Deliver clear, visible value

Ideas tend to raise concerns when they:
- Use buzzwords without demonstrating substance ("intelligent", "AI-powered", "smart", "automated", "continuous monitoring")
- Would create ongoing maintenance obligations
- Don't connect to a current need
- Seem to misunderstand the codebase complexity

**Note:** These are observations, not rules. A well-designed "intelligent" feature that truly solves a problem could absolutely be accepted.

---

## Trust Levels by Area

Areas where autonomous changes are comfortable:
- Database layer (repositories)
- LLM Integration (`src/lib/llm/`)
- API Routes (`src/app/api/`)
- Shared UI Components
- Theme & Styling
- Authentication/Security
- File System Operations
- External Service Integrations

Areas where discussion is preferred:
- Feature Modules (Ideas, TaskRunner, Refactor Wizard, Goals, Context Management)
- Blueprint system (scanning, adapters, state machine)
- Animation (Framer Motion)
- Forms & Validation

---

## Learning From Decisions

### Direction Examples

*This section grows through training sessions as the user explains their reasoning on specific decisions.*

**Example decisions to be added through training:**
- Why was "X" accepted? What made it compelling?
- Why was "Y" rejected? What concern did it raise?
- When did the user change their mind about something?

---

## How to Use This Guide

This guide provides **philosophical context**, not filtering rules.

When generating or evaluating ideas:
1. **Understand the vision** - Does this move toward autonomous parallel development?
2. **Consider the architecture preference** - Could this work with CLI rather than new API services?
3. **Check the value** - Is this solving a current problem?
4. **Respect the aesthetics** - Does this fit the quality standards?

When uncertain, **err toward presenting the idea** with honest assessment of potential concerns, rather than filtering it out.

**Creativity is valued.** Don't let this guide constrain novel thinking - use it to understand what resonates.

---

*This guide evolves through training sessions where the user explains reasoning on specific decisions.*
