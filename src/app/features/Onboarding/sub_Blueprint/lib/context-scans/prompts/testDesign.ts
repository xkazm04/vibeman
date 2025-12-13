/**
 * Test Design Prompt Template
 * Generates Claude Code requirement for creating/updating test scenarios and steps
 */

interface TestDesignPromptParams {
  contextId: string;
  contextName: string;
  contextDescription: string;
  filePaths: string[];
  target: string | null;
  targetFulfillment: string | null;
  projectPath: string;
  existingScenarios: Array<{
    id: string;
    name: string;
    description: string | null;
    steps: Array<{
      id: string;
      step_order: number;
      step_name: string;
      expected_result: string;
      test_selector_id: string | null;
    }>;
  }>;
}

export function testDesignPrompt(params: TestDesignPromptParams): string {
  const {
    contextId,
    contextName,
    contextDescription,
    filePaths,
    target,
    targetFulfillment,
    projectPath,
    existingScenarios,
  } = params;

  // Format existing scenarios for display
  const scenariosSection = existingScenarios.length > 0
    ? `## Existing Test Scenarios

${existingScenarios.map((scenario, idx) => `
### ${idx + 1}. ${scenario.name}

**ID**: \`${scenario.id}\`
**Description**: ${scenario.description || 'No description'}

**Steps**:
${scenario.steps.length > 0
  ? scenario.steps.map((step, stepIdx) => `
  ${stepIdx + 1}. **${step.step_name}**
     - Expected: ${step.expected_result}
     - Selector: ${step.test_selector_id ? `✓ ${step.test_selector_id}` : '✗ None'}
`).join('\n')
  : '  No steps defined'}
`).join('\n')}

**Total Scenarios**: ${existingScenarios.length}
**Total Steps**: ${existingScenarios.reduce((sum, s) => sum + s.steps.length, 0)}
`
    : `## Existing Test Scenarios

No test scenarios exist yet for this context.`;

  return `# Test Design Task for Context: "${contextName}"

## Objective

Analyze the context "${contextName}" and create or update comprehensive test scenarios and steps to ensure proper test coverage. Focus on the top 3 user-facing activities (clickable events, form updates, state changes) that require testing.

## Context Information

