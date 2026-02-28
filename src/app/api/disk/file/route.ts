/**
 * Unified File API
 *
 * POST /api/disk/file
 * Handles read, write, and check operations via the `action` field.
 *
 * Actions:
 *   - read:  { action: 'read',  filePath }                              → { success, content, filePath }
 *   - write: { action: 'write', filePath, content, contextName? }       → { success, message, filePath }
 *   - check: { action: 'check', filePath }                              → { exists, path }
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, normalize } from 'path';
import { withObservability } from '@/lib/observability/middleware';
import { withAccessControl } from '@/lib/api-helpers/accessControl';
import { validateFilePath, validatePathTraversal } from '@/lib/pathSecurity';
import { handleApiError } from '@/lib/api-errors';

type FileAction = 'read' | 'write' | 'check';

interface FileRequestBody {
  action: FileAction;
  filePath: string;
  content?: string;
  contextName?: string;
}

// ── Read ──

async function handleRead(filePath: string) {
  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: validation.error.includes('required') ? 400 : 403 }
    );
  }

  const fullPath = validation.resolvedPath;

  try {
    const content = await readFile(fullPath, 'utf-8');
    return NextResponse.json({ success: true, content, filePath: fullPath });
  } catch (fileError) {
    const errorCode = (fileError as NodeJS.ErrnoException).code;
    if (errorCode === 'ENOENT') {
      return NextResponse.json(
        { success: false, error: 'File not found', filePath: fullPath },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to read file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`, filePath: fullPath },
      { status: 500 }
    );
  }
}

// ── Write ──

async function handleWrite(filePath: string, content: string) {
  if (content === undefined || content === null) {
    return NextResponse.json(
      { success: false, error: 'Content is required' },
      { status: 400 }
    );
  }

  const validation = validateFilePath(filePath);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: validation.error.includes('required') ? 400 : 403 }
    );
  }

  const fullPath = validation.resolvedPath;

  try {
    const dirPath = dirname(fullPath);
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
    await writeFile(fullPath, content, 'utf-8');
    return NextResponse.json({ success: true, message: 'File saved successfully', filePath: fullPath });
  } catch (fileError) {
    const errorCode = (fileError as NodeJS.ErrnoException).code;
    if (errorCode === 'EACCES' || errorCode === 'EPERM') {
      return NextResponse.json(
        { success: false, error: 'Permission denied - cannot write to file', filePath: fullPath },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to save file: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`, filePath: fullPath },
      { status: 500 }
    );
  }
}

// ── Check ──

function handleCheck(filePath: string) {
  const traversalError = validatePathTraversal(filePath);
  if (traversalError) {
    return NextResponse.json(
      { error: traversalError },
      { status: 403 }
    );
  }

  const normalizedPath = normalize(filePath);
  const exists = existsSync(normalizedPath);
  return NextResponse.json({ exists, path: normalizedPath });
}

// ── Router ──

async function handlePost(request: NextRequest) {
  try {
    const body: FileRequestBody = await request.json();
    const { action, filePath, content, contextName } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action is required (read | write | check)' },
        { status: 400 }
      );
    }

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'filePath is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'read':
        return await handleRead(filePath);
      case 'write':
        return await handleWrite(filePath, content ?? '');
      case 'check':
        return handleCheck(filePath);
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}. Valid actions: read, write, check` },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleApiError(error, 'Disk file operation');
  }
}

export const POST = withObservability(
  withAccessControl(handlePost, '/api/disk/file', { skipProjectCheck: true, minRole: 'viewer' }),
  '/api/disk/file'
);
