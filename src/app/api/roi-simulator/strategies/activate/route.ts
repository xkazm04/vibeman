/**
 * API Route: ROI Simulator - Activate Strategy
 * Sets a strategy as the active one
 */

import { NextRequest, NextResponse } from 'next/server';
import { debtPaydownStrategyDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyId } = body;

    if (!strategyId) {
      return NextResponse.json(
        { error: 'strategyId is required' },
        { status: 400 }
      );
    }

    const strategy = debtPaydownStrategyDb.setActive(strategyId);

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      strategy,
    });
  } catch (error) {
    logger.error('Failed to activate strategy:', { data: error });
    return NextResponse.json(
      { error: 'Failed to activate strategy', details: String(error) },
      { status: 500 }
    );
  }
}
