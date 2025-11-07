import { NextRequest, NextResponse } from 'next/server';
import { contextDb, testSelectorDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * Helper to create error response
 */
function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

/**
 * POST /api/tester/selectors/scan - Scan context files for data-testid and create requirement files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, projectId, scanOnly = true } = body;

    if (!contextId) {
      return errorResponse('Context ID is required', 400);
    }

    if (!projectId) {
      return errorResponse('Project ID is required', 400);
    }

    // Get context details
    const context = contextDb.getContextById(contextId);
    if (!context) {
      return errorResponse('Context not found', 404);
    }

    // Get existing selectors from DB
    const dbSelectors = testSelectorDb.getSelectorsByContext(contextId);
    const dbCount = dbSelectors.length;

    // Parse file paths
    const filePaths = JSON.parse(context.file_paths);

    if (filePaths.length === 0) {
      return errorResponse('Context has no files', 400);
    }

    // Get project using projectDb connector
    const project = projectDb.getProject(projectId);

    if (!project) {
      // List all projects to debug
      const allProjects = projectDb.getAllProjects();

      return errorResponse('Project not found', 404, {
        receivedProjectId: projectId,
        availableProjects: allProjects.map(p => ({ id: p.id, name: p.name }))
      });
    }

    const projectPath = project.path;

    // Count data-testid occurrences and extract actual testid values
    let totalSelectors = 0;
    const selectorDetails: Array<{ filepath: string; count: number; testids: string[] }> = [];
    const allTestidsInCode = new Set<string>();

    for (const filepath of filePaths) {
      try {
        const fullPath = join(projectPath, filepath);
        const content = readFileSync(fullPath, 'utf-8');

        // Extract data-testid values (both single and double quotes)
        const singleQuoteMatches = content.match(/data-testid='([^']*)'/g) || [];
        const doubleQuoteMatches = content.match(/data-testid="([^"]*)"/g) || [];
        const allMatches = [...singleQuoteMatches, ...doubleQuoteMatches];

        const testids: string[] = [];
        allMatches.forEach(match => {
          const testid = match.replace(/data-testid=["']([^"']+)["']/, '$1');
          testids.push(testid);
          allTestidsInCode.add(testid);
        });

        const count = testids.length;

        if (count > 0) {
          totalSelectors += count;
          selectorDetails.push({ filepath, count, testids });
        }
      } catch (error) {
        // Failed to read file, continue with other files
      }
    }

    // Compare with DB selectors
    const dbTestids = new Set(dbSelectors.map(s => s.data_testid));
    const isDbOutdated = totalSelectors !== dbCount ||
                         ![...allTestidsInCode].every(tid => dbTestids.has(tid));

    // If scanOnly, return results
    if (scanOnly) {
      return NextResponse.json({
        success: true,
        contextId: context.id,
        contextName: context.name,
        totalSelectors,
        dbCount,
        isDbOutdated,
        filePaths,
        selectorDetails,
      });
    }

    // Create Claude Code requirement file
    const requirementName = `test-selectors-${context.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const requirementContent = buildRequirementContent(
      context.name,
      totalSelectors,
      dbCount,
      filePaths,
      selectorDetails,
      dbSelectors,
      contextId,
      context.test_scenario
    );

    const result = createRequirement(projectPath, requirementName, requirementContent);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to create requirement file', 500);
    }

    return NextResponse.json({
      success: true,
      contextId: context.id,
      contextName: context.name,
      totalSelectors,
      dbCount,
      requirementFile: result.filePath,
    });
  } catch (error) {
    return errorResponse(
      'Failed to scan for selectors',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Build requirement file content for test selector coverage
 */
function buildRequirementContent(
  contextName: string,
  totalSelectors: number,
  dbCount: number,
  filePaths: string[],
  selectorDetails: Array<{ filepath: string; count: number; testids: string[] }>,
  dbSelectors: Array<{ id: string; data_testid: string; title: string; filepath: string }>,
  contextId: string,
  existingScenario: string | null
): string {
  const timestamp = new Date().toISOString();

  let content = `# Test Selector Coverage for "${contextName}"

**Context:** ${contextName}
**Context ID:** ${contextId}
**Generated:** ${timestamp}
**Current Selectors in Code:** ${totalSelectors}
**Selectors in Database:** ${dbCount}
**Database Status:** ${totalSelectors === dbCount ? '✅ Up to date' : '⚠️ Outdated - needs sync'}
**Files:** ${filePaths.length}

## Objective

Improve test automation coverage by adding comprehensive \`data-testid\` attributes to interactive elements in the "${contextName}" context, and create/update a test scenario for automated screenshot testing.

## Database Test Selectors (Current State)

`;

  if (dbCount === 0) {
    content += `⚠️ **No selectors in database yet.** All newly added selectors must be saved to the database.

`;
  } else {
    content += `The following ${dbCount} test selectors are currently tracked in the database:

| data-testid | Title | File |
|-------------|-------|------|
`;
    dbSelectors.forEach(s => {
      const filename = s.filepath.split('/').pop() || s.filepath;
      content += `| \`${s.data_testid}\` | ${s.title} | \`${filename}\` |\n`;
    });
    content += '\n';
  }

  content += `## Code Analysis

`;

  if (totalSelectors === 0) {
    content += `No \`data-testid\` attributes found in any files. This context needs complete test selector coverage.

`;
  } else {
    content += `Found ${totalSelectors} \`data-testid\` attributes in code across ${selectorDetails.length} files:

`;
    selectorDetails.forEach(({ filepath, count, testids }) => {
      const filename = filepath.split('/').pop() || filepath;
      content += `- \`${filename}\`: ${count} selector${count > 1 ? 's' : ''}\n`;
      testids.forEach(tid => {
        content += `  - \`${tid}\`\n`;
      });
    });
    content += '\n';
  }

  content += `## Files to Update

`;
  filePaths.forEach(filepath => {
    content += `- ${filepath}\n`;
  });

  content += `
## Database Management Requirements

**CRITICAL:** This context uses a database to track test selectors. You MUST follow these rules:

### 1. Prevent Duplicates - MANDATORY CHECK

Before adding any new \`data-testid\` attribute to the code:

**Step 1: Query Existing Selectors**
\`\`\`bash
curl -X GET "http://localhost:3000/api/tester/selectors?contextId=${contextId}"
\`\`\`

This will return a JSON array of existing selectors. Example response:
\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "selector_123",
      "dataTestid": "save-goal-button",
      "title": "Save Goal",
      "filepath": "src/app/goals/GoalForm.tsx"
    }
  ]
}
\`\`\`

**Step 2: Check for Duplicates**
- Parse the response and extract all \`dataTestid\` values
- Before adding a new \`data-testid\` to the code, verify it's NOT in the existing list
- If it exists, you can reuse it in your code but **DO NOT** call the POST API again

**Step 3: Track New Selectors**
- Keep a list of all NEW \`data-testid\` values you add to the code
- Only these new ones should be saved to the database

### 2. Save New Selectors to Database

After adding new \`data-testid\` attributes to the code:
- Call the API endpoint: \`POST /api/tester/selectors\`
- **ONLY** for selectors that were NOT in the GET response
- For each NEW selector you add, make a request with:
  \`\`\`json
  {
    "contextId": "${contextId}",
    "dataTestid": "the-new-testid-value",
    "title": "Brief description (1-4 words)",
    "filepath": "relative/path/to/file.tsx"
  }
  \`\`\`
- Title examples: "Save goal", "Delete item", "Open modal", "Submit form"

### 3. Implementation Workflow

1. **Query database**: GET /api/tester/selectors?contextId=${contextId}
2. **Review existing selectors**: Parse response and note all existing \`dataTestid\` values
3. **Add new \`data-testid\` attributes**: Only add new ones not in the database
4. **Save to database**: POST each NEW selector to /api/tester/selectors
5. **Verify**: Query again to confirm no duplicates were created

## Code Requirements

1. **Add \`data-testid\` attributes** to all interactive elements:
   - Buttons (including icon buttons)
   - Links and navigation elements
   - Form inputs (text, select, checkbox, radio)
   - Modals and dialogs
   - Tabs and accordion components
   - Dropdown menus
   - Cards and clickable containers

2. **Naming Convention:**
   - Use kebab-case: \`data-testid="action-object"\`
   - Be descriptive: \`data-testid="save-goal-button"\`
   - Include context: \`data-testid="goal-modal-close-button"\`
   - For lists: \`data-testid="goal-item-{index}"\` or \`data-testid="goal-item-{id}"\`

3. **Examples:**
   \`\`\`tsx
   <button data-testid="submit-form-button" onClick={handleSubmit}>
     Submit
   </button>

   <input data-testid="email-input" type="email" {...} />

   <div data-testid="user-card-{user.id}" onClick={...}>
     {user.name}
   </div>
   \`\`\`

4. **Testing Integration:**
   - After adding selectors, update the test scenario in Context Preview Manager
   - Document key user flows and interactions
   - Ensure selectors are unique within each component

## Test Scenario Generation

**CRITICAL:** After adding \`data-testid\` attributes, you MUST create or update a test scenario for automated screenshot testing.

### Current Test Scenario

`;

  if (existingScenario && existingScenario.trim()) {
    content += `An existing test scenario is defined for this context:

\`\`\`
${existingScenario}
\`\`\`

**Task**: Review the existing scenario and determine if it needs updates based on:
- New selectors you've added
- Changes to the UI or user flows
- Missing steps or navigation paths

If updates are needed, revise the scenario. If it's still accurate, you can keep it as-is.

`;
  } else {
    content += `⚠️ **No test scenario exists yet.** You must create one.

`;
  }

  content += `### Scenario Requirements

The test scenario should:
1. **Navigate to the feature**: Start from \`http://localhost:3000\` and describe how to reach this feature
2. **Interact with key elements**: Use the \`data-testid\` selectors you've added
3. **Capture UI state**: End with the feature in a representative state for screenshot
4. **Be Playwright-compatible**: Use clear, actionable steps that Playwright can execute

### Scenario Format

Write the scenario as numbered steps using this format:

\`\`\`
1. Navigate to http://localhost:3000
2. Click on [data-testid="navigation-item"] to open the [Feature] page
3. Wait for [data-testid="feature-container"] to be visible
4. Click on [data-testid="action-button"] to trigger [action]
5. Wait for [data-testid="result-element"] to appear
6. The page should now show [expected UI state]
\`\`\`

### Example Scenarios

**Goals Management Context:**
\`\`\`
1. Navigate to http://localhost:3000
2. Click on [data-testid="goals-nav-link"] to open Goals page
3. Wait for [data-testid="goals-list"] to be visible
4. Click on [data-testid="create-goal-btn"] to open the goal creation modal
5. Wait for [data-testid="goal-modal"] to appear
6. The create goal modal should be visible and ready for input
\`\`\`

**Context Preview Context:**
\`\`\`
1. Navigate to http://localhost:3000
2. Click on [data-testid="contexts-nav-link"]
3. Wait for [data-testid="context-list"] to be visible
4. Click on the first context card [data-testid="context-card-0"]
5. Wait for [data-testid="context-preview-panel"] to appear
6. The context preview should display with file tree and description
\`\`\`

### Save Test Scenario to Database

After writing or updating the scenario, save it using the contexts API:

\`\`\`bash
curl -X PUT http://localhost:3000/api/contexts \\
  -H "Content-Type: application/json" \\
  -d '{
    "contextId": "${contextId}",
    "updates": {
      "test_scenario": "1. Navigate to http://localhost:3000\\n2. Click on [data-testid=\\"...\"]\\n..."
    }
  }'
\`\`\`

**Important:**
- Escape newlines as \`\\n\` in the JSON
- Escape double quotes inside the scenario steps
- Only include the \`test_scenario\` field in \`updates\`

## Success Criteria

- [ ] All interactive elements have appropriate \`data-testid\` attributes
- [ ] Selectors follow the naming convention
- [ ] All new selectors saved to database (no duplicates)
- [ ] Test scenario created or updated and saved to database
- [ ] Scenario navigates from http://localhost:3000 to the feature
- [ ] Scenario uses the new \`data-testid\` selectors
- [ ] No duplicate \`data-testid\` values within the same view

## Notes

- Focus on user-facing interactive elements first
- Group related selectors with common prefixes (e.g., \`goal-modal-*\`)
- Consider future E2E test scenarios when naming selectors
- Test scenarios should be maintainable and reflect actual user flows
`;

  return content;
}
