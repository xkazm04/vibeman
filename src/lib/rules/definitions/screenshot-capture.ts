/**
 * Screenshot Capture Rule
 * Conditional - Only included when contextId is provided
 */

import type { RuleDefinition } from '../types';

export const screenshotCaptureRule: RuleDefinition = {
  id: 'screenshot-capture',
  name: 'Screenshot Capture',
  description: 'Capture screenshots for context-related implementations',
  category: 'operations',
  priority: 'medium',
  alwaysInclude: false,
  condition: (config) => Boolean(config.contextId),
  order: 70,
  variables: [
    {
      name: 'contextId',
      placeholder: '{{contextId}}',
      configKey: 'contextId',
      defaultValue: '',
    },
    {
      name: 'projectPort',
      placeholder: '{{projectPort}}',
      configKey: 'projectPort',
      defaultValue: '3000',
    },
    {
      name: 'runScript',
      placeholder: '{{runScript}}',
      configKey: 'runScript',
      defaultValue: 'npm run dev',
    },
  ],
  content: `## Screenshot Capture (Context-Related Only)

**Workflow**:

### Step 1: Check if Test Scenario Exists

\`\`\`bash
curl -X POST "http://localhost:3000/api/tester/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"{{contextId}}","scanOnly":true}'
\`\`\`

**If \`hasScenario: false\`**: Skip all remaining screenshot steps. Set \`screenshot: null\` in log.

### Step 2: Start Dev Server (ONLY if scenario exists)

\`\`\`bash
{{runScript}} &
SERVER_PID=$!
sleep 8

# Verify server is running
if ! curl -I http://localhost:{{projectPort}} 2>/dev/null; then
  echo "❌ Server failed - check if your implementation broke the build"
  # Fix bugs if related to your changes, then retry
  # Otherwise continue without screenshot (screenshot: null)
fi
\`\`\`

### Step 3: Capture Screenshot

\`\`\`bash
curl -X POST "http://localhost:3000/api/tester/screenshot" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"{{contextId}}"}'
\`\`\`

### Step 4: Stop Server (CRITICAL)

\`\`\`bash
kill $SERVER_PID 2>/dev/null || true
sleep 2
# Force kill if still running
kill -9 $(lsof -ti:{{projectPort}}) 2>/dev/null || true
\`\`\`

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
- **Always stop the server** to free the port for next task`,
};
