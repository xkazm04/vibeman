/**
 * Migration 090: Persona Agent System
 * Creates tables for AI persona agents that replace traditional workflow automation.
 *
 * Tables:
 * - personas: Agent definitions with system prompts
 * - persona_tool_definitions: Available tools (scripts) that personas can use
 * - persona_tools: Many-to-many mapping of personas to tool definitions
 * - persona_triggers: Schedule/polling/webhook triggers for automated execution
 * - persona_executions: Execution history and output tracking
 * - persona_credentials: Encrypted credential storage for external services
 */

import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate090Personas(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('personas', () => {
    // 1. Personas table
    const personasCreated = createTableIfNotExists(db, 'personas', `
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        max_concurrent INTEGER NOT NULL DEFAULT 1,
        timeout_ms INTEGER NOT NULL DEFAULT 300000,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `, logger);

    if (personasCreated) {
      logger?.info('Created personas table');
    }

    // 2. Tool definitions table
    const toolDefsCreated = createTableIfNotExists(db, 'persona_tool_definitions', `
      CREATE TABLE IF NOT EXISTS persona_tool_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        script_path TEXT NOT NULL,
        input_schema TEXT,
        output_schema TEXT,
        requires_credential_type TEXT,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ptd_category ON persona_tool_definitions(category);
    `, logger);

    if (toolDefsCreated) {
      logger?.info('Created persona_tool_definitions table with indexes');
    }

    // 3. Persona-tool assignments
    const toolsCreated = createTableIfNotExists(db, 'persona_tools', `
      CREATE TABLE IF NOT EXISTS persona_tools (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
        tool_id TEXT NOT NULL REFERENCES persona_tool_definitions(id) ON DELETE CASCADE,
        tool_config TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(persona_id, tool_id)
      );

      CREATE INDEX IF NOT EXISTS idx_pt_persona ON persona_tools(persona_id);
      CREATE INDEX IF NOT EXISTS idx_pt_tool ON persona_tools(tool_id);
    `, logger);

    if (toolsCreated) {
      logger?.info('Created persona_tools table with indexes');
    }

    // 4. Triggers table
    const triggersCreated = createTableIfNotExists(db, 'persona_triggers', `
      CREATE TABLE IF NOT EXISTS persona_triggers (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL CHECK(trigger_type IN ('manual', 'schedule', 'polling', 'webhook')),
        config TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_triggered_at TEXT,
        next_trigger_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ptr_persona ON persona_triggers(persona_id);
      CREATE INDEX IF NOT EXISTS idx_ptr_next_trigger ON persona_triggers(next_trigger_at);
      CREATE INDEX IF NOT EXISTS idx_ptr_enabled ON persona_triggers(enabled);
    `, logger);

    if (triggersCreated) {
      logger?.info('Created persona_triggers table with indexes');
    }

    // 5. Executions table
    const executionsCreated = createTableIfNotExists(db, 'persona_executions', `
      CREATE TABLE IF NOT EXISTS persona_executions (
        id TEXT PRIMARY KEY,
        persona_id TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
        trigger_id TEXT REFERENCES persona_triggers(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
        input_data TEXT,
        output_data TEXT,
        claude_session_id TEXT,
        log_file_path TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pe_persona ON persona_executions(persona_id);
      CREATE INDEX IF NOT EXISTS idx_pe_status ON persona_executions(status);
      CREATE INDEX IF NOT EXISTS idx_pe_created ON persona_executions(created_at DESC);
    `, logger);

    if (executionsCreated) {
      logger?.info('Created persona_executions table with indexes');
    }

    // 6. Credentials table
    const credentialsCreated = createTableIfNotExists(db, 'persona_credentials', `
      CREATE TABLE IF NOT EXISTS persona_credentials (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        iv TEXT NOT NULL,
        metadata TEXT,
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_pc_service ON persona_credentials(service_type);
    `, logger);

    if (credentialsCreated) {
      logger?.info('Created persona_credentials table with indexes');
    }

    if (!personasCreated && !toolDefsCreated && !toolsCreated && !triggersCreated && !executionsCreated && !credentialsCreated) {
      logger?.info('Persona agent tables already exist');
    }

    // Seed builtin tool definitions
    seedBuiltinToolDefs(db, logger);
  }, logger);
}

