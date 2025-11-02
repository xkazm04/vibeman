/**
 * Annette Voicebot Analytics API
 * POST: Log command execution
 * GET: Query analytics summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/app/db/drivers';
import { CommandAnalyticsEntry, AnalyticsSummary } from '@/app/features/Annette/lib/voicebotAnalytics';

/**
 * POST: Log a command execution to analytics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      commandName,
      commandType,
      executionTimeMs,
      success,
      errorMessage,
      timing,
      metadata,
    } = body;

    // Validate required fields
    if (!projectId || !commandName || !commandType || executionTimeMs === undefined || success === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getConnection();
    const id = `analytics-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const stmt = db.prepare(`
      INSERT INTO voicebot_analytics (
        id, project_id, command_name, command_type, execution_time_ms,
        success, error_message, stt_ms, llm_ms, tts_ms, total_ms,
        provider, model, tools_used, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      projectId,
      commandName,
      commandType,
      executionTimeMs,
      success ? 1 : 0,
      errorMessage || null,
      timing?.sttMs || null,
      timing?.llmMs || null,
      timing?.ttsMs || null,
      timing?.totalMs || null,
      metadata?.provider || null,
      metadata?.model || null,
      metadata?.toolsUsed ? JSON.stringify(metadata.toolsUsed) : null
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[Analytics API] Error logging command:', error);
    return NextResponse.json(
      { error: 'Failed to log command execution' },
      { status: 500 }
    );
  }
}

/**
 * GET: Query analytics summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const commandName = searchParams.get('commandName');
    const commandType = searchParams.get('commandType');
    const successParam = searchParams.get('success');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const db = getConnection();

    // Build WHERE clause
    const conditions = ['project_id = ?'];
    const params: any[] = [projectId];

    if (commandName) {
      conditions.push('command_name = ?');
      params.push(commandName);
    }

    if (commandType) {
      conditions.push('command_type = ?');
      params.push(commandType);
    }

    if (successParam !== null) {
      conditions.push('success = ?');
      params.push(successParam === 'true' ? 1 : 0);
    }

    if (startDate) {
      conditions.push('timestamp >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('timestamp <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    // Get total commands and success rate
    const totalsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(success) as successful,
        AVG(execution_time_ms) as avg_execution_ms
      FROM voicebot_analytics
      WHERE ${whereClause}
    `);

    const totals = totalsStmt.get(...params) as any;

    // Get most frequent commands
    const frequentStmt = db.prepare(`
      SELECT
        command_name,
        COUNT(*) as count,
        AVG(execution_time_ms) as avg_ms
      FROM voicebot_analytics
      WHERE ${whereClause}
      GROUP BY command_name
      ORDER BY count DESC
      LIMIT 10
    `);

    const frequentCommands = frequentStmt.all(...params) as any[];

    // Get recent failures
    const failuresStmt = db.prepare(`
      SELECT
        command_name,
        error_message,
        timestamp
      FROM voicebot_analytics
      WHERE ${whereClause} AND success = 0
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    const recentFailures = failuresStmt.all(...params) as any[];

    // Get performance metrics
    const performanceStmt = db.prepare(`
      SELECT
        AVG(stt_ms) as avg_stt_ms,
        AVG(llm_ms) as avg_llm_ms,
        AVG(tts_ms) as avg_tts_ms,
        AVG(total_ms) as avg_total_ms
      FROM voicebot_analytics
      WHERE ${whereClause} AND success = 1
    `);

    const performance = performanceStmt.get(...params) as any;

    const summary: AnalyticsSummary = {
      totalCommands: totals.total || 0,
      successRate: totals.total > 0 ? (totals.successful / totals.total) * 100 : 0,
      averageExecutionMs: totals.avg_execution_ms || 0,
      mostFrequentCommands: frequentCommands.map(cmd => ({
        commandName: cmd.command_name,
        count: cmd.count,
        averageMs: cmd.avg_ms,
      })),
      recentFailures: recentFailures.map(failure => ({
        commandName: failure.command_name,
        errorMessage: failure.error_message || 'Unknown error',
        timestamp: failure.timestamp,
      })),
      performanceMetrics: {
        avgSttMs: performance.avg_stt_ms || 0,
        avgLlmMs: performance.avg_llm_ms || 0,
        avgTtsMs: performance.avg_tts_ms || 0,
        avgTotalMs: performance.avg_total_ms || 0,
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Analytics API] Error querying analytics:', error);
    return NextResponse.json(
      { error: 'Failed to query analytics' },
      { status: 500 }
    );
  }
}
