/**
 * AI-Powered Wizard Optimizer
 * Uses LLM to analyze project structure and suggest optimal scan configuration
 */

import { llmManager } from '@/lib/llm';
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
    const plan = await buildWizardPlan(files, provider, model);
    return { success: true, plan };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build the wizard plan from file analysis
 */
async function buildWizardPlan(
  files: FileAnalysis[],
  provider: SupportedProvider,
  model?: string
): Promise<WizardPlan> {
  const projectType = detectProjectType(files);
  const relevantGroups = getScanGroupsForProjectType(projectType);

  const fileTree = buildFileTreeSummary(files);
  const sampleFiles = selectSampleFiles(files);
  const prompt = buildAnalysisPrompt(projectType, fileTree, sampleFiles, relevantGroups);

  const aiRecommendations = await getAIRecommendations(provider, model, prompt);
  const recommendedGroups = filterGroupsByAIRecommendations(
    relevantGroups,
    aiRecommendations.recommendedGroupIds
  );

  return {
    projectType,
    detectedFrameworks: aiRecommendations.frameworks,
    recommendedGroups,
    reasoning: aiRecommendations.reasoning,
    confidence: aiRecommendations.confidence,
  };
}

/**
 * Get AI recommendations from LLM
 */
async function getAIRecommendations(
  provider: SupportedProvider,
  model: string | undefined,
  prompt: string
) {
  const response = await llmManager.generate({
    provider,
    model: model || llmManager.getDefaultModel(provider),
    prompt,
    temperature: 0.3,
  });

  if (!response.success || !response.response) {
    throw new Error(response.error || 'Failed to generate AI response');
  }

  return parseAIResponse(response.response);
}

/**
 * Helper: Count files by root directory
 */
function countFilesByDirectory(files: FileAnalysis[]): Record<string, number> {
  const tree: Record<string, number> = {};
  files.forEach(file => {
    const parts = file.path.split(/[/\\]/);
    const rootDir = parts[0] || 'root';
    tree[rootDir] = (tree[rootDir] || 0) + 1;
  });
  return tree;
}

/**
 * Build a concise file tree summary for AI analysis
 */
function buildFileTreeSummary(files: FileAnalysis[]): string {
  const tree = countFilesByDirectory(files);
  const lines = Object.entries(tree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dir, count]) => `  ${dir}/ (${count} files)`);

  return lines.join('\n');
}

/**
 * Priority patterns for sample file selection
 */
const SAMPLE_FILE_PATTERNS = [
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

/**
 * Helper: Find files matching priority patterns
 */
function findPriorityFiles(files: FileAnalysis[], maxCount: number): FileAnalysis[] {
  const samples: FileAnalysis[] = [];
  SAMPLE_FILE_PATTERNS.forEach(pattern => {
    const match = files.find(f => pattern.test(f.path));
    if (match && samples.length < maxCount) {
      samples.push(match);
    }
  });
  return samples;
}

/**
 * Helper: Fill remaining slots with largest files
 */
function fillWithLargestFiles(
  files: FileAnalysis[],
  existingSamples: FileAnalysis[],
  targetCount: number
): FileAnalysis[] {
  return files
    .filter(f => !existingSamples.includes(f))
    .sort((a, b) => b.lines - a.lines)
    .slice(0, targetCount - existingSamples.length);
}

/**
 * Select representative sample files for AI analysis
 */
function selectSampleFiles(files: FileAnalysis[]): FileAnalysis[] {
  const maxSamples = 5;
  const samples = findPriorityFiles(files, maxSamples);

  if (samples.length < maxSamples) {
    const remaining = fillWithLargestFiles(files, samples, maxSamples);
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
