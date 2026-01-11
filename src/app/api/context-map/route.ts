/**
 * API Route: Context Map
 *
 * GET /api/context-map?projectPath=/path/to/project
 * Reads and returns the context_map.json from a project directory
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export interface ContextMapEntry {
  id: string;
  title: string;
  summary: string;
  filepaths: {
    ui?: string[];
    lib?: string[];
    api?: string[];
    [key: string]: string[] | undefined;
  };
}

export interface ContextMap {
  version: string;
  generated: string;
  description: string;
  contexts: ContextMapEntry[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath query parameter is required' },
        { status: 400 }
      );
    }

    // Construct path to context_map.json
    const contextMapPath = path.join(projectPath, 'context_map.json');

    // Check if file exists
    if (!fs.existsSync(contextMapPath)) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: 'context_map.json not found in project directory',
        contextMapPath,
        message: 'Use the /context-map-generator skill to create one'
      }, { status: 404 });
    }

    // Read and parse the file
    const fileContent = fs.readFileSync(contextMapPath, 'utf-8');
    const contextMap: ContextMap = JSON.parse(fileContent);

    // Validate structure
    if (!contextMap.contexts || !Array.isArray(contextMap.contexts)) {
      return NextResponse.json({
        success: false,
        exists: true,
        error: 'Invalid context_map.json structure: missing contexts array',
        contextMapPath
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      contextMap,
      contextMapPath,
      entryCount: contextMap.contexts.length
    });

  } catch (error) {
    logger.error('[API] Context map error:', { error });

    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        exists: true,
        error: 'Invalid JSON in context_map.json',
        details: error.message
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
