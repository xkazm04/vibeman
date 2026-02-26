/**
 * API Route: Schema Intelligence
 *
 * GET  /api/schema-intelligence - Get dashboard data (patterns, recommendations, stats)
 * POST /api/schema-intelligence - Trigger analysis cycle (AI-driven schema review)
 */

import { NextRequest, NextResponse } from 'next/server';
import { schemaIntelligenceEngine } from '@/lib/db/schemaIntelligenceEngine';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || 'default';
    const view = searchParams.get('view');

    if (view === 'schema') {
      const { tables, indexes } = schemaIntelligenceEngine.introspect();
      return NextResponse.json({
        success: true,
        data: {
          tables: tables.map(t => ({
            name: t.name,
            columnCount: t.columns.length,
            rowCount: t.rowCount,
            columns: t.columns,
          })),
          indexes,
          tableCount: tables.length,
          indexCount: indexes.length,
        },
      });
    }

    const dashboard = schemaIntelligenceEngine.getDashboard(projectId);

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get schema intelligence data';
    logger.error('[SchemaIntelligence API] GET error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const projectId = body.projectId || 'default';

    logger.info('[SchemaIntelligence API] Triggering analysis cycle...');

    const result = await schemaIntelligenceEngine.analyze(projectId);

    return NextResponse.json({
      success: true,
      data: result,
      message: result.recommendationsGenerated > 0
        ? `Generated ${result.recommendationsGenerated} recommendation(s) from ${result.patternsAnalyzed} query patterns across ${result.tablesIntrospected} tables`
        : `Analyzed ${result.patternsAnalyzed} patterns across ${result.tablesIntrospected} tables — no new recommendations`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run schema analysis';
    logger.error('[SchemaIntelligence API] POST error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
