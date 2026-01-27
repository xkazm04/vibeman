/**
 * Base Scan Prompt Builder
 *
 * Shared infrastructure for all scan types (Refactor, Beautify, Performance).
 * Provides consistent structure, Direction generation, and API integration.
 */

export type ScanType = 'refactor' | 'beautify' | 'performance';

/**
 * Context information for providing codebase awareness
 * NOTE: This information is derived from the Context Group and its Contexts,
 * NOT passed as external codebase data. The scan uses file references from
 * the contexts within the group to understand the codebase structure.
 */
export interface ContextGroupInfo {
  /** Files organized by category from contexts in this group */
  filesByCategory?: {
    ui?: string[];
    lib?: string[];
    api?: string[];
    data?: string[];
    config?: string[];
    test?: string[];
  };
  /** Summary of what this context group represents */
  groupDescription?: string;
  /** Related context names within the group */
  contextNames?: string[];
  /** Detected patterns from file analysis */
  detectedPatterns?: string[];
}

export interface BaseScanPromptOptions {
  // Required metadata
  scanType: ScanType;
  groupName: string;
  groupId: string;
  projectId: string;
  projectPath: string;
  filePaths: string[];

  // Optional configuration
  apiBaseUrl?: string;
  projectType?: 'nextjs' | 'react' | 'express' | 'fastapi' | 'django' | 'rails' | 'generic' | 'combined';

  // Context group information for codebase awareness
  contextGroupInfo?: ContextGroupInfo;
}

export interface ScanSpecificContent {
  /** Title for the scan (e.g., "Refactor Scan") */
  title: string;
  /** Mission statement for Part 1 */
  missionPart1: string;
  /** Mission statement for Part 2 */
  missionPart2: string;
  /** The immediate fixes/actions section content */
  immediateActionsSection: string;
  /** Categories to look for when generating directions */
  directionCategories: Array<{ name: string; description: string }>;
  /** Example excellent directions */
  excellentDirections: string[];
  /** Example bad directions */
  badDirections: string[];
  /** When to generate directions criteria */
  whenToGenerateCriteria: string[];
  /** Max directions to generate (e.g., "0-3") */
  maxDirections: string;
  /** Direction markdown sections specific to this scan type */
  directionMarkdownSections: string;
  /** JSON summary schema for output */
  summaryJsonExample: string;
}

/**
 * Build the metadata section (shared across all scans)
 */
function buildMetadataSection(options: BaseScanPromptOptions): string {
  const { projectId, projectPath, groupId, groupName, apiBaseUrl, projectType } = options;

  let metadata = `## Metadata
- **Project ID**: \`${projectId}\`
- **Project Path**: \`${projectPath}\`
- **Context Group ID**: \`${groupId}\`
- **Context Group Name**: ${groupName}
- **API Base URL**: ${apiBaseUrl || 'http://localhost:3000'}`;

  if (projectType) {
    metadata += `\n- **Project Type**: ${projectType}`;
  }

  return metadata;
}

/**
 * Build the codebase context section from context group info
 * NOTE: This uses data from the Context Group's contexts, not external codebase data
 */
