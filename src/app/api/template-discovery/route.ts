/**
 * Template Discovery API
 * POST: Scan a project path for TemplateConfig exports
 * GET: List all discovered templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { Project } from 'ts-morph';
import { discoverTemplateFiles, parseTemplateConfig } from '@/lib/template-discovery';
import { discoveredTemplateRepository } from '@/app/db/repositories/discovered-template.repository';
import { isTableMissingError } from '@/app/db/repositories/repository.utils';
import { normalizePath } from '@/utils/pathUtils';

export interface ScanRequest {
  projectPath: string;
}

export interface ScanResponse {
  success: boolean;
  projectPath: string;
  filesScanned: number;
  results: {
    created: number;
    updated: number;
    unchanged: number;
  };
  templates: Array<{
    templateId: string;
    templateName: string;
    description: string;
    action: 'created' | 'updated' | 'unchanged';
  }>;
  errors?: string[];
  staleCount?: number;
}

/**
 * POST /api/template-discovery
 * Scan a project path and discover TemplateConfig exports
 */
export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse | { error: string }>> {
  try {
    const body = await request.json() as ScanRequest;
    const { projectPath } = body;

    // Validate request
    if (!projectPath) {
      return NextResponse.json(
        { error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Verify path exists
    try {
      const stats = await stat(projectPath);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { error: 'projectPath must be a directory' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'projectPath does not exist' },
        { status: 400 }
      );
    }

    // Normalize path
    const normalizedPath = normalizePath(projectPath);

    // Step 1: Discover template files
    const scanResult = await discoverTemplateFiles(projectPath);

    if (scanResult.files.length === 0) {
      return NextResponse.json({
        success: true,
        projectPath: normalizedPath,
        filesScanned: 0,
        results: { created: 0, updated: 0, unchanged: 0 },
        templates: [],
      });
    }

    // Step 2: Parse template configs and upsert to database
    // Create a single ts-morph Project instance for all file parsing
    const tsMorphProject = new Project({
      compilerOptions: { allowJs: true, skipLibCheck: true },
      skipAddingFilesFromTsConfig: true,
    });

    const templates: ScanResponse['templates'] = [];
    const errors: string[] = [];
    let created = 0, updated = 0, unchanged = 0;

    for (const discoveredFile of scanResult.files) {
      const parseResult = await parseTemplateConfig(discoveredFile.filePath, tsMorphProject);

      if (parseResult.error) {
        errors.push(`${parseResult.filePath}: ${parseResult.error}`);

        // Mark existing templates for this file path as error
        const existingTemplates = discoveredTemplateRepository.getBySourcePath(normalizedPath);
        const normalizedFilePath = normalizePath(parseResult.filePath);
        for (const existing of existingTemplates) {
          if (normalizePath(existing.file_path) === normalizedFilePath) {
            discoveredTemplateRepository.markError(
              normalizedPath,
              existing.template_id,
              parseResult.error!
            );
          }
        }
        continue;
      }

      for (const config of parseResult.configs) {
        const upsertResult = discoveredTemplateRepository.upsert({
          source_project_path: normalizedPath,
          file_path: normalizePath(parseResult.filePath),
          template_id: config.templateId,
          template_name: config.templateName,
          description: config.description || null,
          category: discoveredFile.category,
          config_json: config.configJson,
          content_hash: config.contentHash,
          source: 'scanned',
        });

        templates.push({
          templateId: config.templateId,
          templateName: config.templateName,
          description: config.description,
          action: upsertResult.action,
        });

        if (upsertResult.action === 'created') created++;
        else if (upsertResult.action === 'updated') updated++;
        else unchanged++;
      }
    }

    // Step 4: Mark stale templates (replaced destructive deleteStale)
    // Only mark stale when there were NO parse errors (partial failure safety)
    const currentTemplateIds = templates.map(t => t.templateId);
    const hasErrors = errors.length > 0;
    const staleCount = hasErrors
      ? 0  // Skip stale marking when there were parse errors (partial failure safety)
      : discoveredTemplateRepository.markStale(normalizedPath, currentTemplateIds);
    if (staleCount > 0) {
      console.log(`[Template Discovery] Marked ${staleCount} templates as stale`);
    }

    return NextResponse.json({
      success: true,
      projectPath: normalizedPath,
      filesScanned: scanResult.files.length,
      results: { created, updated, unchanged },
      templates,
      ...(errors.length > 0 && { errors }),
      ...(staleCount > 0 && { staleCount }),
    });

  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { error: 'Template discovery feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('[Template Discovery] Scan failed:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/template-discovery
 * List all discovered templates, optionally filtered by source path
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const sourcePath = searchParams.get('sourcePath');
    const countOnly = searchParams.get('countOnly');
    const projectPath = searchParams.get('projectPath');

    // Lightweight file count endpoint for scan progress display
    if (countOnly && projectPath) {
      const scanResult = await discoverTemplateFiles(projectPath);
      return NextResponse.json({ fileCount: scanResult.files.length });
    }

    const templates = sourcePath
      ? discoveredTemplateRepository.getBySourcePath(sourcePath)
      : discoveredTemplateRepository.getAll();

    return NextResponse.json({
      templates,
      count: templates.length,
    });

  } catch (error) {
    if (isTableMissingError(error)) {
      return NextResponse.json(
        { error: 'Template discovery feature requires database setup. Run migrations and restart the app.' },
        { status: 503 }
      );
    }
    console.error('[Template Discovery] List failed:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
