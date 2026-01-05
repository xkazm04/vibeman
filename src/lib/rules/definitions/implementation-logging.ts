/**
 * Implementation Logging Rule
 * Always included - logs work via API call
 */

import type { RuleDefinition } from '../types';

export const implementationLoggingRule: RuleDefinition = {
  id: 'implementation-logging',
  name: 'Implementation Logging',
  description: 'Log implementation via API call',
  category: 'documentation',
  priority: 'high',
  alwaysInclude: true,
  order: 60,
  variables: [
    {
      name: 'projectId',
      placeholder: '{{projectId}}',
      configKey: 'projectId',
      defaultValue: '<project-id>',
    },
    {
      name: 'contextId',
      placeholder: '{{contextId}}',
      configKey: 'contextId',
      defaultValue: '',
    },
  ],
  content: `## Implementation Logging

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
    "projectId": "{{projectId}}",{{contextId}}
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

**If the API call fails**: Report the error and continue - logging failures are non-blocking.`,
};
