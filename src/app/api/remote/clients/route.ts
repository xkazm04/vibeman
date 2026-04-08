/**
 * Remote Clients API
 * GET: List registered clients
 * POST: Create a new API client
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRemoteSupabase } from '@/lib/remote/apiMiddleware';
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
export const GET = withRemoteSupabase('Remote/Clients', async (supabase) => {
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
});

/**
 * POST: Create a new API client
 */
export const POST = withRemoteSupabase('Remote/Clients', async (supabase, request: NextRequest) => {
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
});
