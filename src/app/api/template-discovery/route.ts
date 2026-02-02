/**
 * Template Discovery API
 * POST: Scan a project path for TemplateConfig exports
 * GET: List all discovered templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import { discoverTemplateFiles, parseTemplateConfigs } from '@/lib/template-discovery';
import { discoveredTemplateRepository } from '@/app/db/repositories/discovered-template.repository';

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
    const normalizedPath = projectPath.replace(/\\/g, '/');

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

    // Step 2: Parse template configs
    const parseResults = await parseTemplateConfigs(scanResult.files);

    // Step 3: Upsert to database
    const templates: ScanResponse['templates'] = [];
    const errors: string[] = [];
    let created = 0, updated = 0, unchanged = 0;

    for (const parseResult of parseResults) {
      if (parseResult.error) {
        errors.push(`${parseResult.filePath}: ${parseResult.error}`);
        continue;
      }

      for (const config of parseResult.configs) {
        const upsertResult = discoveredTemplateRepository.upsert({
          source_project_path: normalizedPath,
          file_path: parseResult.filePath.replace(/\\/g, '/'),
          template_id: config.templateId,
          template_name: config.templateName,
          description: config.description || null,
          config_json: config.configJson,
          content_hash: config.contentHash,
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

    // Step 4: Clean up stale templates (removed from source)
    const currentTemplateIds = templates.map(t => t.templateId);
    const deletedCount = discoveredTemplateRepository.deleteStale(normalizedPath, currentTemplateIds);
    if (deletedCount > 0) {
      console.log(`[Template Discovery] Deleted ${deletedCount} stale templates`);
    }

    return NextResponse.json({
      success: true,
      projectPath: normalizedPath,
      filesScanned: scanResult.files.length,
      results: { created, updated, unchanged },
      templates,
      ...(errors.length > 0 && { errors }),
    });

  } catch (error) {
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

    const templates = sourcePath
      ? discoveredTemplateRepository.getBySourcePath(sourcePath)
      : discoveredTemplateRepository.getAll();

    return NextResponse.json({
      templates,
      count: templates.length,
    });

  } catch (error) {
    console.error('[Template Discovery] List failed:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
