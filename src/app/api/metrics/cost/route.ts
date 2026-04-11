/**
 * API Route: Session Cost Analytics
 *
 * GET /api/metrics/cost?projectPath=&days=30
 * Returns aggregated cost data from terminal_sessions table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/app/db/connection';

interface CostByDay {
  date: string;
  cost: number;
  sessions: number;
  tokensIn: number;
  tokensOut: number;
}

interface TopSession {
  id: string;
  projectPath: string;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  messageCount: number;
  status: string;
  createdAt: string;
}

interface CostSummary {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  sessionCount: number;
  avgCostPerSession: number;
  costByDay: CostByDay[];
  topSessions: TopSession[];
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceISO = sinceDate.toISOString();

    // Base WHERE clause
    const conditions: string[] = ['created_at >= ?'];
    const params: (string | number)[] = [sinceISO];

    if (projectPath) {
      conditions.push('project_path = ?');
      params.push(projectPath);
    }

    const where = conditions.join(' AND ');

    // Totals
    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(total_cost_usd), 0) as totalCost,
        COALESCE(SUM(total_tokens_in), 0) as totalTokensIn,
        COALESCE(SUM(total_tokens_out), 0) as totalTokensOut,
        COUNT(*) as sessionCount
      FROM terminal_sessions
      WHERE ${where}
    `).get(...params) as {
      totalCost: number;
      totalTokensIn: number;
      totalTokensOut: number;
      sessionCount: number;
    };

    // Cost by day
    const costByDay = db.prepare(`
      SELECT
        date(created_at) as date,
        COALESCE(SUM(total_cost_usd), 0) as cost,
        COUNT(*) as sessions,
        COALESCE(SUM(total_tokens_in), 0) as tokensIn,
        COALESCE(SUM(total_tokens_out), 0) as tokensOut
      FROM terminal_sessions
      WHERE ${where}
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all(...params) as CostByDay[];

    // Top sessions by cost
    const topSessions = db.prepare(`
      SELECT
        id,
        project_path as projectPath,
        total_cost_usd as cost,
        total_tokens_in as tokensIn,
        total_tokens_out as tokensOut,
        message_count as messageCount,
        status,
        created_at as createdAt
      FROM terminal_sessions
      WHERE ${where}
      ORDER BY total_cost_usd DESC
      LIMIT 10
    `).all(...params) as TopSession[];

    const summary: CostSummary = {
      ...totals,
      avgCostPerSession: totals.sessionCount > 0
        ? totals.totalCost / totals.sessionCount
        : 0,
      costByDay,
      topSessions,
    };

    return NextResponse.json({ data: summary });
  } catch (error) {
    console.error('Cost analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cost analytics' },
      { status: 500 },
    );
  }
}
