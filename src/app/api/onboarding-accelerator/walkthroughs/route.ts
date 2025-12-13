/**
 * Onboarding Accelerator API - Code Walkthroughs
 * Interactive code explanation system
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeWalkthroughDb, learningMetricsDb, learningModuleDb } from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/onboarding-accelerator/walkthroughs
 * Get walkthroughs for a module
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get('moduleId');
    const walkthroughId = searchParams.get('walkthroughId');

    // Get single walkthrough
    if (walkthroughId) {
      const walkthrough = codeWalkthroughDb.getById(walkthroughId);
      if (!walkthrough) {
        return NextResponse.json({ error: 'Walkthrough not found' }, { status: 404 });
      }

      return NextResponse.json({
        ...walkthrough,
        key_points: JSON.parse(walkthrough.key_points),
        related_files: JSON.parse(walkthrough.related_files),
      });
    }

    // Get walkthroughs by module
    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
    }

    const walkthroughs = codeWalkthroughDb.getByModule(moduleId);
    return NextResponse.json(
      walkthroughs.map(w => ({
        ...w,
        key_points: JSON.parse(w.key_points),
        related_files: JSON.parse(w.related_files),
      }))
    );
  } catch (error) {
    logger.error('Error fetching walkthroughs:', { data: error });
    return NextResponse.json({ error: 'Failed to fetch walkthroughs' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding-accelerator/walkthroughs
 * Create a new walkthrough
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      moduleId,
      title,
      description,
      filePath,
      startLine,
      endLine,
      orderIndex,
      explanation,
      keyPoints,
      relatedFiles,
    } = body;

    if (!moduleId || !title || !filePath || startLine === undefined || endLine === undefined || orderIndex === undefined || !explanation) {
      return NextResponse.json(
        { error: 'moduleId, title, filePath, startLine, endLine, orderIndex, and explanation are required' },
        { status: 400 }
      );
    }

    const walkthrough = codeWalkthroughDb.create({
      module_id: moduleId,
      title,
      description,
      file_path: filePath,
      start_line: startLine,
      end_line: endLine,
      order_index: orderIndex,
      explanation,
      key_points: keyPoints,
      related_files: relatedFiles,
    });

    // Update metrics walkthrough count
    const module = learningModuleDb.getById(moduleId);
    if (module) {
      const metrics = learningMetricsDb.getOrCreate(module.path_id, moduleId);
      const totalWalkthroughs = codeWalkthroughDb.getByModule(moduleId).length;
      learningMetricsDb.update(metrics.id, {
        walkthroughs_total: totalWalkthroughs,
      });
    }

    return NextResponse.json({
      ...walkthrough,
      key_points: JSON.parse(walkthrough.key_points),
      related_files: JSON.parse(walkthrough.related_files),
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating walkthrough:', { data: error });
    return NextResponse.json({ error: 'Failed to create walkthrough' }, { status: 500 });
  }
}

/**
 * PUT /api/onboarding-accelerator/walkthroughs
 * Update a walkthrough or mark as viewed
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walkthroughId, action, pathId, ...updates } = body;

    if (!walkthroughId) {
      return NextResponse.json({ error: 'walkthroughId is required' }, { status: 400 });
    }

    let walkthrough;

    // Mark as viewed
    if (action === 'view') {
      walkthrough = codeWalkthroughDb.markViewed(walkthroughId);

      // Update metrics
      if (walkthrough && pathId) {
        learningMetricsDb.incrementWalkthroughView(pathId, walkthrough.module_id);
      }
    } else {
      // Regular update
      walkthrough = codeWalkthroughDb.update(walkthroughId, {
        title: updates.title,
        description: updates.description,
        explanation: updates.explanation,
        key_points: updates.keyPoints,
        related_files: updates.relatedFiles,
      });
    }

    if (!walkthrough) {
      return NextResponse.json({ error: 'Walkthrough not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...walkthrough,
      key_points: JSON.parse(walkthrough.key_points),
      related_files: JSON.parse(walkthrough.related_files),
    });
  } catch (error) {
    logger.error('Error updating walkthrough:', { data: error });
    return NextResponse.json({ error: 'Failed to update walkthrough' }, { status: 500 });
  }
}

/**
 * DELETE /api/onboarding-accelerator/walkthroughs
 * Delete a walkthrough
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walkthroughId = searchParams.get('walkthroughId');

    if (!walkthroughId) {
      return NextResponse.json({ error: 'walkthroughId is required' }, { status: 400 });
    }

    codeWalkthroughDb.delete(walkthroughId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting walkthrough:', { data: error });
    return NextResponse.json({ error: 'Failed to delete walkthrough' }, { status: 500 });
  }
}
