/**
 * Default execution prompt template for Claude Code CLI
 * Extracted from ExecutionPromptEditor for maintainability
 */

export const DEFAULT_PROMPT_TEMPLATE = `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

REQUIREMENT TO EXECUTE NOW:

{{REQUIREMENT_CONTENT}}

IMPORTANT INSTRUCTIONS:
- Analyze the requirement thoroughly
- Identify all files that need to be modified or created
- Implement all changes specified in the requirement
- Follow the implementation steps precisely
- Create/modify files as needed
- Run any tests if specified
- Ensure all changes are complete before finishing

## Context Updates

**CRITICAL**: If this requirement references a specific CONTEXT name or feature area, you MUST update the context documentation using the context update skill.

To update a context:
1. Invoke the \`update-context\` skill by running: \`/skill update-context\`
2. The skill will guide you through:
   - Identifying the correct context to update
   - Analyzing the files you've changed
   - Updating the context's file paths to include new/modified files
   - Refreshing the context description to reflect your changes

**When to use the context update skill:**
- The requirement explicitly mentions a context name (e.g., "Update the Goals Management context")
- You've created, modified, or deleted files within a feature area that has an existing context
- Your changes significantly impact the architecture or capabilities of a feature

**Important:** Always invoke the skill AFTER completing your implementation, as it needs to analyze your changes.

## File Structure Guidelines (Next.js/React Projects)

When creating new files in Next.js/React projects, follow this structure:

**Feature-Specific Files** (use \`app/features/<feature>\` structure):
- \`app/features/<feature>/components/\` - Feature-specific components and UI sections
- \`app/features/<feature>/lib/\` - Feature-specific functions, utilities, and logical helpers
- \`app/features/<feature>/\` - Main wrapper, index, or page file for the feature

**Reusable UI Components** (use \`app/components/ui\` structure):
- \`app/components/ui/\` - Shared, reusable UI elements used across multiple features

**Theming and Styling**:
- Before creating new UI components, examine existing components in the project
- Match the color scheme, spacing, and visual patterns of existing components
- Use consistent className patterns (Tailwind CSS classes)
- Follow the app's design language (glassmorphism, gradients, shadows, etc.)
- Pay attention to dark mode support if the app uses it

Examples:
- Feature component: \`app/features/tasks/components/TaskCard.tsx\`
- Feature helper: \`app/features/tasks/lib/taskValidation.ts\`
- Reusable UI: \`app/components/ui/Button.tsx\`

## Test Coverage Preparation

**IMPORTANT**: For all interactive UI components (buttons, inputs, forms, modals, etc.), add \`data-testid\` attributes to enable automated testing.

**Guidelines**:
- Add \`data-testid\` to all clickable elements (buttons, links, icons)
- Use descriptive, kebab-case naming: \`data-testid="submit-form-btn"\`
- Include component context in the ID: \`data-testid="goal-delete-btn"\`, \`data-testid="project-settings-modal"\`
- Add to form inputs: \`data-testid="email-input"\`, \`data-testid="password-input"\`
- Add to list items for testing selection: \`data-testid="task-item-123"\`

**Examples**:
\\\`\\\`\\\`tsx
<button onClick={handleSubmit} data-testid="create-goal-btn">
  Create Goal
</button>

<input
  type="text"
  value={title}
  onChange={handleChange}
  data-testid="goal-title-input"
/>

<div className="modal" data-testid="delete-confirmation-modal">
  ...
</div>
\\\`\\\`\\\`

## Implementation Logging

**CRITICAL**: After completing the implementation, create a log entry in the SQLite database to track what was implemented.

Database Path: \`{{DB_PATH}}\`
Table: \`implementation_log\`
{{PROJECT_ID_COMMENT}}

Execute this SQL command after implementation (replace placeholders with actual values):

\`\`\`sql
INSERT INTO implementation_log (
  id,
  project_id,
  requirement_name,
  title,
  overview,
  tested,
  created_at
) VALUES (
  '<generate-unique-uuid>',
  '{{PROJECT_ID}}',
  '<requirement-name>',
  '<short-descriptive-title>',
  '<detailed-overview-of-changes>',
  0,
  datetime('now')
);
\`\`\`

**Log Entry Guidelines**:
- \`id\`: Generate a unique UUID (e.g., using \`crypto.randomUUID()\` or similar)
- \`project_id\`: The project identifier{{PROJECT_ID_VALUE}}
- \`requirement_name\`: Name of the requirement file being executed
- \`title\`: Short, descriptive title (2-6 words, e.g., "Add User Authentication")
- \`overview\`: Detailed paragraph describing:
  - What was implemented
  - Key files created or modified
  - Major functionality added
  - Any important patterns or decisions made
- \`tested\`: Always set to 0 (false) initially
- \`created_at\`: Use \`datetime('now')\` for current timestamp

**Example Log Entry**:

\`\`\`sql
INSERT INTO implementation_log (
  id,
  project_id,
  requirement_name,
  title,
  overview,
  tested,
  created_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'project-abc-123',
  'implement-user-login',
  'User Login System',
  'Implemented complete user authentication system with login form, JWT token management, and session persistence. Created LoginForm.tsx component, authService.ts for API calls, and useAuth hook for state management. Added protected route wrapper and login/logout functionality. Integrated with existing theme using glassmorphism design.',
  0,
  datetime('now')
);
\`\`\`

**How to Execute the SQL**:
Use the sqlite3 command-line tool or Node.js better-sqlite3 library:

\`\`\`bash
sqlite3 "{{DB_PATH}}" "INSERT INTO implementation_log (...) VALUES (...);"
\`\`\`

Or in Node.js/TypeScript:
\`\`\`typescript
import Database from 'better-sqlite3';
const db = new Database('{{DB_PATH}}');
db.prepare(\`
  INSERT INTO implementation_log (id, project_id, requirement_name, title, overview, tested, created_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
\`).run(id, projectId, requirementName, title, overview, 0);
db.close();
\`\`\`

{{GIT_SECTION}}

## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Test IDs added to interactive components
- [ ] Context documentation updated (if applicable)
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created in database
- [ ] Tests run successfully (if specified)
- [ ] Git operations executed (if enabled)

Begin implementation now.`;

