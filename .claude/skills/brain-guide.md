# Brain Guide for Vibeman

> Philosophy and values for autonomous development decisions
> Generated: 2026-01-17 | Updated: 2026-02-01 | Training: Reflection #4

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

**The acceptance formula (updated: 26/56 = 46% acceptance rate):**
- Visual output the user can see immediately
- Interactive controls the user can click
- Uses existing data/state (no new external dependencies)
- Focused scope (one screen, one concern)
- Solves a current friction, not a future possibility
- Makes autonomous processes transparent (Brain visibility, tool previews)
- AI processing content, not AI advising the user

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

#### Reflection: 2026-02-01 (26 accepted, 30 rejected)

**Acceptance rate: 46% (stable)**

This session reveals strong context-specific patterns. The acceptance/rejection boundary has become predictable: visibility tools for active development contexts are accepted, while infrastructure/configuration/management features are uniformly rejected.

**Accepted: "Build device fleet dashboard with health monitoring and batch command dispatch"** (Remote Control & Mesh Network)
> Why it worked: A dashboard showing multiple devices with health status. Visual, interactive, provides a "single pane of glass." The batch command dispatch adds actionable control - user can *do* something from the dashboard, not just observe.

**Accepted: "Add mesh network topology visualization with connection quality indicators"** (Remote Control & Mesh Network)
> Why it worked: Pure visualization of something that exists (network topology). No new infrastructure, just rendering existing connections visually. Helps diagnose connectivity issues - solves a current problem when debugging mesh networks.

**Accepted: "Add responsive breakpoint ruler with visual guides and breakpoint jumping"** (Zen Control Panel & Emulator)
> Why it worked: In-context development tool. While working in the emulator, the user can see breakpoints visually and jump between them. Integrates into existing workflow, doesn't create a new workflow.

**Accepted: "Create persistent memory system with contextual recall and knowledge graph"** (Annette Voice Assistant Core)
> Why it worked: Frames memory as *project knowledge*, not personality. "Eliminates repetitive context-setting conversations" - solves an actual frustration. Knowledge graph for the *project*, not emotional memory of the *user*.

**Accepted: "Add execution replay and debugging with step-by-step trace viewer"** (Task Runner Batch Execution)
> Why it worked: Post-mortem debugging for when things go wrong. Addresses a pain point: "what did Claude Code actually do?" Visibility into execution history. Unlike rejected "session replay" which records everything, this is targeted at failures and understanding.

**Rejected: "Build remote task distribution with load balancing and failure recovery"** (Remote Control & Mesh Network)
> Concern: Same context as two accepted dashboards, but this adds orchestration. "Intelligently distribute tasks" and "automatic recovery" are automation that takes control away. Contrast: viewing fleet health = accepted; having system distribute work autonomously = rejected.

**Rejected: "Build device preset library with custom configurations and quick switching"** (Zen Control Panel & Emulator)
> Concern: Same context as accepted breakpoint ruler, but this is configuration management. The user doesn't need a library of presets - they use specific devices for specific testing. Infrastructure for a hypothetical workflow.

**Rejected: "Build interaction recording with gesture playback and test scenario generation"** (Zen Control Panel & Emulator)
> Concern: Testing infrastructure. "Record interactions for regression testing" solves a testing problem the user hasn't expressed. Test scenario generation from recordings is speculative automation.

**Rejected: "Build connection manager with service authentication and permission controls"** (Social Configuration & Connections)
> Concern: Configuration plumbing. OAuth flows, permission displays, connection management - this is setup infrastructure, not a feature. The user presumably connects services once and moves on.

**Rejected: "Add notification preferences with per-channel and per-event controls"** (Social Configuration & Connections)
> Concern: Granular configuration. "Per-event notification toggles" adds complexity for marginal control. If notifications are too noisy, fix the defaults - don't ask the user to configure 50 toggles.

**Rejected: "Build project switcher with workspace management and recent projects"** (Project Management & Configuration)
> Concern: Project management infrastructure. This is a localhost single-developer tool. Workspace grouping and project organization solve enterprise problems, not solo developer problems.

