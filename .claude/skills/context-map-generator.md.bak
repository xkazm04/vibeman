# Context Map Generator Skill

## Purpose

Initialize **SQLite-based contexts** via API calls that map **business features** (not architectural layers) for ANY project managed by Vibeman. Each context represents a user-facing capability with all its implementation layers bundled together.

**Works with**: Next.js, React, Express, FastAPI, React Native, Python, Go, or any codebase
**Primary Output**: SQLite database entries via REST API calls to Vibeman
**API Base URL**: `http://localhost:3000` (Vibeman always runs here)

## Philosophy: Business Features, Not Architecture

**OLD approach (WRONG):**
- "API Routes" context with all route files
- "Shared Libraries" context with all utilities
- "UI Components" context with all components

**NEW approach (CORRECT):**
- "Image Upload" context with: upload UI + upload hook + upload API route + db schema
- "Prompt Generation" context with: prompt UI + promptBuilder lib + AI API route
- "Project Management" context with: selector UI + useProject hook + projects API

**Key Principle:** A developer working on "Image Upload" should get ONE context containing everything they need - not 4 separate contexts for UI/hooks/API/db.

## Full-Stack Slice Rule

Every context MUST be a vertical slice through the entire stack. For each feature context, include files from ALL applicable layers:

- **UI**: Layout, components, sub-components for this feature
- **Hooks/State**: Zustand stores, custom hooks, state logic
- **API Routes**: All route.ts files that this feature calls
- **Business Logic**: lib/ helpers, utilities, prompt builders
- **Database**: Repository files, types, migrations related to this feature
- **Types**: Shared type definitions used across layers

**Litmus test**: Can a developer implement a full feature change (DB schema + API + UI) using ONLY the files in this context? If not, the context is incomplete.

**NEVER** create contexts that only contain one layer (e.g., "API routes for X" or "UI components for Y"). Always bundle the full vertical stack.

**Merge sub-features aggressively**: If a feature has sub-modules (e.g., Ideas has Buffer, Lifecycle, Setup), bundle them ALL into ONE context unless they exceed 25 files. Sub-features that share the same DB table, API namespace, or parent feature folder MUST be in the same context.

---

## Step-by-Step Workflow

### Step 1: Get Project ID from Vibeman

First, find the project ID for the project you're mapping:

```bash
curl -s "http://localhost:3000/api/projects" | grep -A5 '"name":"PROJECT_NAME"'
```

Or list all projects to find the one you need:
```bash
curl -s "http://localhost:3000/api/projects" | node -e "const d=require('fs').readFileSync(0,'utf8');JSON.parse(d).projects.forEach(p=>console.log(p.id + ' - ' + p.name + ' (' + p.path + ')'))"
```

**Store the project ID** - you'll use it in all subsequent API calls.

### Step 2: Analyze Codebase Structure

Explore the project directory tree (max depth 3-4) and identify:

1. **Feature directories** - folders that represent distinct business capabilities (e.g., `src/app/features/Ideas/`, `src/app/features/Brain/`)
2. **API route namespaces** - groups of related API endpoints (e.g., `src/app/api/ideas/`, `src/app/api/brain/`)
3. **Database entities** - repository files and their associated types (e.g., `idea.repository.ts`, `brain-reflection.repository.ts`)
4. **State stores** - Zustand stores that manage feature state (e.g., `ideaStore.ts`, `brainStore.ts`)

**The formula**: Each feature-folder + its-matching-API-routes + its-DB-repositories + its-store = ONE context.

**Monorepo detection**: If the project has multiple `package.json` files at different levels, treat each package with 20+ files as its own group. Single apps group by business features.

**Key principle**: Start by listing feature folders, then find the API routes and DB repos that serve each feature. This mapping IS your context list.

### Step 3: Plan Context Groups

**Group by BUSINESS DOMAIN, not architecture layer.**

Create 6-10 groups for a medium-sized app. Each group should:
- Represent a cohesive business area
- Contain 3-6 related contexts
- Have clear boundaries with other groups

**Universal Group Categories:**

| Group Type | Purpose | When to Use |
|------------|---------|-------------|
| **Core Engine** | Primary functionality users interact with | Main feature area |
| **AI/Generation** | AI-powered features, generation services | Apps with AI |
| **Input/Configuration** | User input, settings, preferences | Data entry features |
| **Output/Display** | Results, galleries, visualizations | Display-heavy apps |
| **Interactive** | Dynamic UI, animations, prototypes | Rich UI apps |
| **Persistence** | Database, storage, caching | Data storage |
| **External** | Third-party integrations, APIs | Apps with integrations |
| **Analysis** | Metrics, analytics, monitoring | Dashboard features |

