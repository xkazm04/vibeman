# Context Map Generator Skill

## Purpose

Generate a `context_map.json` file that maps **business features** (not architectural layers). Each context represents a user-facing capability with all its implementation layers bundled together.

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

## Output Schema

```json
{
  "version": "1.0.0",
  "generated": "YYYY-MM-DD",
  "description": "Business feature map for [project name]",
  "contexts": [
    {
      "id": "feature-name",
      "title": "Feature Name",
      "summary": "What this feature DOES for users (2-3 sentences)",
      "filepaths": {
        "ui": ["components that render this feature"],
        "logic": ["hooks, utilities, state for this feature"],
        "server": ["API routes serving this feature"],
        "data": ["db schemas, types, models for this feature"]
      }
    }
  ]
}
```

## Size Guidelines

**Target: 10-20 files per context**

- **< 10 files**: Consider merging with related feature
- **10-20 files**: Ideal size
- **> 20 files**: Split into subfeatures

**Splitting Strategy:**
```
"Simulator" (50 files) → TOO BIG

Split into subfeatures:
- "Image Upload & Analysis" (12 files)
- "Dimension Input" (10 files)
- "Prompt Generation" (8 files)
- "Generated Output Display" (11 files)
- "Project Save/Load" (9 files)
```

## Instructions

### Step 1: Identify User-Facing Features

Ask: "What can users DO with this app?"

For each capability, that's a potential context:
- Upload an image → "Image Upload" feature
- Enter dimensions/references → "Dimension Input" feature
- Generate prompts → "Prompt Generation" feature
- View/save results → "Output Display" feature
- Manage projects → "Project Management" feature

### Step 2: Map Files to Features (Not Layers!)

For "Image Upload" feature, gather ALL related files:
```
ui:     BaseImageInput.tsx, SmartBreakdown.tsx
logic:  useImageGeneration.ts, usePersistedEntity.ts
server: api/ai/image-describe/route.ts, api/ai/generate-images/route.ts
data:   types.ts (image-related types)
```

### Step 3: Check Size and Split if Needed

If a feature has > 20 files, split by sub-capability:
- "Image Upload" (input UI, upload logic)
- "Image Analysis" (AI analysis, breakdown display)
- "Image Generation" (generation API, result handling)

### Step 4: Handle Shared Code

For truly shared utilities (used by 3+ features):
- Create ONE "Core Utilities" context
- Keep it minimal (only cross-cutting concerns)
- Examples: cn() helper, error handling, db connection

### Step 5: Write Feature-Focused Summaries

**BAD summary (architecture-focused):**
> "Contains React components for the simulator UI layer"

**GOOD summary (feature-focused):**
> "Allows users to upload a reference image and get AI-powered visual analysis with automatic dimension suggestions"

## Example: Simulator Project

```json
{
  "version": "1.0.0",
  "generated": "2026-01-11",
  "description": "Business feature map for Simulator - What If image visualization tool",
  "contexts": [
    {
      "id": "image-input-analysis",
      "title": "Image Input & Analysis",
      "summary": "Upload reference images and get AI-powered visual analysis. Gemini Vision extracts format, content, and suggests dimensions.",
      "filepaths": {
        "ui": ["components/BaseImageInput.tsx", "components/SmartBreakdown.tsx"],
        "logic": ["hooks/useImageGeneration.ts", "lib/simulatorAI.ts"],
        "server": ["api/ai/image-describe/route.ts"],
        "data": ["types.ts"]
      }
    },
    {
      "id": "dimension-remix",
      "title": "Dimension & Cultural Reference Input",
      "summary": "Enter cultural references (games, movies, art styles) as remix dimensions. Each dimension swaps content while preserving visual format.",
      "filepaths": {
        "ui": ["components/DimensionCard.tsx", "components/DimensionGrid.tsx", "components/ElementChip.tsx"],
        "logic": ["lib/defaultDimensions.ts", "lib/gameUIPresets.ts"],
        "server": [],
        "data": ["types.ts"]
      }
    },
    {
      "id": "prompt-generation",
      "title": "AI Prompt Generation",
      "summary": "Generate optimized prompts for AI image generators by combining base image analysis with remix dimensions.",
      "filepaths": {
        "ui": ["components/PromptCard.tsx", "components/PromptOutput.tsx", "components/PromptDetailModal.tsx"],
        "logic": ["lib/promptBuilder.ts", "lib/llmPrompts.ts"],
        "server": ["api/ai/simulator/route.ts"],
        "data": []
      }
    },
    {
      "id": "project-management",
      "title": "Project Save & Load",
      "summary": "Create, save, and load simulator projects. Persists dimensions, base images, and generated content.",
      "filepaths": {
        "ui": ["components/ProjectSelector.tsx"],
        "logic": ["hooks/useProject.ts", "hooks/usePoster.ts"],
        "server": ["api/projects/route.ts", "api/projects/[id]/route.ts"],
        "data": ["lib/db.ts"]
      }
    }
  ]
}
```