**Rejected: "Add store health monitor with memory leak detection and cleanup automation"** (State Management & Stores)
> Concern: Debugging infrastructure for a problem that hasn't manifested. "Memory leak detection heuristics" is proactive problem-solving. If stores were leaking memory, the user would notice and fix it.

**Rejected: "Build database migration manager with visual diff and safe rollback"** (Database Layer & Repositories)
> Concern: Migrations work. Visual diff and rollback capabilities add GUI where CLI suffices. "Making database changes stress-free" implies current changes are stressful - they're not.

**Rejected: "Build natural language command parser with contextual suggestions and command history"** (Commander & Orchestration)
> Concern: The commander is a text input. Making it "intelligent" with NLP parsing and learning adds AI where simplicity works. Users know what they want to do - they don't need the system to guess.

**Rejected: "Build direction dependency graph showing prerequisites and unlock chains"** (Directions & Implementation Cards)
> Concern: Extends post-acceptance tracking pattern. Prerequisites, unlock chains, dependency visualization - all add complexity to a system where directions are atomic: accept and execute. No dependency management wanted.

**Rejected: "Add direction comparison view showing side-by-side analysis of competing approaches"** (Directions & Implementation Cards)
> Concern: Over-engineers direction selection. The user swipes through directions. Side-by-side comparison implies a deliberation process that doesn't exist - decisions are fast, not comparative.

**Rejected: "Build focus session timer with break reminders and productivity streaks"** (Zen Mode Dashboard)
> Concern: Productivity gamification. Pomodoro timers, break reminders, streaks - this is lifestyle/productivity app territory. Vibeman is a dev tool, not a productivity coach.

### Patterns Identified (New for 2026-02-01)

- **Visibility dashboards vs autonomous orchestration**: Same context, different outcomes. Device fleet *dashboard* (accepted) vs task *distribution* (rejected). Mesh *visualization* (accepted) vs automatic *recovery* (rejected). The user wants to see and control, not delegate.

- **Configuration areas uniformly rejected**: 6/6 rejected in configuration-related contexts (Social Configuration, Project Management). Connection managers, notification preferences, profile customization, project switchers, settings sync - all rejected. Configuration is "already working" or not a priority.

- **Infrastructure categories completely rejected**: 9/9 rejected across performance, caching, database management, and state monitoring. Performance dashboards, cache analytics, query optimizers, backup schedulers, migration managers - none accepted. These solve developer-facing problems, not user-facing ones.

- **Testing infrastructure rejected despite Zen acceptance**: Breakpoint ruler (in-context dev tool) accepted. Interaction recording, preset library, test scenario generation (testing infrastructure) rejected. The boundary: tools that help *during development* vs tools that help *after development*.

- **AI discovery vs AI processing**: Previous reflection noted "AI on content accepted, AI on user rejected." This session adds: AI-powered *discovery* (project discovery, inspiration feed) rejected vs AI-powered *processing* (already-accepted triage, classification). The user has content to process - they don't need AI finding more.

- **Commander stays simple**: All 3 Commander directions rejected. NLP parsing, command chaining, execution timeline - the user types commands and they execute. Adding intelligence or history to commands is unwanted.

- **Social Kanban saturation**: Previous session accepted 5/5 Social Kanban directions. This session rejected 3/3 Social Discovery directions. The feature may be "complete enough" - further expansion into discovery/inspiration is speculative.

- **Direction lifecycle management unwanted**: Direction dependency graph, comparison view, progress tracker - all rejected. Directions are accepted or rejected. Period. No pre-acceptance analysis, no post-acceptance tracking.

#### Context-Specific Observations (Updated 2026-02-01)

