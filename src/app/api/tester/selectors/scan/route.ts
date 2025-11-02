import { NextRequest, NextResponse } from 'next/server';
import { contextDb, testSelectorDb } from '@/app/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/tester/selectors/scan - Scan context files for data-testid and create requirement files
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, scanOnly = true } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'Context ID is required' },
        { status: 400 }
      );
    }

    // Get context details
    const context = contextDb.getContextById(contextId);
    if (!context) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    // Get existing selectors from DB
    const dbSelectors = testSelectorDb.getSelectorsByContext(contextId);
    const dbCount = dbSelectors.length;

    // Parse file paths
    const filePaths = JSON.parse(context.file_paths);

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'Context has no files' },
        { status: 400 }
      );
    }

    // Get project path from context (we need to fetch the project)
    const { getDatabase } = await import('@/app/db/connection');
    const db = getDatabase();
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(context.project_id) as any;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
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
        console.warn(`Failed to read file ${filepath}:`, error);
        // Continue with other files
      }
    }

    // Compare with DB selectors
    const dbTestids = new Set(dbSelectors.map(s => s.data_testid));
    const isDbOutdated = totalSelectors !== dbCount ||
                         ![...allTestidsInCode].every(tid => dbTestids.has(tid));

    console.log(`[SelectorsScan] Found ${totalSelectors} in code vs ${dbCount} in DB (outdated: ${isDbOutdated})`);

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
    const requirementName = `selectors-${context.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const requirementContent = buildRequirementContent(
      context.name,
      totalSelectors,
      dbCount,
      filePaths,
      selectorDetails,
      dbSelectors
    );

    const result = createRequirement(projectPath, requirementName, requirementContent);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create requirement file' },
        { status: 500 }
      );
    }

    console.log(`[SelectorsScan] ✅ Created requirement file: ${result.filePath}`);

    return NextResponse.json({
      success: true,
      contextId: context.id,
      contextName: context.name,
      totalSelectors,
      dbCount,
      requirementFile: result.filePath,
    });
  } catch (error) {
    console.error('Failed to scan for selectors:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan for selectors',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
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
  dbSelectors: Array<{ id: string; data_testid: string; title: string; filepath: string }>
): string {
  const timestamp = new Date().toISOString();

  let content = `# Test Selector Coverage for "${contextName}"

**Context:** ${contextName}
**Generated:** ${timestamp}
**Current Selectors in Code:** ${totalSelectors}
**Selectors in Database:** ${dbCount}
**Database Status:** ${totalSelectors === dbCount ? '✅ Up to date' : '⚠️ Outdated - needs sync'}
**Files:** ${filePaths.length}

## Objective

Improve test automation coverage by adding comprehensive \`data-testid\` attributes to interactive elements in the "${contextName}" context.

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

### 1. Prevent Duplicates
Before adding any new \`data-testid\` attribute:
- Check the "Database Test Selectors" section above
- If the \`data-testid\` already exists in the database table, **DO NOT add it again**
- You can reuse existing \`data-testid\` values from the database in your code

### 2. Save New Selectors to Database
After adding new \`data-testid\` attributes to the code:
- Call the API endpoint: \`POST /api/tester/selectors\`
- For each NEW selector you add, make a request with:
  \`\`\`json
  {
    "contextId": "${contextName.toLowerCase().replace(/[^a-z0-9]/g, '-')}",
    "dataTestid": "the-testid-value",
    "title": "Brief description (1-4 words)",
    "filepath": "relative/path/to/file.tsx"
  }
  \`\`\`
- Title examples: "Save goal", "Delete item", "Open modal", "Submit form"

### 3. Implementation Workflow
1. Review existing selectors in database (see table above)
2. Add new \`data-testid\` attributes to code (avoid duplicates)
3. Save each new selector to database via API call
4. Verify no duplicates were created

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

## Success Criteria

- [ ] All interactive elements have appropriate \`data-testid\` attributes
- [ ] Selectors follow the naming convention
- [ ] Selectors are documented in Context Preview Manager
- [ ] No duplicate \`data-testid\` values within the same view

## Notes

- Focus on user-facing interactive elements first
- Group related selectors with common prefixes (e.g., \`goal-modal-*\`)
- Consider future E2E test scenarios when naming selectors
`;

  return content;
}
