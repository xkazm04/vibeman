/**
 * File Watch Config API
 * GET: Get file watch config for a project
 * POST: Create/update file watch config
 * PATCH: Toggle file watch enabled status
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb } from '@/app/db';
import { fileWatcherManager } from '@/lib/fileWatcher';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const config = scanQueueDb.getFileWatchConfig(projectId);

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching file watch config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file watch config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectPath,
      enabled,
      watchPatterns,
      ignorePatterns,
      scanTypes,
      debounceMs
    } = body;

    if (!projectId || !watchPatterns || !scanTypes) {
      return NextResponse.json(
        { error: 'projectId, watchPatterns, and scanTypes are required' },
        { status: 400 }
      );
    }

    const configId = `watch-${projectId}`;

    const config = scanQueueDb.upsertFileWatchConfig({
      id: configId,
      project_id: projectId,
      enabled,
      watch_patterns: watchPatterns,
      ignore_patterns: ignorePatterns,
      scan_types: scanTypes,
      debounce_ms: debounceMs
    });

    // Start/restart watcher if enabled and projectPath provided
    if (config.enabled && projectPath) {
      await fileWatcherManager.reloadConfig(projectId, projectPath);
    } else if (!config.enabled) {
      await fileWatcherManager.stopWatching(projectId);
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error creating/updating file watch config:', error);
    return NextResponse.json(
      { error: 'Failed to create/update file watch config', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const config = scanQueueDb.toggleFileWatch(projectId);

    if (!config) {
      return NextResponse.json(
        { error: 'File watch config not found' },
        { status: 404 }
      );
    }

    // Start/stop watcher based on new enabled state
    if (config.enabled && projectPath) {
      fileWatcherManager.startWatching(projectId, projectPath);
    } else {
      await fileWatcherManager.stopWatching(projectId);
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error toggling file watch:', error);
    return NextResponse.json(
      { error: 'Failed to toggle file watch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
