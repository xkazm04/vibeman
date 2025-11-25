/**
 * Screen Coverage Prompt Generator
 * Generates Claude Code requirements for creating test scenarios for contexts
 */

export interface ScreenCoveragePromptParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectPort: number;
  contextId: string;
  contextName: string;
  contextDescription: string;
  contextFilePaths: string[];
}

/**
 * Generate screen coverage prompt for a specific context
 */
export function generateScreenCoveragePrompt(params: ScreenCoveragePromptParams): string {
  const {
    projectId,
    projectName,
    projectPath,
    projectPort,
    contextId,
    contextName,
    contextDescription,
    contextFilePaths,
  } = params;

  return `# Screen Coverage: Generate Test Scenario for ${contextName}

## Context

You are tasked with creating a **screenshot test scenario** for the following context in the **${projectName}** project.

**Context Details:**
- **ID**: ${contextId}
- **Name**: ${contextName}
- **Description**: ${contextDescription}
- **Files**: ${contextFilePaths.length} files
- **Project Path**: ${projectPath}
- **Dev Server Port**: ${projectPort}

**Context Files:**
\`\`\`
${contextFilePaths.map((path) => `- ${path}`).join('\n')}
\`\`\`

---

## Objective

**Generate a Playwright test scenario** that navigates to this context's UI feature and saves it to the database.

A test scenario is a JSON array of steps that:
1. **Starts from the homepage** (\`http://localhost:${projectPort}\`)
2. **Navigates to the feature** (via routes, menus, or buttons)
3. **Waits for the feature to load** (for screenshot capture)

**This test scenario will be used for automated screenshot capture** to provide visual documentation of the feature.

---

## Step-by-Step Instructions

### Step 1: Analyze Context Files

Read all files in the context to understand:

1. **Is this a UI feature?**
   - Does it render visual components?
   - Does it have pages, modals, or interactive elements?
   - If **no UI components** (e.g., pure utility files, API routes), **SKIP scenario generation** and set \`test_scenario: null\`

2. **How is it accessed?**
   - **Direct route**: Does it have a Next.js page route? (e.g., \`app/goals/page.tsx\` → \`/goals\`)
   - **Modal/Drawer**: Is it opened by clicking a button?
   - **Nested component**: Is it rendered conditionally on another page?

3. **What are the entry points?**
   - Look for \`data-testid\` attributes on buttons, links, or navigation elements
   - Identify parent pages or layout components
   - Check for route definitions

---

### Step 2: Search for Navigation Elements

**If the feature is NOT directly accessible via route**, search the codebase for:

1. **Navigation components**:
   - Sidebar menus (\`Sidebar.tsx\`, \`Navigation.tsx\`, etc.)
   - Header/navbar components
   - Menu items or navigation links

2. **Buttons that open the feature**:
   - Search for text matching the context name
   - Look for \`data-testid\` attributes like:
     - \`data-testid="${contextName.toLowerCase().replace(/\s+/g, '-')}-btn"\`
     - \`data-testid="open-${contextName.toLowerCase().replace(/\s+/g, '-')}"\`
   - Check onClick handlers that navigate or open modals

3. **Parent pages**:
   - If this is a sub-component, find the page that renders it
   - Look for imports and component usage

**Tools to use:**
\`\`\`bash
# Search for data-testid attributes
grep -r "data-testid" ${projectPath}/src

# Search for context name in navigation
grep -ri "${contextName}" ${projectPath}/src/components
grep -ri "${contextName}" ${projectPath}/src/app/layout
\`\`\`

---

### Step 3: Determine Navigation Path

Based on your analysis, choose the correct navigation strategy:

#### **Option A: Direct Route** (Page Component)

If the context has a page file like \`app/contextname/page.tsx\`:

**Scenario:**
\`\`\`json
[
  { "type": "navigate", "url": "http://localhost:${projectPort}/route-path" },
  { "type": "wait", "delay": 3000 }
]
\`\`\`

#### **Option B: Menu/Sidebar Navigation**

If accessed via sidebar or menu:

**Scenario:**
\`\`\`json
[
  { "type": "navigate", "url": "http://localhost:${projectPort}" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='menu-item-id']" },
  { "type": "wait", "delay": 2000 }
]
\`\`\`

#### **Option C: Modal/Drawer with Button**

If opened by clicking a button on a parent page:

**Scenario:**
\`\`\`json
[
  { "type": "navigate", "url": "http://localhost:${projectPort}/parent-page" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='open-button-id']" },
  { "type": "wait", "delay": 1500 }
]
\`\`\`

#### **Option D: No UI Feature**

If the context contains no UI components (e.g., API routes, utilities, types):

**Set \`test_scenario: null\`** and skip to Step 4.

---

### Step 4: Build Test Scenario JSON

**Valid Step Types:**

1. **Navigate**: Load a URL
   \`\`\`json
   { "type": "navigate", "url": "http://localhost:${projectPort}/path" }
   \`\`\`

2. **Wait**: Pause for loading/rendering
   \`\`\`json
   { "type": "wait", "delay": 3000 }
   \`\`\`

3. **Click**: Click an element
   \`\`\`json
   { "type": "click", "selector": "[data-testid='element-id']" }
   \`\`\`

**Selector Guidelines:**
- ✅ **Use \`data-testid\`** attributes: \`[data-testid='id']\`
- ✅ Search codebase for existing \`data-testid\` values
- ❌ **Avoid CSS classes** (they may change)
- ❌ **Avoid text selectors** (they may be translated/changed)

**Wait Times:**
- After navigation: **2000-3000ms** (page load)
- After clicks: **1000-1500ms** (modal/component render)
- For slow features: **3000-5000ms**

**Example Scenarios:**

\`\`\`json
// Example 1: Direct route to Goals page
[
  { "type": "navigate", "url": "http://localhost:${projectPort}/goals" },
  { "type": "wait", "delay": 3000 }
]

// Example 2: Sidebar menu to Settings
[
  { "type": "navigate", "url": "http://localhost:${projectPort}" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='sidebar-settings']" },
  { "type": "wait", "delay": 2000 }
]

// Example 3: Button to open Create Goal modal
[
  { "type": "navigate", "url": "http://localhost:${projectPort}/goals" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='create-goal-btn']" },
  { "type": "wait", "delay": 1500 }
]
\`\`\`

---

### Step 5: Save Test Scenario to Database

Update the context in the database with the generated test scenario.

**IMPORTANT**: Use the **repository pattern** or **curl** to avoid fetch API issues in Node.js.

**Option A: Using Repository (Recommended)**

\`\`\`typescript
import { contextRepository } from '@/app/db/repositories/context.repository';

const testScenarioSteps = [
  // Your generated scenario steps
];

// Convert to JSON string
const testScenarioJson = JSON.stringify(testScenarioSteps);

// Update context via repository
const updated = contextRepository.updateContext('${contextId}', {
  test_scenario: testScenarioJson, // ← Stringified JSON array or null
});

if (updated) {
  console.log('✅ Test scenario saved successfully!');
  console.log('Context ID: ${contextId}');
  console.log('Test scenario:', testScenarioJson);
} else {
  console.error('❌ Failed to update context');
}
\`\`\`

**Option B: Using curl (Alternative)**

\`\`\`bash
# UI feature found
curl -X PUT "http://localhost:3000/api/contexts" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"${contextId}","updates":{"test_scenario":"[{\\"type\\":\\"navigate\\",\\"url\\":\\"http://localhost:${projectPort}/goals\\"},{\\"type\\":\\"wait\\",\\"delay\\":3000}]"}}'

# No UI feature
curl -X PUT "http://localhost:3000/api/contexts" \\
  -H "Content-Type: application/json" \\
  -d '{"contextId":"${contextId}","updates":{"test_scenario":null}}'
\`\`\`

**IMPORTANT**:
- ✅ **Prefer Option A (repository)** - More reliable and type-safe
- ✅ If **UI feature found**: Set \`test_scenario\` to the **stringified JSON array**
- ✅ If **no UI feature**: Set \`test_scenario: null\`
- ✅ The value must be a **string**, not a raw JSON object
- ❌ **DO NOT use fetch() directly** - It's not available in Node.js .js files without imports

---

## Validation Checklist

Before completing the task, verify:

- [ ] **Context files analyzed** to determine if UI feature exists
- [ ] **Navigation path identified** (route, menu, button, or none)
- [ ] **Test scenario generated** in correct JSON format
- [ ] **Selectors use \`data-testid\`** (not CSS classes)
- [ ] **Wait times are appropriate** (2-3s after navigation, 1-1.5s after clicks)
- [ ] **Scenario starts from homepage** (\`http://localhost:${projectPort}\`) or direct route
- [ ] **Test scenario saved** to database via \`/api/contexts\` PUT request
- [ ] **test_scenario is a string** (stringified JSON array or null)

---

## Example Complete Implementation

\`\`\`typescript
// 1. Analyze context files
// (Read files from: ${contextFilePaths.join(', ')})

// 2. Search for navigation
// Found: data-testid="sidebar-goals" in src/components/Sidebar.tsx

// 3. Build scenario
const testScenarioSteps = [
  { "type": "navigate", "url": "http://localhost:${projectPort}" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='sidebar-goals']" },
  { "type": "wait", "delay": 2000 }
];

// 4. Save to database
const testScenarioJson = JSON.stringify(testScenarioSteps);

const response = await fetch('/api/contexts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contextId: '${contextId}',
    updates: {
      test_scenario: testScenarioJson,
    },
  }),
});

const result = await response.json();
console.log('✅ Test scenario saved:', result);
\`\`\`

---

## Important Notes

- **Always start from homepage** unless direct route exists
- **Test scenarios enable automated screenshots** for documentation
- **Only generate scenarios for UI features** (skip utilities, APIs, types)
- **Use existing \`data-testid\` values** found in codebase
- **Stringify the JSON array** before saving to database
- **Set to null** if no UI feature exists

---

**Begin the analysis and generate the test scenario for: ${contextName}**`;
}
