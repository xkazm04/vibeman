/**
 * API Route: Context Map
 *
 * GET /api/context-map?projectPath=/path/to/project
 * Returns a project's context map, preferring the authoritative DB-derived
 * `context-map.json` (hyphen) and falling back to the deprecated legacy
 * `context_map.json` (underscore, v1 schema) flagged with `deprecated: true`.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { validateProjectPath } from '@/lib/pathSecurity';

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

    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { error: pathError },
        { status: 403 }
      );
    }

    // Single source of truth: the authoritative, DB-derived export is
    // `context-map.json` (hyphen), auto-written by Vibeman on every mutation.
    // The legacy `context_map.json` (underscore, v1 schema) is deprecated and
    // only served as a fallback so old projects don't 404.
    const v2Path = path.join(projectPath, 'context-map.json');
    if (fs.existsSync(v2Path)) {
      const parsed = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
      return NextResponse.json({
        success: true,
        exists: true,
        format: 'v2',
        contextMap: parsed,
        contextMapPath: v2Path,
        entryCount: parsed?.summary?.totalContexts ?? undefined,
      });
    }

    // Fallback: deprecated legacy underscore artifact.
    const legacyPath = path.join(projectPath, 'context_map.json');
    if (!fs.existsSync(legacyPath)) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: 'No context map found (looked for context-map.json and legacy context_map.json)',
        contextMapPath: v2Path,
        message: 'Scan the project in Vibeman to generate context-map.json',
      }, { status: 404 });
    }

    const contextMap: ContextMap = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    if (!contextMap.contexts || !Array.isArray(contextMap.contexts)) {
      return NextResponse.json({
        success: false,
        exists: true,
        error: 'Invalid legacy context_map.json structure: missing contexts array',
        contextMapPath: legacyPath,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      format: 'legacy',
      deprecated: true,
      message: 'context_map.json (underscore) uses the deprecated v1 schema. Re-scan in Vibeman to produce the authoritative context-map.json.',
      contextMap,
      contextMapPath: legacyPath,
      entryCount: contextMap.contexts.length,
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
