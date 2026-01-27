/**
 * Remote Clients API
 * GET: List registered clients
 * POST: Create a new API client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getActiveRemoteConfig } from '@/lib/remote/config.server';
import type { CreateClientRequest, ClientPermission } from '@/lib/remote/types';
import { randomBytes } from 'crypto';

/**
 * Generate a secure API key
 */
function generateApiKey(): string {
  const bytes = randomBytes(24);
  return 'vbm_' + bytes.toString('base64').replace(/[+/=]/g, '');
}

/**
 * GET: List all clients (without exposing API keys)
 */
export async function GET() {
  try {
    const config = getActiveRemoteConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: clients, error } = await supabase
      .from('vibeman_clients')
      .select('id, name, description, permissions, is_active, last_seen_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Remote/Clients] Query error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      clients: clients || [],
    });
  } catch (error) {
    console.error('[Remote/Clients] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clients',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a new API client
 */
export async function POST(request: NextRequest) {
  try {
    const config = getActiveRemoteConfig();

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreateClientRequest;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Validate permissions
    const validPermissions: ClientPermission[] = ['read_events', 'write_commands', 'admin'];
    const permissions = body.permissions || ['read_events'];

    for (const perm of permissions) {
      if (!validPermissions.includes(perm)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid permission: ${perm}. Valid permissions: ${validPermissions.join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate API key
    const apiKey = generateApiKey();

    // Insert client
    const { data: client, error: insertError } = await supabase
      .from('vibeman_clients')
      .insert({
        api_key: apiKey,
        name: body.name,
        description: body.description || null,
        permissions: permissions,
        is_active: true,
      })
      .select('id, name, permissions')
      .single();

    if (insertError) {
      console.error('[Remote/Clients] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    // Return with API key (only shown once!)
    return NextResponse.json({
      success: true,
      message: 'Client created successfully. Save the API key - it will not be shown again.',
      client: {
        id: client.id,
        api_key: apiKey,
        name: client.name,
        permissions: client.permissions,
      },
    });
  } catch (error) {
    console.error('[Remote/Clients] POST Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create client',
      },
      { status: 500 }
    );
  }
}