export const STORAGE_KEY = 'taskRunner_executionPrompt';

/**
 * Build the example Git section for prompt preview
 */
export function buildExampleGitSection(): string {
  return `
## Git Operations

**IMPORTANT**: After completing all implementation and documentation tasks, execute the following git operations to commit and push your changes.

**Git Commands to Execute (in order)**:
1. \`git add .\`
2. \`git commit -m "{commitMessage}"\`
3. \`git push\`

**Commit Message**: Auto-commit: {requirementName}

**Instructions**:
1. Verify all changes are complete and tested
2. Execute each git command in sequence using the Bash tool
3. If a command fails, analyze the error:
   - **Non-fatal errors** (e.g., "nothing to commit", "working tree clean"): Continue to next command
   - **Merge conflicts**: Attempt to resolve them or report the conflict clearly
   - **Authentication errors**: Report the issue - do not attempt to fix authentication
   - **Branch protection errors**: Report the issue - do not attempt to bypass protection rules
4. Report the outcome of git operations (success or specific errors encountered)

**Error Handling**:
- Check git status before committing: \`git status\`
- If there are no changes to commit, that's OK - report it and continue
- If push is rejected (e.g., non-fast-forward), fetch and rebase: \`git fetch && git rebase origin/main\`
- Always provide clear feedback about what happened

**Example workflow**:
\\\`\\\`\\\`bash
# Check status
git status

# Add changes (if any)
git add .

# Commit with the specified message
git commit -m "Auto-commit: {requirementName}"

# Push to remote
git push
\\\`\\\`\\\`

**Note**: Only proceed with git operations after ALL other tasks are complete (implementation, testing, logging, context updates).
`;
}

/**
 * Replace template variables with example values for preview
 */
export function buildPreviewContent(content: string): string {
  return content
    .replace(/\{\{REQUIREMENT_CONTENT\}\}/g, '[Your requirement content will appear here]')
    .replace(/\{\{DB_PATH\}\}/g, '/path/to/project/database/goals.db')
    .replace(/\{\{PROJECT_PATH\}\}/g, '/path/to/project')
    .replace(/\{\{PROJECT_ID\}\}/g, 'example-project-id')
    .replace(/\{\{PROJECT_ID_COMMENT\}\}/g, 'Project ID: `example-project-id`')
    .replace(/\{\{PROJECT_ID_VALUE\}\}/g, ' (use: "example-project-id")')
    .replace(/\{\{GIT_SECTION\}\}/g, buildExampleGitSection());
}
