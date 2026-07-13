/**
 * API Route: Context Export
 *
 * GET /api/contexts/export?projectId={id}[&write=true]
 * Returns the project's context-map.json structure; with write=true also writes
 * it to the project root. Delegates to src/lib/contexts/exportContextMap.ts (the
 * same builder used for the debounced auto-export on mutations).
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildContextMap, writeContextMap } from '@/lib/contexts/exportContextMap';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const writeToFile = searchParams.get('write') === 'true';

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId is required' }, { status: 400 });
    }

    const contextMap = await buildContextMap(projectId);
    if (!contextMap) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (writeToFile && contextMap.projectPath) {
      try {
        const exportPath = await writeContextMap(contextMap.projectPath, contextMap);
        return NextResponse.json({
          success: true,
          data: contextMap,
          exportedTo: exportPath,
          message: `Context map exported to ${exportPath}`,
        });
      } catch (writeError) {
        logger.error('[API] Failed to write context map file', { error: writeError });
        return NextResponse.json(
          {
            success: false,
            data: contextMap,
            error: 'Failed to write file to disk',
            warning: 'Data is returned in the response body, but the file was not written',
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ success: true, data: contextMap });
  } catch (error) {
    logger.error('[API] Context Export error', { error });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
