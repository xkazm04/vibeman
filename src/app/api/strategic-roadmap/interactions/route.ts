/**
 * Feature Interactions API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { featureInteractionDb } from '@/app/db';
import type { DbFeatureInteraction } from '@/app/db/models/strategic-roadmap.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/strategic-roadmap/interactions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const featureType = searchParams.get('featureType');
    const featureId = searchParams.get('featureId');
    const interactionType = searchParams.get('interactionType');

    if (!projectId && !featureId) {
      return NextResponse.json(
        { error: 'projectId or featureId is required' },
        { status: 400 }
      );
    }

    let interactions: DbFeatureInteraction[];

    if (featureType && featureId) {
      interactions = featureInteractionDb.getByFeature(featureType, featureId);
    } else if (interactionType && projectId) {
      interactions = featureInteractionDb.getByType(projectId, interactionType as DbFeatureInteraction['interaction_type']);
    } else {
      interactions = featureInteractionDb.getByProject(projectId!);
    }

    return NextResponse.json({ interactions });
  } catch (error) {
    logger.error('Error fetching interactions:', { data: error });
    return NextResponse.json(
      { error: 'Failed to fetch interactions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/strategic-roadmap/interactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      featureAId,
      featureAType,
      featureBId,
      featureBType,
      interactionType,
      interactionStrength,
      isBidirectional,
      impactAOnB,
      impactBOnA,
      sharedFiles,
      sharedContexts,
      analysis,
      recommendations,
    } = body;

    if (!projectId || !featureAId || !featureAType || !featureBId || !featureBType || !interactionType) {
      return NextResponse.json(
        { error: 'projectId, featureAId, featureAType, featureBId, featureBType, and interactionType are required' },
        { status: 400 }
      );
    }

    const interaction = featureInteractionDb.create({
      project_id: projectId,
      feature_a_id: featureAId,
      feature_a_type: featureAType,
      feature_b_id: featureBId,
      feature_b_type: featureBType,
      interaction_type: interactionType,
      interaction_strength: interactionStrength || 50,
      is_bidirectional: isBidirectional !== false ? 1 : 0,
      impact_a_on_b: impactAOnB || 0,
      impact_b_on_a: impactBOnA || 0,
      shared_files: JSON.stringify(sharedFiles || []),
      shared_contexts: JSON.stringify(sharedContexts || []),
      analysis: analysis || '',
      recommendations: JSON.stringify(recommendations || []),
    });

    return NextResponse.json({ interaction }, { status: 201 });
  } catch (error) {
    logger.error('Error creating interaction:', { data: error });
    return NextResponse.json(
      { error: 'Failed to create interaction' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/strategic-roadmap/interactions
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const deleted = featureInteractionDb.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting interaction:', { data: error });
    return NextResponse.json(
      { error: 'Failed to delete interaction' },
      { status: 500 }
    );
  }
}
