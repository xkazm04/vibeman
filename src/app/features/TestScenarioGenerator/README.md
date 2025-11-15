# AI-Driven Test Scenario Generator

Automated test scenario generation for Next.js/React applications using AI component analysis and visual regression testing.

## Overview

This feature analyzes React component trees, infers realistic user interaction flows, and auto-generates Playwright test skeletons with injected `data-testid` attributes and visual regression tracking.

## Architecture

### Database Tables

1. **test_scenarios** - AI-generated test scenarios
   - Stores user flows, component trees, and Playwright test code
   - Tracks AI confidence scores
   - Links to contexts for organized testing

2. **test_executions** - Test run history
   - Records execution status, timing, and errors
   - Stores console output and coverage data
   - Maintains screenshot references

3. **visual_diffs** - Screenshot comparisons
   - Baseline vs current screenshot comparison
   - Pixel diff percentage tracking
   - Manual review and approval workflow

### Components

- **scenarioAnalyzer.ts** - AI-powered component analysis using Gemini LLM
- **playwrightGenerator.ts** - Generates executable Playwright test code
- **TestScenarioPanel.tsx** - UI for viewing and running tests

### API Endpoints

- `POST /api/test-scenarios/generate` - Generate scenarios from file paths
- `GET /api/test-scenarios` - List scenarios
- `POST /api/test-scenarios/execute` - Run a test scenario
- `GET /api/test-scenarios/execute?executionId=xxx` - Get execution results

## Usage

### 1. Generate Test Scenarios

```typescript
const response = await fetch('/api/test-scenarios/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'project-id',
    contextId: 'context-id', // Optional
    filePaths: [
      'src/components/LoginForm.tsx',
      'src/components/Dashboard.tsx'
    ],
    baseUrl: 'http://localhost:3000'
  })
});

const { scenarios } = await response.json();
```

### 2. Execute a Test

```typescript
const response = await fetch('/api/test-scenarios/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioId: 'scenario-id',
    baseUrl: 'http://localhost:3000',
    captureScreenshots: true
  })
});

const { execution, visualDiffs } = await response.json();
```

### 3. Display in Blueprint Layout

```tsx
import { TestScenarioPanel } from '@/app/features/Onboarding/sub_Blueprint/components/TestScenarioPanel';

<TestScenarioPanel projectId="project-id" contextId="context-id" />
```

## AI-Powered Features

### Component Analysis

The system uses Gemini LLM to:
- Extract component structure and props
- Identify interactive elements (buttons, inputs, forms)
- Detect existing data-testid attributes
- Map component hierarchies

### Test Scenario Generation

AI generates realistic test scenarios covering:
- Happy path workflows
- Edge cases and error handling
- Critical user interactions
- Form submissions and validations

### data-testid Suggestions

Automatically suggests missing test IDs with:
- Descriptive kebab-case naming
- Context-aware identification
- Uniqueness validation

## Visual Regression Testing

### Screenshot Capture

- Automatic screenshots after each interaction
- Full-page screenshots for comprehensive coverage
- Viewport configuration (1920x1080 default)

### Diff Detection

- Pixel-by-pixel comparison
- Configurable threshold (0.1% default)
- Diff image generation for review

### Review Workflow

- Unreviewed diffs highlighted
- Manual approval process
- Baseline update mechanism

## Generated Test Structure

```typescript
// Example generated Playwright test
import { test, expect } from '@playwright/test';

test.describe('User Login Flow', () => {
  test('Validates successful user authentication', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Step 1: Enter email address
    await page.locator('[data-testid="email-input"]').fill('user@example.com');

    // Step 2: Enter password
    await page.locator('[data-testid="password-input"]').fill('password123');

    // Step 3: Submit login form
    await page.locator('[data-testid="submit-btn"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/login_step_3.png', fullPage: true });

    // Expected: Redirect to dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});
```

## Best Practices

### 1. Add data-testid Attributes

```tsx
<button onClick={handleSubmit} data-testid="submit-form-btn">
  Submit
</button>

<input
  type="email"
  value={email}
  onChange={handleChange}
  data-testid="email-input"
/>
```

### 2. Use Descriptive Test IDs

- `data-testid="login-submit-btn"` ✅
- `data-testid="btn1"` ❌

### 3. Organize by Context

Group related components in contexts to generate focused test suites.

### 4. Review AI Confidence Scores

Higher confidence scores (>80%) indicate more reliable scenarios.

### 5. Baseline Management

- Create baselines for stable UI states
- Update baselines after intentional UI changes
- Review all diffs before approval

## Configuration

### Playwright Setup

Install Playwright dependencies:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Environment Variables

```env
TEST_BASE_URL=http://localhost:3000
GEMINI_API_KEY=your-api-key
```

## Troubleshooting

### Test Execution Fails

1. Ensure dev server is running on baseUrl
2. Check data-testid attributes exist in components
3. Review console output for errors
4. Verify selectors match actual DOM structure

### Visual Diffs Always Detected

1. Check for animations or dynamic content
2. Increase diff threshold if minor pixel differences
3. Ensure consistent viewport size
4. Disable auto-refresh or polling

### AI Generation Issues

1. Verify Gemini API key is configured
2. Check file paths are valid and accessible
3. Ensure component files are valid TypeScript/JSX
4. Review AI confidence scores for quality

## Future Enhancements

- [ ] Multi-browser testing (Firefox, Safari)
- [ ] Mobile viewport testing
- [ ] Accessibility testing integration
- [ ] Performance metrics tracking
- [ ] Test coverage reporting
- [ ] Auto-healing test selectors
- [ ] Parallel test execution
- [ ] CI/CD integration

## Related Documentation

- Playwright Documentation: https://playwright.dev
- Blueprint Layout: `src/app/features/Onboarding/sub_Blueprint/README.md`
- Database Schema: `src/app/db/README.md`
