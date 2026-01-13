/**
 * UI Verification Rule
 * Conditional - Only included when uiVerificationEnabled is true and projectPort is available
 *
 * Uses Playwright to verify UI implementations load without errors.
 * Simple approach: load page, capture console errors, auto-fix if needed.
 */

import type { RuleDefinition } from '../types';

const UI_VERIFICATION_CONTENT = `## UI Verification (Auto-Fix Enabled)

After implementation, verify the page loads without errors.

### Step 1: Start Dev Server

\`\`\`bash
{{runScript}} &
DEV_PID=$!
sleep 8

# Verify server started
curl -s -o /dev/null -w "%{http_code}" http://localhost:{{projectPort}} | grep -q "200\\|304" || {
  echo "Server failed to start - fix build errors first"
}
\`\`\`

### Step 2: Run Verification Script

Create and run a simple verification script:

\`\`\`bash
cat > /tmp/verify-ui.mjs << 'SCRIPT'
import { chromium } from 'playwright-core';

const errors = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(err.message));
page.on('requestfailed', req => errors.push(\`404: \${req.url()}\`));

await page.goto('http://localhost:{{projectPort}}', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await browser.close();

if (errors.length > 0) {
  console.log('ERRORS FOUND:');
  errors.forEach(e => console.log('  - ' + e));
  process.exit(1);
}
console.log('UI verification passed - no errors');
SCRIPT

node /tmp/verify-ui.mjs
VERIFICATION_RESULT=$?
\`\`\`

### Step 3: Handle Results

**If verification passed** (exit code 0): Continue to next steps.

**If verification failed** (exit code 1):
1. Read the error messages printed above
2. Fix the issues in your code (404s, runtime errors, etc.)
3. Re-run: \`node /tmp/verify-ui.mjs\` (max 2 retries)

### Step 4: Stop Dev Server (CRITICAL)

\`\`\`bash
kill $DEV_PID 2>/dev/null || true
kill -9 $(lsof -ti:{{projectPort}}) 2>/dev/null || true
rm /tmp/verify-ui.mjs 2>/dev/null || true
\`\`\`

### Verification Summary

Include in implementation log: \`"verification": "passed"\` or \`"verification": "failed - [reason]"\``;

export const uiVerificationRule: RuleDefinition = {
  id: 'ui-verification',
  name: 'UI Verification',
  description: 'Verify UI loads without errors using Playwright',
  category: 'operations',
  priority: 'high',
  alwaysInclude: false,
  condition: (config) => Boolean(config.uiVerificationEnabled && config.projectPort),
  order: 75,
  variables: [
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
  content: UI_VERIFICATION_CONTENT,
};
