import { NextRequest, NextResponse } from 'next/server';
import { contextDb, testSelectorDb } from '@/app/db';
import { projectDb } from '@/lib/project_database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper to create error response
 */
function errorResponse(message: string, status: number, details?: unknown) {
  const response: Record<string, unknown> = { error: message };
  if (details) {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}

/**
 * Extract data-testid values from file content
 */
function extractTestIds(content: string): string[] {
  const testids: string[] = [];

  // Match both single and double quotes
  const singleQuoteMatches = content.match(/data-testid='([^']*)'/g) || [];
  const doubleQuoteMatches = content.match(/data-testid="([^"]*)"/g) || [];
  const allMatches = [...singleQuoteMatches, ...doubleQuoteMatches];

  allMatches.forEach(match => {
    const testid = match.replace(/data-testid=["']([^"']+)["']/, '$1');
    if (testid && !testid.includes('{')) { // Skip dynamic testids like {id}
      testids.push(testid);
    }
  });

  return testids;
}

/**
 * POST /api/tester/selectors/scan - Scan context files for data-testid and save to database
 *
 * Body:
 * - contextId: string (required)
 * - projectId: string (required)
 * - saveToDb: boolean (default: true) - whether to save discovered testids to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, projectId, saveToDb = true } = body;

    if (!contextId) {
      return errorResponse('Context ID is required', 400);
    }

    if (!projectId) {
      return errorResponse('Project ID is required', 400);
    }

    // Get context details
    const context = contextDb.getContextById(contextId);
    if (!context) {
      return errorResponse('Context not found', 404);
    }

    // Parse file paths
    let filePaths: string[] = [];
    try {
      filePaths = JSON.parse(context.file_paths || '[]');
    } catch {
      return errorResponse('Invalid file paths in context', 400);
    }

    if (filePaths.length === 0) {
      return NextResponse.json({
        success: true,
        contextId: context.id,
        contextName: context.name,
        totalFound: 0,
        newSelectors: 0,
        existingSelectors: 0,
        selectors: [],
        message: 'Context has no files to scan',
      });
    }

    // Get project path
    const project = projectDb.getProject(projectId);
    if (!project) {
      return errorResponse('Project not found', 404);
    }

    const projectPath = project.path;

    // Get existing selectors from DB for this context
    const existingSelectors = testSelectorDb.getSelectorsByContext(contextId);
    const existingTestIds = new Set(existingSelectors.map(s => s.data_testid));

    // Scan files for data-testid attributes
    const discoveredSelectors: Array<{
      filepath: string;
      testid: string;
      isNew: boolean;
    }> = [];

    const allTestIds = new Set<string>();

    for (const filepath of filePaths) {
      try {
        const fullPath = join(projectPath, filepath);
        const content = readFileSync(fullPath, 'utf-8');
        const testids = extractTestIds(content);

        for (const testid of testids) {
          // Track unique testids
          if (!allTestIds.has(testid)) {
            allTestIds.add(testid);
            discoveredSelectors.push({
              filepath,
              testid,
              isNew: !existingTestIds.has(testid),
            });
          }
        }
      } catch {
        // Failed to read file, skip it
      }
    }

    // Save new selectors to database if requested
    let savedCount = 0;
    const savedSelectors: Array<{
      id: string;
      dataTestid: string;
      filepath: string;
    }> = [];

    if (saveToDb) {
      for (const selector of discoveredSelectors) {
        if (selector.isNew) {
          try {
            // Generate a title from the testid (convert kebab-case to Title Case)
            const title = selector.testid
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            const newSelector = testSelectorDb.createSelector({
              id: uuidv4(),
              context_id: contextId,
              data_testid: selector.testid,
              title,
              filepath: selector.filepath,
            });

            savedSelectors.push({
              id: newSelector.id,
              dataTestid: newSelector.data_testid,
              filepath: newSelector.filepath,
            });
            savedCount++;
          } catch {
            // Failed to save selector, continue with others
          }
        }
      }
    }

    // Get updated selector count
    const updatedSelectors = testSelectorDb.getSelectorsByContext(contextId);

    return NextResponse.json({
      success: true,
      contextId: context.id,
      contextName: context.name,
      totalFound: discoveredSelectors.length,
      newSelectors: savedCount,
      existingSelectors: existingSelectors.length,
      totalInDb: updatedSelectors.length,
      selectors: discoveredSelectors.map(s => ({
        testid: s.testid,
        filepath: s.filepath,
        isNew: s.isNew,
      })),
      savedSelectors,
    });
  } catch (error) {
    return errorResponse(
      'Failed to scan for selectors',
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
