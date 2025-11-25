/**
 * Execution Prompt Wrapper
 * Wraps requirement content with execution instructions for Claude Code
 *
 * This wrapper provides consistent execution instructions across all requirement types:
 * - Ideas from tinder accept
 * - Manager-generated plans
 * - Manual requirements
 */

export interface ExecutionWrapperConfig {
  requirementContent: string;
  projectPath: string;
  projectId?: string;
  contextId?: string;
  projectPort?: number;
  runScript?: string;
  gitEnabled?: boolean;
  gitCommands?: string[];
  gitCommitMessage?: string;
}

/**
 * Wrap requirement content with execution instructions
 */
export function wrapRequirementForExecution(config: ExecutionWrapperConfig): string {
  const { requirementContent, projectPath, projectId, contextId, projectPort, runScript, gitEnabled, gitCommands, gitCommitMessage } = config;

  return `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

REQUIREMENT TO EXECUTE NOW:

${requirementContent}

${buildExecutionInstructions(config)}

Begin implementation now.`;
}

/**
 * Build execution instructions section
 */
function buildExecutionInstructions(config: ExecutionWrapperConfig): string {
  const sections: string[] = [];

  // Core implementation guidelines
  sections.push(buildCoreGuidelines());

  // File structure guidelines
  sections.push(buildFileStructureGuidelines());

  // Test selectors
  sections.push(buildTestSelectorsGuidelines());

  // Theming
  sections.push(buildThemingGuidelines());

  // Documentation policy
  sections.push(buildDocumentationPolicy());

  // Implementation logging
  sections.push(buildImplementationLogging(config));

  // Screenshot capture (if context exists)
  if (config.contextId) {
    sections.push(buildScreenshotInstructions(config));
  }

  // Git operations (if enabled)
  if (config.gitEnabled) {
    sections.push(buildGitInstructions(config));
  }

  // Final checklist
  sections.push(buildFinalChecklist(config));

  return sections.join('\n\n');
}

/**
 * Core implementation guidelines
 */
function buildCoreGuidelines(): string {
  return `## Implementation Guidelines

**IMPORTANT**: Execute the requirement immediately without asking for confirmation or approval.

**Steps**:
1. Analyze the requirement thoroughly
2. Identify all files that need to be modified or created
3. Implement all changes specified in the requirement
4. Follow implementation steps precisely
5. Run any tests if specified
6. Ensure all changes are complete before finishing`;
}

/**
 * File structure guidelines for Next.js/React
 */
function buildFileStructureGuidelines(): string {
  return `## File Structure (Next.js/React Projects)

**Feature-Specific Files** (use \`app/features/<feature>\` structure):
- \`app/features/<feature>/components/\` - Feature-specific components and UI
- \`app/features/<feature>/lib/\` - Feature-specific functions, utilities, helpers
- \`app/features/<feature>/\` - Main wrapper, index, or page file

**Reusable UI Components** (use \`app/components/ui\` structure):
- \`app/components/ui/\` - Shared, reusable UI elements across multiple features`;
}

/**
 * Test selectors guidelines
 */
function buildTestSelectorsGuidelines(): string {
  return `## Test Selectors

**CRITICAL**: Add \`data-testid\` attributes to ALL interactive UI components for automated testing.

**Guidelines**:
- Add to all clickable elements (buttons, links, icons)
- Use descriptive kebab-case: \`data-testid="submit-form-btn"\`
- Include component context: \`data-testid="goal-delete-btn"\`, \`data-testid="project-settings-modal"\`
- Add to form inputs: \`data-testid="email-input"\`
- Add to list items: \`data-testid="task-item-123"\`

**Example**:
\`\`\`tsx
<button onClick={handleSubmit} data-testid="create-goal-btn">
  Create Goal
</button>

<input
  type="text"
  value={title}
  onChange={handleChange}
  data-testid="goal-title-input"
/>
\`\`\``;
}

/**
 * Theming guidelines
 */
function buildThemingGuidelines(): string {
  return `## Theming and Styling

**Before creating new UI components**:
1. Examine existing components in the project
2. Match the color scheme, spacing, and visual patterns
3. Use consistent className patterns (Tailwind CSS)
4. Follow the app's design language (glassmorphism, gradients, shadows, etc.)
5. Support dark mode if the app uses it`;
}

/**
 * Documentation policy - CRITICAL to prevent over-documentation
 */
function buildDocumentationPolicy(): string {
  return `## Documentation Policy

**CRITICAL RULE**: Do NOT create separate documentation files (.md, README.md, docs/) for routine implementations.

**Only create documentation when**:
- Implementing a NEW major feature or module (not refactorings)
- Adding a NEW API or public interface
- Creating NEW architectural patterns
- The requirement explicitly asks for documentation

**Do NOT create documentation for**:
- Bug fixes
- Refactorings
- Small adjustments
- UI changes
- Database schema changes
- Performance improvements
- Code quality improvements

**For all implementations**: Create an implementation log entry (see next section) - this is your primary documentation.`;
}

/**
 * Implementation logging instructions - SIMPLIFIED and CLEAR
 */
