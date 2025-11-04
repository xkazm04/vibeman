'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Check, Edit3, Eye, AlertCircle, Loader2, RotateCcw, Info } from 'lucide-react';
import { MarkdownViewer } from '@/components/markdown';

interface ExecutionPromptEditorProps {
  onClose: () => void;
}

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ElementType;
  label: string;
  variant?: 'primary' | 'secondary' | 'success';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  disabled = false,
  icon: Icon,
  label,
  variant = 'secondary'
}) => {
  const baseClasses = "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200";

  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30",
    secondary: "bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 hover:text-gray-300 border border-gray-600/30",
    success: "bg-green-500/20 text-green-400 border border-green-500/30"
  };

  const disabledClasses = disabled ? "bg-gray-700/50 text-gray-400 cursor-not-allowed" : "";

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${disabled ? disabledClasses : variantClasses[variant]}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  );
};

const DEFAULT_PROMPT_TEMPLATE = `You are an expert software engineer. Execute the following requirement immediately. Do not ask questions, do not wait for confirmation. Read the requirement carefully and implement all changes to the codebase as specified.

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

## Final Checklist

Before finishing:
- [ ] All code changes implemented
- [ ] Context documentation updated (if applicable)
- [ ] File structure follows guidelines
- [ ] UI components match existing theme
- [ ] Implementation log entry created in database
- [ ] Tests run successfully (if specified)

Begin implementation now.`;

const STORAGE_KEY = 'taskRunner_executionPrompt';

export default function ExecutionPromptEditor({ onClose }: ExecutionPromptEditorProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load prompt from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      setContent(stored || DEFAULT_PROMPT_TEMPLATE);
    }
  }, []);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    setJustSaved(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, content);
    }
    setTimeout(() => {
      setIsSaving(false);
      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to the default prompt template? This cannot be undone.')) {
      setContent(DEFAULT_PROMPT_TEMPLATE);
      setHasUnsavedChanges(true);
      setJustSaved(false);
    }
  };

  // Render preview with variable examples
  const renderPreview = () => {
    const exampleContent = content
      .replace(/\{\{REQUIREMENT_CONTENT\}\}/g, '[Your requirement content will appear here]')
      .replace(/\{\{DB_PATH\}\}/g, '/path/to/project/database/goals.db')
      .replace(/\{\{PROJECT_PATH\}\}/g, '/path/to/project')
      .replace(/\{\{PROJECT_ID\}\}/g, 'example-project-id')
      .replace(/\{\{PROJECT_ID_COMMENT\}\}/g, 'Project ID: `example-project-id`')
      .replace(/\{\{PROJECT_ID_VALUE\}\}/g, ' (use: "example-project-id")');

    return exampleContent;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/30 bg-gray-900/30 backdrop-blur-sm">
        {/* Left: Info */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
            Configure the prompt template sent to Claude Code CLI
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {/* Unsaved Changes Indicator */}
          <AnimatePresence>
            {hasUnsavedChanges && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center space-x-2 text-amber-400 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Unsaved changes</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset Button */}
          <ActionButton
            onClick={handleReset}
            icon={RotateCcw}
            label="Reset"
            variant="secondary"
          />

          {/* Save Button */}
          <motion.button
            whileHover={!isSaving && hasUnsavedChanges ? { scale: 1.05 } : {}}
            whileTap={!isSaving && hasUnsavedChanges ? { scale: 0.95 } : {}}
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              justSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : hasUnsavedChanges
                ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : justSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save</span>
              </>
            )}
          </motion.button>

          {/* Mode Toggle */}
          <div className="flex bg-gray-800/50 rounded-lg p-1 border border-gray-700/30">
            <button
              onClick={() => setMode('preview')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'preview'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                mode === 'edit'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Variables Info Box */}
      <div className="mx-6 mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Available Variables:</p>
            <div className="text-xs text-blue-300/80 space-y-0.5 font-mono">
              <div><code className="text-cyan-400">{`{{REQUIREMENT_CONTENT}}`}</code> - The requirement text</div>
              <div><code className="text-cyan-400">{`{{PROJECT_PATH}}`}</code> - Absolute project path</div>
              <div><code className="text-cyan-400">{`{{PROJECT_ID}}`}</code> - Project identifier</div>
              <div><code className="text-cyan-400">{`{{DB_PATH}}`}</code> - Database file path</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === 'preview' ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto px-6 py-4 custom-scrollbar"
            >
              <div className="max-w-5xl mx-auto">
                <MarkdownViewer
                  content={renderPreview()}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full p-6"
            >
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full bg-gray-900/50 text-gray-300 font-mono text-sm resize-none border border-gray-700/30 rounded-lg p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm custom-scrollbar"
                placeholder="Enter your execution prompt template..."
                spellCheck={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
