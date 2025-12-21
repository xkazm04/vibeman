import { NextRequest, NextResponse } from 'next/server';
import { socialConfigRepository } from '@/app/db/repositories/social-config.repository';
import { SocialChannelConfigResponse } from '@/app/db/models/social-config.types';
import { encryptCredentials } from '@/app/features/Social/sub_SocConfig/lib/encryption';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/social/config/[id]
 * Get a specific social channel config
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const config = socialConfigRepository.getConfigById(id);
    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    const response: SocialChannelConfigResponse = {
      id: config.id,
      projectId: config.project_id,
      channelType: config.channel_type,
      name: config.name,
      isEnabled: config.is_enabled === 1,
      config: JSON.parse(config.config_json),
      connectionStatus: config.connection_status,
      lastConnectionTest: config.last_connection_test,
      lastError: config.last_error,
      lastFetchAt: config.last_fetch_at,
      itemsFetchedCount: config.items_fetched_count,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };

    return NextResponse.json({ config: response });
  } catch (error) {
    console.error('Error fetching social config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social config' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/social/config/[id]
 * Update a social channel config
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, isEnabled, credentials, config } = body;

    const existingConfig = socialConfigRepository.getConfigById(id);
    if (!existingConfig) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    const updates: Parameters<typeof socialConfigRepository.updateConfig>[1] = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (isEnabled !== undefined) {
      updates.is_enabled = isEnabled ? 1 : 0;
    }

    if (credentials !== undefined) {
      updates.credentials_encrypted = encryptCredentials(credentials, existingConfig.project_id);
      // Reset connection status when credentials change
      updates.connection_status = 'untested';
      updates.last_error = null;
    }

    if (config !== undefined) {
      updates.config_json = JSON.stringify(config);
    }

    const updatedConfig = socialConfigRepository.updateConfig(id, updates);
    if (!updatedConfig) {
      return NextResponse.json(
        { error: 'Failed to update config' },
        { status: 500 }
      );
    }

    const response: SocialChannelConfigResponse = {
      id: updatedConfig.id,
      projectId: updatedConfig.project_id,
      channelType: updatedConfig.channel_type,
      name: updatedConfig.name,
      isEnabled: updatedConfig.is_enabled === 1,
      config: JSON.parse(updatedConfig.config_json),
      connectionStatus: updatedConfig.connection_status,
      lastConnectionTest: updatedConfig.last_connection_test,
      lastError: updatedConfig.last_error,
      lastFetchAt: updatedConfig.last_fetch_at,
      itemsFetchedCount: updatedConfig.items_fetched_count,
      createdAt: updatedConfig.created_at,
      updatedAt: updatedConfig.updated_at,
    };

    return NextResponse.json({ config: response });
  } catch (error) {
    console.error('Error updating social config:', error);
    return NextResponse.json(
      { error: 'Failed to update social config' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/config/[id]
 * Delete a social channel config
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const config = socialConfigRepository.getConfigById(id);
    if (!config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    const deleted = socialConfigRepository.deleteConfig(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete config' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social config:', error);
    return NextResponse.json(
      { error: 'Failed to delete social config' },
      { status: 500 }
    );
  }
}
