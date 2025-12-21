import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { socialConfigRepository } from '@/app/db/repositories/social-config.repository';
import {
  SocialChannelType,
  SocialChannelConfigResponse,
  getDefaultConfig,
} from '@/app/db/models/social-config.types';
import { encryptCredentials, decryptCredentials } from '@/app/features/Social/sub_SocConfig/lib/encryption';

/**
 * GET /api/social/config
 * Get all social channel configs for a project
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const channelType = searchParams.get('channelType') as SocialChannelType | null;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let configs;
    if (channelType) {
      configs = socialConfigRepository.getConfigsByChannel(projectId, channelType);
    } else {
      configs = socialConfigRepository.getConfigsByProject(projectId);
    }

    // Transform to response format (never include credentials)
    const response: SocialChannelConfigResponse[] = configs.map((config) => ({
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
    }));

    return NextResponse.json({ configs: response });
  } catch (error) {
    console.error('Error fetching social configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social configs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/config
 * Create a new social channel config
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, channelType, name, credentials, config } = body;

    if (!projectId || !channelType || !name || !credentials) {
      return NextResponse.json(
        { error: 'projectId, channelType, name, and credentials are required' },
        { status: 400 }
      );
    }

    // Validate channel type
    const validChannels: SocialChannelType[] = ['instagram', 'facebook', 'x', 'gmail', 'discord'];
    if (!validChannels.includes(channelType)) {
      return NextResponse.json(
        { error: 'Invalid channel type' },
        { status: 400 }
      );
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials, projectId);

    // Use provided config or default
    const channelConfig = config || getDefaultConfig(channelType);

    const id = uuidv4();
    const newConfig = socialConfigRepository.createConfig({
      id,
      project_id: projectId,
      channel_type: channelType,
      name,
      is_enabled: 1,
      credentials_encrypted: encryptedCredentials,
      config_json: JSON.stringify(channelConfig),
      connection_status: 'untested',
      last_connection_test: null,
      last_error: null,
      last_fetch_at: null,
      items_fetched_count: 0,
    });

    const response: SocialChannelConfigResponse = {
      id: newConfig.id,
      projectId: newConfig.project_id,
      channelType: newConfig.channel_type,
      name: newConfig.name,
      isEnabled: newConfig.is_enabled === 1,
      config: JSON.parse(newConfig.config_json),
      connectionStatus: newConfig.connection_status,
      lastConnectionTest: newConfig.last_connection_test,
      lastError: newConfig.last_error,
      lastFetchAt: newConfig.last_fetch_at,
      itemsFetchedCount: newConfig.items_fetched_count,
      createdAt: newConfig.created_at,
      updatedAt: newConfig.updated_at,
    };

    return NextResponse.json({ config: response }, { status: 201 });
  } catch (error) {
    console.error('Error creating social config:', error);
    return NextResponse.json(
      { error: 'Failed to create social config' },
      { status: 500 }
    );
  }
}
