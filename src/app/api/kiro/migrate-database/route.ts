import { NextRequest, NextResponse } from 'next/server';
import { backgroundTaskDb } from '../../../../lib/server/backgroundTaskDatabase';

export async function POST(request: NextRequest) {
  try {
    console.log('Running database migration...');
    
    // Force re-initialization of the database to run migrations
    // This will trigger the initializeBackgroundTaskTables function
    const counts = backgroundTaskDb.getTaskCounts();
    
    console.log('Database migration completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      taskCounts: counts
    });
  } catch (error) {
    console.error('Database migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}