**Color Palette:**
- Core/Primary: `#3B82F6` (blue)
- AI/Generation: `#8B5CF6` (purple)
- Input: `#06B6D4` (cyan)
- Output: `#F59E0B` (amber)
- Interactive: `#EC4899` (pink)
- Persistence: `#F97316` (orange)
- External: `#7C3AED` (violet)
- Analysis: `#10B981` (green)

### Step 4: Create Context Groups

```bash
PROJECT_ID="your-project-id"

curl -s -X POST "http://localhost:3000/api/context-groups" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"name\": \"Core Simulator Engine\",
    \"color\": \"#3B82F6\",
    \"position\": 1
  }"
```

**Save the returned group IDs** for creating contexts.

### Step 5: Create Contexts Within Groups

For each business feature, create a context linked to its group:

```bash
curl -s -X POST "http://localhost:3000/api/contexts" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "groupId": "GROUP_ID",
    "name": "Feature Name",
    "description": "What this feature DOES for users (1-2 sentences)",
    "filePaths": ["path/to/file1.tsx", "path/to/file2.ts", "path/to/api/route.ts"],
    "entry_points": [{"path": "path/to/MainLayout.tsx", "type": "component"}],
    "db_tables": ["table_name"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "api_surface": [{"path": "/api/feature/endpoint", "methods": "GET,POST", "description": "Endpoint purpose"}],
    "cross_refs": [],
    "tech_stack": ["zustand", "framer-motion"]
  }'
```

**Context Naming Guidelines:**
- Use action-oriented names: "Image Generation", "Prompt Builder", "Character Roster"
- Avoid generic names: NOT "Components", "Utils", "Helpers"
- Be specific: "WebGL 3D Demos" not "Interactive Features"

**Description Guidelines:**
- Describe what users CAN DO, not implementation details
- Good: "Upload reference images and receive AI-powered visual analysis"
- Bad: "React component with useState and useEffect hooks"

**File Path Guidelines:**
- Include ALL files related to the feature (UI + logic + API + DB + types + store)
- Target 10-25 files per context (ideal ~20)
- Include the main layout/entry file first
- Use relative paths from project root
- Include sub-folders of the feature as part of the SAME context

**AI Navigation Fields** (populate for every context):
- `entry_points`: The 1-3 most important files a developer should read first to understand this feature. Each has a `path` and `type` ("page"|"api"|"component"|"config")
- `db_tables`: Array of SQLite/database table names this context reads from or writes to (e.g., ["ideas", "scans"])
- `keywords`: 3-8 search terms for fuzzy matching user queries to this context (e.g., ["authentication", "login", "session", "JWT"])
- `api_surface`: API endpoints this context exposes, with HTTP methods and a short description
- `cross_refs`: IDs of related contexts. Relationships: "depends_on", "depended_by", "shares_data". Populate AFTER all contexts are created
- `tech_stack`: Key libraries/technologies used in this context (e.g., ["zustand", "d3", "framer-motion"])

### Step 6: Create Relationships Between Groups

```bash
curl -s -X POST "http://localhost:3000/api/context-group-relationships" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "sourceGroupId": "GROUP_A_ID",
    "targetGroupId": "GROUP_B_ID",
    "relationshipType": "calls",
    "description": "Why A connects to B"
  }'
```

**Relationship Types:**
- `calls` - Makes API/function calls
- `uses` - Imports/depends on code
- `depends-on` - Requires data from
- `triggers` - Actions that lead to

### Step 7: Verify Creation

```bash
PROJECT_ID="your-project-id"

# List all groups
curl -s "http://localhost:3000/api/context-groups?projectId=$PROJECT_ID"

# List all contexts
curl -s "http://localhost:3000/api/contexts?projectId=$PROJECT_ID"

# List relationships
curl -s "http://localhost:3000/api/context-group-relationships?projectId=$PROJECT_ID"

# Quick count
echo "Groups: $(curl -s "http://localhost:3000/api/context-groups?projectId=$PROJECT_ID" | grep -o '"id":"group_' | wc -l)"
echo "Contexts: $(curl -s "http://localhost:3000/api/contexts?projectId=$PROJECT_ID" | grep -o '"id":"ctx_' | wc -l)"
```

