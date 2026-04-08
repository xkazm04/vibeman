/**
 * Remote Command by ID API
 * GET: Get command status
 * DELETE: Cancel pending command
 */

import { NextResponse } from 'next/server';
import { withRemoteSupabase } from '@/lib/remote/apiMiddleware';

/**
 * GET: Get command by ID
 */
export const GET = withRemoteSupabase('Remote/Commands/ID', async (supabase, _request, context) => {
  const { id } = await context.params;

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
});

/**
 * DELETE: Cancel a pending command
 */
export const DELETE = withRemoteSupabase('Remote/Commands/ID', async (supabase, _request, context) => {
  const { id } = await context.params;

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
});
