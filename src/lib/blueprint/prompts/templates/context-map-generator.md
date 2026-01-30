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

Before creating groups and contexts, explore the codebase to understand its structure:

**First, detect if this is a monorepo:**
```bash
# Check for multiple package.json files (monorepo indicator)
find . -maxdepth 3 -name "package.json" 2>/dev/null | head -10

# List top-level directories that look like packages
ls -d */ 2>/dev/null | head -15

# Count files per top-level directory
for dir in */; do echo "$dir: $(find "$dir" -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | wc -l) files"; done
```

**If monorepo detected** → Each package with 20+ files becomes its own group.
**If single app** → Group by business features within the app.

**Universal Analysis Commands (work with any project):**

```bash
# Find all source directories
find . -type d -name "src" -o -name "app" -o -name "lib" -o -name "features" 2>/dev/null | head -20

# List top-level directories
ls -la

# Count files by extension to understand the tech stack
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" \) 2>/dev/null | sed 's/.*\.//' | sort | uniq -c | sort -rn

# Find feature directories (common patterns)
ls -la src/features/ 2>/dev/null || ls -la app/features/ 2>/dev/null || ls -la lib/features/ 2>/dev/null || ls -la features/ 2>/dev/null

# Find API/route files
find . -name "route.ts" -o -name "routes.ts" -o -name "*_router.py" -o -name "*_api.go" 2>/dev/null | head -30

# Find state management
find . -name "*.store.ts" -o -name "*Store.ts" -o -name "store.ts" -o -name "*.zustand.ts" 2>/dev/null | head -20

# Find configuration files
find . -name "package.json" -o -name "pyproject.toml" -o -name "go.mod" -o -name "Cargo.toml" 2>/dev/null | head -5

# Count total source files
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" \) 2>/dev/null | wc -l
```

**Framework-Specific Analysis:**

| Framework | Key Directories | Feature Detection |
|-----------|-----------------|-------------------|
| **Next.js** | `app/`, `src/app/features/`, `src/api/` | `app/api/**/route.ts` |
| **React** | `src/components/`, `src/features/`, `src/hooks/` | Feature folders |
| **Express** | `src/routes/`, `src/controllers/`, `src/services/` | `router.get/post` |
| **FastAPI** | `app/routers/`, `app/services/`, `app/models/` | `@router.get` |
| **React Native** | `src/screens/`, `src/components/`, `src/hooks/` | Screen folders |
| **Go** | `cmd/`, `internal/`, `pkg/` | `func Handler` |

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
    "filePaths": ["path/to/file1.tsx", "path/to/file2.ts", "path/to/api/route.ts"]
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
- Include ALL files related to the feature (UI + logic + API + types)
- Target 5-15 files per context
- Include the main layout/entry file first
- Use relative paths from project root

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

**Target: 5-15 files per context, 3-6 contexts per group**

| App Size | Total Files | Groups | Contexts | Relationships |
|----------|-------------|--------|----------|---------------|
| Small | 10-50 | 3-4 | 8-12 | 5-8 |
| Medium | 50-200 | 5-8 | 15-30 | 10-15 |
| Large | 200+ | 8-12 | 30-50 | 15-25 |

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

**500+ files, 8 groups, 32 contexts, 11 relationships**

**Groups Created:**
1. **Core Development Engine** (`#3B82F6`) - Ideas, Goals, Context Management, Task Runner
2. **Analysis & Optimization** (`#8B5CF6`) - RefactorWizard, TechDebtRadar, Reflector
3. **Understanding & Documentation** (`#10B981`) - Architecture Explorer, Code Browser
4. **Project Setup & Configuration** (`#F59E0B`) - Blueprint Scanner, Getting Started
5. **Execution & Monitoring** (`#EF4444`) - Scan Queue, Implementation Review
6. **Intelligence & Collaboration** (`#EC4899`) - Annette AI, Social Kanban, Tinder
7. **Integration & Extension** (`#06B6D4`) - External Integrations, Marketplace
8. **Data & Infrastructure** (`#6366F1`) - Database Layer, LLM Integration

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
- [ ] Each context has 5-15 files
- [ ] Context descriptions say what users CAN DO
- [ ] Files are grouped by feature, not by type
- [ ] Every group has at least 2 contexts
- [ ] Every group has at least 1 relationship
- [ ] No orphan contexts (all belong to a group)
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

**3. Too few or too many contexts per group:**
```
// WRONG
Group with 1 context (merge with another group)
Group with 15 contexts (split into multiple groups)

// CORRECT
Each group has 3-6 contexts
```

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
