/**
 * API Route: ROI Simulator - Select Simulation
 * Sets a simulation as the active/selected one
 */

import { NextRequest, NextResponse } from 'next/server';
import { roiSimulationDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { simulationId } = body;

    if (!simulationId) {
      return NextResponse.json(
        { error: 'simulationId is required' },
        { status: 400 }
      );
    }

    const simulation = roiSimulationDb.select(simulationId);

    if (!simulation) {
      return NextResponse.json(
        { error: 'Simulation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (error) {
    logger.error('Failed to select simulation:', { data: error });
    return NextResponse.json(
      { error: 'Failed to select simulation', details: String(error) },
      { status: 500 }
    );
  }
}
