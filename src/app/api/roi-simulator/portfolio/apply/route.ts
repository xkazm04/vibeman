/**
 * API Route: ROI Simulator - Apply Portfolio
 * Applies a portfolio optimization by updating refactoring statuses
 */

import { NextRequest, NextResponse } from 'next/server';
import { portfolioOptimizationDb, refactoringEconomicsDb } from '@/app/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { portfolioId } = body;

    if (!portfolioId) {
      return NextResponse.json(
        { error: 'portfolioId is required' },
        { status: 400 }
      );
    }

    const portfolio = portfolioOptimizationDb.getById(portfolioId);
    if (!portfolio) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Parse selected items
    let selectedItems: Array<{ id: string; order: number; allocation: number }> = [];
    try {
      selectedItems = JSON.parse(portfolio.selected_items || '[]');
    } catch {
      selectedItems = [];
    }

    // Update status of selected items to 'approved'
    let updated = 0;
    for (const item of selectedItems) {
      const refactoring = refactoringEconomicsDb.getById(item.id);
      if (refactoring && refactoring.status === 'proposed') {
        refactoringEconomicsDb.update(item.id, { status: 'approved' });
        updated++;
      }
    }

    // Mark portfolio as applied
    portfolioOptimizationDb.update(portfolioId, { status: 'applied' });

    return NextResponse.json({
      success: true,
      updated,
      portfolio: portfolioOptimizationDb.getById(portfolioId),
    });
  } catch (error) {
    logger.error('Failed to apply portfolio:', { data: error });
    return NextResponse.json(
      { error: 'Failed to apply portfolio', details: String(error) },
      { status: 500 }
    );
  }
}
