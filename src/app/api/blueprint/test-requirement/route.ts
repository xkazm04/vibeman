import { NextRequest, NextResponse } from 'next/server';
import { contextDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Build test requirement content with context analysis
 */
async function buildTestRequirementContent(
  contextId: string,
  projectId: string
): Promise<string> {
  // Get context from database
  const context = contextDb.getContextById(contextId);
  if (!context) {
    throw new Error('Context not found');
  }

  // Get project details
  const project = projectDb.getProject(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // Parse file paths
  const filePaths: string[] = JSON.parse(context.file_paths);

  // Read context files content
  const fileContents: Array<{ path: string; content: string }> = [];
  for (const filePath of filePaths.slice(0, 10)) {  // Limit to first 10 files
    try {
      const fullPath = join(project.path, filePath);
      const content = await readFile(fullPath, 'utf-8');
      fileContents.push({
        path: filePath,
        content: content.slice(0, 3000), // Limit to 3000 chars per file
      });
    } catch {
      // Skip files that can't be read
    }
  }

  // Check for existing test scenario
  const existingScenario = context.test_scenario || null;

  // Check for existing selectors
  let selectorInfo = '';
  try {
    const response = await fetch(`http://localhost:${project.port || 3000}/api/tester/selectors/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId,
        projectId,
        scanOnly: true,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        selectorInfo = `
## Existing Test Selectors

Found **${result.totalSelectors}** data-testid attributes in the context:
- **Database Count**: ${result.dbCount}
- **Status**: ${result.isDbOutdated ? '⚠️ Database outdated' : '✅ Up to date'}
`;
      }
    }
  } catch {
    // Continue without selector info
  }

  // Build requirement content
  let requirementContent = `# Automated Test Generation and Execution

## Objective
Analyze the **${context.name}** context, build Playwright test scripts, execute tests, and generate a comprehensive test report with issues found.

## Context Information
- **Context Name**: ${context.name}
- **Context ID**: ${contextId}
- **Description**: ${context.description || 'No description provided'}
- **Project**: ${project.name}
- **Project Type**: ${project.type || 'unknown'}
- **Dev Server**: http://localhost:${project.port || 3000}
- **Files in Context**: ${filePaths.length}

${selectorInfo}

`;

  // Add existing scenario if available
  if (existingScenario) {
    requirementContent += `## Existing Test Scenario

The context already has a test scenario:

\`\`\`json
${existingScenario}
\`\`\`

**Note**: Review and enhance this scenario if needed, or create new test cases.

`;
  }

  // Add file contents
  if (fileContents.length > 0) {
    requirementContent += `## Context Files\n\n`;
    requirementContent += `The following files are part of this context:\n\n`;

    for (const file of fileContents) {
      requirementContent += `### ${file.path}\n\n`;
      requirementContent += `\`\`\`typescript\n${file.content}\n\`\`\`\n\n`;
    }

    if (filePaths.length > fileContents.length) {
      requirementContent += `\n*...and ${filePaths.length - fileContents.length} more file(s).*\n\n`;
    }
  }

  // Add task instructions
  requirementContent += `## Task Instructions

### Phase 1: Environment Setup & Diagnostics

1. **Run Diagnostic Check**
   \`\`\`bash
   curl http://localhost:${project.port || 3000}/api/tester/diagnostic
   \`\`\`

   Verify:
   - ✅ Dev server is running
   - ✅ Chromium browser is installed
   - ✅ Screenshot directory exists

   **If any check fails:**
   - Dev server: Make sure the project is running
   - Chromium: Run \`npx playwright install chromium\`

### Phase 2: Test Scenario Analysis & Creation

2. **Analyze Context Files**
   - Review all component files in the context
   - Identify user interactions: buttons, forms, links, navigation
   - Find all \`data-testid\` attributes for reliable selectors
   - Map out the user flow through the UI

3. **Create/Update Test Scenario**
   Create a comprehensive test scenario in JSON format:

   \`\`\`json
   {
     "name": "${context.name} Test Suite",
     "steps": [
       {
         "action": "navigate",
         "url": "/path-to-page",
         "description": "Navigate to the page"
       },
       {
         "action": "waitForSelector",
         "selector": "[data-testid='component-id']",
         "description": "Wait for component to load"
       },
       {
         "action": "click",
         "selector": "[data-testid='button-id']",
         "description": "Click action button"
       },
       {
         "action": "fill",
         "selector": "[data-testid='input-id']",
         "value": "test value",
         "description": "Fill input field"
       },
       {
         "action": "screenshot",
         "name": "after-interaction",
         "description": "Capture state"
       }
     ]
   }
   \`\`\`

   **Supported Actions:**
   - \`navigate\`: Go to URL
   - \`click\`: Click element
   - \`fill\`: Fill form field
   - \`waitForSelector\`: Wait for element to appear
   - \`screenshot\`: Take screenshot
   - \`wait\`: Wait for duration (ms)

4. **Save Test Scenario**
   Update the context in database with the test scenario:
   \`\`\`bash
   # Use the contexts API to update test_scenario column
   curl -X PUT http://localhost:${project.port || 3000}/api/contexts/${contextId} \\
     -H "Content-Type: application/json" \\
     -d '{"test_scenario": "<JSON_SCENARIO>"}'
   \`\`\`

### Phase 3: Test Execution

5. **Check Context Status**
   \`\`\`bash
   curl "http://localhost:${project.port || 3000}/api/tester/screenshot?contextId=${contextId}"
   \`\`\`

6. **Execute Test**
   \`\`\`bash
   curl -X POST http://localhost:${project.port || 3000}/api/tester/screenshot \\
     -H "Content-Type: application/json" \\
     -d '{"contextId": "${contextId}"}'
   \`\`\`

   **Expected Response:**
   \`\`\`json
   {
     "success": true,
     "contextId": "${contextId}",
     "contextName": "${context.name}",
     "screenshotPath": "/screenshots/${contextId}/test-YYYY-MM-DD.png",
     "duration": 2500
   }
   \`\`\`

7. **Analyze Results**
   - Check if test passed (\`success: true\`)
   - Review screenshot at the returned path
   - Note any errors or failures

### Phase 4: Test Report Generation

8. **Create Test Report Requirement**

   Create a new Claude Code requirement file: \`test-report-${contextId}.md\`

   Include the following sections:

   #### Summary
   - Context name
   - Test execution date/time
   - Overall status (Passed/Failed)
   - Duration
   - Screenshot path

   #### Test Cases Executed
   List each test step with status:
   \`\`\`
   1. ✅ Navigate to /dashboard
   2. ✅ Wait for header component
   3. ❌ Click settings button (selector not found)
   4. ⏭️  Fill preferences form (skipped due to previous failure)
   \`\`\`

   #### Issues Found
   Document all issues discovered:
   \`\`\`markdown
   ### Issue 1: Missing Test Selector
   - **Severity**: High
   - **Component**: SettingsButton.tsx
   - **Description**: Button has no data-testid attribute
   - **Expected**: \`data-testid="settings-button"\`
   - **Current**: Only has className
   - **Impact**: Cannot reliably select element for testing
   - **Suggested Fix**: Add \`data-testid="settings-button"\` to line 45

   ### Issue 2: Broken Navigation Link
   - **Severity**: Medium
   - **Component**: Sidebar.tsx
   - **Description**: Link points to non-existent route
   - **Expected**: \`/dashboard/settings\`
   - **Current**: \`/settings\` (404)
   - **Impact**: Navigation test fails
   - **Suggested Fix**: Update href in Sidebar.tsx:32
   \`\`\`

   #### Struggles & Process Improvements
   Document challenges encountered:
   \`\`\`markdown
   ### Struggles
   1. **Selector Instability**: Component uses dynamic class names that change between builds
      - Impact: Tests fail intermittently
      - Learning: Always use data-testid for stable selectors

   2. **Async Loading Issues**: Modal took 3+ seconds to appear
      - Impact: Test timeout on first attempt
      - Learning: Need longer default timeout for modals

   3. **Environment Setup**: Had to troubleshoot Chromium installation
      - Impact: 5min delay before tests could run
      - Learning: Pre-flight diagnostic check is crucial

   ### Improvement Suggestions
   1. **Pre-Scan Validation**: Check all selectors exist before running tests
   2. **Selector Coverage Report**: Generate report of components missing test selectors
   3. **Visual Diff Tool**: Compare screenshots across test runs to detect visual regressions
   4. **Retry Logic**: Automatically retry failed steps once before marking as failed
   5. **Parallel Testing**: Run multiple contexts in parallel to speed up test suite
   \`\`\`

   #### Files Analyzed
   List all files that were part of the test:
   - ${filePaths.map(fp => `\`${fp}\``).join('\n   - ')}

   #### Next Steps
   - [ ] Fix identified issues (do NOT implement fixes in this task)
   - [ ] Re-run tests after fixes
   - [ ] Add missing test selectors
   - [ ] Expand test coverage

## Output Requirements

1. **Test Scenario**: Save to context database
2. **Test Execution**: Run via API and capture results
3. **Test Report**: Create Claude Code requirement file with:
   - Summary of test run
   - List of all test cases performed (with status)
   - Detailed list of issues found
   - Process struggles and improvement suggestions
   - Next steps (without implementing fixes)

## Success Criteria

- ✅ Test scenario created and saved
- ✅ Test executed successfully (or failed with clear error)
- ✅ Screenshot captured
- ✅ Comprehensive test report generated
- ✅ Issues documented with severity and location
- ✅ Struggles and improvements documented
- ✅ Report saved as requirement file in \`.claude/commands/test-report-${contextId}.md\`

## Important Notes

- **DO NOT** fix code issues found during testing
- **DO** document all issues thoroughly
- **DO** provide actionable suggestions
- **DO** note struggles for pipeline improvement
- **DO** include screenshot paths in report
- **DO** use curl commands to interact with APIs

🤖 Generated by Blueprint Test Scan
`;

  return requirementContent;
}

/**
 * POST /api/blueprint/test-requirement
 * Builds test requirement content with context analysis
 */
export async function POST(request: NextRequest) {
  try {
    const { contextId, projectId } = await request.json();

    if (!contextId || !projectId) {
      return NextResponse.json(
        { error: 'contextId and projectId are required' },
        { status: 400 }
      );
    }

    // Build requirement content
    const requirementContent = await buildTestRequirementContent(
      contextId,
      projectId
    );

    return NextResponse.json({
      success: true,
      requirementContent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build requirement content',
      },
      { status: 500 }
    );
  }
}
