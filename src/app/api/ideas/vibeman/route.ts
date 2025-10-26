import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { goalDb } from '@/lib/database';
import { OllamaClient } from '@/lib/llm/providers/ollama-client';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';
import { buildRequirementContent } from '@/app/Claude/lib/requirementPrompts';

interface IdeaEvaluationResult {
  selectedIdeaId: string | null;
  reasoning: string;
  requirementName?: string;
  error?: string;
}

/**
 * POST /api/ideas/vibeman
 * Automated project management - evaluates ideas and initiates implementation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, action } = body;

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { error: 'projectId and projectPath are required' },
        { status: 400 }
      );
    }

    // Get the first accepted idea (priority implementation)
    if (action === 'get-first-accepted') {
      const result = getFirstAcceptedIdea(projectId);
      return NextResponse.json(result);
    }

    // Get next idea to implement
    if (action === 'evaluate-and-select') {
      const result = await evaluateAndSelectIdea(projectId, projectPath);
      return NextResponse.json(result);
    }

    // Execute implementation for a specific idea
    if (action === 'implement-idea') {
      const { ideaId } = body;
      if (!ideaId) {
        return NextResponse.json(
          { error: 'ideaId is required' },
          { status: 400 }
        );
      }

      const result = await implementIdea(ideaId, projectPath);
      return NextResponse.json(result);
    }

    // Get automation status
    if (action === 'get-status') {
      const status = getAutomationStatus(projectId);
      return NextResponse.json(status);
    }

    // Mark idea as implemented (after successful execution)
    if (action === 'mark-implemented') {
      const { ideaId } = body;
      if (!ideaId) {
        return NextResponse.json(
          { error: 'ideaId is required' },
          { status: 400 }
        );
      }

      const result = markIdeaAsImplemented(ideaId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in /api/ideas/vibeman:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get the first accepted idea (for priority implementation)
 */
function getFirstAcceptedIdea(projectId: string): {
  ideaId: string | null;
  idea?: any;
} {
  try {
    console.log('[Vibeman] Getting first accepted idea for project:', projectId);

    // Get all accepted ideas for the project
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const acceptedIdeas = allIdeas.filter(idea => idea.status === 'accepted');

    if (acceptedIdeas.length === 0) {
      console.log('[Vibeman] No accepted ideas found');
      return {
        ideaId: null,
      };
    }

    // Sort by created_at (oldest first) to maintain FIFO order
    acceptedIdeas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const firstAccepted = acceptedIdeas[0];
    console.log('[Vibeman] Found accepted idea:', firstAccepted.id, firstAccepted.title);

    return {
      ideaId: firstAccepted.id,
      idea: firstAccepted,
    };
  } catch (error) {
    console.error('[Vibeman] Error in getFirstAcceptedIdea:', error);
    return {
      ideaId: null,
    };
  }
}

/**
 * Evaluate ideas and select the best one to implement
 */