- **Remote Control & Mesh Network (2 accepted, 1 rejected)**: Dashboards and visualizations accepted. Autonomous task distribution rejected. Watch vs control boundary.
- **Zen Control Panel & Emulator (1 accepted, 2 rejected)**: In-context development tools accepted. Testing infrastructure rejected.
- **Annette Voice Assistant (1 accepted)**: Project knowledge memory accepted. Previous rejections were personality/emotion memory.
- **Task Runner Batch Execution (1 accepted)**: Execution replay for debugging accepted. Distinct from rejected "session recording" - this is failure analysis, not comprehensive recording.
- **Social Kanban Board (previously 5 accepted, this session via Social Discovery: 3 rejected)**: AI processing content = accepted. AI discovering content = rejected.
- **Social Configuration & Connections (0 accepted, 3 rejected)**: Complete rejection. Configuration management not valued.
- **Project Management & Configuration (0 accepted, 3 rejected)**: Complete rejection. Project/workspace management not needed.
- **Caching & Performance (0 accepted, 3 rejected)**: Complete rejection. Performance infrastructure not a priority.
- **Session & Implementation Tracking (0 accepted, 3 rejected)**: Complete rejection. Analytics and audit trails unwanted.
- **State Management & Stores (0 accepted, 2 rejected)**: Complete rejection. Store debugging tools not needed.
- **Database Layer & Repositories (0 accepted, 3 rejected)**: Complete rejection. Database management tools sufficient as-is.
- **Commander & Orchestration (0 accepted, 3 rejected)**: Complete rejection. Commander stays simple.
- **Directions & Implementation Cards (0 accepted, 3 rejected)**: Complete rejection. Direction lifecycle management unwanted.
- **Zen Mode Dashboard (0 accepted, 1 rejected)**: Productivity gamification rejected.

#### Git Correlation (2026-01-25 to 2026-02-01)

Recent commits confirm the pattern of focused, practical work:

- `d4c6193` "Integration fix" (4 files) - Small, targeted fix
- `916e018` "Surface cleanup" (157 files) - Major cleanup bundled with work
- `eb5bb06` "chore(08-01): delete abandoned feature directories" (27 files) - Cleanup of dead code
- `eae027a` "refactor(08-01): relocate tree components to Context feature" (6 files) - Focused refactor
- `a2cd602` "feat(07-01): create migration to drop 21 orphaned tables" (2 files) - Database cleanup
- Series of cleanup commits: deleting unused repositories, routes, hooks, stores

**Key observation**: Git history shows extensive **deletion** activity. The user is actively removing unused code, not adding new infrastructure. This aligns perfectly with the rejection of infrastructure directions - the user is *simplifying*, not expanding.

The "Zen" commits (75a314f, 8260b9f, 96557fe) show work on the Zen feature, which accepted the breakpoint ruler. Active development areas get accepted directions; maintenance-mode areas get rejected directions.

---

#### Reflection: 2026-01-25 (23 accepted, 30 rejected)

**Acceptance rate improved: 43% (up from 12%)**

This session marks a significant shift in what gets accepted. The Brain/Learning system, previously an area of rejection, is now the most-accepted category.

**Accepted: "Add insight confidence trend sparklines showing how each insight's confidence evolves across reflections"** (Learning Insights)
> Why it worked: Makes invisible learning visible. The brain already tracks confidence - this surfaces it graphically. Zero new infrastructure, pure visualization of existing data. Satisfies curiosity about "is the brain actually learning?"

**Accepted: "Build insight-to-direction traceability view showing which directions each insight influenced"** (Learning Insights)
> Why it worked: Adds transparency to an opaque process. When insights influence direction generation, the user can now see the connection. Validates the learning loop.

**Accepted: "Add insight effectiveness scoring - track whether high-confidence insights actually correlate with better direction acceptance rates"** (Learning Insights)
> Why it worked: Meta-validation - "is the brain actually getting smarter?" Rather than assuming the system works, this measures it. Closes a feedback loop the user wanted to see.

**Accepted: "Build signal weight decay visualization showing how behavioral context fades over time with configurable retention"** (Behavioral Signals & Context)
> Why it worked: Explains a mystery. When contexts disappear from focus areas, the user can now understand why. Decay curves make temporal processes tangible. Configuration adds control.

**Accepted: "Connect Memory Canvas D3 visualization to real behavioral signals instead of mock data"** (Brain Dashboard & Visualization)
> Why it worked: Transforms a demo into a tool. The visualization exists but uses mock data - connecting it to real signals makes it useful. Zero new UI work, just data plumbing.

