/**
 * Remote Client by ID API
 * GET: Get client details
 * PUT: Update client
 * DELETE: Delete client
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRemoteSupabase } from '@/lib/remote/supabaseClient';
import type { ClientPermission } from '@/lib/remote/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Get client by ID (without API key)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('[Remote/Clients/ID] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get client',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update client
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('[Remote/Clients/ID] PUT Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update client',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete client
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = getRemoteSupabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Remote not configured' },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error('[Remote/Clients/ID] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete client',
      },
      { status: 500 }
    );
  }
}