---

## Size Guidelines

**Target: 10-25 files per context (ideal ~20), 2-4 contexts per group. Prefer FEWER, LARGER contexts.**

| App Size | Total Files | Groups | Contexts | Relationships |
|----------|-------------|--------|----------|---------------|
| Small | 10-50 | 2-3 | 4-8 | 3-6 |
| Medium | 50-200 | 4-6 | 8-16 | 6-10 |
| Large | 200+ | 5-8 | 12-25 | 8-15 |

---

## Complete Examples

### Example 1: Simulator Project (AI Image Generation Tool)

**158 files, 8 groups, 28 contexts, 12 relationships**

**Groups Created:**
1. **Core Simulator Engine** (`#3B82F6`) - Main orchestration, layout, mobile support
2. **AI & Generation Services** (`#8B5CF6`) - Gemini Vision, Leonardo AI, orchestration
3. **Dimension Management** (`#06B6D4`) - Dimension input, presets, configuration
4. **Prompt System** (`#10B981`) - Prompt generation, display, feedback
5. **Output & Gallery** (`#F59E0B`) - Poster display, image management, comparison
6. **Interactive Prototypes** (`#EC4899`) - WebGL, clickable prototypes, animations
7. **Project Persistence** (`#F97316`) - SQLite, IndexedDB, project management
8. **Character Studio** (`#7C3AED`) - Character roster, identity inspector, generation

**Sample Context:**
```bash
curl -X POST "http://localhost:3000/api/contexts" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "a25313f3-1551-4006-a33e-81dbeb6f0719",
    "groupId": "group_xxx",
    "name": "Gemini Vision Analysis",
    "description": "Google Gemini integration for image analysis. Extracts visual format, identifies swappable content elements, and provides AI-powered breakdown suggestions.",
    "filePaths": [
      "app/lib/gemini.ts",
      "app/api/ai/gemini/route.ts",
      "app/api/ai/image-describe/route.ts",
      "app/features/simulator/lib/simulatorAI.ts"
    ]
  }'
```

**Relationships:**
```
Core Simulator Engine → AI & Generation Services (calls)
Core Simulator Engine → Dimension Management (uses)
Core Simulator Engine → Prompt System (uses)
Core Simulator Engine → Output & Gallery (uses)
Core Simulator Engine → Interactive Prototypes (uses)
Core Simulator Engine → Project Persistence (depends-on)
AI & Generation Services → Output & Gallery (triggers)
Dimension Management → Prompt System (calls)
Prompt System → AI & Generation Services (calls)
Output & Gallery → Interactive Prototypes (triggers)
Character Studio → AI & Generation Services (calls)
Character Studio → Project Persistence (depends-on)
```

### Example 2: Vibeman Project (AI Dev Platform)

**500+ files, 6 groups, 18 contexts, 10 relationships**

**Groups Created:**
1. **Core Development Engine** (`#3B82F6`) - Ideas System, Goals & Standup, Context Management
2. **Code Execution & Testing** (`#8B5CF6`) - TaskRunner & Claude Code, Scan Queue, Blueprint
3. **Intelligence Layer** (`#EC4899`) - Annette AI Assistant, Brain & Signals, Reflector
4. **Analysis & Quality** (`#10B981`) - Dependencies & Security, Debt Prediction, Architecture
5. **Social & Integrations** (`#06B6D4`) - Social Feedback, External Integrations
6. **Data & Infrastructure** (`#6366F1`) - Database & Migrations, LLM Integration, Onboarding

