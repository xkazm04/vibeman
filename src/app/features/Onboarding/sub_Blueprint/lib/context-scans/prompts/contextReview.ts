/**
 * Context Review Prompt Template
 * Generates Claude Code requirement for intelligent context review and maintenance
 */

interface ImplementationLog {
  id: string;
  requirement_name: string;
  title: string;
  overview: string;
  created_at: string;
}

interface ContextReviewPromptParams {
  contextId: string;
  contextName: string;
  contextDescription: string;
  filePaths: string[];
  projectPath: string;
  projectPort: number;
  fileCount: number;
  updatedAt: string;
  untestedLogs: ImplementationLog[];
}

export function contextReviewPrompt(params: ContextReviewPromptParams): string {
  const {
    contextId,
    contextName,
    contextDescription,
    filePaths,
    projectPath,
    projectPort,
    fileCount,
    updatedAt,
    untestedLogs,
  } = params;

  const untestedLogsSection = untestedLogs.length > 0
    ? `
## Recent Untested Implementation Changes

The following implementation logs have **not been tested** and may have affected files in this context:

${untestedLogs.map((log, idx) => `
### ${idx + 1}. ${log.title}
- **Requirement**: \`${log.requirement_name}\`
- **Created**: ${new Date(log.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
- **Overview**: ${log.overview}
`).join('\n')}

**NOTE**: These changes provide context about recent modifications that may have introduced new files or made existing files obsolete.

---
`
    : '';

  return `# Context Review Task

## Objective

Review and update the context "${contextName}" to ensure it accurately reflects the current codebase state. Focus on detecting dead files, discovering new files, and optionally splitting if the context has grown too large.

## Current Context Information

