/**
 * Architecture Relationships API
 * GET - Fetch relationships
 * POST - Create manual relationship
 * DELETE - Remove relationship
 */

import { NextRequest, NextResponse } from 'next/server';
import { crossProjectRelationshipRepository } from '@/app/db/repositories/cross-project-relationship.repository';
import { generateId } from '@/app/db/repositories/repository.utils';
import { validateRequestBody } from '@/lib/validation/apiValidator';
import {
  validateProjectId,
  validateEnum,
  validateString,
} from '@/lib/validation/inputValidator';
import type {
  IntegrationType,
  CreateCrossProjectRelationshipInput,
} from '@/app/db/models/cross-project-architecture.types';

const VALID_INTEGRATION_TYPES = ['rest', 'graphql', 'grpc', 'websocket', 'event', 'database', 'storage'] as const;
const validateIntegrationType = validateEnum('integrationType', VALID_INTEGRATION_TYPES);
const validateLabel = validateString('label', { required: false, maxLength: 500 });
const validateProtocol = validateString('protocol', { required: false, maxLength: 200 });
const validateDataFlow = validateString('dataFlow', { required: false, maxLength: 200 });
const validateConfidence = (value: unknown): string | null => {
  if (typeof value !== 'number') return 'confidence must be a number';
  if (value < 0 || value > 1) return 'confidence must be between 0 and 1';
  return null;
};

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
      const relationships = crossProjectRelationshipRepository.getBetweenProjects(projectA, projectB);
      return NextResponse.json({ relationships });
    }

    // Get relationships for a specific project
    if (projectId) {
      const relationships = crossProjectRelationshipRepository.getByProject(projectId);
      return NextResponse.json({ relationships });
    }

    // Get relationships for a workspace (null = default workspace)
    const wsId = workspaceId === '' ? null : (workspaceId || null);
    const relationships = crossProjectRelationshipRepository.getByWorkspace(wsId);
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
    const result = await validateRequestBody(request, {
      required: [
        { field: 'sourceProjectId', validator: validateProjectId },
        { field: 'targetProjectId', validator: validateProjectId },
        { field: 'integrationType', validator: validateIntegrationType },
      ],
      optional: [
        { field: 'workspaceId', validator: validateProjectId },
        { field: 'label', validator: validateLabel },
        { field: 'protocol', validator: validateProtocol },
        { field: 'dataFlow', validator: validateDataFlow },
        { field: 'confidence', validator: validateConfidence },
        { field: 'sourceContextId', validator: validateProjectId },
        { field: 'targetContextId', validator: validateProjectId },
      ],
    });
    if (!result.success) return result.error;

    const {
      sourceProjectId,
      targetProjectId,
      integrationType,
      workspaceId,
      label,
      protocol,
      dataFlow,
      confidence = 1.0,
      sourceContextId,
      targetContextId,
    } = result.data as Record<string, unknown>;

    // Check for existing relationship
    const existing = crossProjectRelationshipRepository.getBetweenProjects(
      sourceProjectId as string,
      targetProjectId as string,
    );
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
      workspace_id: workspaceId === '' ? null : ((workspaceId as string) || null),
      source_project_id: sourceProjectId as string,
      target_project_id: targetProjectId as string,
      source_context_id: sourceContextId as string | undefined,
      target_context_id: targetContextId as string | undefined,
      integration_type: integrationType as IntegrationType,
      label: label as string | undefined,
      protocol: protocol as string | undefined,
      data_flow: dataFlow as string | undefined,
      confidence: confidence as number,
      detected_by: 'manual',
    };

    const relationship = crossProjectRelationshipRepository.create(input);
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
      const count = crossProjectRelationshipRepository.deleteByWorkspace(wsId);
      return NextResponse.json({ success: true, deleted: count });
    }

    // Delete specific relationship
    if (id) {
      const deleted = crossProjectRelationshipRepository.delete(id);
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