**Context ID**: \`${contextId}\`
**Name**: ${contextName}
**Description**: ${contextDescription || 'No description provided'}
${target ? `**Target/Vision**: ${target}` : ''}
${targetFulfillment ? `**Current Fulfillment**: ${targetFulfillment}` : ''}
**Project Path**: \`${projectPath}\`

## Files in Context

\`\`\`
${filePaths.map((fp, idx) => `${idx + 1}. ${fp}`).join('\n')}
\`\`\`

${scenariosSection}

---

## Instructions

### Step 1: Analyze Context Features

1. **Read ALL files** in the context to understand:
   - What UI components are present (buttons, forms, inputs, etc.)
   - What user interactions are possible (clicks, submits, navigations)
   - What state changes can occur
   - What API calls are made
   - What data flows through the components

2. **Identify entry points**: Since this is a Next.js/React single-page application, you must reverse engineer:
   - Where are these components used/imported?
   - What routes render these components?
   - How does a user navigate to this feature in the UI?
   - What is the navigation path? (e.g., TopBar → Module → Subpage)

### Step 2: Evaluate Test Coverage

Analyze the existing test scenarios (if any) and determine:
- **What's covered**: Which user flows have test coverage?
- **What's missing**: Which critical interactions lack tests?
- **What's outdated**: Do existing steps match current implementation?
- **What's redundant**: Are there duplicate or unnecessary tests?

### Step 3: Identify Top 3 Test Priorities

Focus on the **3 most important user-facing activities** that require test coverage:
1. **Clickable events**: Critical buttons, links, navigation actions
2. **Form interactions**: Input fields, form submissions, validation
3. **State changes**: Modal opens/closes, data updates, UI state transitions

Consider:
- User impact (what breaks user workflows?)
- Frequency of use (what do users do most often?)
- Risk level (what causes the most bugs?)

### Step 4: Design Test Scenarios

For each priority activity, design a test scenario that:
- Has a clear, descriptive name (e.g., "User Login Flow", "Create New Item", "Delete Confirmation")
- Includes a description of what is being tested
- Contains 3-7 steps that cover the complete user flow
- Uses testId selectors where applicable

**Test Scenario Structure**:
- **Name**: Clear, action-oriented (verb + noun)
- **Description**: Brief explanation of the test purpose
- **Steps**: Sequential actions with expected results

### Step 5: Implement testId Selectors (If Needed)

If components lack proper testId attributes, you may add them:

\`\`\`tsx
// Add data-testid to interactive elements
<button data-testid="submit-form-btn" onClick={handleSubmit}>
  Submit
</button>

<input data-testid="email-input" type="email" />
\`\`\`

**Guidelines**:
- Use kebab-case for testIds: \`submit-form-btn\`, \`email-input\`
- Make testIds descriptive and unique
- Add testIds to: buttons, links, inputs, modals, navigation elements
- Only add testIds that are actually needed for tests

### Step 6: Create/Update Test Scenarios in Database

Use the unified test scenarios API endpoint to create or update scenarios with embedded steps:

#### Create New Test Scenario with Steps

\`\`\`typescript
// Create scenario with all steps in one request
const scenarioResponse = await fetch('/api/test-scenarios', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'manual', // Required: 'manual' for test case scenarios
    context_id: '${contextId}',
    name: 'Descriptive Test Name',
    description: 'What this test validates',
    steps: [
      {
        step_order: 1,
        step_name: 'Navigate to login page',
        expected_result: 'Login form is visible',
        test_selector_id: null,
      },
      {
        step_order: 2,
        step_name: 'Enter email address',
        expected_result: 'Email field contains entered value',
        test_selector_id: 'email-input',
      },
      // Add more steps as needed...
    ],
  }),
});

const { scenario } = await scenarioResponse.json();
const scenarioId = scenario.id;
\`\`\`

#### Update Existing Scenario (if needed)

\`\`\`typescript
await fetch('/api/test-scenarios', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: scenarioId,
    type: 'manual',
    name: 'Updated Test Name',
    description: 'Updated description',
    // To replace all steps:
    steps: [
      { step_order: 1, step_name: 'Updated step', expected_result: 'Expected result' },
    ],
    // Or to add new steps:
    // addSteps: [{ step_order: 4, step_name: 'New step', expected_result: 'Expected result' }],
    // Or to remove steps:
    // removeStepIds: ['step-id-to-remove'],
  }),
});
\`\`\`

### Step 7: Playwright Integration Notes

These test scenarios are designed for **Playwright** testing via \`/api/tester\`:
- Scenarios will be executed in a browser context
- Use standard Playwright selectors: \`data-testid\`, CSS selectors, text selectors
- Navigation steps should specify exact routes or navigation sequences
- Expected results should be verifiable via DOM assertions

**Navigation Context**: Since UI entry points may not be obvious from component code alone:
1. Search for component imports across the codebase
2. Check route files (\`page.tsx\`, \`layout.tsx\`)
3. Look for navigation links in TopBar or sidebars
4. Document the complete navigation path in test steps

---

## Requirements Summary

✅ Read and understand all files in the context
✅ Identify the 3 most critical user-facing test scenarios
✅ Create or update test scenarios in the database
✅ Define clear, sequential test steps for each scenario
✅ Add testId selectors to components where needed
✅ Ensure tests cover clickable events, form interactions, and state changes
✅ Reverse engineer navigation paths for frontend components
❌ Do NOT generate documentation files or logs after completion
❌ Do NOT create redundant or low-value test scenarios

---

## Example Test Scenario

**Scenario**: User Login Flow

**Description**: Validates complete login workflow from navigation to authenticated state

**Steps**:
1. **Navigate to home page**
   - Expected: Homepage loads successfully
   - Selector: None

2. **Click login button in TopBar**
   - Expected: Login modal opens
   - Selector: \`login-btn\`

3. **Enter email address**
   - Expected: Email field contains entered value
   - Selector: \`email-input\`

4. **Enter password**
   - Expected: Password field is masked
   - Selector: \`password-input\`

5. **Click submit button**
   - Expected: User is authenticated and modal closes
   - Selector: \`submit-login-btn\`

---

## Testing Technology Stack

- **Framework**: Playwright
- **API**: \`/api/tester\` (see \`${projectPath}/src/app/api/tester/README.md\`)
- **Browser**: Browserbase remote browsers (with local Playwright fallback)
- **Selectors**: Prefer \`data-testid\` attributes for reliability

---

**Begin the test design process now. Focus on quality over quantity - 3 well-designed test scenarios are better than 10 superficial ones.**
`;
}
