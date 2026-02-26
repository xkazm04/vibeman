/**
 * Remote Command by ID API
 * GET: Get command status
 * DELETE: Cancel pending command
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRemoteSupabase } from '@/lib/remote/supabaseClient';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Get command by ID
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

    const { data: command, error } = await supabase
      .from('vibeman_commands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Command not found' },
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
      command,
    });
  } catch (error) {
    console.error('[Remote/Commands/ID] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get command',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Cancel a pending command
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

    // Only allow cancelling pending commands
    const { data: existing, error: fetchError } = await supabase
      .from('vibeman_commands')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Command not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel command with status: ${existing.status}. Only pending commands can be cancelled.`,
        },
        { status: 400 }
      );
    }

    // Update to failed with cancellation message
    const { error: updateError } = await supabase
      .from('vibeman_commands')
      .update({
        status: 'failed',
        error_message: 'Cancelled by user',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Command cancelled',
    });
  } catch (error) {
    console.error('[Remote/Commands/ID] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel command',
      },
      { status: 500 }
    );
  }
}
