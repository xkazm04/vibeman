/**
 * Scan Queue Worker Control API
 * POST: Start/stop/configure the queue worker
 * GET: Get worker status
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueWorker } from '@/lib/scanQueueWorker';

export async function GET(request: NextRequest) {
  try {
    const status = scanQueueWorker.getStatus();
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error getting worker status:', error);
    return NextResponse.json(
      { error: 'Failed to get worker status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (start, stop, or configure)' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start':
        scanQueueWorker.start(config);
        return NextResponse.json({ success: true, message: 'Worker started' });

      case 'stop':
        scanQueueWorker.stop();
        return NextResponse.json({ success: true, message: 'Worker stopped' });

      case 'configure':
        if (!config) {
          return NextResponse.json(
            { error: 'config is required for configure action' },
            { status: 400 }
          );
        }
        scanQueueWorker.updateConfig(config);
        return NextResponse.json({ success: true, message: 'Worker configured' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be start, stop, or configure' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error controlling worker:', error);
    return NextResponse.json(
      { error: 'Failed to control worker', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
