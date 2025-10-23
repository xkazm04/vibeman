import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST - Read a log file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { logFilePath } = body;

    if (!logFilePath) {
      return NextResponse.json(
        { error: 'Log file path is required' },
        { status: 400 }
      );
    }

    // Security: Ensure the path is within a .claude/logs directory
    const normalizedPath = path.normalize(logFilePath);
    if (!normalizedPath.includes('.claude') || !normalizedPath.includes('logs')) {
      return NextResponse.json(
        { error: 'Invalid log file path' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(logFilePath)) {
      return NextResponse.json(
        { error: 'Log file not found' },
        { status: 404 }
      );
    }

    // Read file content
    const content = fs.readFileSync(logFilePath, 'utf-8');

    return NextResponse.json({
      success: true,
      content,
      path: logFilePath,
    });
  } catch (error) {
    console.error('Error reading log file:', error);
    return NextResponse.json(
      {
        error: 'Failed to read log file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET - List all log files for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logsDir = searchParams.get('logsDir');

    if (!logsDir) {
      return NextResponse.json(
        { error: 'Logs directory is required' },
        { status: 400 }
      );
    }

    // Security check
    const normalizedPath = path.normalize(logsDir);
    if (!normalizedPath.includes('.claude') || !normalizedPath.includes('logs')) {
      return NextResponse.json(
        { error: 'Invalid logs directory path' },
        { status: 403 }
      );
    }

    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ logs: [] });
    }

    // Read directory
    const files = fs.readdirSync(logsDir);
    const logFiles = files
      .filter((file) => file.endsWith('.log'))
      .map((file) => {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
        };
      })
      .sort((a, b) => b.modified.getTime() - a.modified.getTime()); // Most recent first

    return NextResponse.json({ logs: logFiles });
  } catch (error) {
    console.error('Error listing log files:', error);
    return NextResponse.json(
      {
        error: 'Failed to list log files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
