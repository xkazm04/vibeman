/**
 * Prompt Templates API
 * Handles CRUD operations for reusable prompt templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateDb } from '@/app/db';
import type { PromptTemplateCategory } from '@/app/db/models/types';

/**
 * GET - List templates by project
 * Query params:
 *   - projectId (required): Project to get templates for
 *   - category (optional): Filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId');
    const category = request.nextUrl.searchParams.get('category') as PromptTemplateCategory | null;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let templates;
    if (category) {
      templates = promptTemplateDb.getByCategory(projectId, category);
    } else {
      templates = promptTemplateDb.getByProject(projectId);
    }

    // Parse variables JSON for each template
    const parsedTemplates = templates.map((t) => ({
      ...t,
      variables: JSON.parse(t.variables || '[]'),
    }));

    return NextResponse.json(parsedTemplates);
  } catch (error) {
    console.error('Failed to get prompt templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get templates' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new template
 * Body:
 *   - projectId (required): Project ID
 *   - name (required): Template name
 *   - description (optional): Template description
 *   - category (required): Template category
 *   - templateContent (required): Template content with {{VARIABLE}} placeholders
 *   - variables (required): Array of variable definitions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, description, category, templateContent, variables } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }
    if (!templateContent) {
      return NextResponse.json({ error: 'templateContent is required' }, { status: 400 });
    }

    // Check for duplicate name
    if (promptTemplateDb.nameExists(projectId, name)) {
      return NextResponse.json(
        { error: `Template with name "${name}" already exists in this project` },
        { status: 409 }
      );
    }

    const template = promptTemplateDb.create({
      project_id: projectId,
      name,
      description: description || null,
      category,
      template_content: templateContent,
      variables: JSON.stringify(variables || []),
    });

    return NextResponse.json({
      ...template,
      variables: JSON.parse(template.variables || '[]'),
    });
  } catch (error) {
    console.error('Failed to create prompt template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update an existing template
 * Body:
 *   - id (required): Template ID
 *   - name (optional): New name
 *   - description (optional): New description
 *   - category (optional): New category
 *   - templateContent (optional): New template content
 *   - variables (optional): New variable definitions
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, category, templateContent, variables } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = promptTemplateDb.getById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      if (promptTemplateDb.nameExists(existing.project_id, name, id)) {
        return NextResponse.json(
          { error: `Template with name "${name}" already exists in this project` },
          { status: 409 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (templateContent !== undefined) updates.template_content = templateContent;
    if (variables !== undefined) updates.variables = JSON.stringify(variables);

    const template = promptTemplateDb.update(id, updates);

    if (!template) {
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      ...template,
      variables: JSON.parse(template.variables || '[]'),
    });
  } catch (error) {
    console.error('Failed to update prompt template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a template
 * Query params:
 *   - id (required): Template ID to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = promptTemplateDb.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete prompt template:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete template' },
      { status: 500 }
    );
  }
}
