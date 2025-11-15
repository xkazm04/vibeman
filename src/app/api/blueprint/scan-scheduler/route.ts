/**
 * Scan Scheduler API
 * Manage automated scan scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  autoScheduleScans,
  getScheduledScans,
  getDueScans,
  scheduleManualScan,
  removeScanFromSchedule,
  getScheduleStats,
  clearSchedule,
} from '@/app/features/Onboarding/sub_Blueprint/lib/scanScheduler';

/**
 * GET /api/blueprint/scan-scheduler
 * Get scheduled scans for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type') || 'all'; // 'all', 'due', 'stats'

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (type === 'stats') {
      const stats = getScheduleStats(projectId);
      return NextResponse.json({ success: true, stats });
    }

    if (type === 'due') {
      const scans = getDueScans(projectId);
      return NextResponse.json({ success: true, scans, count: scans.length });
    }

    const scans = getScheduledScans(projectId);
    return NextResponse.json({ success: true, scans, count: scans.length });
  } catch (error) {
    console.error('Error fetching scheduled scans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scheduled scans',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blueprint/scan-scheduler
 * Auto-schedule scans or manually schedule a specific scan
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, action, scanType, contextId, scheduledFor } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Auto-schedule all scans
    if (action === 'auto-schedule') {
      const scheduled = await autoScheduleScans(projectId);
      return NextResponse.json({
        success: true,
        scheduled,
        count: scheduled.length,
      });
    }

    // Manually schedule a specific scan
    if (action === 'schedule-scan') {
      if (!scanType) {
        return NextResponse.json({ error: 'Scan type is required' }, { status: 400 });
      }

      const scheduledDate = scheduledFor ? new Date(scheduledFor) : undefined;
      const scan = await scheduleManualScan(projectId, scanType, contextId, scheduledDate);

      return NextResponse.json({
        success: true,
        scan,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error scheduling scans:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule scans',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blueprint/scan-scheduler
 * Remove a scan from schedule or clear all
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const scanType = searchParams.get('scanType');
    const contextId = searchParams.get('contextId') || undefined;
    const clearAll = searchParams.get('clearAll') === 'true';

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (clearAll) {
      clearSchedule(projectId);
      return NextResponse.json({
        success: true,
        message: 'All scheduled scans cleared',
      });
    }

    if (!scanType) {
      return NextResponse.json({ error: 'Scan type is required' }, { status: 400 });
    }

    const removed = removeScanFromSchedule(projectId, scanType, contextId);

    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Scan not found in schedule' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Scan removed from schedule',
    });
  } catch (error) {
    console.error('Error removing scheduled scan:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove scan',
      },
      { status: 500 }
    );
  }
}