**Accepted: "Build AI-powered feedback triage with automatic classification and routing"** (Social Kanban Board)
> Why it worked: AI processes *incoming data*, not the user. Sentiment analysis, classification, theme extraction - these apply AI to content that needs processing. Contrast with rejected "AI coaching" which applies AI to the user's behavior.

**Accepted: "Add tool execution preview - show what a tool will do before executing it, with approve/skip/modify controls"** (Chat Orchestration)
> Why it worked: Transparency and control. Instead of Annette executing tools silently, the user sees what's about to happen and can intervene. Reduces autonomy anxiety.

**Accepted: "Build notification center UI that shows brain events as a feed with read/unread state and action buttons"** (Notifications & Streaming)
> Why it worked: Brain events currently fire and disappear. A notification center persists them. Keeps autonomous activity visible even when the user wasn't watching.

**Rejected: "Add outcome feedback UI inline on accepted directions with satisfaction rating and one-click revert detection"** (Direction Outcomes)
> Concern: Asks the user to rate directions after accepting them. Creates an ongoing obligation. The user accepts directions and moves on - they don't want to manage a ratings backlog.

**Rejected: "Build outcome timeline view showing direction lifecycle from acceptance through execution to feedback"** (Direction Outcomes)
> Concern: Another outcomes-tracking mechanism. The rejection pattern is clear: the user values *acceptance decisions* but not *post-acceptance tracking*. Once a direction is accepted, it's done.

**Rejected: "Connect project navigation indicator dots to outcome health"** (Direction Outcomes)
> Concern: Third outcomes-related rejection. Indicator dots showing execution health adds ambient anxiety without actionable value. The user doesn't want passive health monitoring.

**Rejected: "Implement reflection scheduling with configurable triggers"** (Reflection Agent)
> Concern: Current hardcoded triggers work. Configuration adds complexity without solving a problem. If reflections triggered too often or too rarely, the user would have complained.

**Rejected: "Add focus shift detection that highlights when user attention moves between contexts"** (Behavioral Signals & Context)
> Concern: Speculative analysis of user behavior. "Rapid context switching = friction" is an assumption. The user may switch contexts intentionally. This adds interpretation where none is wanted.

**Rejected: "Add voice command shortcuts for common actions - accept idea, trigger reflection, check status"** (Voice Interface)
> Concern: Bypassing the LLM for speed is infrastructure optimization. The user uses voice for complex queries, not shortcuts. If they wanted shortcuts, they'd use the keyboard.

**Rejected: "Add streaming chat responses via SSE so Annette's replies appear word-by-word"** (Notifications & Streaming)
> Concern: Perceived latency optimization. The current all-at-once response works. Streaming adds complexity for a cosmetic improvement the user didn't request.

**Rejected: "Add tool result caching with TTL to prevent repeated identical API calls"** (Tool System)
> Concern: Performance optimization for a problem that hasn't manifested. If tool re-calls were causing noticeable slowness, the user would have raised it.

### Patterns Identified (New for 2026-01-25)

- **Brain transparency directions now accepted en masse**: 7 of 23 accepted directions are about making Brain internals visible (sparklines, traceability, effectiveness, decay, drill-down, real data, reflection history). The user previously rejected "AI coaching" directions - the key difference is these *show* what the brain is doing rather than having the brain *advise* the user.

- **AI on content ≠ AI on user**: Accepted: sentiment analysis on feedback, classification of incoming items, theme extraction from text. Rejected: AI coaching, proactive suggestions, emotional detection of user state. The boundary is clear: AI can process *data*, but shouldn't analyze *the user*.

- **Post-acceptance tracking uniformly rejected**: All 3 Direction Outcomes directions were rejected (inline feedback, timeline view, health indicators). The user's workflow is: accept → execute → done. They don't want an outcomes management layer.

- **Tool transparency and control highly valued**: Tool preview with approve/skip/modify, tool analytics dashboard, notification center - all accepted. The user wants to see autonomous actions before they happen and have records of what happened.

