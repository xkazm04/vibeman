/**
 * Onboarding Accelerator API - Learning Paths
 * Main CRUD operations for learning paths
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  learningPathDb,
  learningModuleDb,
  learningMetricsDb,
} from '@/app/db';

/**
 * GET /api/onboarding-accelerator
 * Get learning paths, optionally filtered by project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pathId = searchParams.get('pathId');
    const status = searchParams.get('status');

    // Get single path by ID
    if (pathId) {
      const path = learningPathDb.getById(pathId);
      if (!path) {
        return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
      }

      // Include modules
      const modules = learningModuleDb.getByPath(pathId);
      const metrics = learningMetricsDb.getByPath(pathId);

      return NextResponse.json({
        ...path,
        modules,
        metrics,
        assigned_work: JSON.parse(path.assigned_work),
      });
    }

    // Get paths by project
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    let paths = status === 'active'
      ? learningPathDb.getActiveByProject(projectId)
      : learningPathDb.getByProject(projectId);

    // Parse JSON fields
    const parsedPaths = paths.map(path => ({
      ...path,
      assigned_work: JSON.parse(path.assigned_work),
    }));

    return NextResponse.json(parsedPaths);
  } catch (error) {
    logger.error('Error fetching learning paths:', { data: error });
    return NextResponse.json({ error: 'Failed to fetch learning paths' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding-accelerator
 * Create a new learning path
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, developerName, assignedWork } = body;

    if (!projectId || !developerName) {
      return NextResponse.json(
        { error: 'projectId and developerName are required' },
        { status: 400 }
      );
    }

    const path = learningPathDb.create({
      project_id: projectId,
      developer_name: developerName,
      assigned_work: assignedWork || [],
    });

    // Create overall metrics for the path
    learningMetricsDb.getOrCreate(path.id, null);

    return NextResponse.json({
      ...path,
      assigned_work: JSON.parse(path.assigned_work),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating learning path:', { data: error });
    return NextResponse.json({ error: 'Failed to create learning path' }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding-accelerator
 * Update a learning path
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { pathId, ...updates } = body;

    if (!pathId) {
      return NextResponse.json({ error: 'pathId is required' }, { status: 400 });
    }

    // Map camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {};
    if (updates.developerName !== undefined) dbUpdates.developer_name = updates.developerName;
    if (updates.assignedWork !== undefined) dbUpdates.assigned_work = updates.assignedWork;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.totalModules !== undefined) dbUpdates.total_modules = updates.totalModules;
    if (updates.completedModules !== undefined) dbUpdates.completed_modules = updates.completedModules;
    if (updates.progressPercentage !== undefined) dbUpdates.progress_percentage = updates.progressPercentage;
    if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) dbUpdates.actual_hours = updates.actualHours;
    if (updates.learningSpeed !== undefined) dbUpdates.learning_speed = updates.learningSpeed;

    const path = learningPathDb.update(pathId, dbUpdates as Parameters<typeof learningPathDb.update>[1]);

    if (!path) {
      return NextResponse.json({ error: 'Learning path not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...path,
      assigned_work: JSON.parse(path.assigned_work),
    });
  } catch (error) {
    logger.error('Error updating learning path:', { data: error });
    return NextResponse.json({ error: 'Failed to update learning path' }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding-accelerator
 * Delete a learning path
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathId = searchParams.get('pathId');

    if (!pathId) {
      return NextResponse.json({ error: 'pathId is required' }, { status: 400 });
    }

    learningPathDb.delete(pathId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting learning path:', { data: error });
    return NextResponse.json({ error: 'Failed to delete learning path' }, { status: 500 });
  }
}
