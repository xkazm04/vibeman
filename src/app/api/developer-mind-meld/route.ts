/**
 * Developer Mind-Meld API
 * Main API for managing developer profiles and learning
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  developerProfileDb,
  developerDecisionDb,
  learningInsightDb,
  skillTrackingDb,
} from '@/app/db';
import {
  analyzeDeveloperPreferences,
  recordDecision,
  getLearningProgress,
  filterIdeasByPreference,
} from '@/app/features/DeveloperMindMeld/lib/mindMeldAnalyzer';

/**
 * GET /api/developer-mind-meld
 * Get developer profile and insights for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get or create profile
    const profile = developerProfileDb.getOrCreate(projectId);

    // Get full insights if profile is enabled
    if (profile.enabled) {
      const insights = await analyzeDeveloperPreferences(projectId);
      const progress = getLearningProgress(profile.id);

      return NextResponse.json({
        success: true,
        profile,
        insights,
        progress,
      });
    }

    return NextResponse.json({
      success: true,
      profile,
      insights: null,
      progress: null,
      message: 'Developer Mind-Meld is disabled for this project',
    });
  } catch (error) {
    console.error('Error fetching developer mind-meld data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch developer mind-meld data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/developer-mind-meld
 * Record a developer decision for learning
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      decisionType,
      entityId,
      entityType,
      scanType,
      category,
      effort,
      impact,
      accepted,
      feedback,
    } = body;

    if (!projectId || !decisionType || !entityId || !entityType || accepted === undefined) {
      return NextResponse.json(
        { error: 'projectId, decisionType, entityId, entityType, and accepted are required' },
        { status: 400 }
      );
    }

    // Check if mind-meld is enabled
    const profile = developerProfileDb.getByProject(projectId);
    if (!profile || !profile.enabled) {
      return NextResponse.json({
        success: true,
        message: 'Mind-Meld is disabled, decision not recorded',
        recorded: false,
      });
    }

    // Record the decision
    await recordDecision(projectId, {
      decisionType,
      entityId,
      entityType,
      scanType,
      category,
      effort,
      impact,
      accepted,
      feedback,
    });

    // Get updated progress
    const progress = getLearningProgress(profile.id);

    return NextResponse.json({
      success: true,
      message: 'Decision recorded successfully',
      recorded: true,
      progress,
    });
  } catch (error) {
    console.error('Error recording decision:', error);
    return NextResponse.json(
      { error: 'Failed to record decision' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/developer-mind-meld
 * Update developer profile settings
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      enabled,
      preferredScanTypes,
      avoidedScanTypes,
      preferredPatterns,
      formattingPreferences,
      securityPosture,
      performanceThreshold,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const profile = developerProfileDb.getOrCreate(projectId);

    const updates: Parameters<typeof developerProfileDb.update>[1] = {};

    if (enabled !== undefined) updates.enabled = enabled;
    if (preferredScanTypes !== undefined) updates.preferred_scan_types = preferredScanTypes;
    if (avoidedScanTypes !== undefined) updates.avoided_scan_types = avoidedScanTypes;
    if (preferredPatterns !== undefined) updates.preferred_patterns = preferredPatterns;
    if (formattingPreferences !== undefined) updates.formatting_preferences = formattingPreferences;
    if (securityPosture !== undefined) updates.security_posture = securityPosture;
    if (performanceThreshold !== undefined) updates.performance_threshold = performanceThreshold;

    const updatedProfile = developerProfileDb.update(profile.id, updates);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
