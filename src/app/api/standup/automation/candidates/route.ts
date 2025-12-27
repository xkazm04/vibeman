/**
 * Candidate Submission API
 * Endpoint for Claude Code to submit generated goal candidates during automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { automationSessionRepository } from '@/app/db/repositories/automation-session.repository';
import type { CandidateSubmission, GoalCandidate } from '@/lib/standupAutomation/types';

/**
 * POST /api/standup/automation/candidates
 * Submit goal candidates from Claude Code automation
 *
 * Body: CandidateSubmission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CandidateSubmission;
    const { projectId, sessionId, claudeSessionId, candidates, metadata, tokensUsed } = body;

    // Validate required fields
    if (!projectId || !sessionId || !candidates) {
      return NextResponse.json(
        { success: false, error: 'projectId, sessionId, and candidates are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(candidates)) {
      return NextResponse.json(
        { success: false, error: 'candidates must be an array' },
        { status: 400 }
      );
    }

    logger.info('[Candidates API] Receiving candidates from Claude Code', {
      sessionId,
      projectId,
      candidateCount: candidates.length,
      claudeSessionId,
    });

    // Get the session
    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Automation session not found' },
        { status: 404 }
      );
    }

    // Verify project ID matches
    if (session.project_id !== projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID mismatch' },
        { status: 400 }
      );
    }

    // Update Claude session ID if provided
    if (claudeSessionId && !session.claude_session_id) {
      automationSessionRepository.updateClaudeSessionId(sessionId, claudeSessionId);
    }

    // Validate candidates structure
    const validatedCandidates: GoalCandidate[] = candidates.map((c, index) => {
      if (!c.title || typeof c.title !== 'string') {
        throw new Error(`Candidate ${index}: title is required`);
      }
      return {
        title: c.title,
        description: c.description || '',
        reasoning: c.reasoning || '',
        priorityScore: typeof c.priorityScore === 'number' ? c.priorityScore : 50,
        suggestedContext: c.suggestedContext,
        category: c.category || 'general',
        source: c.source || 'pattern_detection',
        relatedItems: c.relatedItems,
      };
    });

    // Build partial result
    const partialResult = {
      id: sessionId,
      projectId,
      projectName: '', // Will be filled by aggregator
      timestamp: new Date().toISOString(),
      duration: 0,
      goalsEvaluated: 0,
      statusesUpdated: [],
      goalsGenerated: validatedCandidates,
      tasksCreated: [],
      tokensUsed: tokensUsed || { input: 0, output: 0 },
      errors: [],
      metadata: {
        explorationSummary: metadata?.explorationSummary || '',
        filesAnalyzed: metadata?.filesAnalyzed || [],
        patternsIdentified: metadata?.patternsIdentified || [],
      },
    };

    // Update session phase
    automationSessionRepository.updatePhase(sessionId, 'evaluating');

    logger.info('[Candidates API] Candidates processed', {
      sessionId,
      validCandidates: validatedCandidates.length,
      filesAnalyzed: metadata?.filesAnalyzed?.length || 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Candidates received',
      summary: {
        candidatesReceived: validatedCandidates.length,
        sessionPhase: 'evaluating',
      },
      partialResult,
    });
  } catch (error) {
    logger.error('[Candidates API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process candidates',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/standup/automation/candidates
 * Get candidates for a session (for debugging/monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId query parameter required' },
        { status: 400 }
      );
    }

    const session = automationSessionRepository.getById(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const result = automationSessionRepository.parseResult(session);
    const candidates = result?.goalsGenerated || [];

    return NextResponse.json({
      success: true,
      sessionId,
      phase: session.phase,
      candidates,
      count: candidates.length,
    });
  } catch (error) {
    logger.error('[Candidates API] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get candidates',
      },
      { status: 500 }
    );
  }
}
