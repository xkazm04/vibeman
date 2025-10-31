import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { createRequirement } from '@/app/Claude/lib/claudeCodeManager';

/**
 * POST /api/ideas/tinder/accept
 * Accept an idea and generate requirement file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, projectPath } = body;

    if (!ideaId || !projectPath) {
      return NextResponse.json(
        { error: 'ideaId and projectPath are required' },
        { status: 400 }
      );
    }

    console.log('[Tinder Accept] Processing idea:', ideaId);

    // 1. Get the idea
    const idea = ideaDb.getIdeaById(ideaId);
    if (!idea) {
      return NextResponse.json(
        { error: 'Idea not found' },
        { status: 404 }
      );
    }

    // 2. Update idea status to accepted
    ideaDb.updateIdea(ideaId, { status: 'accepted' });
    console.log('[Tinder Accept] Updated idea status to accepted');

    // 3. Generate requirement file name
    const requirementName = `idea-${ideaId.substring(0, 8)}-${idea.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 30)}`;

    console.log('[Tinder Accept] Creating requirement:', requirementName);

    // 4. Build requirement content
    const content = buildRequirementContentFromIdea(idea);

    // 5. Create requirement file
    const createResult = createRequirement(projectPath, requirementName, content);

    if (!createResult.success) {
      // Rollback status change
      ideaDb.updateIdea(ideaId, { status: 'pending' });
      throw new Error(createResult.error || 'Failed to create requirement');
    }

    console.log('[Tinder Accept] Requirement created successfully');

    return NextResponse.json({
      success: true,
      requirementName,
      message: 'Idea accepted and requirement file created',
    });
  } catch (error) {
    console.error('[Tinder Accept] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to accept idea',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
- **Scan Type**: ${idea.scan_type}
- **Generated**: ${new Date(idea.created_at).toLocaleString()}
- **Accepted via**: Tinder UI

## Description
${idea.description || 'No description provided'}

## Reasoning
${idea.reasoning || 'No reasoning provided'}

## Implementation Guidelines

⚠️ **Important**: Before implementing this requirement, use the Claude Code skill for comprehensive guidelines:

\`\`\`
/implementation-guidelines
\`\`\`

This skill provides detailed guidance on:
- Code quality standards
- Testing requirements
- Project conventions
- Technical best practices
- Quality checklist

## Notes

This requirement was generated from an AI-evaluated project idea via the Tinder UI.
Original idea ID: ${idea.id}
`;
}