- **Annette memory now accepted (context shift)**: "Create persistent memory system with contextual recall and knowledge graph" was accepted. Previous reflections noted Annette "memory" directions were rejected. The difference: this specific direction frames memory as *knowledge graph and contextual recall* for the project, not as personality/emotional memory of the user.

- **Social Kanban accepted 5 directions**: Feedback triage, sentiment analysis, clustering, unified inbox, and themes - all accepted. This is a relatively new feature area where the user is actively building capability. Compare to Blueprint (established, no acceptances) or Goals (established, 3 rejections).

- **Reflection history accepted but reflection scheduling rejected**: The user wants to see past reflection stats (history panel) but doesn't want to configure when reflections run (scheduling). Visibility: yes. Control of timing: no.

#### Context-Specific Observations (Updated 2026-01-25)

- **Learning Insights (4 accepted, 0 rejected)**: New area of high acceptance. Every direction that surfaces insight data visually was accepted.
- **Behavioral Signals (2 accepted, 1 rejected)**: Decay visualization and signal hooks accepted. Focus shift detection rejected - it interprets user behavior rather than just showing it.
- **Brain Dashboard (2 accepted, 1 rejected)**: Real data connection and drill-down accepted. Summary widget rejected - embedding brain info outside the brain page is unwanted.
- **Reflection Agent (1 accepted, 1 rejected)**: History panel accepted. Scheduling rejected.
- **Social Kanban (5 accepted, 0 rejected)**: Complete acceptance. Building AI-powered feedback processing capability.
- **Chat Orchestration (2 accepted, 1 rejected)**: Tool preview and quick options accepted. Conversation branching rejected - too complex, speculative value.
- **Tool System (2 accepted, 1 rejected)**: Analytics and prompt-templates accepted. Result caching rejected - premature optimization.
- **Notifications (2 accepted, 1 rejected)**: Center and task notifications accepted. Streaming responses rejected.
- **Voice Interface (0 accepted, 3 rejected)**: All rejected. Voice shortcuts, model comparison, provider switching - all infrastructure without user-facing need.
- **Direction Outcomes (0 accepted, 3 rejected)**: All rejected. Post-acceptance tracking is unwanted.

#### The 43% Acceptance Rate Signal

The jump from 12% to 43% acceptance suggests direction generation has improved alignment with user preferences. However, this may also reflect:
1. More directions generated for areas the user actively cares about (Brain, Social Kanban)
2. Fewer directions for "already working" areas (Blueprint, CLI, Goals)
3. Better avoidance of the "infrastructure as feature" anti-pattern

The remaining 57% rejection rate shows selectivity remains high. Precision over volume is still the goal.

---

#### Reflection: 2026-01-24 (4 accepted, 30 rejected)

**Accepted: "Document and standardize which Zustand store fields persist across sessions and implement consistently"** (Cross-Cutting Initiative)
> Why it worked: Practical housekeeping that addresses an existing inconsistency in the codebase. Not speculative - the problem exists today across 31 stores. Delivers a clear, standardized pattern developers can follow. Results in tangible code quality improvement.

**Accepted: "Create interactive code impact visualization showing refactoring ripple effects"** (Refactor Wizard Steps)
> Why it worked: Visual and interactive - shows the user something they can see and act on. Solves a real problem: understanding what a refactoring will break before executing it. Builds confidence in existing tooling rather than adding new systems.

**Accepted: "Build unified inbox with cross-channel conversation threading and customer 360 view"** (Social Kanban Board)
> Why it worked: A concrete, well-scoped new feature with clear UX value. Provides visible functionality the user can interact with immediately. Consolidates information rather than adding more systems.

**Accepted: "Create interactive project health dashboard with actionable setup recommendations"** (Getting Started & Onboarding Flow)
> Why it worked: Visual dashboard with "actionable" output. Transforms abstract status into something tangible. Motivates completion through gamification. Self-service guidance reduces friction.

