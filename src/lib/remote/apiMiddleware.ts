/**
 * Remote API Middleware
 *
 * Provides a `withRemoteSupabase` wrapper that eliminates duplicated
 * boilerplate across remote API routes:
 *   - getRemoteSupabase() call + null check → 400 response
 *   - try-catch with console.error + JSON error response
 *
 * Usage:
 *   export const GET = withRemoteSupabase('Remote/Events', async (supabase, request) => {
 *     const { data } = await supabase.from('table').select('*');
 *     return NextResponse.json({ success: true, data });
 *   });
 */

import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getRemoteSupabase } from './supabaseClient';

interface RouteContext {
  params: Promise<Record<string, string>>;
}

type SupabaseRouteHandler = (
  supabase: SupabaseClient,
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>;

/**
 * Wraps a remote API route handler with Supabase client initialization,
 * null-check guard, and standardized error handling.
 *
 * @param tag - Log prefix for error messages, e.g. 'Remote/Clients'
 * @param handler - Route handler that receives a guaranteed non-null SupabaseClient
 */
export function withRemoteSupabase(tag: string, handler: SupabaseRouteHandler) {
  return async (request: NextRequest, context?: RouteContext): Promise<NextResponse> => {
    try {
      const supabase = getRemoteSupabase();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Remote not configured' },
          { status: 400 }
        );
      }
      return await handler(supabase, request, context as RouteContext);
    } catch (error) {
      console.error(`[${tag}] Error:`, error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}
