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
 *   - count (optional): Number of value sets to generate (1-10, default: 1)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, provider = 'ollama', count = 1 } = body;
    const itemCount = Math.min(Math.max(1, Number(count) || 1), 10);

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

    const isBatch = itemCount > 1;

    const systemPrompt = isBatch
      ? `You are a creative content generator. Generate interesting, contextually appropriate values for template variables.
Output ONLY a valid JSON array of ${itemCount} objects, each with variable names as keys and generated values as strings.
Each set should be DIFFERENT and creative. No explanations, no markdown, just pure JSON array.`
      : `You are a creative content generator. Generate interesting, contextually appropriate values for template variables.
Output ONLY valid JSON object with variable names as keys and generated values as strings.
No explanations, no markdown, just pure JSON.`;

    const userPrompt = isBatch
      ? `Generate ${itemCount} DIFFERENT sets of creative, contextually appropriate values for a "${template.category}" template named "${template.name}".

Template description: ${template.description || 'No description'}

Template content preview:
${template.template_content.slice(0, 500)}${template.template_content.length > 500 ? '...' : ''}

Variables to fill:
${variableDescriptions}

Generate ${itemCount} engaging, VARIED sets of values. Each set should be distinct and creative but appropriate for the template category.
Return ONLY a JSON array of ${itemCount} objects like: [{"VARIABLE1": "value1", "VARIABLE2": "value2"}, {"VARIABLE1": "other1", "VARIABLE2": "other2"}]`
      : `Generate creative, contextually appropriate values for a "${template.category}" template named "${template.name}".

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
    let jsonStr = result.response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    if (isBatch) {
      // Batch mode: expect JSON array
      let parsedSets: Record<string, string>[];
      try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          parsedSets = parsed;
        } else {
          // LLM returned single object instead of array - wrap it
          parsedSets = [parsed];
        }
      } catch {
        console.error('Failed to parse batch LLM response:', result.response);
        return NextResponse.json(
          { error: 'Failed to parse LLM response as JSON array' },
          { status: 500 }
        );
      }

      // Sanitize each set
      const sanitizedSets: Record<string, string>[] = parsedSets.map((set) => {
        const sanitized: Record<string, string> = {};
        for (const variable of variables) {
          if (set[variable.name] !== undefined) {
            sanitized[variable.name] = String(set[variable.name]);
          }
        }
        return sanitized;
      });

      // Pad with empty sets if LLM returned fewer than requested
      while (sanitizedSets.length < itemCount) {
        const emptySet: Record<string, string> = {};
        for (const variable of variables) {
          emptySet[variable.name] = variable.default_value || '';
        }
        sanitizedSets.push(emptySet);
      }

      return NextResponse.json({
        variableSets: sanitizedSets.slice(0, itemCount),
        provider: result.provider,
        tokens: result.usage?.total_tokens,
      });
    } else {
      // Single mode: expect JSON object (backward compatible)
      let generatedValues: Record<string, string>;
      try {
        generatedValues = JSON.parse(jsonStr);
      } catch {
        console.error('Failed to parse LLM response:', result.response);
        return NextResponse.json(
          { error: 'Failed to parse LLM response as JSON' },
          { status: 500 }
        );
      }

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
    }
  } catch (error) {
    console.error('Failed to generate random values:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate values' },
      { status: 500 }
    );
  }
}