function buildImplementationLogging(config: ExecutionWrapperConfig): string {
  const { projectId, contextId } = config;

  return `## Implementation Logging

**CRITICAL**: After completing the implementation, create ONE log entry using the implementation-log repository.

**DO NOT**:
- ❌ Create standalone SQL scripts
- ❌ Create separate logging files
- ❌ Insert SQL directly into project databases
- ❌ Use \`sqlite3\` commands

**DO**:
- ✅ Use the repository function directly in a simple Node.js script
- ✅ Run the script once to create the log entry
- ✅ Delete the script after execution

**Step 1**: Create a simple logging script

\`\`\`typescript
// create-log.ts (or create-log.mjs with import syntax)
import { implementationLogDb } from '@/app/db';
import { randomUUID } from 'crypto';

implementationLogDb.createLog({
  id: randomUUID(),
  project_id: '${projectId || '<project-id>'}',${contextId ? `\n  context_id: '${contextId}',` : ''}
  requirement_name: '<requirement-file-name-without-.md>',
  title: '<2-6 words describing what was done>',
  overview: '<1-2 paragraphs: What was implemented, key files modified/created, major functionality added>',
  overview_bullets: '<bullet1>\\n<bullet2>\\n<bullet3>',
  tested: false,${contextId ? `\n  screenshot: null, // Will be populated if screenshot succeeds` : ''}
});

console.log('✅ Implementation log created');
\`\`\`

**Step 2**: Run the script

\`\`\`bash
npx tsx create-log.ts
# or
node create-log.mjs
\`\`\`

**Step 3**: Delete the script

\`\`\`bash
rm create-log.ts
# or del create-log.ts on Windows
\`\`\`

**Field Guidelines**:
- \`id\`: Use \`randomUUID()\` or \`crypto.randomUUID()\`
- \`requirement_name\`: Requirement filename WITHOUT .md extension
- \`title\`: 2-6 words (e.g., "User Authentication System")
- \`overview\`: 1-2 paragraphs describing what was done
- \`overview_bullets\`: 3-5 bullets separated by \\n (e.g., "Added OAuth flow\\nCreated auth context\\nUpdated login UI")
- \`tested\`: Always \`false\` initially

**Example**:
\`\`\`typescript
implementationLogDb.createLog({
  id: randomUUID(),
  project_id: 'proj-123',
  requirement_name: 'implement-dark-mode',
  title: 'Dark Mode Implementation',
  overview: 'Implemented global dark mode toggle with theme persistence. Added theme context provider, updated all UI components to support dark mode, and created settings panel for theme switching.',
  overview_bullets: 'Created ThemeProvider context\\nUpdated 25+ components with dark mode styles\\nAdded theme toggle in settings\\nImplemented localStorage persistence',
  tested: false
});
\`\`\``;
}

/**
 * Screenshot capture instructions (only if context exists)
 */
function buildScreenshotInstructions(config: ExecutionWrapperConfig): string {
  const { contextId, projectPort, runScript } = config;

  return `## Screenshot Capture (Context-Related Only)

**Workflow**:

### Step 1: Check if Test Scenario Exists

\`\`\`bash
curl -X POST "http://localhost:3000/api/tester/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"${contextId}","scanOnly":true}'
\`\`\`

**If \`hasScenario: false\`**: Skip all remaining screenshot steps. Set \`screenshot: null\` in log.

### Step 2: Start Dev Server (ONLY if scenario exists)

${projectPort && runScript ? `
\`\`\`bash
${runScript} &
SERVER_PID=$!
sleep 8

# Verify server is running
if ! curl -I http://localhost:${projectPort} 2>/dev/null; then
  echo "❌ Server failed - check if your implementation broke the build"
  # Fix bugs if related to your changes, then retry
  # Otherwise continue without screenshot (screenshot: null)
fi
\`\`\`
` : 'Start your development server manually (e.g., \`npm run dev\`)'}

### Step 3: Capture Screenshot

\`\`\`bash
curl -X POST "http://localhost:3000/api/tester/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"${contextId}"}'
\`\`\`

### Step 4: Stop Server (CRITICAL)

${projectPort ? `
\`\`\`bash
kill $SERVER_PID 2>/dev/null || true
sleep 2
# Force kill if still running
kill -9 $(lsof -ti:${projectPort}) 2>/dev/null || true
\`\`\`
` : 'Stop your development server'}

### Step 5: Update Log with Screenshot Path

Use the \`screenshotPath\` from API response in your log creation:

\`\`\`typescript
screenshot: screenshotPath || null
\`\`\`

**Error Handling**:
- No scenario → \`screenshot: null\`
- Server fails (unrelated to your code) → \`screenshot: null\`
- Server fails (your bugs) → Fix bugs, retry, then screenshot
- Screenshot API fails → \`screenshot: null\`
- **Always stop the server** to free the port for next task`;
}

/**
 * Git operations instructions
 */
function buildGitInstructions(config: ExecutionWrapperConfig): string {
  const { gitCommands, gitCommitMessage } = config;

  const defaultCommands = gitCommands || [
    'git add .',
    'git commit -m "{commitMessage}"',
    'git push'
  ];

  return `## Git Operations

**Execute AFTER all implementation and logging tasks are complete**:

${defaultCommands.map((cmd, idx) => `${idx + 1}. \`${cmd}\``).join('\n')}

**Commit Message**: ${gitCommitMessage || 'Auto-commit: {requirementName}'}

**Error Handling**:
- Check \`git status\` before committing
- If nothing to commit, report and continue
- If push rejected, fetch and rebase: \`git fetch && git rebase origin/main\`
- Do not attempt to fix authentication or bypass branch protection`;
}

/**
 * Final checklist
 */
function buildFinalChecklist(config: ExecutionWrapperConfig): string {
  const { contextId, gitEnabled } = config;

  return `## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Test IDs added to interactive components
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created${contextId ? '\n- [ ] Screenshot captured (if test scenario exists)' : ''}${gitEnabled ? '\n- [ ] Git operations executed' : ''}
- [ ] NO separate documentation files created (unless new major feature)`;
}