**Rejected: "Consolidate 3 error handling systems and complete observability middleware rollout to all 65 API routes"** (Cross-Cutting Initiative)
> Concern: Pure infrastructure plumbing with no visible user-facing value. Touches 65 routes (massive blast radius) for marginal benefit. The current error handling works - this is solving a theoretical elegance problem, not a user problem.

**Rejected: "Replace 15+ independent fetch implementations with a centralized API client"** (Cross-Cutting Initiative)
> Concern: Infrastructure consolidation that doesn't deliver user-facing value. The existing fetch calls work. The effort-to-value ratio is poor - massive refactoring for architectural purity that doesn't solve a pain point.

**Rejected: "Implement intelligent context recommendation engine with ML-based file grouping"** (Blueprint Context & File Selection)
> Concern: "Intelligent" and "ML-based" are buzzwords here. The user manually organizes contexts and understands their codebase. An AI guessing at boundaries adds complexity without solving a real problem.

**Rejected: "Build visual workflow designer for creating custom automated scan pipelines"** (Blueprint State Machine)
> Concern: Over-engineered solution for a problem that doesn't exist yet. "Drag-and-drop visual workflow designer" is enterprise software scope for a localhost dev tool. The current state machine works.

**Rejected: "Implement AI-powered goal coaching with progress insights"** (Manager Goal Hub)
> Concern: "AI-powered coaching" is speculative value. The user doesn't need an AI to tell them to work harder on their goals. Adds ongoing LLM costs for marginal motivational output.

**Rejected: "Build session recording and playback system for debugging"** (CLI Session Management)
> Concern: Recording/replay systems are complex infrastructure with narrow use cases. The user can re-run sessions. This solves a "nice to have" scenario, not an active pain point.

### Patterns Identified

- **Visual + Actionable wins**: Accepted directions consistently deliver something the user can see and interact with. Dashboards, visualizations, and interactive tools resonate. Pure backend infrastructure does not.

- **Consolidation of information > Consolidation of code**: Accepted items consolidate user-facing information (unified inbox, health dashboard, impact visualization). Rejected items consolidate developer-facing code (API client, error handling, component library). The user values UX consolidation, not DX consolidation.

- **"Intelligent/AI-powered" is a red flag in directions**: 6+ rejected directions use "intelligent", "AI-powered", "smart", or "ML-based" as selling points. These terms signal speculative value without demonstrating substance. The one accepted "actionable recommendations" direction works because the recommendations are concrete, not AI-generated platitudes.

- **Scope inversely correlates with acceptance**: Accepted directions have focused scope (one dashboard, one visualization, one standardization). Rejected directions frequently touch "all 65 routes", "all 31 stores", or span the entire application.

- **Current pain > Future optimization**: Every accepted direction addresses something the user encounters today. Rejected directions frequently solve hypothetical future problems ("what if scans fail?", "what if we need to debug workflows?", "what if goals have dependencies?").

- **Infrastructure-for-infrastructure-sake is rejected**: Session pooling, event systems, workflow designers, analytics engines - these are infrastructure without user-facing output. The user wants features, not foundations.

- **Meta-tooling is valued**: Git history shows the user builds tools that improve their own workflow (Direction tinder for evaluating directions, Brain system for learning preferences, CLI session management). Self-improving tooling that reduces friction in existing processes resonates.

- **Cleanup follows acceptance, not the reverse**: The accepted "state persistence" direction led to "Brain + Cleanup" (261 files). The user acts on accepted directions and bundles cleanup into feature work. Standalone cleanup (error handling consolidation, API client unification) is rejected, but cleanup bundled with a feature is welcomed.

#### Deeper Pattern Analysis (Refined 2026-01-24)

**Acceptance archetype - "Show me, don't tell me":**
All 4 accepted directions produce something the user can *look at* and *click on*. They share a pattern: take existing data/state and render it visually with interactive controls. None of them require new external integrations, new AI services, or fundamental architecture changes.

**Rejection archetype - "Infrastructure as a feature":**
The 30 rejected directions share a common anti-pattern: they frame infrastructure work as if it were a feature. Session pooling, error handling consolidation, API client layers, event systems - these are all infrastructure disguised with feature-like language ("intelligent", "comprehensive", "adaptive").

