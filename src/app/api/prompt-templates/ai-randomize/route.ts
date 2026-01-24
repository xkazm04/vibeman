/**
 * AI Randomize API
 * Generates creative random values for template variables using LLM
 */

import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateDb } from '@/app/db';
import { llmManager } from '@/lib/llm/llm-manager';
import type { SupportedProvider } from '@/lib/llm/types';
import type { PromptTemplateVariable } from '@/app/db/models/types';

/**
 * POST - Generate random values for template variables
 * Body:
 *   - templateId (required): Template ID
 *   - provider (optional): LLM provider to use (default: ollama)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, provider = 'ollama' } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    // Get the template
    const template = promptTemplateDb.getById(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Parse variables
    const variables: PromptTemplateVariable[] = JSON.parse(template.variables || '[]');
    if (variables.length === 0) {
      return NextResponse.json({ variables: {} });
    }

    // Build prompt for LLM
    const variableDescriptions = variables
      .map((v) => {
        const typeHint = v.type === 'number' ? 'a number' : v.type === 'boolean' ? 'true or false' : 'text';
        return `- ${v.name} (${typeHint})${v.description ? `: ${v.description}` : ''}`;
      })
      .join('\n');

    const systemPrompt = `You are a creative content generator. Generate interesting, contextually appropriate values for template variables.
Output ONLY valid JSON object with variable names as keys and generated values as strings.
No explanations, no markdown, just pure JSON.`;

    const userPrompt = `Generate creative, contextually appropriate values for a "${template.category}" template named "${template.name}".

Template description: ${template.description || 'No description'}

Template content preview:
${template.template_content.slice(0, 500)}${template.template_content.length > 500 ? '...' : ''}

Variables to fill:
${variableDescriptions}

Generate engaging, varied values that would make for an interesting result. Be creative but appropriate for the template category.
Return ONLY a JSON object like: {"VARIABLE1": "value1", "VARIABLE2": "value2"}`;

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
    let generatedValues: Record<string, string>;
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = result.response.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      generatedValues = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse LLM response:', result.response);
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON' },
        { status: 500 }
      );
    }

    // Validate and sanitize values
    const sanitizedValues: Record<string, string> = {};
    for (const variable of variables) {
      if (generatedValues[variable.name] !== undefined) {
        sanitizedValues[variable.name] = String(generatedValues[variable.name]);
      }
    }

    return NextResponse.json({
      variables: sanitizedValues,
      provider: result.provider,
      tokens: result.usage?.total_tokens,
    });
  } catch (error) {
    console.error('Failed to generate random values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate values' },
      { status: 500 }
    );
  }
}
