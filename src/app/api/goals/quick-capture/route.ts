import { NextRequest, NextResponse } from 'next/server';
import { generateWithLLM } from '@/lib/llm/llm-manager';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { randomUUID } from 'crypto';
import { signalCollector } from '@/lib/brain/signalCollector';

function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

interface ParsedGoal {
  title: string;
  description: string | null;
  priority: 'P1' | 'P2' | 'P3' | null;
  targetDate: string | null;
  status: 'open' | 'in_progress';
  keywords: string[];
}

/**
 * Score how well a context matches the parsed keywords.
 * Uses name, description, keywords, and business_feature for matching.
 */
function scoreContextMatch(
  context: { name: string; description: string | null; keywords: string | null; business_feature: string | null; file_paths: string },
  keywords: string[]
): number {
  if (keywords.length === 0) return 0;

  const contextText = [
    context.name,
    context.description || '',
    context.business_feature || '',
    tryParseJsonArray(context.keywords).join(' '),
    tryParseJsonArray(context.file_paths).join(' '),
  ].join(' ').toLowerCase();

  let score = 0;
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    // Exact word in context name is highest value
    if (context.name.toLowerCase().includes(lower)) score += 3;
    // Present elsewhere
    else if (contextText.includes(lower)) score += 1;
  }
  return score;
}

function tryParseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * POST /api/goals/quick-capture
 *
 * Accepts natural language goal description, uses LLM to parse it,
 * auto-matches a context, and creates the goal immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, projectId } = body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return createErrorResponse('Input text is required', 400);
    }
    if (!projectId || typeof projectId !== 'string') {
      return createErrorResponse('Project ID is required', 400);
    }

    // Step 1: Parse natural language with LLM
    const parseResult = await generateWithLLM(
      `Parse this goal description into structured fields. Return ONLY valid JSON, no markdown.

Input: "${input.trim()}"

Extract:
- title: Clean goal title (remove priority markers, dates)
- description: null unless the input contains extra detail beyond the title
- priority: P1, P2, or P3 if mentioned (look for P1/P2/P3, high/medium/low, urgent/important), otherwise null
- targetDate: ISO date string if a date or relative date is mentioned (today is ${new Date().toISOString().split('T')[0]}), otherwise null
- status: "in_progress" if words like "started", "working on", "doing" appear, otherwise "open"
- keywords: Array of 2-5 keywords for matching to code areas (e.g. "auth", "middleware", "API", "dashboard")

JSON:`,
      {
        temperature: 0.1,
        maxTokens: 300,
        systemPrompt: 'You are a structured data extractor. Return only valid JSON objects. Never wrap in markdown code blocks.',
      }
    );

    let parsed: ParsedGoal;
    try {
      const content = (parseResult.response || '').trim();
      // Strip markdown code fences if present
      const jsonStr = content.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: use input as-is
      parsed = {
        title: input.trim(),
        description: null,
        priority: null,
        targetDate: null,
        status: 'open',
        keywords: [],
      };
    }

    // Ensure valid fields
    if (!parsed.title || typeof parsed.title !== 'string') {
      parsed.title = input.trim();
    }
    if (!['open', 'in_progress'].includes(parsed.status)) {
      parsed.status = 'open';
    }

    // Step 2: Match context by keyword similarity
    let matchedContextId: string | null = null;
    let matchedContextName: string | null = null;

    if (parsed.keywords && parsed.keywords.length > 0) {
      const contexts = contextRepository.getContextsByProject(projectId);
      let bestScore = 0;

      for (const ctx of contexts) {
        const score = scoreContextMatch(ctx, parsed.keywords);
        if (score > bestScore) {
          bestScore = score;
          matchedContextId = ctx.id;
          matchedContextName = ctx.name;
        }
      }

      // Only use match if score is meaningful
      if (bestScore < 2) {
        matchedContextId = null;
        matchedContextName = null;
      }
    }

    // Step 3: Build description with priority info
    let description = parsed.description || null;
    if (parsed.priority && !description) {
      description = `Priority: ${parsed.priority}`;
    } else if (parsed.priority && description) {
      description = `Priority: ${parsed.priority} — ${description}`;
    }

    // Step 4: Create the goal
    const orderIndex = goalRepository.getMaxOrderIndex(projectId) + 1;

    // Build description including target date info if present
    if (parsed.targetDate) {
      const dateNote = `Target: ${parsed.targetDate}`;
      description = description ? `${description} | ${dateNote}` : dateNote;
    }

    const goal = goalRepository.createGoal({
      id: randomUUID(),
      project_id: projectId,
      context_id: matchedContextId || undefined,
      title: parsed.title,
      description: description || undefined,
      status: parsed.status,
      order_index: orderIndex,
    });

    // Record brain signal
    try {
      signalCollector.recordContextFocus(projectId, {
        contextId: matchedContextId || projectId,
        contextName: parsed.title,
        duration: 0,
        actions: ['quick_capture_goal'],
      });
    } catch {
      // Signal recording must never break the main flow
    }

    return NextResponse.json({
      success: true,
      goal,
      parsed: {
        title: parsed.title,
        priority: parsed.priority,
        targetDate: parsed.targetDate,
        status: parsed.status,
        keywords: parsed.keywords,
      },
      matchedContext: matchedContextId
        ? { id: matchedContextId, name: matchedContextName }
        : null,
    });
  } catch (error) {
    console.error('Quick capture error:', error);
    return createErrorResponse('Failed to process quick capture', 500);
  }
}
