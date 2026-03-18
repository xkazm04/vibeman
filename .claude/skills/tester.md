# Tester Skill

This skill provides Playwright testing capabilities for automated UI testing and screenshot capture.

## Available Testing Commands

### 1. Run Diagnostic Check

Check if the testing environment is properly configured.

```bash
curl http://localhost:3000/api/tester/diagnostic
```

**Returns:**
- Dev server status (localhost:3000)
- Chromium browser availability
- Screenshot directory status
- Available test scenarios

**Example Response:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "checks": [
    {
      "name": "Dev Server (localhost:3000)",
      "status": "PASS",
      "message": "✅ Server is accessible"
    },
    {
      "name": "Chromium Browser",
      "status": "PASS",
      "message": "✅ Chromium is installed and working"
    }
  ],
  "summary": {
    "allPassed": true,
    "criticalIssues": 0,
    "warnings": 0
  }
}
```

### 2. Check Context Screenshot Status

Check if a context has test scenarios and when it was last tested.

```bash
curl "http://localhost:3000/api/tester/screenshot?contextId=<CONTEXT_ID>"
```

**Parameters:**
- `contextId` (required): Context ID to check

**Returns:**
- Whether context has test scenario
- Days since last test
- Test updated timestamp

### 3. Execute Context Test Scenario

Run Playwright test for a specific context and capture screenshots.

```bash
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "<CONTEXT_ID>"
  }'
```

**Parameters:**
- `contextId` (required): Context ID to test
- `scanOnly` (optional): If true, only checks if scenario exists without running

**Returns:**
```json
{
  "success": true,
  "contextId": "ctx-123",
  "contextName": "Login Page",
  "screenshotPath": "/screenshots/ctx-123/test-2025-01-15.png",
  "duration": 2500
}
```

**What It Does:**
1. Retrieves test scenario from context database
2. Connects to Chromium browser
3. Navigates to `http://localhost:<PROJECT_PORT>`
4. Executes scenario steps (navigate, click, fill forms, etc.)
5. Captures screenshot
6. Saves screenshot to `public/screenshots/<contextId>/`
7. Updates context `test_updated` timestamp and `preview` path

### 4. Scan Context for Test Selectors

Scan context files for `data-testid` attributes.

```bash
curl -X POST http://localhost:3000/api/tester/selectors/scan \
  -H "Content-Type: application/json" \
  -d '{
    "contextId": "<CONTEXT_ID>",
    "projectId": "<PROJECT_ID>",
    "scanOnly": true
  }'
```

**Returns:**
- Total selectors found in code
- Database count (tracked selectors)
- Whether database is outdated
- List of file paths scanned

## Test Scenario Format

Test scenarios are stored in the `test_scenario` column of the `contexts` table. Format:

```json
{
  "name": "Login Flow Test",
  "steps": [
    {
      "action": "navigate",
      "url": "/login"
    },
    {
      "action": "fill",
      "selector": "[data-testid='email-input']",
      "value": "test@example.com"
    },
    {
      "action": "click",
      "selector": "[data-testid='login-button']"
    },
    {
      "action": "waitForSelector",
      "selector": "[data-testid='dashboard']"
    },
    {
      "action": "screenshot",
      "name": "after-login"
    }
  ]
}
```

## Supported Actions

| Action | Description | Parameters |
|--------|-------------|------------|
| `navigate` | Navigate to URL | `url` (string) |
| `click` | Click element | `selector` (string) |
| `fill` | Fill input field | `selector` (string), `value` (string) |
| `waitForSelector` | Wait for element | `selector` (string), `timeout` (optional) |
| `screenshot` | Take screenshot | `name` (string) |
| `wait` | Wait for duration | `duration` (number in ms) |

## Usage Guidelines

### When to Use Tester Skill

1. **Running Automated Tests**: Execute Playwright tests for contexts
2. **Visual Regression Testing**: Capture screenshots for comparison
3. **Selector Coverage**: Check test selector coverage in code
4. **Environment Validation**: Verify testing setup before running tests

### Best Practices

1. **Always run diagnostic first**: Ensure environment is ready
2. **Check dev server**: Tests require dev server running on expected port
3. **Use data-testid**: Prefer `data-testid` selectors over CSS/XPath
4. **Handle errors gracefully**: Check response status and provide helpful hints
5. **Update scenarios**: Keep test scenarios in sync with UI changes

### Error Handling

Common errors and solutions:

**Dev server not accessible:**
```
Error: Cannot connect to http://localhost:3000
Solution: Start dev server with `npm run dev`
```

**Chromium not installed:**
```
Error: Executable doesn't exist at /path/to/chromium
Solution: Run `npx playwright install chromium`
```

**No test scenario:**
```
Error: No test scenario found
Solution: Create test scenario for the context first
```

## Example: Complete Test Flow

```bash
# Step 1: Check diagnostic
curl http://localhost:3000/api/tester/diagnostic

# Step 2: Check if context has scenario
curl "http://localhost:3000/api/tester/screenshot?contextId=ctx-123"

# Step 3: Run test and capture screenshot
curl -X POST http://localhost:3000/api/tester/screenshot \
  -H "Content-Type: application/json" \
  -d '{"contextId": "ctx-123"}'

# Step 4: Check selectors (optional)
curl -X POST http://localhost:3000/api/tester/selectors/scan \
  -H "Content-Type: application/json" \
  -d '{"contextId": "ctx-123", "projectId": "proj-456", "scanOnly": true}'
```

## Integration with Claude Code

When writing tests:
1. Use this skill to run diagnostic checks
2. Execute tests via API calls
3. Analyze screenshots and results
4. Report issues found in structured format
5. Document struggles for pipeline improvements

## Output Format for Test Reports

```markdown
# Test Execution Report

## Summary
- **Context**: Login Page
- **Test Duration**: 2.5s
- **Status**: ✅ Passed / ❌ Failed
- **Screenshot**: /screenshots/ctx-123/test-2025-01-15.png

## Test Cases Executed
1. ✅ Navigate to login page
2. ✅ Fill email field
3. ✅ Fill password field
4. ❌ Click login button (selector not found)

## Issues Found
1. **Missing Selector**: Login button has no data-testid
   - **Severity**: High
   - **Location**: src/components/LoginForm.tsx:45
   - **Fix**: Add `data-testid="login-button"` to button element

## Struggles & Improvements
- Selector changed from `#login-btn` to `.login-button` without update
- Suggestion: Add selector validation step before running tests
- Suggestion: Track selector changes in git history
```
