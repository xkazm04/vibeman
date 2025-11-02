import { NextRequest, NextResponse } from 'next/server';
import { documentationDb } from '@/app/db';

/**
 * GET /api/docs - Get all documentation for a project
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const sectionType = searchParams.get('sectionType');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let docs;
    if (sectionType) {
      docs = documentationDb.getBySectionType(
        projectId,
        sectionType as any
      );
    } else {
      docs = documentationDb.getByProject(projectId);
    }

    return NextResponse.json({ docs });
  } catch (error) {
    console.error('Error fetching documentation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documentation', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/docs - Delete documentation
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const docId = searchParams.get('docId');
    const projectId = searchParams.get('projectId');

    if (docId) {
      const success = documentationDb.delete(docId);
      return NextResponse.json({ success });
    } else if (projectId) {
      const count = documentationDb.deleteByProject(projectId);
      return NextResponse.json({ success: true, count });
    } else {
      return NextResponse.json(
        { error: 'docId or projectId is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error deleting documentation:', error);
    return NextResponse.json(
      { error: 'Failed to delete documentation', details: String(error) },
      { status: 500 }
    );
  }
}
