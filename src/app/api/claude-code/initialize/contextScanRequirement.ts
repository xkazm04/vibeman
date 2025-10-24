/**
 * Template for Claude Code context scan requirement file
 * This file generates a requirement that instructs Claude Code to scan a codebase
 * and create feature-based contexts stored in SQLite
 *
 * UPDATED APPROACH (Structure-Based):
 * - Uses enforced Next.js structure (src/app/*-page, features/sub_*, etc.)
 * - Creates contexts based on folder boundaries (10-20 files each)
 * - Each page folder = 1 context
 * - Each subfeature folder = 1 context
 * - Prevents large, unwieldy contexts by respecting structural boundaries
 * - Strict size enforcement: 10-20 files (5-25 acceptable with warning)
 */

export interface ContextScanConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
}

/**
 * Generate a Claude Code requirement file content for context scanning
 */
export function generateContextScanRequirement(config: ContextScanConfig): string {
  const { projectId, projectName, projectPath } = config;

  return `# Context Scan and Generation

## Your Mission

You are tasked with analyzing the codebase at **${projectPath}** and creating intelligent, **structure-based** contexts that will be stored in the SQLite database. This is not a one-time task - you will be called again to update contexts as the codebase evolves.

**NEW APPROACH**: Use the project's folder structure as natural context boundaries. Each \`*-page\` folder becomes a context, each \`sub_*\` subfeature becomes a context. This ensures contexts stay small (10-20 files) and focused.

## Project Information

- **Project ID**: ${projectId}
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}

## Step-by-Step Instructions

### Step 1: Check for Existing Contexts

**CRITICAL FIRST STEP**: Before creating any new contexts, check if this project already has contexts in the database.

Fetch existing contexts from the database:

\`\`\`bash
curl -X GET "http://localhost:3000/api/contexts?projectId=${projectId}"
\`\`\`

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

\`\`\`bash
cat "${projectPath}/context/high.md"
\`\`\`

If this file doesn't exist, that's okay - proceed to the next step. This file provides important context about:
- Application overview and purpose
- Technical stack
- Feature inventory by domain
- Code organization patterns
- Architectural patterns

### Step 3: Map Project Structure (CRITICAL - DO THIS FIRST!)

**Before creating ANY contexts**, create a complete structural map:

#### 3.1 List All Structural Folders

Run these commands and document the output:

\`\`\`bash
# List all page folders
find "${projectPath}/src/app" -maxdepth 1 -type d -name "*-page" 2>/dev/null

# List all subfeatures
find "${projectPath}/src/app/features" -maxdepth 1 -type d -name "sub_*" 2>/dev/null

# List feature-level folders
ls -d "${projectPath}/src/app/features"/*/ 2>/dev/null | grep -v "sub_"

# List API resource folders
ls -d "${projectPath}/src/app/api"/*/ 2>/dev/null

# List lib subfolders
ls -d "${projectPath}/src/lib"/*/ 2>/dev/null
\`\`\`

#### 3.2 Create Context Plan

**Before creating contexts, plan them out:**

For each structural folder found above, determine:
1. **Folder name** (e.g., \`goals-page\`, \`sub_auth\`)
2. **Estimated file count** (run \`find <folder> -type f | wc -l\`)
3. **Context name** (user-friendly name)
4. **Context scope** (what it includes)

**Output a table like this:**

| Structure Path | File Count | Context Name | Status |
|----------------|------------|--------------|--------|
| src/app/goals-page | 12 | Goals Management Page | Will create |
| src/app/features/sub_auth | 8 | Authentication Module | Will create |
| src/app/features/sub_monitoring | 25 | Monitoring Module | Too large - will split |

**If any folder has >25 files**, plan to split it into smaller contexts based on sub-functionality.
**If any folder has <5 files**, consider merging with related folder or creating as mini-context.

### Step 4: Understand Project Structure Details

**Review the structural organization identified in Step 3:**

#### 4.1 Verify Next.js Structure
Determine if the project follows the enforced Next.js structure:

\`\`\`bash
# Check if src/ folder exists
ls -la "${projectPath}/src"

# Check structure under src/app
ls -la "${projectPath}/src/app"

# Look for features and subfeatures
ls -la "${projectPath}/src/app/features"
\`\`\`

**Key structure patterns to identify:**
- **src/app/*-page/**: Page-level features (e.g., \`goals-page\`, \`coder-page\`)
- **src/app/features/**: Shared feature components and logic
- **src/app/features/sub_*/**: Subfeatures (nested one level deep)
- **src/app/api/**: API routes organized by resource

#### 4.2 Structure-Guided Context Boundaries

**Use the project structure to define context boundaries:**

1. **Page-Level Contexts** (\`src/app/*-page/\`):
   - Each \`*-page\` folder = ONE context
   - Include ALL files within that page folder
   - Include related API routes (e.g., \`src/app/api/goals/\` for \`goals-page\`)
   - Include dependencies from \`src/lib/\`, \`src/hooks/\`, etc.
   - Target: 10-20 files per page context

2. **Feature Contexts** (\`src/app/features/\`):
   - Top-level feature folders = ONE context each
   - Example: \`src/app/features/components/\` could be "Shared UI Components"
   - Target: 8-15 files per feature context

3. **Subfeature Contexts** (\`src/app/features/sub_*/\`):
   - **EACH subfeature = SEPARATE context** (this prevents large contexts!)
   - Example: \`src/app/features/sub_auth/\` = "Authentication Module"
   - Example: \`src/app/features/sub_monitoring/\` = "Monitoring Module"
   - Include only files within that subfeature folder
   - Target: 5-12 files per subfeature context

4. **API Contexts** (\`src/app/api/\`):
   - Group by API resource (e.g., \`/api/goals\`, \`/api/contexts\`)
   - One context per major API domain
   - Target: 3-8 files per API context

5. **Shared Library Contexts** (\`src/lib/\`, \`src/stores/\`):
   - Group by functional domain
   - Example: "Database Layer", "State Management", "Process Management"
   - Target: 8-15 files per library context

**IMPORTANT RULE**: Respect structure boundaries! Don't mix files from different \`sub_*\` folders or different \`*-page\` folders into the same context.

#### 4.3 Dependency Analysis (Optional - Use Sparingly)
Apply dependency analysis to group contexts from parent to children:

**For each major entry point (pages, API routes):**
1. Identify the root file (e.g., \`src/app/goals/page.tsx\`)
2. Use the file-dependencies API to trace its import chain:
   \`\`\`bash
   curl -X POST http://localhost:3000/api/file-dependencies \\
     -H "Content-Type: application/json" \\
     -d '{
       "filePath": "<absolute-path-to-file>",
       "projectPath": "${projectPath}",
       "maxDepth": 3
     }'
   \`\`\`

   **IMPORTANT - Windows File Paths:**
   - On Windows, use forward slashes (/) OR properly escape backslashes (\\\\)
   - Example: \`"filePath": "C:/Users/project/src/file.ts"\` (preferred)
   - Or: \`"filePath": "C:\\\\Users\\\\project\\\\src\\\\file.ts"\`
   - If you encounter JSON parsing errors, ensure all backslashes are doubled
3. Group the file and its dependencies together (parent → children pattern)
4. Include files across all depths (UI → Services → Database)

**Example dependency chain:**
- Parent: \`src/app/goals/page.tsx\` (UI)
  - Child: \`src/hooks/useGoals.ts\` (Hook)
    - Grandchild: \`src/lib/queries/goalQueries.ts\` (Database)
    - Grandchild: \`src/app/api/goals/route.ts\` (API)

All these files would form ONE context: "Goals Management System"

**NOTE**: Dependency analysis should only be used when structure-based boundaries are insufficient. Always prefer structural boundaries first!

#### 4.4 Naming Pattern Recognition
- Find files with consistent prefixes/suffixes within the same structural boundary
- Example: Within \`goals-page/\`: \`GoalsList.tsx\`, \`GoalsDetailModal.tsx\`, \`GoalsFilters.tsx\`
- Group related files by naming patterns BUT respect folder boundaries

#### 4.5 Data Flow Mapping
- Trace data flow: UI Component → API Endpoint → Database Query
- Group files that operate on the same data entities
- Example: All files working with "goals" data belong together
- **BUT**: Keep page-specific UI separate from shared libraries

#### 4.6 Business Domain Clustering
- **Focus on user-facing capabilities, not technical layers**
- Group by WHAT users can accomplish, not HOW it's implemented
- Example: "Project Management" not "React Components and APIs"
- **Use folder structure as domain indicators**

### Step 5: Context Size Guidelines (STRICT ENFORCEMENT)

**Target**: 10-20 files per context (strictly enforced)
**Minimum**: 5 files (contexts with fewer files should be merged)
**Maximum**: 25 files (contexts with more files MUST be split)

**Ideal context structure (feature-based):**
- 1-3 UI components (pages, layouts, components)
- 1-2 API routes (if applicable)
- 1-2 Service/Library files (business logic)
- 1-2 Database/Query files (data layer)
- 1-2 Type/Schema files
- 1-2 Hook files (if using React hooks)
- Supporting files (utilities, helpers)

**Each file should appear in EXACTLY ONE context** - no duplicates across contexts.

### Step 6: Create Structure-Based Contexts

**Context examples organized by structure type:**

**Page-Level Contexts** (from \`src/app/*-page/\`):
- "Goals Management Page" (12 files)
  - Files: \`src/app/goals-page/page.tsx\`, \`GoalsList.tsx\`, \`GoalDetailModal.tsx\`, related hooks, API routes
  - Scope: Complete goals page with all UI components and backend

- "Code Editor Page" (15 files)
  - Files: \`src/app/coder-page/page.tsx\`, Monaco integration, file tree, context panel
  - Scope: Code editing interface with file management

- "Projects Dashboard Page" (10 files)
  - Files: \`src/app/projects-page/page.tsx\`, project cards, status monitoring
  - Scope: Project overview and management interface

**Subfeature Contexts** (from \`src/app/features/sub_*/\`):
- "Authentication Module" (8 files)
  - Files: \`src/app/features/sub_auth/\` folder contents
  - Scope: Login, session management, auth guards

- "Monitoring Module" (10 files)
  - Files: \`src/app/features/sub_monitoring/\` folder contents
  - Scope: Real-time event tracking and health checks

- "File Upload Module" (6 files)
  - Files: \`src/app/features/sub_upload/\` folder contents
  - Scope: File upload, validation, storage

**Feature-Level Contexts** (from \`src/app/features/\`):
- "Shared UI Components" (12 files)
  - Files: \`src/app/features/components/\` folder
  - Scope: Reusable buttons, modals, forms, etc.

- "Feature Utilities" (7 files)
  - Files: \`src/app/features/lib/\` folder
  - Scope: Shared feature logic and helpers

**API Contexts** (from \`src/app/api/\`):
- "Goals API" (5 files)
  - Files: \`src/app/api/goals/route.ts\` and related handlers
  - Scope: CRUD operations for goals resource

- "Contexts API" (6 files)
  - Files: \`src/app/api/contexts/route.ts\` and related handlers
  - Scope: Context management endpoints

**Shared Library Contexts** (from \`src/lib/\`, \`src/stores/\`):
- "Database Layer" (10 files)
  - Files: \`src/lib/database.ts\`, migration files, query builders
  - Scope: SQLite operations and schema management

- "State Management" (8 files)
  - Files: All Zustand stores from \`src/stores/\`
  - Scope: Global state and persistence

**CRITICAL RULES:**
- **NEVER mix \`sub_*\` folders** - Each subfeature is its own context
- **NEVER mix \`*-page\` folders** - Each page is its own context
- **KEEP contexts between 10-20 files** - Split if larger, merge if smaller
- **ONE feature = ONE context** - Use folder boundaries as context boundaries

### Step 7: Description Structure (CRITICAL)

**Each context description MUST follow this exact structure:**

\`\`\`markdown
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
| \`path/to/file1.tsx\` | [Short description] | UI |
| \`path/to/file2.ts\` | [Short description] | Service |
| \`path/to/file3.ts\` | [Short description] | Data |

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
\`\`\`

**CONSISTENCY IS CRITICAL**: Every context you create (now and in future updates) MUST follow this exact structure. This enables automated parsing and ensures quality.

### Step 8: Store Contexts in SQLite

**Use the Contexts API to store each context:**

For each context you create:

\`\`\`bash
curl -X POST http://localhost:3000/api/contexts \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId}",
    "groupId": null,
    "name": "Feature Name Here",
    "description": "## Overview\\n[markdown description following the structure above]",
    "filePaths": [
      "src/path/to/file1.tsx",
      "src/path/to/file2.ts",
      "src/path/to/file3.ts"
    ]
  }'
\`\`\`

**Important field requirements:**
- \`projectId\`: Always use "${projectId}"
- \`groupId\`: Leave as null (contexts will be ungrouped initially)
- \`name\`: Short feature title (e.g., "Goals Management System")
- \`description\`: Full markdown description following the structure above
- \`filePaths\`: Array of relative paths from project root (use forward slashes)

**DO NOT include these fields** (they are auto-generated or deprecated):
- \`id\` - Auto-generated by the database
- \`context_file_path\` - Deprecated, no longer used
- \`has_context_file\` - Deprecated, no longer used
- \`preview\` - Leave empty

### Step 9: Quality Check (MANDATORY)

**Before finalizing, verify EVERY context meets these requirements:**

For each context you created, check:

1. **Size validation**:
   - ✅ Has 10-20 files (ideal)
   - ⚠️ Has 5-9 files (acceptable, but consider merging)
   - ⚠️ Has 21-25 files (acceptable, but consider splitting)
   - ❌ Has <5 files (MUST merge with related context)
   - ❌ Has >25 files (MUST split into smaller contexts)

2. **Structure compliance**:
   - ✅ Respects folder boundaries (doesn't mix \`sub_*\` or \`*-page\` folders)
   - ✅ Follows structure-based naming
   - ✅ Groups related functionality

3. **Description quality**:
   - ✅ Follows the exact structure template
   - ✅ Includes component breakdown table
   - ✅ Documents data flow
   - ✅ Lists dependencies

**If any context fails validation:**
- **Too small (<5 files)**: Merge with related context or expand scope
- **Too large (>25 files)**: Split into 2-3 smaller contexts
- **Mixed folders**: Separate into individual contexts per folder
- **Poor description**: Rewrite following template

**DO NOT proceed to Step 10 until ALL contexts pass validation!**

### Step 10: Verification and Output

After ALL contexts pass quality check:

1. **Verify all contexts were created successfully:**
   \`\`\`bash
   curl -X GET "http://localhost:3000/api/contexts?projectId=${projectId}"
   \`\`\`

2. **Provide a summary in this format:**

   \`\`\`markdown
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
   \`\`\`

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
     \`\`\`bash
     curl -X PUT http://localhost:3000/api/contexts \\
       -H "Content-Type: application/json" \\
       -d '{
         "contextId": "<existing-context-id>",
         "updates": {
           "name": "Updated Context Name",
           "description": "## Overview\\n...(maintain structure)...",
           "filePaths": [
             "src/updated/file1.tsx",
             "src/updated/file2.ts",
             "src/new/file3.ts"
           ]
         }
       }'
     \`\`\`

   **DELETE (Remove obsolete):**
   - Feature no longer exists in codebase
   - Context was incorrectly created
   - Files have been moved to other contexts
   - **Action**: Use DELETE endpoint
     \`\`\`bash
     curl -X DELETE "http://localhost:3000/api/contexts?contextId=<context-id>"
     \`\`\`

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
- Files: \`src/app/goals/page.tsx\`, \`src/hooks/useGoals.ts\`, \`src/lib/queries/goalQueries.ts\`

**Analysis**:
- ✅ All files still exist
- ❌ New file added: \`src/app/goals/GoalsDetailModal.tsx\`
- ❌ Description missing new modal feature

**Action**: UPDATE
\`\`\`bash
curl -X PUT http://localhost:3000/api/contexts \\
  -H "Content-Type: application/json" \\
  -d '{
    "contextId": "ctx_existing_123",
    "updates": {
      "filePaths": [
        "src/app/goals/page.tsx",
        "src/app/goals/GoalsDetailModal.tsx",
        "src/hooks/useGoals.ts",
        "src/lib/queries/goalQueries.ts"
      ],
      "description": "## Overview\\nComprehensive goals management system with modal-based detail editing...\\n\\n[rest of description following structure]"
    }
  }'
\`\`\`

## Important Notes

- **DO NOT ask for confirmation** - execute the scan automatically
- **DO NOT create markdown files** - contexts go directly to SQLite via API
- **DO use relative paths** - paths should be relative to project root
- **DO maintain structure consistency** - critical for automated parsing
- **DO analyze deeply** - use dependency analysis, not just folder structure
- **DO think about user value** - focus on features users interact with

## Begin Now

Start the context scan immediately. Follow all steps sequentially. Report progress as you go.
`;
}

/**
 * Generate the requirement file name
 */
export function getContextScanRequirementFileName(): string {
  return 'scan-contexts.md';
}

/**
 * Get the requirement file description for display in UI
 */
export function getContextScanRequirementDescription(): string {
  return 'Analyze the codebase and generate intelligent feature-based contexts stored in SQLite';
}
