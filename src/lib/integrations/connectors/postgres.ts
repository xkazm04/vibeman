/**
 * PostgreSQL Direct Integration Connector
 * Maps Vibeman events to PostgreSQL table inserts
 */

import type {
  IntegrationConnector,
  IntegrationEventPayload,
  PostgresConfig,
  PostgresCredentials,
} from '@/app/db/models/integration.types';

/**
 * Build event data for PostgreSQL insert
 */
function buildInsertData(
  event: IntegrationEventPayload,
  config: PostgresConfig
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

  // Add event-specific data as JSON
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
 * Build PostgreSQL connection string
 */
function buildConnectionString(config: PostgresConfig, credentials: PostgresCredentials): string {
  const sslParam = config.sslMode ? `?sslmode=${config.sslMode}` : '';
  return `postgres://${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@${config.host}:${config.port}/${config.database}${sslParam}`;
}

/**
 * Execute PostgreSQL query via pg module
 * Uses dynamic import to handle when pg is not available
 */
async function executeQuery(
  config: PostgresConfig,
  credentials: PostgresCredentials,
  query: string,
  values: unknown[]
): Promise<{ success: boolean; rows?: unknown[]; error?: string }> {
  try {
    // Dynamic require of pg module - wrapped in try to handle missing module
    // Using eval to prevent TypeScript from analyzing the require path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pg: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pg = eval("require('pg')");
    } catch {
      return {
        success: false,
        error: 'PostgreSQL driver (pg) not installed. Run: npm install pg',
      };
    }

    const Pool = pg.Pool || pg.default?.Pool;
    if (!Pool) {
      return { success: false, error: 'Invalid pg module format' };
    }

    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: credentials.username,
      password: credentials.password,
      ssl: config.sslMode && config.sslMode !== 'disable'
        ? { rejectUnauthorized: config.sslMode === 'verify-full' || config.sslMode === 'verify-ca' }
        : false,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 1000,
      max: 1,
    });

    try {
      const result = await pool.query(query, values);
      return { success: true, rows: result.rows };
    } finally {
      await pool.end();
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}

/**
 * PostgreSQL Connector implementation
 */
export const PostgresConnector: IntegrationConnector = {
  provider: 'postgres',

  async validate(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ valid: boolean; error?: string }> {
    const pgConfig = config as unknown as PostgresConfig;
    const pgCredentials = credentials as unknown as PostgresCredentials;

    // Validate host
    if (!pgConfig.host) {
      return { valid: false, error: 'PostgreSQL host is required' };
    }

    // Validate port
    if (!pgConfig.port || pgConfig.port < 1 || pgConfig.port > 65535) {
      return { valid: false, error: 'Valid PostgreSQL port is required (1-65535)' };
    }

    // Validate database
    if (!pgConfig.database) {
      return { valid: false, error: 'Database name is required' };
    }

    // Validate table name
    if (!pgConfig.tableName) {
      return { valid: false, error: 'Table name is required' };
    }

    // Validate table name format (alphanumeric and underscores only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(pgConfig.tableName)) {
      return { valid: false, error: 'Invalid table name format' };
    }

    // Validate credentials
    if (!pgCredentials.username) {
      return { valid: false, error: 'PostgreSQL username is required' };
    }

    if (!pgCredentials.password) {
      return { valid: false, error: 'PostgreSQL password is required' };
    }

    return { valid: true };
  },

  async testConnection(
    config: Record<string, unknown>,
    credentials: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> {
    // Validate first
    const validation = await this.validate(config, credentials);
    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid configuration' };
    }

    const pgConfig = config as unknown as PostgresConfig;
    const pgCredentials = credentials as unknown as PostgresCredentials;

    // Test connection by running a simple query
    const result = await executeQuery(
      pgConfig,
      pgCredentials,
      'SELECT 1 as test',
      []
    );

    if (!result.success) {
      return { success: false, message: result.error || 'Failed to connect to PostgreSQL' };
    }

    // Check if the table exists
    const schema = pgConfig.schema || 'public';
    const tableCheckResult = await executeQuery(
      pgConfig,
      pgCredentials,
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      ) as exists`,
      [schema, pgConfig.tableName]
    );

    if (!tableCheckResult.success) {
      return { success: false, message: tableCheckResult.error || 'Failed to check table' };
    }

    const tableExists = (tableCheckResult.rows as { exists: boolean }[])?.[0]?.exists;
    if (!tableExists) {
      return {
        success: false,
        message: `Table "${schema}.${pgConfig.tableName}" does not exist. Please create it first.`,
      };
    }

    return {
      success: true,
      message: `Connected to PostgreSQL database "${pgConfig.database}" (table: ${schema}.${pgConfig.tableName})`,
    };
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

    const pgConfig = config as unknown as PostgresConfig;
    const pgCredentials = credentials as unknown as PostgresCredentials;

    // Build insert data
    const insertData = buildInsertData(event, pgConfig);

    // Build INSERT query
    const schema = pgConfig.schema || 'public';
    const columns = Object.keys(insertData);
    const values = Object.values(insertData).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : v
    );
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO "${schema}"."${pgConfig.tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`;

    const result = await executeQuery(pgConfig, pgCredentials, query, values);

    if (result.success) {
      return {
        success: true,
        response: {
          database: pgConfig.database,
          table: `${schema}.${pgConfig.tableName}`,
          insertedColumns: columns.length,
        },
      };
    }

    return { success: false, error: result.error };
  },
};
