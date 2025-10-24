# Context Scan and Generation

## Your Mission

You are tasked with analyzing the codebase at **C:\Users\kazda\kiro\story** and creating intelligent, feature-based contexts that will be stored in the SQLite database. This is not a one-time task - you will be called again to update contexts as the codebase evolves.

## Project Information

- **Project ID**: dd11e61e-f267-4e52-95c5-421b1ed9567b
- **Project Name**: story
- **Project Path**: C:\Users\kazda\kiro\story

## Step-by-Step Instructions

### Step 1: Check for Existing Contexts

**CRITICAL FIRST STEP**: Before creating any new contexts, check if this project already has contexts in the database.

Fetch existing contexts from the database:

```bash
curl -X GET "http://localhost:3000/api/contexts?projectId=dd11e61e-f267-4e52-95c5-421b1ed9567b"
```

**If contexts exist:**
- Review each existing context carefully
- Compare with current codebase structure
- Decide for each context: **KEEP**, **UPDATE**, or **DELETE**
- Create new contexts ONLY for features not yet covered
- **DO NOT duplicate existing contexts**

**If no contexts exist:**
- Proceed with full codebase scan
- Create contexts from scratch

### Step 2: Understand High-Level Architecture

Read the high-level architecture overview if it exists:

```bash
cat "C:\Users\kazda\kiro\story/context/high.md"
```

If this file doesn't exist, that's okay - proceed to the next step. This file provides important context about:
- Application overview and purpose
- Technical stack
- Feature inventory by domain
- Code organization patterns
- Architectural patterns

### Step 3: Intelligent Feature Discovery

Use the following heuristics to identify feature boundaries:

#### 3.1 Route-Based Detection
- Group files that serve the same route family
- Example: `/auth/*`, `/dashboard/*`, `/api/goals/*`
- Look for page.tsx, route.ts, layout.tsx patterns in Next.js

#### 3.2 Dependency Analysis
Apply dependency analysis to group contexts from parent to children:

**For each major entry point (pages, API routes):**
1. Identify the root file (e.g., `src/app/goals/page.tsx`)
2. Use the file-dependencies API to trace its import chain:
   ```bash
   curl -X POST http://localhost:3000/api/file-dependencies \
     -H "Content-Type: application/json" \
     -d '{
       "filePath": "<absolute-path-to-file>",
       "projectPath": "C:\Users\kazda\kiro\story",
       "maxDepth": 3
     }'
   ```
3. Group the file and its dependencies together (parent → children pattern)
4. Include files across all depths (UI → Services → Database)

**Example dependency chain:**
- Parent: `src/app/goals/page.tsx` (UI)
  - Child: `src/hooks/useGoals.ts` (Hook)
    - Grandchild: `src/lib/queries/goalQueries.ts` (Database)
    - Grandchild: `src/app/api/goals/route.ts` (API)

All these files would form ONE context: "Goals Management System"

#### 3.3 Naming Pattern Recognition
- Find files with consistent prefixes/suffixes
- Example: `Goal*.tsx`, `*Service.ts`, `*Queries.ts`
- Group related files by naming patterns

#### 3.4 Data Flow Mapping
- Trace data flow: UI Component → API Endpoint → Database Query
- Group files that operate on the same data entities
- Example: All files working with "goals" data belong together

#### 3.5 Business Domain Clustering
- **Focus on user-facing capabilities, not technical layers**
- Group by WHAT users can accomplish, not HOW it's implemented
- Example: "Project Management" not "React Components and APIs"

### Step 4: Context Size Guidelines

**Target**: ~10 files per context (can range from 5-15 files)

**Ideal context structure (feature-based):**
- 1-3 UI components (pages, layouts, components)
- 1-2 API routes (if applicable)
- 1-2 Service/Library files (business logic)
- 1-2 Database/Query files (data layer)
- 1-2 Type/Schema files
- 1-2 Hook files (if using React hooks)
- Supporting files (utilities, helpers)

