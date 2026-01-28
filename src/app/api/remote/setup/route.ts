/**
 * Remote Setup API
 * POST: Configure Supabase credentials and validate connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  saveRemoteConfig,
  initializeRemoteServices,
} from '@/lib/remote/config.server';

interface SetupRequest {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
}

interface TablesStatus {
  vibeman_clients: boolean;
  vibeman_events: boolean;
  vibeman_commands: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SetupRequest;

    // Validate required fields
    if (!body.supabase_url || !body.supabase_anon_key || !body.supabase_service_role_key) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: supabase_url, supabase_anon_key, supabase_service_role_key',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(body.supabase_url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid supabase_url format' },
        { status: 400 }
      );
    }

    // Create Supabase client to test connection
    const supabase = createClient(body.supabase_url, body.supabase_service_role_key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if required tables exist
    const tablesStatus: TablesStatus = {
      vibeman_clients: false,
      vibeman_events: false,
      vibeman_commands: false,
    };

    // Test connection and check tables
    const tables = ['vibeman_clients', 'vibeman_events', 'vibeman_commands'] as const;

    for (const table of tables) {
      // Use count query which works even with RLS (returns 0 if no access)
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      console.log(`[Remote/Setup] Table ${table}: count=${count}, error=`, error);

      if (!error) {
        // No error means table exists (count may be 0 due to RLS or empty table)
        tablesStatus[table] = true;
      } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
        // Table doesn't exist
        tablesStatus[table] = false;
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        // RLS blocking - but table exists! Service role should bypass this.
        // If we get here with service role key, there's a config issue.
        console.warn(`[Remote/Setup] RLS blocking ${table} even with service role key`);
        // Table exists, just can't access - treat as existing for now
        tablesStatus[table] = true;
      } else if (error.message?.includes('Invalid API key') || error.code === 'PGRST301') {
        return NextResponse.json(
          { success: false, error: 'Invalid Supabase credentials' },
          { status: 401 }
        );
      } else if (error.code === 'PGRST200' || error.message?.includes('Could not find')) {
        // PostgREST can't find the table in the schema
        tablesStatus[table] = false;
      } else {
        // Unknown error - log it but assume table might exist
        console.warn(`[Remote/Setup] Unknown error for ${table}:`, error.code, error.message);
        // For unknown errors, check if it's a "relation does not exist" variant
        if (error.message?.toLowerCase().includes('relation') && error.message?.toLowerCase().includes('not exist')) {
          tablesStatus[table] = false;
        } else {
          // Assume table exists but has access issues
          tablesStatus[table] = true;
        }
      }
    }

    // Check if all tables exist
    const allTablesExist = Object.values(tablesStatus).every(Boolean);

    if (!allTablesExist) {
      const missingTables = Object.entries(tablesStatus)
        .filter(([, exists]) => !exists)
        .map(([name]) => name);

      return NextResponse.json({
        success: false,
        error: `Missing required tables: ${missingTables.join(', ')}. Please run the migration SQL in your Supabase project.`,
        tables_found: tablesStatus,
      });
    }

    // Save configuration
    const config = saveRemoteConfig({
      supabase_url: body.supabase_url,
      supabase_anon_key: body.supabase_anon_key,
      supabase_service_role_key: body.supabase_service_role_key,
      is_configured: true,
      last_validated_at: new Date().toISOString(),
    });

    // Initialize the services
    initializeRemoteServices(body.supabase_url, body.supabase_service_role_key);

    return NextResponse.json({
      success: true,
      message: 'Remote message broker configured successfully',
      tables_found: tablesStatus,
      config_id: config.id,
    });
  } catch (error) {
    console.error('[Remote/Setup] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to configure remote',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove remote configuration
 */
export async function DELETE() {
  try {
    const { deleteRemoteConfig } = await import('@/lib/remote/config.server');
    deleteRemoteConfig();

    return NextResponse.json({
      success: true,
      message: 'Remote configuration deleted',
    });
  } catch (error) {
    console.error('[Remote/Setup] Delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}