**Sample Full-Stack Context (18 files spanning all layers):**
```json
{
  "name": "Ideas System",
  "description": "Continuous AI-powered suggestion engine. Scans codebase with specialized agents, evaluates ideas via LLM, and lets users triage through swipe-based acceptance.",
  "filePaths": [
    "src/app/features/Ideas/IdeasLayout.tsx",
    "src/app/features/Ideas/components/IdeasHeaderWithFilter.tsx",
    "src/app/features/Ideas/components/ScanTypePreview.tsx",
    "src/app/features/Ideas/lib/scanApi.ts",
    "src/app/features/Ideas/lib/scanTypes.ts",
    "src/app/features/Ideas/lib/ideaConfig.ts",
    "src/app/features/Ideas/sub_Buffer/BufferView.tsx",
    "src/app/features/Ideas/sub_Buffer/BufferColumn.tsx",
    "src/app/features/Ideas/sub_IdeasSetup/components/ClaudeIdeasButton.tsx",
    "src/app/features/Ideas/sub_Lifecycle/LifecycleDashboard.tsx",
    "src/app/features/Ideas/sub_Lifecycle/lib/lifecycleOrchestrator.ts",
    "src/app/api/ideas/stats/route.ts",
    "src/app/api/ideas/categories/route.ts",
    "src/app/api/ideas/tinder/accept/route.ts",
    "src/app/api/idea-aggregator/route.ts",
    "src/app/db/repositories/idea.repository.ts",
    "src/app/db/models/types.ts",
    "src/stores/ideaStore.ts"
  ],
  "entry_points": [{"path": "src/app/features/Ideas/IdeasLayout.tsx", "type": "component"}, {"path": "src/app/api/ideas/stats/route.ts", "type": "api"}],
  "db_tables": ["ideas", "scans"],
  "keywords": ["ideas", "suggestions", "tinder", "scan", "evaluate", "accept", "reject"],
  "api_surface": [{"path": "/api/ideas/stats", "methods": "GET", "description": "Idea statistics"}, {"path": "/api/ideas/tinder/accept", "methods": "POST", "description": "Accept idea"}],
  "cross_refs": [],
  "tech_stack": ["zustand"]
}
```

Notice: 18 files spanning UI (5), lib (3), sub-features (3), API routes (4), DB (2), store (1).
One context = everything a developer needs to work on Ideas.

### Example 3: Arc Project (Multi-Component Monorepo)

**580+ files across 6 packages, 10 groups, 39 contexts, 13 relationships**

This example demonstrates **multi-component project handling** - a monorepo with multiple npm packages and a Next.js dashboard.

**Project Structure:**
```
arc/
├── ArcPay/           # React payment SDK (96 files)
├── ArcPayNode/       # Node.js server SDK (31 files)
├── arcpay-b2b/       # B2B management SDK (33 files)
├── arcpay-react/     # React component library (53 files)
├── arcpay-x402/      # x402 protocol SDK (10 files)
└── test/             # Next.js dashboard (359 files)
```

**Grouping Strategy for Monorepos:**

1. **Each SDK package gets its own group** - maintains package boundaries
2. **Shared application (dashboard) splits by business domain** - not by package
3. **Relationships show cross-package dependencies** - how SDKs interconnect

**Groups Created:**
1. **ArcPay SDK (React)** (`#3B82F6`) - Payment core, wallet, transfers, ramps, history
2. **ArcPayNode SDK (Server)** (`#8B5CF6`) - Payment resources, subscriptions, webhooks
3. **B2B Management SDK** (`#06B6D4`) - Disputes, treasury, x402 gateway, testing
4. **React Components Library** (`#10B981`) - Primitives, checkout, invoice, subscription UI
5. **x402 Protocol** (`#F59E0B`) - Server middleware, client, React integration
6. **Dashboard: Core & Auth** (`#EF4444`) - App shell, auth flow, shared components
7. **Dashboard: Payments & Billing** (`#EC4899`) - Transactions, invoicing, subscriptions
8. **Dashboard: Customer Portal** (`#7C3AED`) - Self-service portal, dispute management
9. **Dashboard: Treasury & Assets** (`#F97316`) - Treasury, USDY yield, cross-chain
10. **Dashboard: Infrastructure** (`#6366F1`) - API keys, webhooks, settings, x402

**Key Relationships:**
```
ArcPay SDK → React Components (uses)
ArcPay SDK → x402 Protocol (uses)
ArcPayNode SDK → B2B Management SDK (uses)
B2B Management SDK → x402 Protocol (uses)
Dashboard: Core → ArcPay SDK (uses for wallet)
Dashboard: Core → React Components (uses)
Dashboard: Payments → Dashboard: Core (depends-on)
Dashboard: Payments → ArcPayNode SDK (calls)
Dashboard: Portal → Dashboard: Payments (uses)
Dashboard: Treasury → Dashboard: Core (depends-on)
Dashboard: Treasury → B2B Management SDK (calls)
Dashboard: Infrastructure → x402 Protocol (uses)
Dashboard: Infrastructure → B2B Management SDK (uses)
```