## Anti-Patterns to Avoid

**1. Layer-based grouping:**
```json
// WRONG - architectural layers
{ "id": "api-routes", "filepaths": { "server": ["all API files"] } }
{ "id": "react-hooks", "filepaths": { "logic": ["all hook files"] } }
```

**2. Folder-based grouping:**
```json
// WRONG - just follows folder structure
{ "id": "components-folder", "filepaths": { "ui": ["everything in /components"] } }
```

**3. Huge monolithic contexts:**
```json
// WRONG - too big, not useful
{ "id": "simulator-feature", "filepaths": { "ui": ["42 files..."] } }
```

## Validation Checklist

Before finalizing:
- [ ] Each context represents a USER capability (not a code layer)
- [ ] Each context has 10-20 files
- [ ] Context summary describes what users CAN DO
- [ ] Files are grouped by feature, not by type
- [ ] Shared utilities are minimal (< 10 files total)

## Quick Test

For each context, ask:
> "If a developer needs to modify [this feature], do they have everything they need in ONE context?"

If yes → Good context
If no → Files are missing or split wrong

---

## Application Summary Section

After generating all individual contexts, add a `summary` section to the JSON that provides a high-level view of how the entire application works together.

### Updated Schema with Summary

```json
{
  "version": "1.0.0",
  "generated": "YYYY-MM-DD",
  "description": "Business feature map for [project name]",
  "contexts": [ ... ],
  "summary": {
    "overview": "2-3 sentence description of what the app does as a whole",
    "entryPoints": ["context-id-1", "context-id-2"],
    "interconnections": [
      {
        "from": "feature-a-id",
        "to": "feature-b-id",
        "relationship": "calls|uses|depends-on|triggers",
        "description": "Why feature-a connects to feature-b"
      }
    ],
    "userJourneys": [
      {
        "name": "Primary User Flow",
        "description": "What the user accomplishes",
        "steps": [
          { "context": "feature-id", "action": "What user does here" }
        ]
      }
    ],
    "sharedDependencies": [
      {
        "context": "core-utilities-id",
        "usedBy": ["feature-a", "feature-b", "feature-c"],
        "purpose": "Why this is shared"
      }
    ]
  }
}
```

### Instructions for Summary Generation

#### Step 1: Write the Overview

After all contexts are mapped, write a 2-3 sentence overview that:
- Describes what the app does from a user perspective
- Mentions the main capabilities (referencing key contexts)
- Avoids technical jargon

**Example:**
> "Vibeman is an AI-driven development platform that automates software development lifecycle. Users can analyze codebases (Blueprint), generate improvement ideas (Ideas System), batch execute code changes (TaskRunner), and track project goals (Goals)."

#### Step 2: Identify Entry Points

List contexts where users typically START their journey:
- Authentication/Login contexts
- Main dashboard or home page
- Landing page features

```json
"entryPoints": ["project-dashboard", "authentication"]
```

#### Step 3: Map Interconnections

For each context, identify connections to other contexts:

| Relationship | Meaning | Example |
|--------------|---------|---------|
| `calls` | Makes API calls to another context | idea-tinder → ideas-api |
| `uses` | Imports utilities/components from another context | blueprint → llm-integration |
| `depends-on` | Requires data from another context | task-runner → claude-code |
| `triggers` | User actions navigate to another context | project-list → project-dashboard |