**Context-specific observations:**
- **Blueprint (6 rejected, 0 accepted)**: The user considers Blueprint's current state machine sufficient. All rejected Blueprint directions add orchestration/automation layers on top of something that already works.
- **CLI Session Management (3 rejected)**: The user uses CLI sessions as simple execution units. Attempts to make sessions "smart" (pooling, recording, streaming) are rejected because sessions are intentionally lightweight.
- **Voice/Annette (3 rejected)**: "Memory", "proactive", and "emotional detection" are all rejected. The user wants Annette to do what's asked, not anticipate needs.
- **Goals (3 rejected)**: OKRs, coaching, dependency graphs - the user treats goals as simple markers, not project management infrastructure.
- **Cross-Cutting (6 rejected, 1 accepted)**: The only accepted cross-cutting direction was state persistence - because it solves an actual inconsistency. The rest (error handling, API client, Cmd+K, keyboard shortcuts, component library) are all "unification for unification's sake."

**The 10:1 rejection ratio signal:**
With 30 rejections and 4 acceptances, the user is highly selective. This means direction generation should prioritize precision over volume. A smaller number of well-targeted directions is more valuable than broad coverage.

**What "actionable" really means:**
The accepted "actionable recommendations" in the health dashboard doesn't mean "AI tells you what to do." It means the dashboard shows concrete next steps the user can click to execute. Actionable = clickable, not advisable.

#### Reflection 2: 2026-01-24 (same data, deeper git analysis)

**New patterns from extended git history (28 commits):**

- **Enterprise-scope language triggers rejection**: Words like "comprehensive", "sophisticated", "advanced", "framework", "engine", "orchestration", "system" appear almost exclusively in rejected directions. These signal enterprise-grade solutions for a solo-developer localhost tool. Compare: accepted "interactive dashboard" vs rejected "comprehensive SLA management system", accepted "code impact visualization" vs rejected "intelligent scan orchestration system". The word "system" alone appears in 20+ rejected direction titles.

- **"Already working" doctrine**: Blueprint (6 rejected/0 accepted), CLI Sessions (3 rejected), Goals (3 rejected), Annette (3 rejected). For each of these areas, the existing implementation is considered sufficient. Directions proposing improvements to working subsystems are rejected regardless of improvement quality. The accepted directions either fix an acknowledged inconsistency (state persistence) or add genuinely new capability (unified inbox, health dashboard).

- **Self-improvement tooling is the exception to infrastructure rejection**: Git history shows "Direction tinder" (meta-tool for evaluating directions), "Brain + Cleanup" (self-learning system), "UI quickcheck after each task" (self-verification), "Added improved context mapping skill" - all meta-tools that improve the AI development process itself. This is infrastructure, but it's infrastructure that makes the autonomous development loop better. The distinction: infrastructure that serves the *user's workflow* is accepted; infrastructure that serves *code purity* is rejected.

- **Commit size reveals preference**: Large commits (39-261 files) happen for feature+cleanup bundles or new subsystems. Small commits (2-14 files) happen for focused UX fixes. The user never makes large commits for pure refactoring without a feature attached. This confirms: cleanup is a side-effect of feature work, never the main event.

#### Git Correlation (2026-01-17 to 2026-01-24)

Commits in this period confirm existing patterns:
- `7f8bbb5` "Brain + Cleanup" (261 files) - Aligns with accepted state persistence direction
- `8a3b2bf` "Direction tinder" (40 files) - Meta-tooling: built a UI to evaluate directions themselves
- `a938e48` "Added Reset item into TaskColumnItem" - Small, focused UX improvement
- `23346af` "Questions table UX fixes" - Continuous polish of existing features
- `3896cdf` "Test coverage - server side" (33 files) - Practical quality improvement

No commits correspond to rejected direction areas (workflow designers, session pooling, analytics dashboards, AI coaching). The user's actual development activity confirms the preference for practical, focused work over speculative infrastructure.

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
