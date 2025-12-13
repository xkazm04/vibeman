/**
 * Autonomous CI API
 * GET - Get pipelines and dashboard stats
 * POST - Create a new pipeline
 * PUT - Update a pipeline
 * DELETE - Delete a pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ciPipelineDb,
  ciDashboardDb,
  ciConfigDb,
} from '@/app/db';
import type { PipelineTriggerType } from '@/app/db/models/autonomous-ci.types';

import { logger } from '@/lib/logger';
/**
 * GET /api/autonomous-ci
 * Get pipelines and stats for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const pipelineId = searchParams.get('pipelineId');
    const includeStats = searchParams.get('includeStats') !== 'false';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // Single pipeline fetch
    if (pipelineId) {
      const pipeline = ciPipelineDb.getById(pipelineId);

      if (!pipeline) {
        return NextResponse.json(
          { error: 'Pipeline not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ pipeline });
    }

    // List fetch requires projectId
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId or pipelineId is required' },
        { status: 400 }
      );
    }

    // Get pipelines
    const pipelines = activeOnly
      ? ciPipelineDb.getActivePipelines(projectId)
      : ciPipelineDb.getByProject(projectId);

    // Get dashboard stats if requested
    const stats = includeStats ? ciDashboardDb.getStats(projectId) : null;

    // Get config
    const config = ciConfigDb.getByProject(projectId);

    return NextResponse.json({
      pipelines,
      stats,
      config,
    });
  } catch (error) {
    logger.error('GET /api/autonomous-ci failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch CI data', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/autonomous-ci
 * Create a new pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      name,
      description,
      triggerType,
      scheduleCron,
      branchPatterns,
      minCoverageThreshold,
      isSelfHealing,
    } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    // Create pipeline
    const pipeline = ciPipelineDb.create({
      project_id: projectId,
      name,
      description: description || null,
      trigger_type: (triggerType as PipelineTriggerType) || 'manual',
      schedule_cron: scheduleCron || null,
      branch_patterns: branchPatterns || null,
      min_coverage_threshold: minCoverageThreshold,
      is_self_healing: isSelfHealing,
    });

    // Ensure config exists for project
    ciConfigDb.upsert(projectId, {});

    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (error) {
    logger.error('POST /api/autonomous-ci failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create pipeline', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/autonomous-ci
 * Update a pipeline
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      triggerType,
      scheduleCron,
      branchPatterns,
      minCoverageThreshold,
      isActive,
      isSelfHealing,
      aiAnalysis,
      recommendedOptimizations,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (triggerType !== undefined) updates.trigger_type = triggerType;
    if (scheduleCron !== undefined) updates.schedule_cron = scheduleCron;
    if (branchPatterns !== undefined) updates.branch_patterns = branchPatterns;
    if (minCoverageThreshold !== undefined) updates.min_coverage_threshold = minCoverageThreshold;
    if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;
    if (isSelfHealing !== undefined) updates.is_self_healing = isSelfHealing ? 1 : 0;
    if (aiAnalysis !== undefined) updates.ai_analysis = aiAnalysis;
    if (recommendedOptimizations !== undefined) {
      updates.recommended_optimizations = typeof recommendedOptimizations === 'string'
        ? recommendedOptimizations
        : JSON.stringify(recommendedOptimizations);
    }

    const pipeline = ciPipelineDb.update(id, updates);

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pipeline });
  } catch (error) {
    logger.error('PUT /api/autonomous-ci failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update pipeline', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/autonomous-ci
 * Delete a pipeline
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const success = ciPipelineDb.delete(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('DELETE /api/autonomous-ci failed:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete pipeline', details: String(error) },
      { status: 500 }
    );
  }
}
