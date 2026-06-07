import { NextRequest, NextResponse } from 'next/server';
import { goalCheckinRepository } from '@/app/db/repositories/goal-checkin.repository';
import { goalRepository } from '@/app/db/repositories/goal.repository';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-helpers';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

/**
 * Get the ISO Monday date for a given date's week.
 */
function getWeekOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * GET /api/goals/checkins?goalId=xxx or ?projectId=xxx&weekOf=xxx
 * Fetch check-in history for a goal or project week.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goalId');
    const projectId = searchParams.get('projectId');
    const weekOf = searchParams.get('weekOf');
    const limitParam = searchParams.get('limit');

    if (goalId) {
      const limit = limitParam ? parseInt(limitParam, 10) : 12;
      const checkins = goalCheckinRepository.getCheckinsByGoal(goalId, limit);
      return NextResponse.json({ success: true, checkins });
    }

    if (projectId) {
      const accessDenied = checkProjectAccess(projectId, request);
      if (accessDenied) return accessDenied;

      if (weekOf) {
        const checkins = goalCheckinRepository.getCheckinsByProjectWeek(projectId, weekOf);
        return NextResponse.json({ success: true, checkins });
      }

      const checkins = goalCheckinRepository.getLatestCheckinsByProject(projectId);
      return NextResponse.json({ success: true, checkins });
    }

    return createErrorResponse('goalId or projectId is required', 400);
  } catch (error) {
    logger.error('Error in GET /api/goals/checkins:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * POST /api/goals/checkins
 * Submit weekly confidence check-ins for one or more goals.
 * Body: { projectId, checkins: [{ goalId, confidence, note? }], weekOf? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, checkins, weekOf } = body as {
      projectId: string;
      checkins: Array<{ goalId: string; confidence: number; note?: string }>;
      weekOf?: string;
    };

    if (!projectId || !checkins || !Array.isArray(checkins) || checkins.length === 0) {
      return createErrorResponse('projectId and checkins array are required', 400);
    }

    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    const effectiveWeekOf = weekOf || getWeekOf();
    const results = [];

    for (const item of checkins) {
      if (!item.goalId || !item.confidence || item.confidence < 1 || item.confidence > 5) {
        continue;
      }

      // Verify the goal exists and belongs to the project
      const goal = goalRepository.getGoalById(item.goalId);
      if (!goal || goal.project_id !== projectId) continue;

      const result = goalCheckinRepository.upsertCheckin({
        id: randomUUID(),
        goal_id: item.goalId,
        project_id: projectId,
        confidence: item.confidence,
        note: item.note || null,
        week_of: effectiveWeekOf,
      });

      results.push(result);
    }

    return NextResponse.json({ success: true, checkins: results, weekOf: effectiveWeekOf });
  } catch (error) {
    logger.error('Error in POST /api/goals/checkins:', { error });
    return createErrorResponse('Internal server error', 500);
  }
}
