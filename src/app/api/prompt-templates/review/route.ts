/**
 * Template Review API
 * LLM-powered template analysis and improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { llmManager } from '@/lib/llm/llm-manager';
import type { SupportedProvider } from '@/lib/llm/types';
import type { PromptTemplateCategory } from '@/app/db/models/types';

interface TemplateFeedback {
  clarity: number;
  completeness: number;
  suggestions: string[];
  improvedVersion?: string;
}

/**
 * POST - Review template content with LLM
 * Body:
 *   - templateContent (required): Template text to review
 *   - category (required): Template category for context
 *   - provider (optional): LLM provider to use (default: ollama)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateContent, category, provider = 'ollama' } = body;

    if (!templateContent) {
      return NextResponse.json({ error: 'templateContent is required' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }

    const systemPrompt = `You are an expert prompt engineer reviewing prompt templates. Analyze the given template and provide constructive feedback.

Output ONLY valid JSON with this exact structure:
{
  "clarity": <number 1-5>,
  "completeness": <number 1-5>,
  "suggestions": [<string>, ...],
  "improvedVersion": "<optional improved template>"
}

Scoring guide:
- clarity: How clear and unambiguous is the template? (1=confusing, 5=crystal clear)
- completeness: Does it include all necessary context and instructions? (1=missing critical info, 5=comprehensive)

Provide 2-4 actionable suggestions for improvement.
If the template could benefit significantly from changes, provide an improvedVersion.
No explanations outside the JSON. Output only the JSON object.`;

    const categoryLabels: Record<PromptTemplateCategory, string> = {
      storywriting: 'Creative Writing / Storytelling',
      research: 'Research & Analysis',
      code_generation: 'Code Generation',
      analysis: 'Data Analysis',
      review: 'Code Review',
      custom: 'Custom / General Purpose',
    };

    const userPrompt = `Review this ${categoryLabels[category as PromptTemplateCategory] || category} template:

---
${templateContent}
---

Analyze for:
1. Clarity of instructions
2. Proper use of variables ({{VARIABLE}} syntax)
3. Sufficient context for the LLM
4. Appropriate structure for the category
5. Any missing elements that would improve output quality

Provide your analysis as JSON.`;

    // Call LLM
    const result = await llmManager.generate({
      prompt: userPrompt,
      systemPrompt,
      provider: provider as SupportedProvider,
    });

    if (!result.success || !result.response) {
      return NextResponse.json({ error: result.error || 'LLM returned empty response' }, { status: 500 });
    }

    // Parse JSON response
    let feedback: TemplateFeedback;
    try {
      let jsonStr = result.response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and sanitize response
      feedback = {
        clarity: Math.max(1, Math.min(5, Math.round(parsed.clarity || 3))),
        completeness: Math.max(1, Math.min(5, Math.round(parsed.completeness || 3))),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5)
          : [],
        improvedVersion: typeof parsed.improvedVersion === 'string' && parsed.improvedVersion.trim()
          ? parsed.improvedVersion.trim()
          : undefined,
      };
    } catch {
      console.error('Failed to parse LLM response:', result.response);
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...feedback,
      provider: result.provider,
      tokens: result.usage?.total_tokens,
    });
  } catch (error) {
    console.error('Failed to review template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to review template' },
      { status: 500 }
    );
  }
}
