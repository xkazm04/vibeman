import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getStructureTemplate, StructureRule } from '../structureTemplates';

const CUSTOM_TEMPLATES_DIR = path.join(process.cwd(), 'data', 'custom-templates');

/**
 * Get custom template file path
 */
function getCustomTemplatePath(projectType: string): string {
  return path.join(CUSTOM_TEMPLATES_DIR, `${projectType}.json`);
}

/**
 * Ensure custom templates directory exists
 */
async function ensureCustomTemplatesDir() {
  try {
    await fs.access(CUSTOM_TEMPLATES_DIR);
  } catch {
    await fs.mkdir(CUSTOM_TEMPLATES_DIR, { recursive: true });
  }
}

/**
 * GET /api/structure-scan/templates
 * Get structure template (custom if exists, otherwise default)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || (type !== 'nextjs' && type !== 'fastapi')) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      );
    }

    await ensureCustomTemplatesDir();

    // Try to load custom template
    const customPath = getCustomTemplatePath(type);
    try {
      const customContent = await fs.readFile(customPath, 'utf-8');
      const customTemplate = JSON.parse(customContent);

      return NextResponse.json({
        success: true,
        rules: customTemplate.rules,
        isCustom: true,
      });
    } catch {
      // If custom template doesn't exist, return default
      const defaultTemplate = getStructureTemplate(type as 'nextjs' | 'fastapi');

      return NextResponse.json({
        success: true,
        rules: defaultTemplate.rules,
        isCustom: false,
      });
    }
  } catch (error) {
    console.error('Error loading template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load template' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/structure-scan/templates
 * Save custom structure template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectType, rules } = body;

    if (!projectType || (projectType !== 'nextjs' && projectType !== 'fastapi')) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      );
    }

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'Invalid rules format' },
        { status: 400 }
      );
    }

    await ensureCustomTemplatesDir();

    // Save custom template
    const customPath = getCustomTemplatePath(projectType);
    const template = {
      projectType,
      rules: rules as StructureRule[],
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(customPath, JSON.stringify(template, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Template saved successfully',
    });
  } catch (error) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/structure-scan/templates
 * Reset to default template by deleting custom template
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || (type !== 'nextjs' && type !== 'fastapi')) {
      return NextResponse.json(
        { error: 'Invalid project type' },
        { status: 400 }
      );
    }

    const customPath = getCustomTemplatePath(type);

    try {
      await fs.unlink(customPath);
    } catch {
      // File doesn't exist, that's fine
    }

    return NextResponse.json({
      success: true,
      message: 'Template reset to default',
    });
  } catch (error) {
    console.error('Error resetting template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset template' },
      { status: 500 }
    );
  }
}
