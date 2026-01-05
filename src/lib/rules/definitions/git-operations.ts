/**
 * Git Operations Rule
 * Conditional - Only included when gitEnabled is true
 */

import type { RuleDefinition } from '../types';

export const gitOperationsRule: RuleDefinition = {
  id: 'git-operations',
  name: 'Git Operations',
  description: 'Non-blocking git commit and push operations',
  category: 'operations',
  priority: 'medium',
  alwaysInclude: false,
  condition: (config) => config.gitEnabled === true,
  order: 80,
  variables: [
    {
      name: 'gitCommitMessage',
      placeholder: '{{gitCommitMessage}}',
      configKey: 'gitCommitMessage',
      defaultValue: 'Auto-commit: implementation update',
    },
  ],
  content: `## Git Operations (NON-BLOCKING)

**IMPORTANT**: Git operations are NON-BLOCKING. If they fail, report the error and CONTINUE.
Do NOT let git failures prevent task completion.

**Execute AFTER all implementation and logging are complete**:

1. \`git add .\`
2. \`git commit -m "{{gitCommitMessage}}"\`
3. \`git push\`

**Error Handling** (all errors are non-blocking):
- Check \`git status\` first - if nothing to commit, skip and continue
- If commit fails → report error, continue to next step
- If push fails → try once: \`git pull --rebase && git push\`
- If push still fails → report "Git push failed" and CONTINUE (do not block)
- Authentication errors → report and continue (do not attempt to fix)
- Branch protection errors → report and continue

**Success**: Report "Git operations completed"
**Failure**: Report specific error, then continue with task completion`,
};