function buildCodebaseContextSection(options: BaseScanPromptOptions): string {
  const { contextGroupInfo, filePaths } = options;

  if (!contextGroupInfo) {
    return '';
  }

  let section = `\n## Codebase Context (from Context Group)

This context group contains organized code contexts. Use this information to:
- Leverage existing patterns instead of creating new ones
- Understand the file organization and conventions
- Identify related code that may need consistent treatment
`;

  if (contextGroupInfo.groupDescription) {
    section += `\n**Group Purpose**: ${contextGroupInfo.groupDescription}\n`;
  }

  if (contextGroupInfo.contextNames && contextGroupInfo.contextNames.length > 0) {
    section += `\n**Contexts in Group**: ${contextGroupInfo.contextNames.join(', ')}\n`;
  }

  if (contextGroupInfo.filesByCategory) {
    section += `\n**File Organization**:\n`;
    const { ui, lib, api, data, config, test } = contextGroupInfo.filesByCategory;
    if (ui?.length) section += `- UI Components: ${ui.length} files\n`;
    if (lib?.length) section += `- Library/Utilities: ${lib.length} files\n`;
    if (api?.length) section += `- API Routes: ${api.length} files\n`;
    if (data?.length) section += `- Data/Models: ${data.length} files\n`;
    if (config?.length) section += `- Configuration: ${config.length} files\n`;
    if (test?.length) section += `- Tests: ${test.length} files\n`;
  }

  if (contextGroupInfo.detectedPatterns && contextGroupInfo.detectedPatterns.length > 0) {
    section += `\n**Detected Patterns** (leverage these instead of creating new ones):\n`;
    contextGroupInfo.detectedPatterns.forEach(pattern => {
      section += `- ${pattern}\n`;
    });
  }

  // Add file count summary
  section += `\n**Files to Analyze**: ${filePaths.length} files\n`;

  return section;
}

/**
 * Build the Direction generation section (shared structure, customizable content)
 */
function buildDirectionSection(
  options: BaseScanPromptOptions,
  content: ScanSpecificContent
): string {
  const { groupId, groupName, projectId, apiBaseUrl, scanType } = options;
  const baseUrl = apiBaseUrl || 'http://localhost:3000';

  const excellentList = content.excellentDirections.map(d => `- "${d}"`).join('\n');
  const badList = content.badDirections.map(d => `- "${d}"`).join('\n');
  const categoriesList = content.directionCategories
    .map((c, i) => `${i + 1}. **${c.name}**: ${c.description}`)
    .join('\n\n');
  const criteriaList = content.whenToGenerateCriteria.map(c => `- ${c}`).join('\n');

  return `
## PART 2: Strategic Direction Generation

While performing immediate actions, identify opportunities for **substantial improvements** that would benefit from a dedicated Claude Code session (30-90 minutes of work).

### What Makes a Good Direction

**EXCELLENT directions** (30-90 min work, high impact):
${excellentList}

**BAD directions** (too small or vague):
${badList}

### Direction Categories to Look For

${categoriesList}

### When to Generate Directions

Generate a Direction when you observe:
${criteriaList}

**Generate ${content.maxDirections} directions per scan.** Only create directions for genuinely impactful opportunities.

---

## Output Requirements

### Step 1: Perform Immediate Actions
${content.missionPart1}

### Step 2: Generate Directions (if opportunities found)

For each strategic opportunity, create a direction. Use proper JSON escaping for the markdown content.

**IMPORTANT**: Write the direction content to a temporary file first to handle escaping properly:

\`\`\`bash
# Step 1: Write direction markdown to temp file
cat > /tmp/direction_content.md << 'DIRECTION_EOF'
${content.directionMarkdownSections}
DIRECTION_EOF

# Step 2: Create the direction via API with proper escaping
curl -X POST "${baseUrl}/api/directions" \\
  -H "Content-Type: application/json" \\
  -d "$(cat <<EOF
{
  "project_id": "${projectId}",
  "context_map_id": "${groupId}",
  "context_map_title": "${groupName}",
  "context_group_id": "${groupId}",
  "context_name": "${groupName}",
  "source_scan_type": "${scanType}",
  "summary": "YOUR_COMPELLING_ONE_LINER_HERE",
  "direction": $(cat /tmp/direction_content.md | jq -Rs .)
}
EOF
)"
\`\`\`

**Alternative** (for simpler directions without special characters):
\`\`\`bash
curl -X POST "${baseUrl}/api/directions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "context_map_id": "${groupId}",
    "context_map_title": "${groupName}",
    "context_group_id": "${groupId}",
    "context_name": "${groupName}",
    "source_scan_type": "${scanType}",
    "summary": "Your compelling one-liner",
    "direction": "## Vision\\n\\nYour markdown content with escaped newlines"
  }'
\`\`\`

### Step 3: Output Final Summary

At the end, output a JSON summary block:

\`\`\`json
${content.summaryJsonExample}
\`\`\``;
}

