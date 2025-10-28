/**
 * Execution prompts for Claude Code
 * Provides instructions for executing requirements with proper logging and documentation
 */

export interface ExecutionPromptConfig {
  requirementContent: string;
  projectPath: string;
  projectId?: string;
  dbPath?: string; // Path to the SQLite database
}

/**
 * Build the full execution prompt with enhanced instructions
 */
export function buildExecutionPrompt(config: ExecutionPromptConfig): string {
  const { requirementContent, projectPath, projectId, dbPath } = config;

  // Calculate the database path if not provided
  const calculatedDbPath = dbPath || `${projectPath}/database/goals.db`;

  return `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

REQUIREMENT TO EXECUTE NOW:

${requirementContent}

IMPORTANT INSTRUCTIONS:
- Analyze the requirement thoroughly
- Identify all files that need to be modified or created
- Implement all changes specified in the requirement
- Follow the implementation steps precisely
- Create/modify files as needed
- Run any tests if specified
- Ensure all changes are complete before finishing

## Context Reference Updates

After implementing changes, if the requirement references a specific CONTEXT (feature group), update the context documentation:

1. Look for \`.context\` files in the project that match the feature being implemented
2. Update the context file with:
   - New files created
   - Modified components
   - Updated functionality
   - New patterns introduced

Example: If working on "authentication" feature, update \`contexts/authentication/.context\` with the changes.

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

## Implementation Logging

**CRITICAL**: After completing the implementation, create a log entry in the SQLite database to track what was implemented.

Database Path: \`${calculatedDbPath}\`
Table: \`implementation_log\`
${projectId ? `Project ID: \`${projectId}\`` : ''}

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
  '${projectId || '<project-id>'}',
  '<requirement-name>',
  '<short-descriptive-title>',
  '<detailed-overview-of-changes>',
  0,
  datetime('now')
);
\`\`\`

**Log Entry Guidelines**:
- \`id\`: Generate a unique UUID (e.g., using \`crypto.randomUUID()\` or similar)
- \`project_id\`: The project identifier${projectId ? ` (use: "${projectId}")` : ''}
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
sqlite3 "${calculatedDbPath}" "INSERT INTO implementation_log (...) VALUES (...);"
\`\`\`

Or in Node.js/TypeScript:
\`\`\`typescript
import Database from 'better-sqlite3';
const db = new Database('${calculatedDbPath}');
db.prepare(\`
  INSERT INTO implementation_log (id, project_id, requirement_name, title, overview, tested, created_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
\`).run(id, projectId, requirementName, title, overview, 0);
db.close();
\`\`\`

## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Context documentation updated (if applicable)
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created in database
- [ ] Tests run successfully (if specified)

Begin implementation now.`;
}