**Monorepo-Specific Guidelines:**

| Pattern | Approach |
|---------|----------|
| **Shared packages** | One group per package |
| **Consuming apps** | Split by business domain, not package |
| **Cross-package relationships** | Create explicit relationships showing dependencies |
| **File paths** | Use package-relative paths: `ArcPay/src/...`, `test/src/...` |
| **Context naming** | Include package context when needed: "Payment Resources" vs "Dashboard Transactions" |

**When to Split vs Merge:**
- **Split** if package has 3+ distinct features (ArcPay → Core, Wallet, Ramps, History)
- **Merge** if package is small utility (<15 files) → add to nearest related group
- **Dashboard apps** always split by user-facing business domain, not by SDK usage

---

## Cleaning Up Existing Data

Before regenerating contexts for a project:

```bash
PROJECT_ID="your-project-id"

# Delete all contexts
curl -s -X DELETE "http://localhost:3000/api/contexts?projectId=$PROJECT_ID"

# Delete all context groups (get IDs first)
for group_id in $(curl -s "http://localhost:3000/api/context-groups?projectId=$PROJECT_ID" | grep -o '"id":"group_[^"]*"' | cut -d'"' -f4); do
  curl -s -X DELETE "http://localhost:3000/api/context-groups?groupId=$group_id"
done

# Delete context_map.json if it exists
rm context_map.json 2>/dev/null
```

---

## Validation Checklist

Before finalizing:
- [ ] Each group represents a BUSINESS DOMAIN (not code layer)
- [ ] Each context represents a USER CAPABILITY
- [ ] Each context has 10-25 files (ideal ~20)
- [ ] Context descriptions say what users CAN DO
- [ ] Files are grouped by feature, not by type
- [ ] Every group has at least 2 contexts
- [ ] Every group has at least 1 relationship
- [ ] No orphan contexts (all belong to a group)
- [ ] Every context has entry_points populated (1-3 key files)
- [ ] Every context has db_tables populated (or empty array if none)
- [ ] Every context has keywords populated (3-8 search terms)
- [ ] Verified via API calls that data is persisted

## Anti-Patterns to Avoid

**1. Layer-based grouping:**
```json
// WRONG - architectural layers
{ "name": "API Layer" }
{ "name": "UI Components" }
{ "name": "Utilities" }

// CORRECT - business domains
{ "name": "Core Simulator Engine" }
{ "name": "AI & Generation Services" }
```

**2. Generic context names:**
```json
// WRONG
{ "name": "Main Features" }
{ "name": "Helper Functions" }

// CORRECT
{ "name": "Gemini Vision Analysis" }
{ "name": "Poster Display & Gallery" }
```

**3. Too many thin contexts (CONSOLIDATE aggressively):**
```
// WRONG - splitting sub-features into separate contexts
{ "name": "Idea Generation" }       // 6 files
{ "name": "Idea Evaluation" }       // 4 files
{ "name": "Idea Display" }          // 5 files

// CORRECT - one fat context per domain feature
{ "name": "Ideas System" }          // 15-20 files: generation + evaluation + display + API + DB
```

**Merge rule**: If two contexts share the same database table, API namespace,
or feature folder they MUST be a single context. Prefer fewer, larger contexts
over many granular ones. When in doubt, MERGE.

Each group should have 2-4 contexts. If you have more than 4, merge the smallest ones.

**4. Missing relationships:**
```
// WRONG - isolated groups
Groups have no connections

// CORRECT - connected architecture
Core → Infrastructure
Core → External Services
Analysis → Data Layer
```

---

## Quick Test

For each context, ask:
> "If a developer needs to modify [this feature], do they have everything they need in ONE context?"

For each group, ask:
> "Does this group represent a cohesive business area that a product manager would recognize?"

If yes to both → Good structure
If no → Reorganize

---

## Fallback: JSON File Output

If API is unavailable, generate `context_map.json` for manual import:

```json
{
  "version": "1.0.0",
  "generated": "YYYY-MM-DD",
  "description": "Business feature map for [project name]",
  "contexts": [
    {
      "id": "feature-name",
      "title": "Feature Name",
      "summary": "What this feature DOES for users",
      "filepaths": {
        "ui": ["ui files"],
        "lib": ["logic files"],
        "api": ["api files"],
        "data": ["data/type files"]
      }
    }
  ]
}
```