/**
 * Build the complete scan prompt
 */
export function buildBaseScanPrompt(
  options: BaseScanPromptOptions,
  content: ScanSpecificContent
): string {
  const { groupName, filePaths } = options;
  const fileList = filePaths.map(f => `- \`${f}\``).join('\n');

  const metadataSection = buildMetadataSection(options);
  const codebaseContextSection = buildCodebaseContextSection(options);
  const directionSection = buildDirectionSection(options, content);

  return `
# ${content.title}: ${groupName}

You are performing an intelligent ${content.title.toLowerCase()} on the "${groupName}" context group.
Your mission has TWO parts:
1. **${content.missionPart1}**
2. **${content.missionPart2}**

${metadataSection}
${codebaseContextSection}

## Files to Analyze
${fileList}

---

## PART 1: ${content.missionPart1}

${content.immediateActionsSection}

---
${directionSection}

---

## Important Notes

- Be thorough but efficient with immediate actions
- Only modify files when confident the change is safe
- Preserve all existing functionality
- Quality over quantity for directions - fewer excellent ones beat many mediocre ones
- Each direction should represent 30-90 minutes of dedicated work
- Use existing patterns from the codebase context when available
`.trim();
}

/**
 * Shared summary parsing logic
 */
export function parseBaseScanSummary<T>(output: string): T | null {
  // Try to find JSON in code block
  const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      // Fall through to raw match
    }
  }

  // Try to find raw JSON object
  const rawMatch = output.match(/\{[\s\S]*"filesScanned"[\s\S]*\}/);
  if (rawMatch) {
    try {
      return JSON.parse(rawMatch[0]) as T;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Helper to categorize files by type
 */
export function categorizeFiles(filePaths: string[]): ContextGroupInfo['filesByCategory'] {
  const categories: ContextGroupInfo['filesByCategory'] = {
    ui: [],
    lib: [],
    api: [],
    data: [],
    config: [],
    test: [],
  };

  for (const filePath of filePaths) {
    const lower = filePath.toLowerCase();

    if (lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__')) {
      categories.test?.push(filePath);
    } else if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('route.ts')) {
      categories.api?.push(filePath);
    } else if (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('.tsx')) {
      categories.ui?.push(filePath);
    } else if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/hooks/') || lower.includes('/helpers/')) {
      categories.lib?.push(filePath);
    } else if (lower.includes('/models/') || lower.includes('/types/') || lower.includes('/data/') || lower.includes('.types.ts')) {
      categories.data?.push(filePath);
    } else if (lower.includes('config') || lower.includes('.config.') || lower.includes('/settings/')) {
      categories.config?.push(filePath);
    } else if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) {
      categories.ui?.push(filePath);
    } else {
      categories.lib?.push(filePath);
    }
  }

  return categories;
}

/**
 * Detect common patterns from file paths
 */
export function detectPatterns(filePaths: string[]): string[] {
  const patterns: string[] = [];
  const fileContents = filePaths.join('\n').toLowerCase();

  // React patterns
  if (fileContents.includes('use') && fileContents.includes('hook')) {
    patterns.push('Custom React hooks pattern (check /hooks/ folder)');
  }
  if (fileContents.includes('context') || fileContents.includes('provider')) {
    patterns.push('React Context/Provider pattern');
  }
  if (fileContents.includes('store') || fileContents.includes('zustand')) {
    patterns.push('Zustand state management');
  }

  // API patterns
  if (fileContents.includes('/api/') && fileContents.includes('route')) {
    patterns.push('Next.js API routes pattern');
  }

  // Component patterns
  if (fileContents.includes('components/ui')) {
    patterns.push('Shared UI components in /components/ui/');
  }

  // Utility patterns
  if (fileContents.includes('/lib/') || fileContents.includes('/utils/')) {
    patterns.push('Utility functions in /lib/ or /utils/');
  }

  // Repository pattern
  if (fileContents.includes('repository')) {
    patterns.push('Repository pattern for data access');
  }

  return patterns;
}
