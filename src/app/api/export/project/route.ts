import { NextRequest, NextResponse } from 'next/server';
import {
  gatherExportData,
  exportAsJSON,
  exportAsMarkdown,
  generateExportFilename
} from '@/app/features/Export/lib/exportService';

/**
 * POST /api/export/project
 * Export project AI review data as JSON or Markdown
 *
 * Request body:
 * {
 *   projectId: string;
 *   projectName: string;
 *   format: 'json' | 'markdown';
 *   includeAIDocs?: boolean;
 *   aiDocsContent?: string;
 *   aiDocsProvider?: string;
 *   llmProvider?: string;
 * }
 *
 * Response:
 * {
 *   success: true;
 *   data: string; // JSON or Markdown content
 *   filename: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectId,
      projectName,
      format = 'json',
      includeAIDocs = false,
      aiDocsContent,
      aiDocsProvider,
      llmProvider
    } = body;

    // Validation
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!projectName) {
      return NextResponse.json(
        { success: false, error: 'projectName is required' },
        { status: 400 }
      );
    }

    if (format !== 'json' && format !== 'markdown') {
      return NextResponse.json(
        { success: false, error: 'format must be "json" or "markdown"' },
        { status: 400 }
      );
    }

    console.log(`[Export] Starting export for project: ${projectName} (${projectId}) in ${format} format`);

    // Gather all export data
    const exportData = await gatherExportData(projectId, projectName, {
      includeAIDocs,
      aiDocsContent,
      aiDocsProvider,
      llmProvider
    });

    console.log(`[Export] Gathered data - Goals: ${exportData.goals.length}, Tasks: ${exportData.tasks.length}, Contexts: ${exportData.contexts.length}`);

    // Format the data
    let formattedContent: string;
    if (format === 'json') {
      formattedContent = exportAsJSON(exportData);
    } else {
      formattedContent = exportAsMarkdown(exportData);
    }

    // Generate filename
    const filename = generateExportFilename(projectName, format);

    console.log(`[Export] Export complete - File: ${filename}, Size: ${formattedContent.length} bytes`);

    return NextResponse.json({
      success: true,
      data: formattedContent,
      filename,
      stats: {
        goals: exportData.goals.length,
        tasks: exportData.tasks.length,
        contexts: exportData.contexts.length,
        scans: exportData.scans.length,
        implementationLogs: exportData.implementationLogs.length
      }
    });

  } catch (error) {
    console.error('[Export] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export project data'
      },
      { status: 500 }
    );
  }
}
