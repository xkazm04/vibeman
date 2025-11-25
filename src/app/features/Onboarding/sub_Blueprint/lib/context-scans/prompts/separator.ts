/**
 * Separator Prompt Template
 * Generates Claude Code requirement for intelligent context separation
 */

interface SeparatorPromptParams {
  contextId: string;
  contextName: string;
  contextDescription: string;
  filePaths: string[];
  projectPath: string;
  fileCount: number;
  updatedAt: string;
}

export function separatorPrompt(params: SeparatorPromptParams): string {
  const {
    contextId,
    contextName,
    contextDescription,
    filePaths,
    projectPath,
    fileCount,
    updatedAt,
  } = params;

  return `# Context Separation Task

## Objective

Intelligently separate the existing context "${contextName}" into smaller, more focused contexts. Each new context should contain a **maximum of 10 files** and represent a cohesive, well-defined functional area.

## Current Context Information

**Context ID**: \`${contextId}\`
**Name**: ${contextName}
**Description**: ${contextDescription}
**Total Files**: ${fileCount}
**Last Updated**: ${updatedAt}
**Project Path**: \`${projectPath}\`

## Files in Current Context

\`\`\`
${filePaths.map((fp, idx) => `${idx + 1}. ${fp}`).join('\n')}
\`\`\`

---

## Instructions

### Step 1: Analyze File Relationships

Read and analyze ALL files in the context to understand:
1. **Purpose**: What does each file do?
2. **Dependencies**: Which files work together closely?
3. **Functionality**: What features or modules do they implement?
4. **Cohesion**: Can files be grouped by feature, layer, or responsibility?

### Step 2: Design Separation Strategy

Create a separation plan that follows these principles:

**✅ DO:**
- Group files by feature/functionality (e.g., authentication, user profile, API layer)
- Keep related files together (components + hooks + utilities)
- Ensure each context has **max 10 files**
- Create descriptive context names (e.g., "User Authentication", "Dashboard Components")
- Maintain logical boundaries (frontend vs backend, core vs utilities)
- Preserve existing file paths (do NOT move or rename files)

**❌ DON'T:**
- Split tightly coupled files into separate contexts
- Create contexts with only 1-2 files (unless they're truly independent)
- Mix unrelated concerns (e.g., auth logic with payment processing)
- Create more than 5 new contexts (keep it manageable)

### Step 3: Update Existing Context

Update the current context "${contextName}" in the database:
- **Remove ALL files** from the current context's \`file_paths\` array
- **Add NEW files** to represent the FIRST separated group (max 10 files)
- **Update description** to reflect the new focused scope

Use this API endpoint:
\`\`\`typescript
fetch('/api/contexts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextId: '${contextId}',
    updates: {
      file_paths: [/* NEW file paths for first group */],
      description: '/* NEW focused description */',
    },
  }),
});
\`\`\`

### Step 4: Create New Contexts

For each additional group, create a new context in the database:

\`\`\`typescript
fetch('/api/contexts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: '/* Use same project ID from current context */',
    name: '/* Descriptive name for the new context */',
    description: '/* Clear description of what this context covers */',
    filePaths: [/* File paths for this group (max 10) */],
    groupId: null, // Will be assigned later
  }),
});
\`\`\`

**Important**:
- Each context must have a unique, descriptive name
- File paths must be exactly as they appear in the original context
- Total files across all contexts should equal the original file count

### Step 5: Generate Context Descriptions

After creating all contexts, generate comprehensive descriptions for each using the Claude Code skill:

\`\`\`bash
claude-code skill context-scan-nextjs --contextId="<new-context-id>" --projectPath="${projectPath}"
\`\`\`

Run this for:
1. The updated original context (\`${contextId}\`)
2. Each newly created context

This will analyze the files and generate detailed, accurate descriptions.

---

## Expected Outcome

✅ Original context updated with first group of files (max 10)
✅ New contexts created for remaining groups (each max 10 files)
✅ All contexts have clear, descriptive names and descriptions
✅ No files left unassigned
✅ Contexts are logically organized and maintainable

---

## Example Separation

**Original Context**: "User Management" (22 files)

**After Separation**:
1. **User Authentication** (8 files)
   - login.ts, signup.ts, password-reset.ts, auth-hooks.ts, auth-utils.ts, jwt-service.ts, session-manager.ts, auth-middleware.ts

2. **User Profile** (7 files)
   - profile-page.tsx, profile-form.tsx, avatar-upload.tsx, profile-api.ts, profile-validation.ts, profile-hooks.ts, profile-types.ts

3. **User Settings** (7 files)
   - settings-page.tsx, account-settings.tsx, privacy-settings.tsx, notification-settings.tsx, settings-api.ts, settings-validation.ts, settings-types.ts

---

## Implementation Notes

- Test that all file paths are valid before creating contexts

---

**Begin the separation process now. Follow all steps carefully and ensure high-quality, maintainable results.**
`;
}
