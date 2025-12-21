import { NextRequest, NextResponse } from 'next/server';
import { discoveryConfigRepository } from '@/app/db/repositories/social-discovery.repository';
import { mapDbToDiscoveryConfig } from '@/app/features/Social/sub_SocDiscovery/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/social/discovery
 * List discovery configs for a project
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const configs = discoveryConfigRepository.getConfigsByProject(projectId);
    return NextResponse.json({
      configs: configs.map(mapDbToDiscoveryConfig),
    });
  } catch (error) {
    console.error('[Discovery API] Error listing configs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list configs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/discovery
 * Create a new discovery config
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, name, query } = body;

    if (!projectId || !name || !query) {
      return NextResponse.json(
        { error: 'projectId, name, and query are required' },
        { status: 400 }
      );
    }

    const config = discoveryConfigRepository.createConfig({
      id: uuidv4(),
      project_id: projectId,
      name,
      channel: 'x', // Only X supported for now
      query,
    });

    return NextResponse.json({
      success: true,
      config: mapDbToDiscoveryConfig(config),
    });
  } catch (error) {
    console.error('[Discovery API] Error creating config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/social/discovery
 * Update a discovery config
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, query, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: { name?: string; query?: string; is_active?: number } = {};
    if (name !== undefined) updates.name = name;
    if (query !== undefined) updates.query = query;
    if (isActive !== undefined) updates.is_active = isActive ? 1 : 0;

    const config = discoveryConfigRepository.updateConfig(id, updates);

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      config: mapDbToDiscoveryConfig(config),
    });
  } catch (error) {
    console.error('[Discovery API] Error updating config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/discovery
 * Delete a discovery config
 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const deleted = discoveryConfigRepository.deleteConfig(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Discovery API] Error deleting config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete config' },
      { status: 500 }
    );
  }
}