**Each file should appear in EXACTLY ONE context** - no duplicates across contexts.

### Step 5: Create Feature-Based Contexts

**Excellent context examples:**

**Business Features (User-Facing):**
- "Goals Management System" - Create, track, and manage project goals
- "Context Organization" - Group and manage code contexts with file associations
- "Project Monitoring Dashboard" - Real-time event tracking and system health
- "Backlog Task Management" - Organize and prioritize development tasks
- "Claude Code Integration" - AI-powered requirement execution and automation

**Technical Modules (Supporting):**
- "Database Layer & Schema Management" - SQLite operations, migrations, query builders
- "LangGraph AI Assistant" - Knowledge-base constrained Q&A system
- "Process Manager" - Multi-project dev server orchestration
- "State Management" - Zustand stores and persistence
- "API Layer & Route Handlers" - Next.js API routes architecture

**Avoid creating contexts for:**
- Single utility files
- Generic "Types" or "Utilities"
- Config files only
- Contexts with fewer than 5 files

### Step 6: Description Structure (CRITICAL)

**Each context description MUST follow this exact structure:**

```markdown
## Overview
[2-3 sentences describing what this feature does for users or developers]

## Key Capabilities
- Capability 1: [description]
- Capability 2: [description]
- Capability 3: [description]

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| `path/to/file1.tsx` | [Short description] | UI |
| `path/to/file2.ts` | [Short description] | Service |
| `path/to/file3.ts` | [Short description] | Data |

### Data Flow
[Describe how data flows through the system]
Example: User action → API call → Database query → State update → UI render

### Key Dependencies
- External: [External packages used]
- Internal: [Other contexts this depends on]

## Technical Details

### State Management
[How state is managed - Zustand, React hooks, etc.]

### API Endpoints
[List relevant API endpoints if applicable]

### Database Tables
[List relevant database tables if applicable]

## Usage Examples
[1-2 code examples showing how to use this feature]

## Future Improvements
- [ ] [Potential enhancement 1]
- [ ] [Potential enhancement 2]
```

**CONSISTENCY IS CRITICAL**: Every context you create (now and in future updates) MUST follow this exact structure. This enables automated parsing and ensures quality.

### Step 7: Store Contexts in SQLite

**Use the Contexts API to store each context:**

For each context you create:

```bash
curl -X POST http://localhost:3000/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "dd11e61e-f267-4e52-95c5-421b1ed9567b",
    "groupId": null,
    "name": "Feature Name Here",
    "description": "## Overview\n[markdown description following the structure above]",
    "filePaths": [
      "src/path/to/file1.tsx",
      "src/path/to/file2.ts",
      "src/path/to/file3.ts"
    ]
  }'
```

**Important field requirements:**
- `projectId`: Always use "dd11e61e-f267-4e52-95c5-421b1ed9567b"
- `groupId`: Leave as null (contexts will be ungrouped initially)
- `name`: Short feature title (e.g., "Goals Management System")
- `description`: Full markdown description following the structure above
- `filePaths`: Array of relative paths from project root (use forward slashes)

**DO NOT include these fields** (they are auto-generated or deprecated):
- `id` - Auto-generated by the database
- `context_file_path` - Deprecated, no longer used
- `has_context_file` - Deprecated, no longer used
- `preview` - Leave empty

### Step 8: Verification and Output

After creating all contexts:

1. **Verify all contexts were created successfully:**
   ```bash
   curl -X GET "http://localhost:3000/api/contexts?projectId=dd11e61e-f267-4e52-95c5-421b1ed9567b"
   ```

2. **Provide a summary in this format:**

   ```markdown
   # Context Scan Complete

   ## Summary
   - **Total Contexts Created**: X
   - **Total Files Covered**: Y
   - **Coverage**: Z% of codebase

   ## Contexts Created

   1. **Context Name** (N files)
      - Brief description
      - Key files: file1.ts, file2.tsx, ...

   2. **Context Name** (N files)
      - Brief description
      - Key files: file1.ts, file2.tsx, ...

   [... continue for all contexts ...]

   ## Files Not Included
   [List files that weren't included in any context and explain why]

   ## Recommended Next Steps
   - [ ] Review generated contexts for accuracy
   - [ ] Create context groups to organize related contexts
   - [ ] Add preview images for visual contexts
   - [ ] Link goals to relevant contexts
   ```

