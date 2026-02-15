import { NextRequest, NextResponse } from 'next/server';
import { getStructureTemplateWithCustom } from '../../structure-scan/structureTemplates';
import { withObservability } from '@/lib/observability/middleware';
import { glob as globCallback } from 'glob';
import { promisify } from 'util';
import path from 'path';
import { validateProjectPath } from '@/lib/pathSecurity';
import { checkProjectAccess } from '@/lib/api-helpers/accessControl';

const glob = promisify(globCallback);
import { contextQueries } from '@/lib/queries/contextQueries';

interface ScriptedContext {
  parentFile: string;
  dependencies: string[];
  totalFiles: number;
}

/**
 * POST /api/contexts/scripted
 *
 * Performs a scripted context scan based on structure template rules marked with context=true.
 * For each matching pattern, gathers dependencies and prepares context data.
 *
 * Request body:
 * {
 *   projectId: string;      // Project ID for database operations
 *   projectPath: string;    // Absolute path to project root
 *   projectType: 'nextjs' | 'fastapi';  // Project type
 *   dryRun?: boolean;       // If true, only return contexts without saving (default: false)
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   contexts: Array<{
 *     parentFile: string;
 *     dependencies: string[];
 *     totalFiles: number;
 *   }>;
 *   stats: {
 *     totalContexts: number;
 *     totalFiles: number;
 *     skippedDuplicates: number;
 *   };
 * }
 */
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, projectType, dryRun = false } = body;

    // Validate input
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required in request body' },
        { status: 400 }
      );
    }

    const accessDenied = checkProjectAccess(projectId, request);
    if (accessDenied) return accessDenied;

    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required in request body' },
        { status: 400 }
      );
    }

    // Validate project path for traversal attacks
    const pathError = validateProjectPath(projectPath);
    if (pathError) {
      return NextResponse.json(
        { error: pathError },
        { status: 403 }
      );
    }

    if (!projectType || (projectType !== 'nextjs' && projectType !== 'fastapi')) {
      return NextResponse.json(
        { error: 'projectType must be "nextjs" or "fastapi"' },
        { status: 400 }
      );
    }

    // Load structure template
    const template = await getStructureTemplateWithCustom(projectType);

    // Filter rules marked with context=true
    const contextRules = template.rules.filter(rule => rule.context === true);

    if (contextRules.length === 0) {
      return NextResponse.json({
        success: true,
        contexts: [],
        stats: {
          totalContexts: 0,
          totalFiles: 0,
          skippedDuplicates: 0,
        },
        message: 'No rules marked with context=true in structure template',
      });
    }

    // Fetch existing contexts to check for duplicates
    const existingContexts = await contextQueries.getContextsByProject(projectId);
    const existingParentFiles = new Set(
      existingContexts
        .map(ctx => {
          const filePaths = Array.isArray(ctx.filePaths) ? ctx.filePaths : JSON.parse((ctx.filePaths as string) || '[]') as string[];
          // Consider the first file in the context as the "parent"
          return filePaths[0];
        })
        .filter(Boolean)
    );

    const discoveredContexts: ScriptedContext[] = [];
    let totalFilesCount = 0;
    let skippedDuplicates = 0;

    // Process each context rule
    for (const rule of contextRules) {
      // Find matching files using glob
      const matchingFiles = await glob(rule.pattern, {
        cwd: projectPath,
        absolute: false,
        nodir: true,
        nocase: true, // Case-insensitive matching
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**'],
      }) as string[];

      // For each matching file, gather dependencies
      for (const relativeFilePath of matchingFiles) {
        const absoluteFilePath = path.join(projectPath, relativeFilePath);
        const normalizedRelativePath = relativeFilePath.replace(/\\/g, '/');

        // Check if this file is already in an existing context
        if (existingParentFiles.has(normalizedRelativePath)) {
          skippedDuplicates++;
          continue;
        }

        // Call file-dependencies API to gather children
        try {
          const dependencyResponse = await fetch(
            `${request.nextUrl.origin}/api/file-dependencies`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filePath: absoluteFilePath,
                projectPath: projectPath,
                maxDepth: 3,
              }),
            }
          );

          if (!dependencyResponse.ok) {
            continue;
          }

          const dependencyData = await dependencyResponse.json();

          if (dependencyData.success && dependencyData.dependencies) {
            const allFiles = [
              normalizedRelativePath, // Parent file
              ...dependencyData.dependencies.map((dep: { relativePath: string }) => dep.relativePath),
            ];

            discoveredContexts.push({
              parentFile: normalizedRelativePath,
              dependencies: dependencyData.dependencies.map((dep: { relativePath: string }) => dep.relativePath),
              totalFiles: allFiles.length,
            });

            totalFilesCount += allFiles.length;
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      contexts: discoveredContexts,
      stats: {
        totalContexts: discoveredContexts.length,
        totalFiles: totalFilesCount,
        skippedDuplicates,
      },
      dryRun,
      message: dryRun
        ? 'Dry run complete. Contexts not saved to database.'
        : 'Scripted scan complete. Ready for LLM metadata generation.',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform scripted scan',
      },
      { status: 500 }
    );
  }
}

export const POST = withObservability(handlePost, '/api/contexts/scripted');
