import { NextRequest, NextResponse } from 'next/server';
import { generateProjectDocs, saveGeneratedDocs } from '@/app/features/Docs/lib/docsGenerator';
import { documentationDb } from '@/app/db';

/**
 * POST /api/docs/generate - Generate documentation for a project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectName, sectionTypes, provider, model } = body;

    // Validate required fields
    if (!projectId || !projectPath || !projectName) {
      return NextResponse.json(
        { error: 'projectId, projectPath, and projectName are required' },
        { status: 400 }
      );
    }

    // Generate documentation sections
    const sections = await generateProjectDocs({
      projectId,
      projectPath,
      projectName,
      sectionTypes,
      provider,
      model
    });

    // Save to database
    const savedDocs = await saveGeneratedDocs(projectId, sections);

    return NextResponse.json({
      success: true,
      count: savedDocs.length,
      docs: savedDocs
    });
  } catch (error) {
    console.error('Error generating documentation:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/docs/generate - Regenerate specific documentation sections
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { docId, projectId, projectPath, projectName, provider, model } = body;

    if (!docId || !projectId || !projectPath || !projectName) {
      return NextResponse.json(
        { error: 'docId, projectId, projectPath, and projectName are required' },
        { status: 400 }
      );
    }

    // Get existing doc to determine section type
    const existingDoc = documentationDb.getById(docId);
    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Documentation not found' },
        { status: 404 }
      );
    }

    // Regenerate just this section
    const sections = await generateProjectDocs({
      projectId,
      projectPath,
      projectName,
      sectionTypes: [existingDoc.section_type],
      provider,
      model
    });

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate section' },
        { status: 500 }
      );
    }

    // Update existing doc
    const updatedDoc = documentationDb.update(docId, {
      content: sections[0].content,
      source_metadata: JSON.stringify(sections[0].sourceMetadata),
      last_sync_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      doc: updatedDoc
    });
  } catch (error) {
    console.error('Error regenerating documentation:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate documentation', details: String(error) },
      { status: 500 }
    );
  }
}
