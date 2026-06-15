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

export interface RemoteClient {
  id: string;
  permissions: string[];
  is_active: boolean;
}

export type RequireClientResult =
  | { client: RemoteClient; error?: undefined }
  | { client?: undefined; error: NextResponse };

/**
 * Validate a remote API key against vibeman_clients and (optionally) require at
 * least one of `requiredPerms` (an `admin` permission always satisfies). Returns
 * the active client, or an `error` NextResponse the caller should return as-is.
 *
 * This is the same gate the main /api/remote/commands POST applies inline; it is
 * extracted here so the mesh and fleet command-dispatch routes can require auth
 * before inserting EXECUTION-class commands (which run Claude Code locally and
 * write requirement files). Without it those routes were an unauthenticated
 * remote-code-execution / filesystem-write surface for any device on the mesh.
 */
export async function requireClient(
  supabase: SupabaseClient,
  apiKey: string | undefined | null,
  requiredPerms: string[] = []
): Promise<RequireClientResult> {
  if (!apiKey) {
    return { error: NextResponse.json({ success: false, error: 'Missing api_key' }, { status: 401 }) };
  }

  const { data: client, error } = await supabase
    .from('vibeman_clients')
    .select('id, permissions, is_active')
    .eq('api_key', apiKey)
    .single();

  if (error || !client) {
    return { error: NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401 }) };
  }

  if (!client.is_active) {
    return { error: NextResponse.json({ success: false, error: 'API key is inactive' }, { status: 403 }) };
  }

  const permissions = (client.permissions as string[]) || [];
  if (
    requiredPerms.length > 0 &&
    !permissions.includes('admin') &&
    !requiredPerms.some((p) => permissions.includes(p))
  ) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Insufficient permissions to dispatch this command' },
        { status: 403 }
      ),
    };
  }

  return { client: client as RemoteClient };
}
