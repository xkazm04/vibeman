/**
 * Remote Client by ID API
 * GET: Get client details
 * PUT: Update client
 * DELETE: Delete client
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRemoteSupabase } from '@/lib/remote/apiMiddleware';
import type { ClientPermission } from '@/lib/remote/types';

/**
 * GET: Get client by ID (without API key)
 */
export const GET = withRemoteSupabase('Remote/Clients/ID', async (supabase, _request, context) => {
  const { id } = await context.params;

  const { data: client, error } = await supabase
    .from('vibeman_clients')
    .select('id, name, description, permissions, is_active, last_seen_at, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    client,
  });
});

/**
 * PUT: Update client
 */
export const PUT = withRemoteSupabase('Remote/Clients/ID', async (supabase, request: NextRequest, context) => {
  const { id } = await context.params;
  const body = await request.json();

  // Validate permissions if provided
  if (body.permissions) {
    const validPermissions: ClientPermission[] = ['read_events', 'write_commands', 'admin'];
    for (const perm of body.permissions) {
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
  }

  // Build update object
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.permissions !== undefined) update.permissions = body.permissions;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const { data: client, error } = await supabase
    .from('vibeman_clients')
    .update(update)
    .eq('id', id)
    .select('id, name, description, permissions, is_active, updated_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    client,
  });
});

/**
 * DELETE: Delete client
 */
export const DELETE = withRemoteSupabase('Remote/Clients/ID', async (supabase, _request, context) => {
  const { id } = await context.params;

  const { error } = await supabase
    .from('vibeman_clients')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Client deleted',
  });
});