async function evaluateAndSelectIdea(
  projectId: string,
  projectPath: string
): Promise<IdeaEvaluationResult> {
  try {
    console.log('[Vibeman] Evaluating ideas for project:', projectId);

    // 1. Get all pending ideas for the project
    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const pendingIdeas = allIdeas.filter(idea => idea.status === 'pending');

    if (pendingIdeas.length === 0) {
      return {
        selectedIdeaId: null,
        reasoning: 'No pending ideas available for implementation',
      };
    }

    console.log(`[Vibeman] Found ${pendingIdeas.length} pending ideas`);

    // 2. Get all open goals for context
    const allGoals = goalDb.getGoalsByProject(projectId);
    const openGoals = allGoals.filter(g => g.status === 'open' || g.status === 'in_progress');

    console.log(`[Vibeman] Found ${openGoals.length} open goals`);

    // 3. Build evaluation prompt
    const prompt = buildEvaluationPrompt(pendingIdeas, openGoals);

    // 4. Call Ollama LLM for evaluation
    const ollama = new OllamaClient({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });

    console.log('[Vibeman] Calling Ollama for idea evaluation...');

    const response = await ollama.generate({
      prompt,
      systemPrompt: buildEvaluationSystemPrompt(),
      maxTokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent selection
      projectId,
    });

    if (!response.success || !response.response) {
      throw new Error(response.error || 'LLM evaluation failed');
    }

    console.log('[Vibeman] LLM response received, parsing...');

    // 5. Parse LLM response
    let evaluation: IdeaEvaluationResult;
    try {
      // Clean response - remove markdown code blocks if present
      let cleanedResponse = response.response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      evaluation = JSON.parse(cleanedResponse);
      console.log('[Vibeman] Successfully parsed evaluation:', evaluation);

      // 6. Validate that the selected ID exists and is pending
      if (evaluation.selectedIdeaId) {
        const selectedIdea = pendingIdeas.find(i => i.id === evaluation.selectedIdeaId);

        if (!selectedIdea) {
          // LLM might have returned an index or invalid ID, try to find by matching criteria
          console.error('[Vibeman] Selected ID not found in pending ideas:', evaluation.selectedIdeaId);
          console.error('[Vibeman] Available pending idea IDs:', pendingIdeas.map(i => i.id));

          // Attempt to recover by selecting the first idea with highest impact/effort ratio
          const fallbackIdea = pendingIdeas
            .filter(i => i.effort && i.impact)
            .sort((a, b) => (b.impact! / b.effort!) - (a.impact! / a.effort!))[0];

          if (fallbackIdea) {
            console.log('[Vibeman] Using fallback idea:', fallbackIdea.id);
            evaluation.selectedIdeaId = fallbackIdea.id;
            evaluation.reasoning = `Fallback selection (LLM returned invalid ID). ${evaluation.reasoning}`;
          } else {
            throw new Error(`Invalid idea ID returned by LLM: ${evaluation.selectedIdeaId}`);
          }
        }
      }
    } catch (parseError) {
      console.error('[Vibeman] Failed to parse LLM response:', parseError);
      console.error('[Vibeman] Raw response:', response.response);
      throw new Error('Failed to parse LLM evaluation response');
    }

    return evaluation;
  } catch (error) {
    console.error('[Vibeman] Error in evaluateAndSelectIdea:', error);
    return {
      selectedIdeaId: null,
      reasoning: 'Error during evaluation',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Implement a selected idea
 */
async function implementIdea(
  ideaId: string,
  projectPath: string
): Promise<{ success: boolean; requirementName?: string; taskId?: string; error?: string }> {
  try {
    console.log('[Vibeman] Implementing idea:', ideaId);

    // 1. Get the idea
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      throw new Error('Idea not found');
    }

    // Store original status for rollback
    const originalStatus = idea.status;

    // 2. Update idea status to accepted (only if not already accepted)
    if (idea.status !== 'accepted') {
      ideaDb.updateIdea(ideaId, { status: 'accepted' });
      console.log('[Vibeman] Updated idea status to accepted');
    } else {
      console.log('[Vibeman] Idea already in accepted status');
    }

    try {
      // 3. Generate requirement file name
      const requirementName = `idea-${ideaId.substring(0, 8)}-${idea.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 30)}`;

      console.log('[Vibeman] Creating requirement:', requirementName);

      // 4. Build requirement content
      const content = buildRequirementContentFromIdea(idea);

      // 5. Create requirement file
      const createResult = createRequirement(projectPath, requirementName, content);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create requirement');
      }

      console.log('[Vibeman] Requirement created successfully');

      // 6. Queue requirement for execution using the execution queue
      const { executionQueue } = await import('@/app/Claude/lib/claudeExecutionQueue');
      const taskId = executionQueue.addTask(projectPath, requirementName, idea.project_id);

      console.log('[Vibeman] Requirement queued for execution:', taskId);

      return {
        success: true,
        requirementName,
        taskId,
      };
    } catch (error) {
      // Rollback idea status on error
      console.error('[Vibeman] Implementation failed, rolling back idea status');
      ideaDb.updateIdea(ideaId, { status: originalStatus });
      throw error;
    }
  } catch (error) {
    console.error('[Vibeman] Error in implementIdea:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get automation status for a project
 */
function getAutomationStatus(projectId: string): {
  pendingIdeasCount: number;
  acceptedIdeasCount: number;
  implementedIdeasCount: number;
  openGoalsCount: number;
} {
  const allIdeas = ideaDb.getIdeasByProject(projectId);
  const allGoals = goalDb.getGoalsByProject(projectId);

  return {
    pendingIdeasCount: allIdeas.filter(i => i.status === 'pending').length,
    acceptedIdeasCount: allIdeas.filter(i => i.status === 'accepted').length,
    implementedIdeasCount: allIdeas.filter(i => i.status === 'implemented').length,
    openGoalsCount: allGoals.filter(g => g.status === 'open' || g.status === 'in_progress').length,
  };
}

/**
 * Build system prompt for idea evaluation
 */
function buildEvaluationSystemPrompt(): string {
  return `You are an expert project manager AI responsible for selecting the best idea to implement next.

Your role is to:
1. Analyze all pending ideas based on their effort and impact ratings
2. Consider how well each idea aligns with current project goals
3. Select the single best idea that provides maximum value with minimal effort
4. Provide clear reasoning for your selection

Selection criteria (in order of priority):
1. **Effort-to-Impact Ratio**: Prefer high-impact, low-effort ideas (quick wins)
2. **Goal Alignment**: Ideas that directly support open goals are prioritized
3. **Risk**: Lower-risk implementations are preferred
4. **Dependencies**: Ideas with fewer dependencies are prioritized

You must respond with ONLY valid JSON in the exact format specified. No additional text or explanation outside the JSON.`;
}

/**
 * Build evaluation prompt with ideas and goals
 */
function buildEvaluationPrompt(ideas: any[], goals: any[]): string {
  const ideasSection = ideas
    .map(
      (idea, index) => `
### Idea ${index + 1}: ${idea.title}
- **ID**: ${idea.id}
- **Category**: ${idea.category}
- **Effort**: ${idea.effort || 'N/A'} (1=low, 2=medium, 3=high)
- **Impact**: ${idea.impact || 'N/A'} (1=low, 2=medium, 3=high)
- **Status**: ${idea.status}
- **Description**: ${idea.description || 'No description'}
- **Reasoning**: ${idea.reasoning || 'No reasoning provided'}
- **Scan Type**: ${idea.scan_type || 'overall'}
`
    )
    .join('\n');

  const goalsSection =
    goals.length > 0
      ? goals
          .map(
            (goal, index) => `
### Goal ${index + 1}: ${goal.title}
- **Status**: ${goal.status}
- **Description**: ${goal.description || 'No description'}
`
          )
          .join('\n')
      : 'No open goals currently defined for this project.';

  return `# Project Context

## Current Project Goals
${goalsSection}

## Pending Ideas for Implementation
${ideasSection}

# Your Task

Analyze all ${ideas.length} pending ideas and select the SINGLE BEST idea to implement next based on:

1. **Effort-to-Impact Ratio**: Calculate value = impact / effort. Higher is better.
2. **Goal Alignment**: Does this idea support current project goals?
3. **Implementation Risk**: Is this idea well-defined and achievable?
4. **Priority**: Consider category and business value

**CRITICAL: You MUST use the EXACT full ID from the list above, not the index number.**

**Response Format** (JSON only, no markdown):

{
  "selectedIdeaId": "COPY THE FULL ID FROM ABOVE - NOT THE INDEX NUMBER",
  "reasoning": "Clear explanation of why this idea was selected (2-3 sentences)",
  "effortImpactScore": "calculated score or evaluation",
  "goalAlignment": "how this aligns with current goals"
}

Example valid response:
{
  "selectedIdeaId": "550e8400-e29b-41d4-a716-446655440000",
  "reasoning": "This idea has high impact (3) with low effort (1)...",
  "effortImpactScore": "3.0",
  "goalAlignment": "Directly supports current authentication goal"
}

If NO suitable idea can be selected, respond with:

{
  "selectedIdeaId": null,
  "reasoning": "Explanation of why no idea was selected"
}

REMEMBER: Copy the FULL ID value from the - **ID**: field above, not "Idea 1" or "1" or any index.

Select the best idea now:`;
}

/**
 * Build requirement content from an idea
 */
function buildRequirementContentFromIdea(idea: any): string {
  const effortLabel = idea.effort === 1 ? 'Low' : idea.effort === 2 ? 'Medium' : idea.effort === 3 ? 'High' : 'Unknown';
  const impactLabel = idea.impact === 1 ? 'Low' : idea.impact === 2 ? 'Medium' : idea.impact === 3 ? 'High' : 'Unknown';

  return `# ${idea.title}

## Metadata
- **Category**: ${idea.category}
- **Effort**: ${effortLabel} (${idea.effort || 'N/A'}/3)
- **Impact**: ${impactLabel} (${idea.impact || 'N/A'}/3)
- **Scan Type**: ${idea.scan_type || 'overall'}
- **Generated**: ${new Date(idea.created_at).toLocaleString()}

## Description
${idea.description || 'No description provided'}

## Reasoning
${idea.reasoning || 'No reasoning provided'}

## Implementation Guidelines

Please implement this feature following these guidelines:

1. **Code Quality**: Follow existing code patterns and conventions in the project
2. **Testing**: Add appropriate tests if applicable
3. **Documentation**: Update relevant documentation
4. **Error Handling**: Include proper error handling and edge cases
5. **User Experience**: Consider the user experience and accessibility

## Acceptance Criteria

The implementation should:
- Fulfill the description and reasoning outlined above
- Maintain or improve code quality
- Be well-tested and documented
- Follow project conventions and patterns

## Notes

This requirement was automatically generated from an AI-evaluated project idea.
Original idea ID: ${idea.id}
`;
}

/**
 * Mark an idea as implemented with timestamp
 */
function markIdeaAsImplemented(ideaId: string): {
  success: boolean;
  error?: string;
} {
  try {
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return {
        success: false,
        error: 'Idea not found',
      };
    }

    // Update idea status to implemented with current timestamp
    const now = new Date().toISOString();
    ideaDb.updateIdea(ideaId, {
      status: 'implemented',
      implemented_at: now,
    });

    console.log(`[Vibeman] Marked idea ${ideaId} as implemented at ${now}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Vibeman] Error marking idea as implemented:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
