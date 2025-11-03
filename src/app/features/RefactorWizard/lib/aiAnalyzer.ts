import { generateWithLLM } from '@/lib/llm';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { FileAnalysis } from './types';

/**
 * AI-powered code analysis
 */

/**
 * Builds analysis prompt for AI
 */
function buildAnalysisPrompt(files: FileAnalysis[]): string {
  const fileDescriptions = files.map(f =>
    `File: ${f.path} (${f.lines} lines)\n\`\`\`\n${f.content.slice(0, 2000)}\n\`\`\``
  ).join('\n\n');

  return `Analyze the following TypeScript/React code files for refactoring opportunities.

Focus on:
- Architectural issues (tight coupling, poor separation of concerns)
- Performance bottlenecks (unnecessary re-renders, inefficient algorithms)
- Security vulnerabilities (XSS, injection, insecure patterns)
- Code quality issues (complexity, naming, patterns)
- Maintainability concerns (duplication, unclear logic)

${fileDescriptions}

Provide a JSON array of refactoring opportunities with this structure:
[
  {
    "title": "Brief title",
    "description": "Detailed description",
    "category": "performance|maintainability|security|code-quality|duplication|architecture",
    "severity": "low|medium|high|critical",
    "impact": "What improves",
    "effort": "low|medium|high",
    "files": ["path1", "path2"],
    "suggestedFix": "How to fix it",
    "autoFixAvailable": true/false,
    "estimatedTime": "time estimate"
  }
]

Return ONLY valid JSON, no additional text.`;
}

/**
 * Parses AI response into refactoring opportunities
 */
function parseAIResponse(response: string, files: FileAnalysis[]): RefactorOpportunity[] {
  try {
    // Validate input
    if (!response || typeof response !== 'string') {
      console.error('Invalid AI response: not a string or empty');
      return [];
    }

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No JSON array found in AI response. Response preview:', response.slice(0, 200));
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      console.error('Parsed AI response is not an array');
      return [];
    }

    return parsed.map((item: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      title: item.title || 'Untitled opportunity',
      description: item.description || '',
      category: item.category || 'code-quality',
      severity: item.severity || 'medium',
      impact: item.impact || '',
      effort: item.effort || 'medium',
      files: item.files || files.map(f => f.path),
      suggestedFix: item.suggestedFix,
      autoFixAvailable: item.autoFixAvailable || false,
      estimatedTime: item.estimatedTime,
    }));
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return [];
  }
}

/**
 * Uses AI to analyze code for deeper refactoring opportunities
 */
export async function analyzeWithAI(
  files: FileAnalysis[],
  provider: string = 'gemini',
  model: string = 'gemini-2.0-flash-exp'
): Promise<RefactorOpportunity[]> {
  const opportunities: RefactorOpportunity[] = [];

  // Batch files for analysis (don't send too much at once)
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const prompt = buildAnalysisPrompt(batch);

    try {
      const response = await generateWithLLM({
        prompt,
        provider: provider as any,
        model,
        temperature: 0.3,
        maxTokens: 4000,
      });

      // Validate response before parsing
      if (!response || !response.text) {
        console.error('AI analysis returned empty or invalid response');
        continue;
      }

      const aiOpportunities = parseAIResponse(response.text, batch);
      opportunities.push(...aiOpportunities);
    } catch (error) {
      console.error('AI analysis error for batch:', error);
      // Continue with next batch instead of failing completely
    }
  }

  return opportunities;
}

/**
 * Deduplicates opportunities based on category, files, and description
 */
export function deduplicateOpportunities(opportunities: RefactorOpportunity[]): RefactorOpportunity[] {
  const seen = new Set<string>();
  const unique: RefactorOpportunity[] = [];

  for (const opp of opportunities) {
    // Create a key based on category, files, and description
    const key = `${opp.category}-${opp.files.join(',')}-${opp.description.slice(0, 50)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(opp);
    }
  }

  return unique;
}
