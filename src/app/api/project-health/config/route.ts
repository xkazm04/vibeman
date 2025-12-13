/**
 * Project Health Score Configuration API
 * GET - Get configuration for a project
 * POST - Update configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { projectHealthDb } from '@/app/db';
import { DEFAULT_CATEGORY_WEIGHTS, DEFAULT_STATUS_THRESHOLDS } from '@/app/db/models/project-health.types';
import { logger } from '@/lib/logger';

/**
 * GET /api/project-health/config
 * Get health score configuration for a project
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

    const config = projectHealthDb.getConfig(projectId);

    if (!config) {
      // Return default configuration
      return NextResponse.json({
        config: null,
        defaults: {
          enabled: true,
          auto_calculate: true,
          calculation_frequency: 'on_change',
          category_weights: DEFAULT_CATEGORY_WEIGHTS,
          thresholds: DEFAULT_STATUS_THRESHOLDS,
        },
      });
    }

    return NextResponse.json({
      config: {
        ...config,
        category_weights: JSON.parse(config.category_weights),
        thresholds: JSON.parse(config.thresholds),
      },
    });
  } catch (error) {
    logger.error('Failed to get health config:', { data: error });
    return NextResponse.json(
      { error: 'Failed to get configuration', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project-health/config
 * Create or update health score configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      enabled,
      autoCalculate,
      calculationFrequency,
      categoryWeights,
      thresholds,
    } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Validate weights sum to approximately 1
    if (categoryWeights) {
      const values = Object.values(categoryWeights) as number[];
      const sum = values.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
      if (sum < 0.95 || sum > 1.05) {
        return NextResponse.json(
          { error: 'Category weights must sum to 1.0' },
          { status: 400 }
        );
      }
    }

    // Validate thresholds
    if (thresholds) {
      const { excellent, good, fair, poor } = thresholds;
      if (excellent <= good || good <= fair || fair <= poor) {
        return NextResponse.json(
          { error: 'Thresholds must be in descending order: excellent > good > fair > poor' },
          { status: 400 }
        );
      }
    }

    const config = projectHealthDb.upsertConfig({
      project_id: projectId,
      enabled,
      auto_calculate: autoCalculate,
      calculation_frequency: calculationFrequency,
      category_weights: categoryWeights,
      thresholds,
    });

    return NextResponse.json({
      config: {
        ...config,
        category_weights: JSON.parse(config.category_weights),
        thresholds: JSON.parse(config.thresholds),
      },
    });
  } catch (error) {
    logger.error('Failed to update health config:', { data: error });
    return NextResponse.json(
      { error: 'Failed to update configuration', details: String(error) },
      { status: 500 }
    );
  }
}
