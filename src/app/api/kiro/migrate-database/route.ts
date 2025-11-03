import { NextRequest, NextResponse } from 'next/server';
import { backgroundTaskDb } from '../../../../lib/server/backgroundTaskDatabase';

export async function POST(request: NextRequest) {
  try {
    const counts = backgroundTaskDb.getTaskCounts();

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      taskCounts: counts
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}