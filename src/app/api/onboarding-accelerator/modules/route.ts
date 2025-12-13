/**
 * Onboarding Accelerator API - Learning Modules
 * CRUD operations for learning modules
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  learningModuleDb,
  learningPathDb,
  codeWalkthroughDb,
  quizQuestionDb,
  learningMetricsDb,
} from '@/app/db';

/**
 * GET /api/onboarding-accelerator/modules
 * Get modules for a learning path
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pathId = searchParams.get('pathId');
    const moduleId = searchParams.get('moduleId');

    // Get single module by ID
    if (moduleId) {
      const module = learningModuleDb.getById(moduleId);
      if (!module) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }

      // Include walkthroughs and quizzes
      const walkthroughs = codeWalkthroughDb.getByModule(moduleId);
      const questions = quizQuestionDb.getByModule(moduleId);

      return NextResponse.json({
        ...module,
        prerequisites: JSON.parse(module.prerequisites),
        key_concepts: JSON.parse(module.key_concepts),
        code_areas: JSON.parse(module.code_areas),
        walkthroughs: walkthroughs.map(w => ({
          ...w,
          key_points: JSON.parse(w.key_points),
          related_files: JSON.parse(w.related_files),
        })),
        questions: questions.map(q => ({
          ...q,
          options: JSON.parse(q.options),
        })),
      });
    }

    // Get modules by path
    if (!pathId) {
      return NextResponse.json({ error: 'pathId is required' }, { status: 400 });
    }

    const modules = learningModuleDb.getByPath(pathId);
    const parsedModules = modules.map(module => ({
      ...module,
      prerequisites: JSON.parse(module.prerequisites),
      key_concepts: JSON.parse(module.key_concepts),
      code_areas: JSON.parse(module.code_areas),
    }));

    return NextResponse.json(parsedModules);
  } catch (error) {
    logger.error('Error fetching modules:', { data: error });
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding-accelerator/modules
 * Create a new learning module
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      pathId,
      contextId,
      title,
      description,
      orderIndex,
      difficulty,
      estimatedMinutes,
      relevanceScore,
      prerequisites,
      keyConcepts,
      codeAreas,
    } = body;

    if (!pathId || !title || !description || orderIndex === undefined) {
      return NextResponse.json(
        { error: 'pathId, title, description, and orderIndex are required' },
        { status: 400 }
      );
    }

    const module = learningModuleDb.create({
      path_id: pathId,
      context_id: contextId || null,
      title,
      description,
      order_index: orderIndex,
      difficulty,
      estimated_minutes: estimatedMinutes,
      relevance_score: relevanceScore,
      prerequisites,
      key_concepts: keyConcepts,
      code_areas: codeAreas,
    });

    // Create metrics for this module
    learningMetricsDb.getOrCreate(pathId, module.id);

    // Update path totals
    learningPathDb.updateProgress(pathId);

    return NextResponse.json({
      ...module,
      prerequisites: JSON.parse(module.prerequisites),
      key_concepts: JSON.parse(module.key_concepts),
      code_areas: JSON.parse(module.code_areas),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating module:', { data: error });
    return NextResponse.json({ error: 'Failed to create module' }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding-accelerator/modules
 * Update a module or change its status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { moduleId, action, ...updates } = body;

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
    }

    let module;

    // Handle status actions
    if (action === 'start') {
      module = learningModuleDb.start(moduleId);
    } else if (action === 'complete') {
      const { actualMinutes } = updates;
      module = learningModuleDb.complete(moduleId, actualMinutes || 0);
    } else if (action === 'skip') {
      module = learningModuleDb.skip(moduleId);
    } else {
      // Regular update
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
      if (updates.estimatedMinutes !== undefined) dbUpdates.estimated_minutes = updates.estimatedMinutes;
      if (updates.actualMinutes !== undefined) dbUpdates.actual_minutes = updates.actualMinutes;
      if (updates.relevanceScore !== undefined) dbUpdates.relevance_score = updates.relevanceScore;
      if (updates.prerequisites !== undefined) dbUpdates.prerequisites = updates.prerequisites;
      if (updates.keyConcepts !== undefined) dbUpdates.key_concepts = updates.keyConcepts;
      if (updates.codeAreas !== undefined) dbUpdates.code_areas = updates.codeAreas;

      module = learningModuleDb.update(moduleId, dbUpdates as Parameters<typeof learningModuleDb.update>[1]);
    }

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...module,
      prerequisites: JSON.parse(module.prerequisites),
      key_concepts: JSON.parse(module.key_concepts),
      code_areas: JSON.parse(module.code_areas),
    });
  } catch (error) {
    logger.error('Error updating module:', { data: error });
    return NextResponse.json({ error: 'Failed to update module' }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding-accelerator/modules
 * Delete a module
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
    }

    // Get module to find path_id for progress update
    const module = learningModuleDb.getById(moduleId);
    if (module) {
      learningModuleDb.delete(moduleId);
      learningPathDb.updateProgress(module.path_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting module:', { data: error });
    return NextResponse.json({ error: 'Failed to delete module' }, { status: 500 });
  }
}