**Context ID**: \`${contextId}\`
**Name**: ${contextName}
**Description**: ${contextDescription}
**Total Files**: ${fileCount}
**Last Updated**: ${updatedAt}
**Project Path**: \`${projectPath}\`
**Project Port**: ${projectPort} (use \`http://localhost:${projectPort}\` for test scenarios)

## Files in Current Context

\`\`\`
${filePaths.map((fp, idx) => `${idx + 1}. ${fp}`).join('\n')}
\`\`\`

---

${untestedLogsSection}

## Instructions

### Step 1: Verify File Existence (PRIMARY TASK)

**Objective**: Ensure all files in the context still exist and identify any that have been deleted or moved.

1. **Check each file** in the context to verify it exists at the specified path
2. **Identify dead files**: Create a list of files that no longer exist
3. **Search for moved files**: If a file is missing, search the codebase for files with the same name but different paths

**Dead Files Detection**:
\`\`\`bash
# For each file in the context, check if it exists
test -f "<file-path>" && echo "EXISTS" || echo "DEAD: <file-path>"
\`\`\`

### Step 2: Discover New Related Files (PRIMARY TASK)

**Objective**: Find new files that should be included in this context but are missing.

1. **Analyze context purpose**: Based on the context name, description, and existing files, identify the functional area this context covers
2. **Search for related files**: Look for files that:
   - Are in the same directory as existing context files
   - Have similar naming patterns (e.g., same prefix, related feature names)
   - Import or are imported by files in the context
   - Serve the same functional purpose
${untestedLogs.length > 0 ? '   - Were mentioned in recent untested implementation changes\n' : ''}
3. **Filter candidates**: Only suggest files that are clearly related and belong to the same feature/module

**File Discovery Approaches**:
- Check directories containing context files for new additions
- Search for files importing/imported by context files
- Look for files with similar naming conventions
${untestedLogs.length > 0 ? '- Review files mentioned in untested implementation logs\n' : ''}

### Step 3: Generate Comprehensive Context Description (PRIMARY TASK)

**Objective**: Create or improve the context description using best practices.

${contextDescription === 'No description provided' || !contextDescription
  ? '⚠️ **This context currently has NO description or a placeholder description.**'
  : 'ℹ️ **Review the existing description and improve it based on actual file contents.**'
}

**Description Best Practices** (follow these exactly):

1. **Purpose Statement** (1-2 sentences)
   - What is the PRIMARY functional area this context covers?
   - What problem does it solve or what feature does it implement?

2. **Key Components** (bullet points)
   - List 3-5 main components/modules with brief explanations
   - Focus on WHAT each does, not implementation details

3. **Architectural Role** (1 sentence)
   - Where does this fit in the larger system?
   - What other contexts/modules does it interact with?

4. **Technical Notes** (optional, 1-2 points)
   - Key technologies or patterns used
   - Important design decisions or constraints

**Example Format**:
\`\`\`
Manages user authentication and session handling across the application.
Provides secure login, logout, token management, and permission checking.

Key Components:
- AuthProvider: React context for authentication state
- useAuth hook: Access current user and auth methods
- AuthGuard: Route protection component
- Token service: JWT token management and refresh

Integrates with the API layer for auth endpoints and the user management context
for profile data. Uses httpOnly cookies for secure session storage.
\`\`\`

**Generation Steps**:
1. Read ALL files in the context to understand what they do
2. Identify the common purpose/feature they implement
3. Write a description following the format above
4. Keep it concise but informative (aim for 100-200 words)

### Step 4: Generate/Update Screenshot Test Scenario (PRIMARY TASK - FOR UI FEATURES ONLY)

**Objective**: Create or update the test scenario for screenshot capture if this context includes UI components.

**When to generate/update:**
- ✅ Context includes page.tsx, layout.tsx, or major UI components
- ✅ Context represents a user-facing feature with visible UI
- ❌ Context is purely backend/API (skip this step)
- ❌ Context is utility/helper code (skip this step)

**Purpose**: Test scenarios are used ONLY for taking screenshots of the UI feature. They are NOT functional tests—they simply navigate to where the feature can be seen.

**Test Scenario Format** (JSON array stored as string):

\`\`\`json
[
  { "type": "navigate", "url": "http://localhost:${projectPort}" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='menu-item']" },
  { "type": "wait", "delay": 1500 }
]
\`\`\`

**Step-by-Step Guide:**

1. **Determine if UI feature**:
   - Check if context includes page.tsx, layout.tsx, or UI components
   - If NO UI files → skip test scenario (set to null)
   - If YES → continue to step 2

2. **Identify the feature route**:
   - Look at context files to find the route (e.g., \`src/app/goals/page.tsx\` → route is \`/goals\`)
   - Check if it's a direct route or requires navigation through UI

3. **Analyze navigation path**:
   - **Direct route**: Navigate directly to \`http://localhost:${projectPort}/route\`
   - **Nested/modal**: Find parent page and navigation elements
   - Search codebase for:
     - Navigation components (sidebar, menu, header)
     - \`data-testid\` attributes on buttons/links
     - Layout files with navigation

4. **Build the scenario**:

   **Example 1 - Direct route** (Goals page):
   \`\`\`json
   [
     { "type": "navigate", "url": "http://localhost:${projectPort}/goals" },
     { "type": "wait", "delay": 3000 }
   ]
   \`\`\`

   **Example 2 - Menu navigation** (Goals via sidebar):
   \`\`\`json
   [
     { "type": "navigate", "url": "http://localhost:${projectPort}" },
     { "type": "wait", "delay": 3000 },
     { "type": "click", "selector": "[data-testid='sidebar-goals']" },
     { "type": "wait", "delay": 2000 }
   ]
   \`\`\`

   **Example 3 - Modal/Component** (Add Goal modal):
   \`\`\`json
   [
     { "type": "navigate", "url": "http://localhost:${projectPort}/goals" },
     { "type": "wait", "delay": 3000 },
     { "type": "click", "selector": "[data-testid='add-goal-btn']" },
     { "type": "wait", "delay": 1500 }
   ]
   \`\`\`

**Valid step types:**
- \`navigate\`: \`{ "type": "navigate", "url": "http://localhost:${projectPort}/path" }\`
- \`wait\`: \`{ "type": "wait", "delay": 3000 }\` (milliseconds)
- \`click\`: \`{ "type": "click", "selector": "[data-testid='id']" }\`

**Selector Guidelines:**
- ✅ Use \`data-testid\` attributes: \`[data-testid='element-id']\`
- ✅ Search codebase for existing data-testid values
- ❌ Avoid CSS class selectors (they may change)

**Wait Times:**
- After navigation: 2000-3000ms
- After clicks: 1000-1500ms
- For slow features: 3000-5000ms

---

### Step 5: Update Context in Database (PRIMARY TASK)

**Objective**: Update the context with cleaned file list, improved description, AND test scenario.

**IMPORTANT**: Use the **repository pattern** or **curl** to avoid fetch API issues in Node.js.

**Option A: Using Repository (Recommended)**

\`\`\`typescript
import { contextRepository } from '@/app/db/repositories/context.repository';

// Prepare updates
const updates = {
  file_paths: [/* Updated file paths array */],
  description: \`/* Generated description following best practices */\`,
  test_scenario: \`/* Stringified JSON array or null */\`,
};

// Update context via repository
const updated = contextRepository.updateContext('${contextId}', updates);

if (updated) {
  console.log('✅ Context updated successfully!');
  console.log('Context ID: ${contextId}');
  console.log('Files updated:', updates.file_paths.length);
  console.log('Description length:', updates.description.length);
  console.log('Test scenario:', updates.test_scenario ? 'Generated' : 'Not applicable');
} else {
  console.error('❌ Failed to update context');
}
\`\`\`

**Option B: Using curl (Alternative)**

\`\`\`bash
curl -X PUT "http://localhost:3000/api/contexts" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"${contextId}","updates":{"file_paths":["src/file1.tsx","src/file2.ts"],"description":"## Overview...","test_scenario":"[{\\"type\\":\\"navigate\\"}]"}}'
\`\`\`

**Update Logic**:
1. **Remove** all dead/moved files from \`file_paths\` array
2. **Add** new discovered files that belong to this context
3. **Generate/Update description** following the format in Step 3 (ALWAYS DO THIS)
4. **Generate/Update test_scenario** if UI feature (following Step 4 format)

**CRITICAL**:
- ✅ **Use Option A (repository)** - More reliable and type-safe
- ❌ **DO NOT use fetch() directly** - It's not available in Node.js .js files without imports

---

### Step 6: Evaluate Context Size (SECONDARY TASK)

**Objective**: Determine if the context should be split into smaller, more focused contexts.

${fileCount > 10
  ? `⚠️ **Current file count (${fileCount}) exceeds recommended maximum of 10 files per context.**\n\nConsider splitting if:`
  : `ℹ️ **Current file count (${fileCount}) is within recommended range.**\n\nOnly consider splitting if:`
}

1. Files serve **distinctly different purposes** (e.g., API layer + UI components mixed together)
2. Files can be grouped into **2+ logical feature sets** with minimal cross-dependencies
3. Splitting would **improve clarity** without creating artificial boundaries

**✅ DO Split If**:
- Context mixes unrelated concerns (e.g., authentication + payments)
- Clear feature boundaries exist (e.g., user-profile vs user-settings)
- File count is high (>15 files) and logical groupings are obvious

**❌ DON'T Split If**:
- Files are tightly coupled and work together closely
- Splitting would create contexts with only 1-3 files
- No clear logical boundaries exist

### Step 7: Create Split Contexts (OPTIONAL - Only if Step 6 recommends splitting)

If splitting is justified, follow the separator scan pattern:

**Principles**:
- Group files by feature/functionality
- Keep related files together (components + hooks + utilities)
- Each context should have **max 10 files**
- Maintain logical boundaries

**Steps**:
1. **Update existing context** with the first group of files (max 10)
2. **Create new contexts** for remaining groups using:

\`\`\`typescript
fetch('/api/contexts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: '/* Use same project ID */',
    name: '/* Descriptive name for new context */',
    description: '/* Clear description */',
    filePaths: [/* File paths for this group (max 10) */],
    groupId: null,
  }),
});
\`\`\`

---

### Step 8: Refactor Codebase for Split Contexts (REQUIRED - When Step 7 was executed)

**IMPORTANT**: If you created split contexts in Step 7, you MUST refactor the codebase to organize files into proper folder structure.

**Objective**: Organize split contexts into subfolders with the \`sub_\` prefix and ensure files are properly modularized.

#### 8.1: Identify Main Context Folder

1. **Find the main feature folder** that contains files from the original context
   - Example: If context has files from \`src/app/features/Goals/\`, the main folder is \`Goals/\`
   - This is typically the highest common parent directory of all context files

2. **Determine the main context** (the one that represents the core/primary functionality)
   - Usually the context with the most fundamental files or entry point
   - This context's files stay in the main folder

#### 8.2: Create Subfolders for Sub-Contexts

For each **new split context** (NOT the main context):

1. **Choose a descriptive name** based on the context purpose
   - Examples: "ImplementationLogs", "GoalModal", "Analytics"
   - Keep it concise (1-3 words max)

2. **Create subfolder with \`sub_\` prefix**:
   \`\`\`bash
   mkdir -p "<main-context-folder>/sub_<SubContextName>"
   \`\`\`

   **Examples**:
   - Main: \`src/app/features/Goals/\`
   - Sub-context: \`src/app/features/Goals/sub_ImplementationLogs/\`
   - Sub-context: \`src/app/features/Goals/sub_GoalModal/\`

3. **Move files to subfolder**:
   \`\`\`bash
   # Move each file from the sub-context into the subfolder
   mv "<original-path>" "<main-context-folder>/sub_<SubContextName>/<filename>"
   \`\`\`

#### 8.3: Review and Modularize Large Files (CRITICAL)

For **each file** in the sub-context folder:

1. **Count the lines**:
   \`\`\`bash
   wc -l "<file-path>"
   \`\`\`

2. **If file has > 200 lines**, you MUST refactor it into smaller modules:

   **Refactoring Strategy**:
   - **Extract components**: Move sub-components to separate files
   - **Extract utilities**: Move helper functions to \`utils.ts\` or specific utility files
   - **Extract types**: Move type definitions to \`types.ts\`
   - **Extract hooks**: Move custom hooks to separate files
   - **Extract constants**: Move constants to \`constants.ts\`

   **Example - Refactoring a 350-line component**:

   **Before**:
   \`\`\`
   sub_GoalModal/
     GoalModal.tsx (350 lines)
   \`\`\`

   **After**:
   \`\`\`
   sub_GoalModal/
     GoalModal.tsx (120 lines - main component)
     GoalForm.tsx (80 lines - extracted form component)
     GoalValidation.tsx (60 lines - extracted validation logic)
     useGoalSubmit.ts (50 lines - extracted custom hook)
     types.ts (40 lines - type definitions)
   \`\`\`

3. **Keep each file under 200 lines** after refactoring
   - Aim for 100-150 lines for better maintainability
   - Only exceed 200 if splitting would harm code clarity

4. **Update imports** in all files that reference the refactored code:
   \`\`\`typescript
   // Update paths to reflect new structure
   import { GoalModal } from '@/app/features/Goals/sub_GoalModal/GoalModal';
   \`\`\`

#### 8.4: Update Context File Paths

After refactoring, **update all affected contexts** with new file paths:

\`\`\`typescript
// Update main context
fetch('/api/contexts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextId: '<main-context-id>',
    updates: {
      filePaths: [
        // Updated paths for main context files
        'src/app/features/Goals/GoalsLayout.tsx',
        'src/app/features/Goals/GoalsList.tsx',
        // ... other main files
      ],
    },
  }),
});

// Update each sub-context with new paths (including any files created during modularization)
fetch('/api/contexts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextId: '<sub-context-id>',
    updates: {
      filePaths: [
        'src/app/features/Goals/sub_ImplementationLogs/ImplementationLogList.tsx',
        'src/app/features/Goals/sub_ImplementationLogs/ImplementationLogCard.tsx',
        'src/app/features/Goals/sub_ImplementationLogs/useImplementationLogs.ts',
        'src/app/features/Goals/sub_ImplementationLogs/types.ts',
        // ... all files in this sub-context
      ],
    },
  }),
});
\`\`\`

**Refactoring Checklist**:
- [ ] Main context files remain in main folder
- [ ] Each sub-context has its own \`sub_<Name>\` subfolder
- [ ] All files in subfolders are ≤ 200 lines (preferably 100-150)
- [ ] Large files have been split into focused modules
- [ ] All imports updated to reflect new paths
- [ ] All contexts updated in database with new file paths
- [ ] Code still compiles and runs without errors

**Example Complete Structure**:
\`\`\`
src/app/features/Goals/
├── GoalsLayout.tsx                    # Main context
├── GoalsList.tsx                      # Main context
├── GoalsHeader.tsx                    # Main context
├── sub_ImplementationLogs/            # Sub-context folder
│   ├── ImplementationLogList.tsx      # 145 lines
│   ├── ImplementationLogCard.tsx      # 98 lines
│   ├── useImplementationLogs.ts       # 67 lines
│   └── types.ts                       # 34 lines
└── sub_GoalModal/                     # Sub-context folder
    ├── GoalModal.tsx                  # 120 lines
    ├── GoalForm.tsx                   # 80 lines
    ├── GoalValidation.tsx             # 60 lines
    ├── useGoalSubmit.ts               # 50 lines
    └── types.ts                       # 40 lines
\`\`\`

---

## Expected Outcome

### Primary Outcomes (REQUIRED):
✅ All dead/moved files removed from context
✅ New related files discovered and added to context
✅ **Comprehensive description generated/updated following best practices**
✅ **Screenshot test scenario generated/updated and saved to \`contexts.test_scenario\` column** (for UI features only)
   - Test scenario is a JSON array string stored in the database
   - Format: \`[{"type":"navigate","url":"..."},{"type":"wait","delay":3000}]\`
   - Used for automated screenshot capture via Playwright
✅ Context file list is accurate and up-to-date
✅ Database updated with cleaned file list, improved description, AND test scenario

### Secondary Outcomes (OPTIONAL - only if needed):
✅ Context split into smaller, focused contexts if size/scope warrants it
✅ **Codebase refactored with \`sub_<Name>\` subfolders** (when contexts are split)
✅ **All files modularized to ≤ 200 lines** (preferably 100-150 lines)
✅ **All imports updated** to reflect new file structure
✅ **All contexts updated in database** with new file paths after refactoring
✅ All contexts have clear, descriptive names
✅ Logical organization maintained

---

## Implementation Priority

1. **FIRST**: Focus on Steps 1-5 (file verification, description generation, test scenario, and updates)
   - Step 3 (description generation) is CRITICAL - do not skip this!
   - Step 4 (test scenario) is CRITICAL for UI features - analyze navigation paths carefully
   - Step 5 (database update) must include test_scenario in the updates object
2. **THEN**: Consider Steps 6-7 (splitting) only if clearly beneficial
3. **IF SPLITTING**: Step 8 (refactoring) is MANDATORY when contexts are split
   - Create \`sub_<Name>\` subfolders for each new context
   - Ensure all files are ≤ 200 lines
   - Update imports and context file paths
4. **ALWAYS**: Preserve file relationships and logical boundaries
5. **QUALITY**: Description should be comprehensive, not just a one-liner
6. **TEST SCENARIOS**: Must start from homepage with correct port and navigate to feature
7. **CODE ORGANIZATION**: Maintain clean folder structure with proper modularization

---

**Begin the context review now. Prioritize accuracy over completeness—it's better to be conservative than to make incorrect changes.**
`;
}
