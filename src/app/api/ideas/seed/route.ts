import { NextResponse } from 'next/server';
import { ideaDb, scanDb } from '@/app/db';
import { v4 as uuidv4 } from 'uuid';

function createSampleScans() {
  const scan1Id = uuidv4();
  const scan2Id = uuidv4();

  scanDb.createScan({
    id: scan1Id,
    project_id: 'vibeman-project',
    scan_type: 'functionality',
    summary: 'Analyzed authentication flow and user management'
  });

  scanDb.createScan({
    id: scan2Id,
    project_id: 'vibeman-project',
    scan_type: 'performance',
    summary: 'Reviewed database queries and API response times'
  });

  return { scan1Id, scan2Id };
}

function createSampleIdeas(scan1Id: string, scan2Id: string) {
  const idea1 = ideaDb.createIdea({
    id: uuidv4(),
    scan_id: scan1Id,
    project_id: 'vibeman-project',
    context_id: null,
    scan_type: 'functionality',
    category: 'functionality',
    title: 'Add password reset functionality',
    description: 'Users currently cannot reset their password if they forget it. Adding email-based password reset would improve user experience and reduce support requests.',
    reasoning: 'The authentication system lacks a critical recovery mechanism. This is a common user pain point that can lead to abandoned accounts and increased support overhead.',
    status: 'pending'
  });

  const idea2 = ideaDb.createIdea({
    id: uuidv4(),
    scan_id: scan2Id,
    project_id: 'vibeman-project',
    context_id: null,
    scan_type: 'performance',
    category: 'performance',
    title: 'Implement database query caching',
    description: 'Many database queries are repeated frequently. Implementing a caching layer (Redis or in-memory) could reduce database load by 60-70%.',
    reasoning: 'Analysis shows that 45% of database queries are identical reads happening within short time windows. Caching these results would significantly improve response times and reduce server costs.',
    status: 'accepted',
    user_feedback: 'Great idea! Let\'s prioritize this for next sprint.'
  });

  return [idea1, idea2];
}

/**
 * POST /api/ideas/seed
 * Create sample ideas for testing
 */
export async function POST() {
  try {
    const { scan1Id, scan2Id } = createSampleScans();
    const ideas = createSampleIdeas(scan1Id, scan2Id);

    return NextResponse.json({
      message: 'Sample ideas created successfully',
      ideas,
      scans: [
        scanDb.getScanById(scan1Id),
        scanDb.getScanById(scan2Id)
      ]
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed sample ideas' },
      { status: 500 }
    );
  }
}