**Rules:**
- Every context should have at least one incoming OR outgoing connection
- Core utilities are typically `usedBy` many contexts (document in `sharedDependencies`)
- Aim for 10-20 interconnections for a medium-sized app

#### Step 4: Define User Journeys

Identify 2-4 primary paths users take through the app:

```json
{
  "name": "Idea Review Flow",
  "description": "User reviews and accepts AI-generated improvement ideas",
  "steps": [
    { "context": "project-dashboard", "action": "User selects a project" },
    { "context": "ideas-list", "action": "User views generated ideas" },
    { "context": "idea-tinder", "action": "User swipes through ideas to accept/reject" },
    { "context": "task-runner", "action": "Accepted ideas become execution tasks" }
  ]
}
```

**Journey Selection Criteria:**
- Cover the main use cases of the app
- Each journey should touch 3-6 contexts
- Include the "happy path" for core features

#### Step 5: Document Shared Dependencies

For any "Core Utilities" or shared contexts:
- List which features depend on them
- Explain WHY they are shared (not just WHAT they contain)

```json
{
  "context": "llm-integration",
  "usedBy": ["blueprint", "ideas-system", "refactor-wizard", "test-generator"],
  "purpose": "Unified LLM access layer - all AI features route through here for consistent token tracking and provider switching"
}
```

### Summary Example: Simulator Project

```json
"summary": {
  "overview": "Simulator is a What-If image visualization tool. Users upload reference images, add cultural remix dimensions (games, movies, art styles), and generate AI prompts that preserve visual format while swapping content.",
  "entryPoints": ["project-management"],
  "interconnections": [
    {
      "from": "project-management",
      "to": "image-input-analysis",
      "relationship": "triggers",
      "description": "Opening a project loads saved images into the analysis view"
    },
    {
      "from": "image-input-analysis",
      "to": "dimension-remix",
      "relationship": "triggers",
      "description": "After image analysis, user proceeds to add remix dimensions"
    },
    {
      "from": "dimension-remix",
      "to": "prompt-generation",
      "relationship": "depends-on",
      "description": "Prompt generation combines image analysis with selected dimensions"
    },
    {
      "from": "prompt-generation",
      "to": "project-management",
      "relationship": "calls",
      "description": "Generated prompts are saved to the current project"
    }
  ],
  "userJourneys": [
    {
      "name": "New Remix Creation",
      "description": "User creates a new image remix from scratch",
      "steps": [
        { "context": "project-management", "action": "Create or select a project" },
        { "context": "image-input-analysis", "action": "Upload and analyze a reference image" },
        { "context": "dimension-remix", "action": "Add cultural dimensions (e.g., 'Zelda style', '80s anime')" },
        { "context": "prompt-generation", "action": "Generate and copy AI prompt" }
      ]
    }
  ],
  "sharedDependencies": []
}
```

### Summary Validation Checklist

Before finalizing the summary:
- [ ] Overview describes the app from USER perspective (not tech stack)
- [ ] All entry points are contexts that exist in the map
- [ ] Every context appears in at least one interconnection OR journey
- [ ] User journeys cover the main use cases
- [ ] Interconnection descriptions explain WHY (not just WHAT)
- [ ] Shared dependencies explain their cross-cutting purpose

### Summary Anti-Patterns

**1. Vague interconnections:**
```json
// WRONG - too vague
{ "from": "auth", "to": "everything", "relationship": "used-by" }

// CORRECT - specific
{ "from": "auth", "to": "project-management", "relationship": "depends-on",
  "description": "Project CRUD requires authenticated user context" }
```

**2. Tech-focused overview:**
```json
// WRONG - describes architecture
"overview": "Next.js 16 app with Zustand stores and SQLite database"

// CORRECT - describes user value
"overview": "AI development platform where users analyze code, generate improvements, and batch-execute changes"
```

**3. Missing journeys:**
```json
// WRONG - just listing contexts
"userJourneys": [{ "name": "Usage", "steps": ["use all features"] }]

// CORRECT - concrete user actions
"userJourneys": [{ "name": "Code Analysis", "steps": [
  { "context": "project-select", "action": "Pick a codebase" },
  { "context": "blueprint", "action": "Run structural analysis" },
  { "context": "context-viewer", "action": "Review generated contexts" }
]}]
```
