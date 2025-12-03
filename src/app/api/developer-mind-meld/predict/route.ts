/**
 * Developer Mind-Meld Prediction API
 * Predict developer decisions and filter ideas
 */

import { NextRequest, NextResponse } from 'next/server';
import { developerProfileDb } from '@/app/db';
import {
  predictDecision,
  filterIdeasByPreference,
} from '@/app/features/DeveloperMindMeld/lib/mindMeldAnalyzer';

/**
 * POST /api/developer-mind-meld/predict
 * Predict if developer will accept an idea
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, idea, ideas } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getByProject(projectId);
    if (!profile || !profile.enabled) {
      return NextResponse.json({
        success: true,
        prediction: null,
        filteredIdeas: null,
        message: 'Mind-Meld is disabled',
      });
    }

    // Single idea prediction
    if (idea) {
      const prediction = predictDecision(profile.id, {
        scanType: idea.scanType,
        category: idea.category,
        effort: idea.effort,
        impact: idea.impact,
      });

      return NextResponse.json({
        success: true,
        prediction,
      });
    }

    // Batch filtering
    if (ideas && Array.isArray(ideas)) {
      const filteredIdeas = filterIdeasByPreference(profile.id, ideas);

      return NextResponse.json({
        success: true,
        filteredIdeas,
      });
    }

    return NextResponse.json(
      { error: 'Either idea or ideas array is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error predicting decision:', error);
    return NextResponse.json(
      { error: 'Failed to predict decision' },
      { status: 500 }
    );
  }
}
