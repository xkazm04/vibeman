/**
 * GET /api/personas/scheduler - Get scheduler + event bus status (auto-starts if not running)
 * POST /api/personas/scheduler - Start/stop scheduler
 */
import { NextRequest, NextResponse } from 'next/server';
import { triggerScheduler } from '@/lib/personas/triggerScheduler';
import { personaEventBus } from '@/lib/personas/eventBus';

export async function GET() {
  try {
    // Auto-start on first access (lazy initialization)
    const schedulerStatus = triggerScheduler.getStatus();
    if (!schedulerStatus.isRunning) {
      triggerScheduler.start();
    }

    return NextResponse.json({
      scheduler: triggerScheduler.getStatus(),
      eventBus: personaEventBus.getStatus(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      triggerScheduler.start();
    } else if (action === 'stop') {
      triggerScheduler.stop();
    } else {
      return NextResponse.json({ error: 'action must be "start" or "stop"' }, { status: 400 });
    }

    return NextResponse.json({
      scheduler: triggerScheduler.getStatus(),
      eventBus: personaEventBus.getStatus(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