## Quality Requirements

1. **Coverage**: Aim to cover 80%+ of the codebase's meaningful files
2. **Balance**: Create 5-12 contexts depending on project size
3. **Uniqueness**: Each file in exactly ONE context
4. **Completeness**: Each context represents a complete feature or module
5. **Consistency**: All descriptions follow the exact structure specified
6. **Maintainability**: Future runs should UPDATE existing contexts, not duplicate them

## Handling Existing Contexts (Update Mode)

**This section applies when contexts already exist in the database.**

### Update Workflow

1. **Fetch existing contexts** (already done in Step 1)

2. **Analyze each existing context:**

   For each context, ask:
   - Are all listed files still in the codebase?
   - Are there new files that should be added?
   - Is the description still accurate?
   - Does the context still represent a cohesive feature?

3. **Make decisions:**

   **KEEP (No action needed):**
   - Context is up-to-date
   - All files exist and are correctly grouped
   - Description is accurate
   - **Action**: Do nothing, move to next context

   **UPDATE (Modify existing):**
   - Files need to be added/removed
   - Description needs updates
   - Context name needs refinement
   - **Action**: Use PUT endpoint
     ```bash
     curl -X PUT http://localhost:3000/api/contexts \
       -H "Content-Type: application/json" \
       -d '{
         "contextId": "<existing-context-id>",
         "updates": {
           "name": "Updated Context Name",
           "description": "## Overview\n...(maintain structure)...",
           "filePaths": [
             "src/updated/file1.tsx",
             "src/updated/file2.ts",
             "src/new/file3.ts"
           ]
         }
       }'
     ```

   **DELETE (Remove obsolete):**
   - Feature no longer exists in codebase
   - Context was incorrectly created
   - Files have been moved to other contexts
   - **Action**: Use DELETE endpoint
     ```bash
     curl -X DELETE "http://localhost:3000/api/contexts?contextId=<context-id>"
     ```

4. **Identify gaps:**
   - Find files not covered by any existing context
   - Identify new features added since last scan
   - Create NEW contexts for these (follow Step 5-7)

5. **Update summary:**
   In your final report, include:
   - Contexts kept (count)
   - Contexts updated (list with changes)
   - Contexts deleted (list with reasons)
   - New contexts created (list)

### Example Update Scenario

**Existing Context**: "Goals Management System"
- Files: `src/app/goals/page.tsx`, `src/hooks/useGoals.ts`, `src/lib/queries/goalQueries.ts`

**Analysis**:
- ✅ All files still exist
- ❌ New file added: `src/app/goals/GoalsDetailModal.tsx`
- ❌ Description missing new modal feature

**Action**: UPDATE
```bash
curl -X PUT http://localhost:3000/api/contexts \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "ctx_existing_123",
    "updates": {
      "filePaths": [
        "src/app/goals/page.tsx",
        "src/app/goals/GoalsDetailModal.tsx",
        "src/hooks/useGoals.ts",
        "src/lib/queries/goalQueries.ts"
      ],
      "description": "## Overview\nComprehensive goals management system with modal-based detail editing...\n\n[rest of description following structure]"
    }
  }'
```

## Important Notes

- **DO NOT ask for confirmation** - execute the scan automatically
- **DO NOT create markdown files** - contexts go directly to SQLite via API
- **DO use relative paths** - paths should be relative to project root
- **DO maintain structure consistency** - critical for automated parsing
- **DO analyze deeply** - use dependency analysis, not just folder structure
- **DO think about user value** - focus on features users interact with

## Begin Now

Start the context scan immediately. Follow all steps sequentially. Report progress as you go.
