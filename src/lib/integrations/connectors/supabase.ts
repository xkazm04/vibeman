/**
 * Supabase Integration Connector
 * Maps Vibeman events to Supabase table inserts
 */

import type {
  IntegrationConnector,
  IntegrationEventPayload,
  SupabaseConfig,
  SupabaseCredentials,
} from '@/app/db/models/integration.types';

/**
 * Required tables for Vibeman Remote Message Broker
 */
const REQUIRED_TABLES = ['vibeman_events', 'vibeman_commands', 'vibeman_clients'] as const;

/**
 * Build event data for Supabase insert
 */
function buildInsertData(
  event: IntegrationEventPayload,
  config: SupabaseConfig
): Record<string, unknown> {
  // Start with basic event data
  const data: Record<string, unknown> = {
    event_type: event.eventType,
    project_id: event.projectId,
    timestamp: event.timestamp,
  };

  // Add project name if available
  if (event.projectName) {
    data.project_name = event.projectName;
  }

  // Add event-specific data
  if (event.data) {
    data.event_data = event.data;
  }

  // Add metadata if configured
  if (config.includeMetadata && event.metadata) {
    data.metadata = event.metadata;
  }

  // Apply column mapping if configured
  if (config.columnMapping) {
    const mappedData: Record<string, unknown> = {};
    for (const [sourceKey, targetColumn] of Object.entries(config.columnMapping)) {
      if (data[sourceKey] !== undefined) {
        mappedData[targetColumn] = data[sourceKey];
        delete data[sourceKey];
      }
    }
    return { ...data, ...mappedData };
  }

  return data;
}

/**
 * Check if a table exists by attempting to query it
 */
async function tableExists(
  projectUrl: string,
  tableName: string,
  credentials: SupabaseCredentials
): Promise<boolean> {
  try {
    const apiUrl = `${projectUrl}/rest/v1/${tableName}?limit=0`;
    const apiKey = credentials.serviceRoleKey || credentials.anonKey;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    // 200 = table exists, 404 = table does not exist
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Validate that required Vibeman Remote Message Broker tables exist
 */
async function validateRequiredTables(
  projectUrl: string,
  credentials: SupabaseCredentials
): Promise<{ valid: boolean; missingTables: string[] }> {
  const missingTables: string[] = [];

  for (const table of REQUIRED_TABLES) {
    const exists = await tableExists(projectUrl, table, credentials);
    if (!exists) {
      missingTables.push(table);
    }
  }

  return {
    valid: missingTables.length === 0,
    missingTables,
  };
}

/**
 * Make Supabase REST API request
 */
async function supabaseRequest(
  projectUrl: string,
  tableName: string,
  data: Record<string, unknown>,
  credentials: SupabaseCredentials,
  method: 'POST' | 'GET' = 'POST'
): Promise<{ success: boolean; status?: number; data?: unknown; error?: string }> {
  try {
    const apiUrl = `${projectUrl}/rest/v1/${tableName}`;
    const apiKey = credentials.serviceRoleKey || credentials.anonKey;

    const headers: Record<string, string> = {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };

    const response = await fetch(apiUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignore JSON parse errors
      }
      return { success: false, status: response.status, error: errorMessage };
    }

    let responseData: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        // Response might be empty for inserts
      }
    }

    return { success: true, status: response.status, data: responseData };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * Supabase Connector implementation
 */
export const SupabaseConnector: IntegrationConnector = {
  provider: 'supabase',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const supabaseConfig = config as unknown as SupabaseConfig;
    const supabaseCredentials = credentials as unknown as SupabaseCredentials;

    // Validate project URL
    if (!supabaseConfig.projectUrl) {
      return { valid: false, error: 'Supabase project URL is required' };
    }

    try {
      new URL(supabaseConfig.projectUrl);
    } catch {
      return { valid: false, error: 'Invalid Supabase project URL' };
    }

    // Validate table name
    if (!supabaseConfig.tableName) {
      return { valid: false, error: 'Table name is required' };
    }

    // Validate table name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(supabaseConfig.tableName)) {
      return { valid: false, error: 'Invalid table name format' };
    }

    // Validate credentials
    if (!supabaseCredentials.anonKey) {
      return { valid: false, error: 'Supabase anon key is required' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string; schemaRequired?: boolean }> {
    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    const supabaseConfig = config as unknown as SupabaseConfig;
    const supabaseCredentials = credentials as unknown as SupabaseCredentials;

    // Step 1: Validate required tables exist (needs service role key for accurate check)
    const tableValidation = await validateRequiredTables(
      supabaseConfig.projectUrl,
      supabaseCredentials
    );

    if (!tableValidation.valid) {
      return {
        success: false,
        message: `Missing required tables: ${tableValidation.missingTables.join(', ')}. Run the schema SQL in your Supabase SQL Editor.`,
        schemaRequired: true,
      };
    }

    // Step 2: Test connection by inserting a test event
    const testData: Record<string, unknown> = {
      event_type: 'automation.started',
      project_id: 'test',
      project_name: 'Vibeman Connection Test',
      timestamp: new Date().toISOString(),
      event_data: {
        message: 'Vibeman integration test',
        test: true,
      },
    };

    // Apply column mapping if configured
    let insertData = testData;
    if (supabaseConfig.columnMapping) {
      insertData = {};
      for (const [sourceKey, targetColumn] of Object.entries(supabaseConfig.columnMapping)) {
        if (testData[sourceKey] !== undefined) {
          insertData[targetColumn] = testData[sourceKey];
        }
      }
      // Include unmapped fields
      for (const [key, value] of Object.entries(testData)) {
        if (!supabaseConfig.columnMapping[key]) {
          insertData[key] = value;
        }
      }
    }

    const result = await supabaseRequest(
      supabaseConfig.projectUrl,
      supabaseConfig.tableName,
      insertData,
      supabaseCredentials
    );

    if (result.success) {
      return { success: true, message: `Connected to Supabase and inserted test event to ${supabaseConfig.tableName}` };
    }

    return { success: false, message: result.error || 'Failed to connect to Supabase' };
  },

  async sendEvent(
    event: IntegrationEventPayload,
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; response?: unknown; error?: string }> {
    // Validate
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const supabaseConfig = config as unknown as SupabaseConfig;
    const supabaseCredentials = credentials as unknown as SupabaseCredentials;

    // Build insert data
    const insertData = buildInsertData(event, supabaseConfig);

    const result = await supabaseRequest(
      supabaseConfig.projectUrl,
      supabaseConfig.tableName,
      insertData,
      supabaseCredentials
    );

    if (result.success) {
      return {
        success: true,
        response: {
          status: result.status,
          table: supabaseConfig.tableName,
        },
      };
    }

    return { success: false, error: result.error };
  },
};
