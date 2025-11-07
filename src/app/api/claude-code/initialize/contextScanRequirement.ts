/**
 * Template for Claude Code context scan requirement file
 * This file generates a requirement that instructs Claude Code to scan a codebase
 * and create feature-based contexts stored in SQLite
 */

export interface ContextScanConfig {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectType?: 'nextjs' | 'fastapi' | 'other';
}

/**
 * Generate timestamp for file naming
 */
function generateTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Generate mission section
 */
function generateMissionSection(projectName: string, projectPath: string): string {
  return `## Your Mission

Analyze the **${projectName}** codebase at **${projectPath}** and create/update intelligent, structure-based contexts in the SQLite database.`;
}

/**
 * Generate project information section
 */
function generateProjectInfoSection(
  projectId: string,
  projectName: string,
  projectPath: string,
  projectType: string,
  timestamp: string
): string {
  return `## Project Information

- **Project ID**: ${projectId}
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}
- **Project Type**: ${projectType}
- **Scan Timestamp**: ${timestamp}`;
}

/**
 * Generate quick reference section
 */
function generateQuickReferenceSection(projectId: string, projectPath: string): string {
  return `## Quick Reference

**Always replace these placeholders:**
- \`PROJECT_ID\` → ${projectId}
- \`PROJECT_PATH\` → ${projectPath}`;
}

/**
 * Generate essential steps section
 */
function generateEssentialStepsSection(projectId: string, projectPath: string, timestamp: string, projectName: string): string {
  return `## Essential Steps

### 1. Check Existing Contexts

\`\`\`bash
curl -X GET "http://localhost:3000/api/contexts?projectId=${projectId}"
\`\`\`

### 2. Map Project Structure

\`\`\`bash
# List all structural folders
find "${projectPath}/src/app" -maxdepth 1 -type d -name "*-page" 2>/dev/null
find "${projectPath}/src/app/features" -maxdepth 1 -type d -name "sub_*" 2>/dev/null
\`\`\`

### 3. Read High-Level Architecture (Optional)

\`\`\`bash
cat "${projectPath}/context/high.md" 2>/dev/null || echo "No high-level architecture file found"
\`\`\`

### 4. Create and Store Contexts

Follow the skill instructions to create contexts using the API.

### 5. Generate Markdown Report (MANDATORY)

**After storing contexts in the database, you MUST create a summary report for debugging:**

\`\`\`bash
# Create docs/contexts directory
mkdir -p "${projectPath}/docs/contexts"

# Generate the report
cat > "${projectPath}/docs/contexts/scan-report-${timestamp}.md" << 'EOF'
# Context Scan Report

**Date**: ${timestamp}
**Project**: ${projectName}
**Project ID**: ${projectId}

## Execution Summary

| Metric | Value |
|--------|-------|
| Total Contexts | X |
| New Contexts Created | Y |
| Existing Contexts Updated | Z |
| Contexts Deleted | W |
| Total Files Covered | N |
| Coverage Percentage | M% |

## Created Contexts

| # | Context Name | Files | Database Status |
|---|--------------|-------|-----------------|
| 1 | Goals Page | 12 | ✓ Stored (ID: ctx_xxx) |
| 2 | Auth Module | 8 | ✓ Stored (ID: ctx_yyy) |

## Updated Contexts

| # | Context Name | Changes | Database Status |
|---|--------------|---------|-----------------|
| 1 | Project Dashboard | Added 2 files, removed 1 file | ✓ Updated |

## Deleted Contexts

| # | Context Name | Reason |
|---|--------------|--------|
| 1 | Old Feature | Feature removed from codebase |

## Detailed Context Information

### 1. Goals Page (12 files)
- **ID**: ctx_xxx
- **Status**: Created
- **Files**:
  - src/app/goals-page/page.tsx
  - src/app/goals-page/GoalsList.tsx
  - [... list all files ...]
- **Description Preview**: Overview of goals management feature...

### 2. Auth Module (8 files)
- **ID**: ctx_yyy
- **Status**: Created
- **Files**:
  - src/app/features/sub_auth/Login.tsx
  - [... list all files ...]

[Continue for all contexts...]

## Files Not Included in Any Context

- src/temp/test-file.ts (temporary test file)
- src/deprecated/old-component.tsx (deprecated)

## Verification

To verify contexts were saved:
\`\`\`bash
curl -X GET "http://localhost:3000/api/contexts?projectId=${projectId}"
\`\`\`

## Issues and Warnings

- ⚠️ Context "X" has 22 files (recommended: 10-20)
- ✓ All contexts follow description template
- ✓ No duplicate files across contexts

## Next Steps

- [ ] Review generated contexts in the UI
- [ ] Create context groups for better organization
- [ ] Link related goals to contexts
- [ ] Add preview images where applicable
EOF
\`\`\`

**This report is critical for debugging. It helps identify:**
- Contexts that were identified but not actually saved
- API errors during context creation
- Size and structure issues
- Coverage gaps`;
}

/**
 * Generate final output section
 */
function generateFinalOutputSection(projectPath: string, timestamp: string): string {
  return `## Final Output

After completing all steps and generating the markdown report:

1. Confirm all contexts were stored in the database
2. Provide a brief summary in your response
3. Mention the location of the detailed report

Example final message:

\`\`\`
Context scan complete!

Created 8 new contexts and updated 3 existing ones.
Total coverage: 156 files (87% of codebase)

Detailed report saved to:
${projectPath}/docs/contexts/scan-report-${timestamp}.md

All contexts verified in database.
\`\`\``;
}

/**
 * Generate a Claude Code requirement file content for context scanning
 */
export function generateContextScanRequirement(config: ContextScanConfig): string {
  const { projectId, projectName, projectPath, projectType = 'nextjs' } = config;
  const timestamp = generateTimestamp();

  return `# Context Scan and Generation

${generateMissionSection(projectName, projectPath)}

${generateProjectInfoSection(projectId, projectName, projectPath, projectType, timestamp)}

## How to Complete This Task

Use the Claude Code skill for detailed instructions:

\`\`\`
/context-scan-${projectType}
\`\`\`

This skill provides comprehensive guidance on:
- Checking existing contexts
- Mapping project structure
- Creating properly-sized contexts
- Using the required description template
- Updating existing contexts
- Quality validation

${generateQuickReferenceSection(projectId, projectPath)}

${generateEssentialStepsSection(projectId, projectPath, timestamp, projectName)}

${generateFinalOutputSection(projectPath, timestamp)}

## Important Notes

- Use the \`/context-scan-${projectType}\` skill for comprehensive guidance
- Generate the markdown report AFTER storing contexts (helps debug save issues)
- Follow the exact description template for consistency
- Respect folder boundaries to keep contexts manageable
- Update existing contexts when possible instead of creating duplicates
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
