/**
 * Single Feature Contexts Scan Prompt Template
 * Generates requirement for analyzing ONE feature folder and creating contexts
 */

export interface SingleFeatureContextsScanParams {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectPort: number;
  projectType: string;
  featureName: string;
  featurePath: string;
}

export function singleFeatureContextsScanPrompt(params: SingleFeatureContextsScanParams): string {
  const {
    projectId,
    projectName,
    projectPath,
    projectPort,
    projectType,
    featureName,
    featurePath,
  } = params;

  return `# Single Feature Context Scan: ${featureName}

## Your Mission

Analyze the **${featureName}** feature folder and create intelligent, well-structured contexts for this feature. Each context should represent a cohesive sub-feature or module within this feature.

## Feature Information

- **Project ID**: ${projectId}
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}
- **Project Port**: ${projectPort} (use \`http://localhost:${projectPort}\` for test scenarios)
- **Project Type**: ${projectType}
- **Feature Name**: ${featureName}
- **Feature Path**: ${featurePath}

## 🚨 CRITICAL - API Call Format Rules

**Before making ANY API calls, read this carefully:**

### Windows Path Handling:
- ✅ **ALWAYS use forward slashes** in paths: \`C:/Users/...\`
- ❌ **NEVER use backslashes**: \`C:\\Users\\...\` (causes JSON parse errors)

### JSON Format in curl:
- ✅ **Keep JSON in ONE LINE** in the \`-d\` parameter
- ✅ Format: \`curl -X POST "url" -H "Content-Type: application/json" -d '{"key":"value"}'\`
- ❌ **NEVER use multi-line JSON** in \`-d\` parameter
- ❌ **NEVER wrap in "body" property**

### Example - CORRECT format:
\`\`\`bash
curl -X POST "http://localhost:3000/api/file-dependencies" -H "Content-Type: application/json" -d '{"filePath":"C:/Users/kazda/kiro/vibeman/src/app/page.tsx","projectPath":"C:/Users/kazda/kiro/vibeman","maxDepth":3}'
\`\`\`

## Step-by-Step Instructions

### Step 1: Analyze Feature Structure

Explore the feature folder to understand its structure:

\`\`\`bash
# List all files in the feature folder
find "${featurePath}" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -n 50
\`\`\`

Identify:
1. **Main entry points** (page.tsx, layout.tsx, index.tsx)
2. **Sub-features** (folders with prefix \`sub_\`)
3. **Component groups** (components/ folder)
4. **Business logic** (lib/ folder, hooks/)
5. **API routes** (if feature has API endpoints)

### Step 2: Use Dependency Analysis

For each major entry point, trace dependencies:

\`\`\`bash
curl -X POST "http://localhost:3000/api/file-dependencies" \\
  -H "Content-Type: application/json" \\
  -d '{"filePath":"C:/Users/kazda/kiro/vibeman/${featurePath}/MainFile.tsx","projectPath":"C:/Users/kazda/kiro/vibeman","maxDepth":3}'
\`\`\`

**IMPORTANT**: Use forward slashes in paths even on Windows!

### Step 3: Group into Logical Contexts

Create 1-3 contexts for this feature based on:

**Grouping Strategy:**
- If feature is small (<15 files): Create 1 context for entire feature
- If feature is medium (15-30 files): Create 2 contexts (e.g., UI + Logic)
- If feature is large (>30 files): Create 2-3 contexts by sub-features or modules

**Context Size Guidelines:**
- Target: 5-15 files per context
- Maximum: 20 files per context
- Minimum: 3 files per context

**Naming Convention:**
- Use feature name + specific area: "${featureName} - [Sub-feature/Module]"
- Examples:
  - "Goals Management - Core System"
  - "Goals Management - Implementation Logs"
  - "Ideas - Scan Engine"
  - "Ideas - Buffer & Filters"

### Step 4: Generate Descriptions

For each context, create a comprehensive description following this EXACT structure:

\`\`\`markdown
## Overview
[2-3 sentences describing what this sub-feature does]

## Key Capabilities
- Capability 1: [description]
- Capability 2: [description]
- Capability 3: [description]

## Architecture

### Component Breakdown
| Component/File | Purpose | Layer |
|----------------|---------|-------|
| \`path/to/file1.tsx\` | [Short description] | UI |
| \`path/to/file2.ts\` | [Short description] | Service |
| \`path/to/file3.ts\` | [Short description] | Data |

### Data Flow
[Describe how data flows through the system]

### Key Dependencies
- External: [External packages used]
- Internal: [Other contexts this depends on]

## Technical Details

### State Management
[How state is managed]

### API Endpoints
[List relevant API endpoints if applicable]

### Database Tables
[List relevant database tables if applicable]
\`\`\`

### Step 5: Generate Test Scenarios (UI Features Only)

**When to create test scenarios:**
- ✅ Context includes page.tsx, layout.tsx, or major UI components
- ✅ Context represents a user-facing feature
- ❌ Context is purely backend/logic (skip test scenario)

**Test Scenario Requirements:**
1. **Start from homepage**: \`http://localhost:${projectPort}\`
2. **Navigate to feature**: Find navigation path through codebase
3. **Use data-testid selectors**: Search for existing data-testid attributes
4. **Keep it simple**: Minimum steps to show the feature

**Format** (direct JSON array, NOT wrapped in {"steps": ...}):
\`\`\`json
[
  { "type": "navigate", "url": "http://localhost:${projectPort}" },
  { "type": "wait", "delay": 3000 },
  { "type": "click", "selector": "[data-testid='feature-btn']" },
  { "type": "wait", "delay": 1500 }
]
\`\`\`

**Valid step types:**
- \`navigate\`: \`{ "type": "navigate", "url": "http://localhost:${projectPort}/path" }\`
- \`wait\`: \`{ "type": "wait", "delay": 3000 }\`
- \`click\`: \`{ "type": "click", "selector": "[data-testid='id']" }\`

**CRITICAL**: The test scenario must be a **stringified JSON array**, NOT an object with "steps" property!

**Finding navigation:**
1. Check if feature has direct route (e.g., \`/goals\`, \`/ideas\`)
2. If yes: Navigate directly to route
3. If no: Search for navigation elements (sidebar, menu) with data-testid

### Step 6: Create Contexts in Database

For each context, call the API:

\`\`\`bash
curl -X POST "http://localhost:3000/api/contexts" \\
  -H "Content-Type: application/json" \\
  -d '{"projectId":"${projectId}","name":"${featureName} - Context Name","description":"## Overview\\n...","filePaths":["src/app/features/${featureName}/file1.tsx","src/app/features/${featureName}/file2.ts"],"testScenario":"[{\\"type\\":\\"navigate\\",\\"url\\":\\"http://localhost:${projectPort}/route\\"},{\\"type\\":\\"wait\\",\\"delay\\":3000}]"}'
\`\`\`

**CRITICAL testScenario Format:**
- Must be a **stringified JSON array**: \`"[{...},{...}]"\`
- NOT an object with "steps": \`"{\\"steps\\":[...]}"\` ❌
- Use double backslash for nested quotes: \`\\"\`
- Example: \`"testScenario":"[{\\"type\\":\\"navigate\\",\\"url\\":\\"http://localhost:3000/\\"}]"\`

**Field Requirements:**
- \`projectId\`: "${projectId}"
- \`name\`: "${featureName} - [Specific area]"
- \`description\`: Full markdown following structure above
- \`filePaths\`: Array of relative paths from project root
- \`testScenario\`: Stringified JSON array (UI features only) or null

### Step 7: Verification

After creating all contexts:

\`\`\`bash
curl -X GET "http://localhost:3000/api/contexts?projectId=${projectId}"
\`\`\`

Filter to see contexts for this feature and verify they were created correctly.

## Expected Outcome

### For Small Feature (<15 files):
✅ 1 context covering the entire feature
✅ Comprehensive description
✅ Test scenario (if UI feature)

### For Medium Feature (15-30 files):
✅ 2 contexts logically grouped
✅ Each with comprehensive description
✅ Test scenarios for UI contexts

### For Large Feature (>30 files):
✅ 2-3 contexts by sub-features/modules
✅ Each with comprehensive description
✅ Test scenarios for UI contexts

## Quality Checklist

- [ ] Each context has 5-15 files (max 20)
- [ ] Descriptions follow the EXACT structure provided
- [ ] File paths are relative from project root
- [ ] Test scenarios use correct format (array, not object)
- [ ] Test scenarios start from \`http://localhost:${projectPort}\`
- [ ] Test scenarios use data-testid selectors
- [ ] Context names include feature name: "${featureName} - [Area]"
- [ ] All files in feature folder are included in at least one context

## Success Criteria

✅ Feature is fully covered by 1-3 contexts
✅ Each context is cohesive and well-defined
✅ Descriptions are comprehensive and follow structure
✅ UI features have working test scenarios
✅ All contexts successfully created in database

---

**Begin analyzing the ${featureName} feature now. Focus on creating high-quality, well-structured contexts that accurately represent the feature's architecture.**
`;
}
