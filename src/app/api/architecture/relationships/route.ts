/**
 * Architecture Relationships API
 * GET - Fetch relationships
 * POST - Create manual relationship
 * DELETE - Remove relationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { crossProjectRelationshipDb } from '@/app/db';
import { generateId } from '@/app/db/repositories/repository.utils';
import type {
  IntegrationType,
  CreateCrossProjectRelationshipInput,
} from '@/app/db/models/cross-project-architecture.types';

interface CreateRelationshipBody {
  workspaceId?: string | null;
  sourceProjectId: string;
  targetProjectId: string;
  integrationType: IntegrationType;
  label?: string;
  protocol?: string;
  dataFlow?: string;
  confidence?: number;
  sourceContextId?: string;
  targetContextId?: string;
}

/**
 * GET /api/architecture/relationships
 * Fetch relationships by workspace, project, or between specific projects
 * Query params: workspaceId | projectId | (projectA & projectB)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const projectId = searchParams.get('projectId');
    const projectA = searchParams.get('projectA');
    const projectB = searchParams.get('projectB');

    // Get relationships between two specific projects
    if (projectA && projectB) {
      const relationships = crossProjectRelationshipDb.getBetweenProjects(projectA, projectB);
      return NextResponse.json({ relationships });
    }

    // Get relationships for a specific project
    if (projectId) {
      const relationships = crossProjectRelationshipDb.getByProject(projectId);
      return NextResponse.json({ relationships });
    }

    // Get relationships for a workspace (null = default workspace)
    const wsId = workspaceId === '' ? null : (workspaceId || null);
    const relationships = crossProjectRelationshipDb.getByWorkspace(wsId);
    return NextResponse.json({ relationships });
  } catch (error) {
    console.error('Get relationships error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get relationships' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/architecture/relationships
 * Create a new manual relationship between projects
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRelationshipBody;
    const {
      workspaceId,
      sourceProjectId,
      targetProjectId,
      integrationType,
      label,
      protocol,
      dataFlow,
      confidence = 1.0, // Manual relationships have full confidence
      sourceContextId,
      targetContextId,
    } = body;

    // Validate required fields
    if (!sourceProjectId || !targetProjectId || !integrationType) {
      return NextResponse.json(
        { error: 'sourceProjectId, targetProjectId, and integrationType are required' },
        { status: 400 }
      );
    }

    // Validate integration type
    const validTypes: IntegrationType[] = [
      'rest', 'graphql', 'grpc', 'websocket', 'event', 'database', 'storage'
    ];
    if (!validTypes.includes(integrationType)) {
      return NextResponse.json(
        { error: `Invalid integrationType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for existing relationship
    const existing = crossProjectRelationshipDb.getBetweenProjects(sourceProjectId, targetProjectId);
    const duplicateType = existing.find(
      r => r.source_project_id === sourceProjectId &&
           r.target_project_id === targetProjectId &&
           r.integration_type === integrationType
    );
    if (duplicateType) {
      return NextResponse.json(
        { error: 'Relationship with same type already exists', existing: duplicateType },
        { status: 409 }
      );
    }

    // Create the relationship
    const input: CreateCrossProjectRelationshipInput = {
      id: generateId('cpr'),
      workspace_id: workspaceId === '' ? null : (workspaceId || null),
      source_project_id: sourceProjectId,
      target_project_id: targetProjectId,
      source_context_id: sourceContextId,
      target_context_id: targetContextId,
      integration_type: integrationType,
      label,
      protocol,
      data_flow: dataFlow,
      confidence,
      detected_by: 'manual',
    };

    const relationship = crossProjectRelationshipDb.create(input);
    return NextResponse.json({ success: true, relationship });
  } catch (error) {
    console.error('Create relationship error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create relationship' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/architecture/relationships
 * Delete a relationship by ID
 * Query params: id | workspaceId (to delete all for workspace)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspaceId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    // Delete all relationships for a workspace
    if (deleteAll && workspaceId !== null) {
      const wsId = workspaceId === '' ? null : workspaceId;
      const count = crossProjectRelationshipDb.deleteByWorkspace(wsId);
      return NextResponse.json({ success: true, deleted: count });
    }

    // Delete specific relationship
    if (id) {
      const deleted = crossProjectRelationshipDb.delete(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'id or (workspaceId + deleteAll) required' }, { status: 400 });
  } catch (error) {
    console.error('Delete relationship error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}
