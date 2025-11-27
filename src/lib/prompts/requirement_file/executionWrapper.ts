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
 * Implementation logging instructions - SIMPLIFIED to use direct API call
 */
function buildImplementationLogging(config: ExecutionWrapperConfig): string {
  const { projectId, contextId } = config;

  return `## Implementation Logging

After completing the implementation, log your work via a simple API call.

**DO NOT**:
- ❌ Create separate script files for logging
- ❌ Create SQL scripts or use sqlite3
- ❌ Create documentation files (.md, README.md)

**DO**: Make ONE API call to log your implementation:

\`\`\`bash
curl -X POST "http://localhost:3000/api/implementation-log" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "${projectId || '<project-id>'}",${contextId ? `
    "contextId": "${contextId}",` : ''}
    "requirementName": "<requirement-filename-without-.md>",
    "title": "<2-6 word summary>",
    "overview": "<1-2 paragraphs describing implementation>",
    "overviewBullets": "<bullet1>\\n<bullet2>\\n<bullet3>"
  }'
\`\`\`

**Field Guidelines**:
- \`requirementName\`: Requirement filename WITHOUT .md extension
- \`title\`: 2-6 words (e.g., "User Authentication System")
- \`overview\`: 1-2 paragraphs describing what was done
- \`overviewBullets\`: 3-5 key points separated by \\n

**Example**:
\`\`\`bash
curl -X POST "http://localhost:3000/api/implementation-log" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "proj-123",
    "requirementName": "implement-dark-mode",
    "title": "Dark Mode Implementation",
    "overview": "Implemented global dark mode toggle with theme persistence.",
    "overviewBullets": "Created ThemeProvider\\nUpdated components\\nAdded toggle in settings"
  }'
\`\`\`

**If the API call fails**: Report the error and continue - logging failures are non-blocking.`;
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
 * Git operations instructions - NON-BLOCKING
 */
function buildGitInstructions(config: ExecutionWrapperConfig): string {
  const { gitCommands, gitCommitMessage } = config;

  const defaultCommands = gitCommands || [
    'git add .',
    'git commit -m "{commitMessage}"',
    'git push'
  ];

  return `## Git Operations (NON-BLOCKING)

**IMPORTANT**: Git operations are NON-BLOCKING. If they fail, report the error and CONTINUE.
Do NOT let git failures prevent task completion.

**Execute AFTER all implementation and logging are complete**:

${defaultCommands.map((cmd, idx) => `${idx + 1}. \`${cmd}\``).join('\n')}

**Commit Message**: ${gitCommitMessage || 'Auto-commit: {requirementName}'}

**Error Handling** (all errors are non-blocking):
- Check \`git status\` first - if nothing to commit, skip and continue
- If commit fails → report error, continue to next step
- If push fails → try once: \`git pull --rebase && git push\`
- If push still fails → report "Git push failed" and CONTINUE (do not block)
- Authentication errors → report and continue (do not attempt to fix)
- Branch protection errors → report and continue

**Success**: Report "Git operations completed"
**Failure**: Report specific error, then continue with task completion`;
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