/**
 * Seed builtin tool definitions into persona_tool_definitions.
 * Uses INSERT OR IGNORE to avoid duplicates (name column has UNIQUE constraint).
 */
function seedBuiltinToolDefs(db: DbConnection, logger?: MigrationLogger): void {
  const now = new Date().toISOString();
  const builtins = [
    {
      id: 'ptooldef_builtin_http_request',
      name: 'http_request',
      category: 'http',
      description: 'Make HTTP requests to any URL. Supports GET, POST, PUT, DELETE with custom headers and body.',
      script_path: 'persona-tools/http/request.ts',
      input_schema: JSON.stringify({ url: 'string', method: 'string', headers: 'object?', body: 'any?' }),
      output_schema: JSON.stringify({ status: 'number', headers: 'object', body: 'any' }),
      requires_credential_type: null,
    },
    {
      id: 'ptooldef_builtin_gmail_read',
      name: 'gmail_read',
      category: 'gmail',
      description: 'Read emails from Gmail inbox. Supports filtering by query, labels, and max results.',
      script_path: 'persona-tools/gmail/read.ts',
      input_schema: JSON.stringify({ maxResults: 'number?', query: 'string?', labelIds: 'string[]?' }),
      output_schema: JSON.stringify({ emails: 'array' }),
      requires_credential_type: 'gmail',
    },
    {
      id: 'ptooldef_builtin_gmail_send',
      name: 'gmail_send',
      category: 'gmail',
      description: 'Send an email via Gmail. Supports threading via threadId.',
      script_path: 'persona-tools/gmail/send.ts',
      input_schema: JSON.stringify({ to: 'string', subject: 'string', body: 'string', threadId: 'string?' }),
      output_schema: JSON.stringify({ messageId: 'string', threadId: 'string' }),
      requires_credential_type: 'gmail',
    },
    {
      id: 'ptooldef_builtin_gmail_search',
      name: 'gmail_search',
      category: 'gmail',
      description: 'Search Gmail using Gmail search syntax.',
      script_path: 'persona-tools/gmail/search.ts',
      input_schema: JSON.stringify({ query: 'string', maxResults: 'number?' }),
      output_schema: JSON.stringify({ emails: 'array' }),
      requires_credential_type: 'gmail',
    },
    {
      id: 'ptooldef_builtin_gmail_mark_read',
      name: 'gmail_mark_read',
      category: 'gmail',
      description: 'Mark one or more Gmail messages as read by removing the UNREAD label.',
      script_path: 'persona-tools/gmail/mark_read.ts',
      input_schema: JSON.stringify({ messageIds: 'string[]' }),
      output_schema: JSON.stringify({ markedCount: 'number', messageIds: 'string[]' }),
      requires_credential_type: 'gmail',
    },
    {
      id: 'ptooldef_builtin_file_read',
      name: 'file_read',
      category: 'filesystem',
      description: 'Read a file from the local filesystem.',
      script_path: 'persona-tools/filesystem/read.ts',
      input_schema: JSON.stringify({ path: 'string', encoding: 'string?' }),
      output_schema: JSON.stringify({ content: 'string' }),
      requires_credential_type: null,
    },
    {
      id: 'ptooldef_builtin_file_write',
      name: 'file_write',
      category: 'filesystem',
      description: 'Write content to a file on the local filesystem.',
      script_path: 'persona-tools/filesystem/write.ts',
      input_schema: JSON.stringify({ path: 'string', content: 'string', encoding: 'string?' }),
      output_schema: JSON.stringify({ bytesWritten: 'number' }),
      requires_credential_type: null,
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO persona_tool_definitions
      (id, name, category, description, script_path, input_schema, output_schema, requires_credential_type, is_builtin, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  let seeded = 0;
  for (const tool of builtins) {
    const result = stmt.run(
      tool.id,
      tool.name,
      tool.category,
      tool.description,
      tool.script_path,
      tool.input_schema,
      tool.output_schema,
      tool.requires_credential_type,
      now,
      now
    );
    if (result.changes > 0) seeded++;
  }

  if (seeded > 0) {
    logger?.info(`Seeded ${seeded} builtin tool definitions`);
  }
}
