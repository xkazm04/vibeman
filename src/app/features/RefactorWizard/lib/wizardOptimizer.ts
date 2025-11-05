/**
 * AI-Powered Wizard Optimizer
 * Uses LLM to analyze project structure and suggest optimal scan configuration
 */

import { createLLMClient } from '@/lib/llm';
import type { SupportedProvider } from '@/lib/llm/types';
import {
  detectProjectType,
  getScanGroupsForProjectType,
  type ProjectType,
  type ScanTechniqueGroup,
} from './scanTechniques';
import type { FileAnalysis } from './types';

export interface WizardPlan {
  projectType: ProjectType;
  detectedFrameworks: string[];
  recommendedGroups: ScanTechniqueGroup[];
  reasoning: string;
  confidence: number; // 0-100
}

export interface OptimizationResult {
  success: boolean;
  plan?: WizardPlan;
  error?: string;
}

/**
 * Analyze project structure and generate AI-powered wizard configuration
 */
export async function generateWizardPlan(
  files: FileAnalysis[],
  provider: SupportedProvider = 'gemini',
  model?: string
): Promise<OptimizationResult> {
  try {
    // Detect basic project type
    const projectType = detectProjectType(files);
    const relevantGroups = getScanGroupsForProjectType(projectType);

    // Build file tree summary for AI
    const fileTree = buildFileTreeSummary(files);
    const sampleFiles = selectSampleFiles(files);

    // Get LLM client
    const llm = await createLLMClient(provider, model);

    // Construct prompt for AI analysis
    const prompt = buildAnalysisPrompt(projectType, fileTree, sampleFiles, relevantGroups);

    // Call AI
    const response = await llm.generateText(prompt);

    // Parse AI response
    const aiRecommendations = parseAIResponse(response);

    // Filter recommended groups based on AI suggestions
    const recommendedGroups = filterGroupsByAIRecommendations(
      relevantGroups,
      aiRecommendations.recommendedGroupIds
    );

    const plan: WizardPlan = {
      projectType,
      detectedFrameworks: aiRecommendations.frameworks,
      recommendedGroups,
      reasoning: aiRecommendations.reasoning,
      confidence: aiRecommendations.confidence,
    };

    return {
      success: true,
      plan,
    };
  } catch (error) {
    console.error('[WizardOptimizer] Error generating plan:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build a concise file tree summary for AI analysis
 */
function buildFileTreeSummary(files: FileAnalysis[]): string {
  const tree: Record<string, number> = {};

  files.forEach(file => {
    const parts = file.path.split(/[/\\]/);
    const rootDir = parts[0] || 'root';
    tree[rootDir] = (tree[rootDir] || 0) + 1;
  });

  const lines = Object.entries(tree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dir, count]) => `  ${dir}/ (${count} files)`);

  return lines.join('\n');
}

/**
 * Select representative sample files for AI analysis
 */
function selectSampleFiles(files: FileAnalysis[]): FileAnalysis[] {
  // Prioritize: package.json, config files, main app files
  const priority = [
    /package\.json$/,
    /next\.config/,
    /tsconfig\.json$/,
    /app\/layout\./,
    /app\/page\./,
    /pages\/_app/,
    /main\.py$/,
    /app\.py$/,
    /requirements\.txt$/,
  ];

  const samples: FileAnalysis[] = [];

  // Add files matching priority patterns
  priority.forEach(pattern => {
    const match = files.find(f => pattern.test(f.path));
    if (match && samples.length < 5) {
      samples.push(match);
    }
  });

  // Fill remaining slots with largest files
  if (samples.length < 5) {
    const remaining = files
      .filter(f => !samples.includes(f))
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 5 - samples.length);
    samples.push(...remaining);
  }

  return samples;
}

/**
 * Build AI analysis prompt
 */
function buildAnalysisPrompt(
  projectType: ProjectType,
  fileTree: string,
  sampleFiles: FileAnalysis[],
  availableGroups: ScanTechniqueGroup[]
): string {
  const sampleFilesText = sampleFiles
    .map(f => {
      const preview = f.content.slice(0, 500);
      return `### ${f.path} (${f.lines} lines)\n\`\`\`\n${preview}\n...\n\`\`\``;
    })
    .join('\n\n');

  const groupsText = availableGroups
    .map(g => `- **${g.id}**: ${g.name} - ${g.description}`)
    .join('\n');

  return `You are an expert code analyzer. Analyze this project structure and recommend which scan technique groups are most relevant.

**Project Type Detected**: ${projectType}

**File Tree Summary**:
${fileTree}

**Sample Files**:
${sampleFilesText}

**Available Scan Groups**:
${groupsText}

Based on this project structure, respond in JSON format with:
{
  "frameworks": ["framework1", "framework2"],
  "recommendedGroupIds": ["group-id-1", "group-id-2"],
  "reasoning": "Brief explanation of why these groups are recommended",
  "confidence": 85
}

Focus on:
1. Identifying the primary frameworks/libraries in use
2. Selecting the most impactful scan groups for this specific project
3. Avoiding unnecessary scans that don't apply to this project type
4. Providing clear reasoning for your recommendations

Respond ONLY with valid JSON, no additional text.`;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response: string): {
  frameworks: string[];
  recommendedGroupIds: string[];
  reasoning: string;
  confidence: number;
} {
  try {
    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      frameworks: parsed.frameworks || [],
      recommendedGroupIds: parsed.recommendedGroupIds || [],
      reasoning: parsed.reasoning || 'AI analysis completed',
      confidence: parsed.confidence || 50,
    };
  } catch (error) {
    console.error('[WizardOptimizer] Error parsing AI response:', error);
    // Fallback: return default recommendations
    return {
      frameworks: [],
      recommendedGroupIds: ['code-quality', 'maintainability', 'security'],
      reasoning: 'Using default recommendations due to parsing error',
      confidence: 30,
    };
  }
}

/**
 * Filter groups based on AI recommendations
 */
function filterGroupsByAIRecommendations(
  availableGroups: ScanTechniqueGroup[],
  recommendedIds: string[]
): ScanTechniqueGroup[] {
  // Include all recommended groups
  const recommended = availableGroups.filter(g => recommendedIds.includes(g.id));

  // Always include high-priority groups even if not explicitly recommended
  const highPriority = availableGroups.filter(g => g.priority >= 9 && !recommendedIds.includes(g.id));

  return [...recommended, ...highPriority];
}
