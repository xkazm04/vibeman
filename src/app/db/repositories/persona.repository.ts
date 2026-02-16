/**
 * Persona Agent System - Repository
 * CRUD operations for personas, tools, triggers, executions, and credentials
 */

import { getDatabase } from '../connection';
import { getCurrentTimestamp, selectOne, selectAll, buildUpdateStatement } from './repository.utils';
import { generateId } from '@/lib/idGenerator';
import type {
  DbPersona,
  DbPersonaToolDefinition,
  DbPersonaTool,
  DbPersonaTrigger,
  DbPersonaExecution,
  DbPersonaCredential,
  DbCredentialEvent,
  DbPersonaManualReview,
  DbConnectorDefinition,
  DbPersonaMessage,
  DbPersonaMessageDelivery,
  CreatePersonaInput,
  UpdatePersonaInput,
  CreateToolDefinitionInput,
  CreateTriggerInput,
  UpdateTriggerInput,
  CreateCredentialInput,
  CreateCredentialEventInput,
  UpdateCredentialEventInput,
  CreateManualReviewInput,
  UpdateManualReviewInput,
  CreateConnectorDefinitionInput,
  UpdateConnectorDefinitionInput,
  CreateMessageInput,
  PersonaExecutionStatus,
  ManualReviewStatus,
  DbPersonaEvent,
  DbPersonaEventSubscription,
  CreatePersonaEventInput,
  CreateEventSubscriptionInput,
  UpdateEventSubscriptionInput,
  PersonaEventStatus,
} from '../models/persona.types';

// ============================================================================
// Persona Repository
// ============================================================================

export const personaRepository = {
  getAll: (): DbPersona[] => {
    const db = getDatabase();
    return selectAll<DbPersona>(db, 'SELECT * FROM personas ORDER BY created_at DESC');
  },

  getById: (id: string): DbPersona | null => {
    const db = getDatabase();
    return selectOne<DbPersona>(db, 'SELECT * FROM personas WHERE id = ?', id);
  },

  getEnabled: (): DbPersona[] => {
    const db = getDatabase();
    return selectAll<DbPersona>(db, 'SELECT * FROM personas WHERE enabled = 1 ORDER BY name');
  },

  create: (input: CreatePersonaInput): DbPersona => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('persona');

    db.prepare(`
      INSERT INTO personas (id, name, description, system_prompt, structured_prompt, icon, color, enabled, max_concurrent, timeout_ms, model_profile, max_budget_usd, max_turns, design_context, group_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.description || null,
      input.system_prompt,
      input.structured_prompt || null,
      input.icon || null,
      input.color || null,
      input.enabled !== false ? 1 : 0,
      input.max_concurrent || 1,
      input.timeout_ms || 300000,
      input.model_profile || null,
      input.max_budget_usd ?? null,
      input.max_turns ?? null,
      input.design_context || null,
      input.group_id || null,
      now,
      now
    );

    return selectOne<DbPersona>(db, 'SELECT * FROM personas WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdatePersonaInput): DbPersona | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.system_prompt !== undefined) mapped.system_prompt = updates.system_prompt;
    if (updates.structured_prompt !== undefined) mapped.structured_prompt = updates.structured_prompt;
    if (updates.icon !== undefined) mapped.icon = updates.icon;
    if (updates.color !== undefined) mapped.color = updates.color;
    if (updates.enabled !== undefined) mapped.enabled = updates.enabled ? 1 : 0;
    if (updates.max_concurrent !== undefined) mapped.max_concurrent = updates.max_concurrent;
    if (updates.timeout_ms !== undefined) mapped.timeout_ms = updates.timeout_ms;
    if (updates.notification_channels !== undefined) mapped.notification_channels = updates.notification_channels;
    if (updates.last_design_result !== undefined) mapped.last_design_result = updates.last_design_result;
    if (updates.model_profile !== undefined) mapped.model_profile = updates.model_profile;
    if (updates.max_budget_usd !== undefined) mapped.max_budget_usd = updates.max_budget_usd;
    if (updates.max_turns !== undefined) mapped.max_turns = updates.max_turns;
    if (updates.design_context !== undefined) mapped.design_context = updates.design_context;
    if (updates.group_id !== undefined) mapped.group_id = updates.group_id;

    const result = buildUpdateStatement(db, 'personas', mapped);
    if (!result) return personaRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);
    return selectOne<DbPersona>(db, 'SELECT * FROM personas WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM personas WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// Tool Definition Repository
// ============================================================================

export const personaToolDefRepository = {
  getAll: (): DbPersonaToolDefinition[] => {
    const db = getDatabase();
    return selectAll<DbPersonaToolDefinition>(db, 'SELECT * FROM persona_tool_definitions ORDER BY category, name');
  },

  getByCategory: (category: string): DbPersonaToolDefinition[] => {
    const db = getDatabase();
    return selectAll<DbPersonaToolDefinition>(
      db,
      'SELECT * FROM persona_tool_definitions WHERE category = ? ORDER BY name',
      category
    );
  },

  getById: (id: string): DbPersonaToolDefinition | null => {
    const db = getDatabase();
    return selectOne<DbPersonaToolDefinition>(db, 'SELECT * FROM persona_tool_definitions WHERE id = ?', id);
  },

  getByName: (name: string): DbPersonaToolDefinition | null => {
    const db = getDatabase();
    return selectOne<DbPersonaToolDefinition>(db, 'SELECT * FROM persona_tool_definitions WHERE name = ?', name);
  },

  create: (input: CreateToolDefinitionInput): DbPersonaToolDefinition => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('ptooldef');

    db.prepare(`
      INSERT INTO persona_tool_definitions (id, name, category, description, script_path, input_schema, output_schema, requires_credential_type, is_builtin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.category,
      input.description,
      input.script_path,
      input.input_schema ? JSON.stringify(input.input_schema) : null,
      input.output_schema ? JSON.stringify(input.output_schema) : null,
      input.requires_credential_type || null,
      input.is_builtin ? 1 : 0,
      now,
      now
    );

    return selectOne<DbPersonaToolDefinition>(db, 'SELECT * FROM persona_tool_definitions WHERE id = ?', id)!;
  },

  update: (id: string, updates: Partial<CreateToolDefinitionInput>): DbPersonaToolDefinition | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.category !== undefined) mapped.category = updates.category;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.script_path !== undefined) mapped.script_path = updates.script_path;
    if (updates.input_schema !== undefined) mapped.input_schema = JSON.stringify(updates.input_schema);
    if (updates.output_schema !== undefined) mapped.output_schema = JSON.stringify(updates.output_schema);
    if (updates.requires_credential_type !== undefined) mapped.requires_credential_type = updates.requires_credential_type;

    const result = buildUpdateStatement(db, 'persona_tool_definitions', mapped);
    if (!result) return personaToolDefRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);
    return selectOne<DbPersonaToolDefinition>(db, 'SELECT * FROM persona_tool_definitions WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_tool_definitions WHERE id = ?').run(id);
    return result.changes > 0;
  },

  seedBuiltins: (): void => {
    const builtins: CreateToolDefinitionInput[] = [
      {
        name: 'http_request',
        category: 'http',
        description: 'Make HTTP requests to any URL. Supports GET, POST, PUT, DELETE with custom headers and body.',
        script_path: 'persona-tools/http/request.ts',
        input_schema: { url: 'string', method: 'string', headers: 'object?', body: 'any?' },
        output_schema: { status: 'number', headers: 'object', body: 'any' },
        is_builtin: true,
      },
      {
        name: 'gmail_read',
        category: 'gmail',
        description: 'Read emails from Gmail inbox. Supports filtering by query, labels, and max results.',
        script_path: 'persona-tools/gmail/read.ts',
        input_schema: { maxResults: 'number?', query: 'string?', labelIds: 'string[]?' },
        output_schema: { emails: 'array' },
        requires_credential_type: 'gmail',
        is_builtin: true,
      },
      {
        name: 'gmail_send',
        category: 'gmail',
        description: 'Send an email via Gmail. Supports threading via threadId.',
        script_path: 'persona-tools/gmail/send.ts',
        input_schema: { to: 'string', subject: 'string', body: 'string', threadId: 'string?' },
        output_schema: { messageId: 'string', threadId: 'string' },
        requires_credential_type: 'gmail',
        is_builtin: true,
      },
      {
        name: 'gmail_search',
        category: 'gmail',
        description: 'Search Gmail using Gmail search syntax.',
        script_path: 'persona-tools/gmail/search.ts',
        input_schema: { query: 'string', maxResults: 'number?' },
        output_schema: { emails: 'array' },
        requires_credential_type: 'gmail',
        is_builtin: true,
      },
      {
        name: 'gmail_mark_read',
        category: 'gmail',
        description: 'Mark one or more Gmail messages as read by removing the UNREAD label.',
        script_path: 'persona-tools/gmail/mark_read.ts',
        input_schema: { messageIds: 'string[]' },
        output_schema: { markedCount: 'number', messageIds: 'string[]' },
        requires_credential_type: 'gmail',
        is_builtin: true,
      },
      {
        name: 'file_read',
        category: 'filesystem',
        description: 'Read a file from the local filesystem.',
        script_path: 'persona-tools/filesystem/read.ts',
        input_schema: { path: 'string', encoding: 'string?' },
        output_schema: { content: 'string' },
        is_builtin: true,
      },
      {
        name: 'file_write',
        category: 'filesystem',
        description: 'Write content to a file on the local filesystem.',
        script_path: 'persona-tools/filesystem/write.ts',
        input_schema: { path: 'string', content: 'string', encoding: 'string?' },
        output_schema: { bytesWritten: 'number' },
        is_builtin: true,
      },
    ];

    for (const tool of builtins) {
      const existing = personaToolDefRepository.getByName(tool.name);
      if (!existing) {
        personaToolDefRepository.create(tool);
      }
    }
  },
};

// ============================================================================
// Persona Tool Assignment Repository
// ============================================================================

export const personaToolRepository = {
  getByPersonaId: (personaId: string): DbPersonaTool[] => {
    const db = getDatabase();
    return selectAll<DbPersonaTool>(
      db,
      'SELECT * FROM persona_tools WHERE persona_id = ? ORDER BY created_at',
      personaId
    );
  },

  getToolDefsForPersona: (personaId: string): DbPersonaToolDefinition[] => {
    const db = getDatabase();
    return selectAll<DbPersonaToolDefinition>(
      db,
      `SELECT DISTINCT ptd.* FROM persona_tool_definitions ptd
       INNER JOIN persona_tools pt ON (pt.tool_id = ptd.id OR pt.tool_id = ptd.name)
       WHERE pt.persona_id = ?
       ORDER BY ptd.category, ptd.name`,
      personaId
    );
  },

  assign: (personaId: string, toolId: string, toolConfig?: object): DbPersonaTool => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('ptool');

    db.prepare(`
      INSERT OR IGNORE INTO persona_tools (id, persona_id, tool_id, tool_config, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, personaId, toolId, toolConfig ? JSON.stringify(toolConfig) : null, now);

    return selectOne<DbPersonaTool>(
      db,
      'SELECT * FROM persona_tools WHERE persona_id = ? AND tool_id = ?',
      personaId,
      toolId
    )!;
  },

  remove: (personaId: string, toolId: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_tools WHERE persona_id = ? AND tool_id = ?').run(personaId, toolId);
    return result.changes > 0;
  },

  /**
   * Auto-resolve tool definitions that have matching credentials available.
   * Returns tools that either:
   * - Don't require any credential (http_request, file_read, file_write)
   * - Have at least one stored credential matching their requires_credential_type
   *
   * Used as fallback when a persona has no explicit tool assignments.
   */
  getToolsWithAvailableCredentials: (): DbPersonaToolDefinition[] => {
    const db = getDatabase();
    return selectAll<DbPersonaToolDefinition>(
      db,
      `SELECT DISTINCT ptd.* FROM persona_tool_definitions ptd
       LEFT JOIN persona_credentials pc ON ptd.requires_credential_type = pc.service_type
       WHERE ptd.requires_credential_type IS NULL OR pc.id IS NOT NULL
       ORDER BY ptd.category, ptd.name`
    );
  },
};

// ============================================================================
// Trigger Repository
// ============================================================================

export const personaTriggerRepository = {
  getByPersonaId: (personaId: string): DbPersonaTrigger[] => {
    const db = getDatabase();
    return selectAll<DbPersonaTrigger>(
      db,
      'SELECT * FROM persona_triggers WHERE persona_id = ? ORDER BY created_at',
      personaId
    );
  },

  getById: (id: string): DbPersonaTrigger | null => {
    const db = getDatabase();
    return selectOne<DbPersonaTrigger>(db, 'SELECT * FROM persona_triggers WHERE id = ?', id);
  },

  create: (input: CreateTriggerInput): DbPersonaTrigger => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('ptrigger');

    db.prepare(`
      INSERT INTO persona_triggers (id, persona_id, trigger_type, config, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.persona_id,
      input.trigger_type,
      input.config ? JSON.stringify(input.config) : null,
      input.enabled !== false ? 1 : 0,
      now,
      now
    );

    return selectOne<DbPersonaTrigger>(db, 'SELECT * FROM persona_triggers WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdateTriggerInput): DbPersonaTrigger | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.trigger_type !== undefined) mapped.trigger_type = updates.trigger_type;
    if (updates.config !== undefined) mapped.config = JSON.stringify(updates.config);
    if (updates.enabled !== undefined) mapped.enabled = updates.enabled ? 1 : 0;
    if (updates.next_trigger_at !== undefined) mapped.next_trigger_at = updates.next_trigger_at;

    const result = buildUpdateStatement(db, 'persona_triggers', mapped);
    if (!result) return personaTriggerRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);
    return selectOne<DbPersonaTrigger>(db, 'SELECT * FROM persona_triggers WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_triggers WHERE id = ?').run(id);
    return result.changes > 0;
  },

  getDue: (now: string): DbPersonaTrigger[] => {
    const db = getDatabase();
    return selectAll<DbPersonaTrigger>(
      db,
      `SELECT * FROM persona_triggers
       WHERE enabled = 1 AND next_trigger_at IS NOT NULL AND next_trigger_at <= ?
       ORDER BY next_trigger_at ASC`,
      now
    );
  },

  markTriggered: (id: string, nextTriggerAt: string | null): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare(`
      UPDATE persona_triggers SET last_triggered_at = ?, next_trigger_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, nextTriggerAt, now, id);
  },
};

// ============================================================================
// Execution Repository
// ============================================================================

export const personaExecutionRepository = {
  getByPersonaId: (personaId: string, limit: number = 50): DbPersonaExecution[] => {
    const db = getDatabase();
    return selectAll<DbPersonaExecution>(
      db,
      'SELECT * FROM persona_executions WHERE persona_id = ? ORDER BY created_at DESC LIMIT ?',
      personaId,
      limit
    );
  },

  getById: (id: string): DbPersonaExecution | null => {
    const db = getDatabase();
    return selectOne<DbPersonaExecution>(db, 'SELECT * FROM persona_executions WHERE id = ?', id);
  },

  create: (personaId: string, triggerId?: string, inputData?: object, modelUsed?: string): DbPersonaExecution => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('pexec');

    db.prepare(`
      INSERT INTO persona_executions (id, persona_id, trigger_id, status, input_data, model_used, input_tokens, output_tokens, cost_usd, created_at)
      VALUES (?, ?, ?, 'queued', ?, ?, 0, 0, 0, ?)
    `).run(
      id,
      personaId,
      triggerId || null,
      inputData ? JSON.stringify(inputData) : null,
      modelUsed || null,
      now
    );

    return selectOne<DbPersonaExecution>(db, 'SELECT * FROM persona_executions WHERE id = ?', id)!;
  },

  updateStatus: (
    id: string,
    status: PersonaExecutionStatus,
    extra?: {
      output_data?: object;
      claude_session_id?: string;
      log_file_path?: string;
      execution_flows?: string;
      error_message?: string;
      duration_ms?: number;
      started_at?: string;
      completed_at?: string;
      model_used?: string;
      input_tokens?: number;
      output_tokens?: number;
      cost_usd?: number;
    }
  ): void => {
    const db = getDatabase();
    const sets = ['status = ?'];
    const values: unknown[] = [status];

    if (extra?.output_data !== undefined) {
      sets.push('output_data = ?');
      values.push(JSON.stringify(extra.output_data));
    }
    if (extra?.claude_session_id !== undefined) {
      sets.push('claude_session_id = ?');
      values.push(extra.claude_session_id);
    }
    if (extra?.log_file_path !== undefined) {
      sets.push('log_file_path = ?');
      values.push(extra.log_file_path);
    }
    if (extra?.execution_flows !== undefined) {
      sets.push('execution_flows = ?');
      values.push(extra.execution_flows);
    }
    if (extra?.error_message !== undefined) {
      sets.push('error_message = ?');
      values.push(extra.error_message);
    }
    if (extra?.duration_ms !== undefined) {
      sets.push('duration_ms = ?');
      values.push(extra.duration_ms);
    }
    if (extra?.started_at !== undefined) {
      sets.push('started_at = ?');
      values.push(extra.started_at);
    }
    if (extra?.completed_at !== undefined) {
      sets.push('completed_at = ?');
      values.push(extra.completed_at);
    }
    if (extra?.model_used !== undefined) {
      sets.push('model_used = ?');
      values.push(extra.model_used);
    }
    if (extra?.input_tokens !== undefined) {
      sets.push('input_tokens = ?');
      values.push(extra.input_tokens);
    }
    if (extra?.output_tokens !== undefined) {
      sets.push('output_tokens = ?');
      values.push(extra.output_tokens);
    }
    if (extra?.cost_usd !== undefined) {
      sets.push('cost_usd = ?');
      values.push(extra.cost_usd);
    }

    values.push(id);
    db.prepare(`UPDATE persona_executions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  getRecent: (limit: number = 20): DbPersonaExecution[] => {
    const db = getDatabase();
    return selectAll<DbPersonaExecution>(
      db,
      'SELECT * FROM persona_executions ORDER BY created_at DESC LIMIT ?',
      limit
    );
  },

  getRunning: (): DbPersonaExecution[] => {
    const db = getDatabase();
    return selectAll<DbPersonaExecution>(
      db,
      "SELECT * FROM persona_executions WHERE status IN ('queued', 'running') ORDER BY created_at"
    );
  },

  getRunningCountForPersona: (personaId: string): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM persona_executions WHERE persona_id = ? AND status IN ('queued', 'running')",
      personaId
    );
    return row?.count ?? 0;
  },

  getGlobalPaginated: (limit: number = 10, offset: number = 0, status?: PersonaExecutionStatus): Array<DbPersonaExecution & { persona_name?: string; persona_icon?: string; persona_color?: string }> => {
    const db = getDatabase();
    let query = `SELECT pe.*, p.name as persona_name, p.icon as persona_icon, p.color as persona_color
      FROM persona_executions pe
      LEFT JOIN personas p ON pe.persona_id = p.id`;
    const params: unknown[] = [];

    if (status) {
      query += ' WHERE pe.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pe.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return selectAll(db, query, ...params);
  },

  getGlobalCount: (status?: PersonaExecutionStatus): number => {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM persona_executions';
    const params: unknown[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    const row = selectOne<{ count: number }>(db, query, ...params);
    return row?.count ?? 0;
  },
};

// ============================================================================
// Credential Repository
// ============================================================================

export const personaCredentialRepository = {
  getAll: (): DbPersonaCredential[] => {
    const db = getDatabase();
    return selectAll<DbPersonaCredential>(db, 'SELECT * FROM persona_credentials ORDER BY created_at DESC');
  },

  getById: (id: string): DbPersonaCredential | null => {
    const db = getDatabase();
    return selectOne<DbPersonaCredential>(db, 'SELECT * FROM persona_credentials WHERE id = ?', id);
  },

  getByServiceType: (serviceType: string): DbPersonaCredential[] => {
    const db = getDatabase();
    return selectAll<DbPersonaCredential>(
      db,
      'SELECT * FROM persona_credentials WHERE service_type = ? ORDER BY name',
      serviceType
    );
  },

  create: (input: CreateCredentialInput): DbPersonaCredential => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('pcred');

    db.prepare(`
      INSERT INTO persona_credentials (id, name, service_type, encrypted_data, iv, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.service_type,
      input.encrypted_data,
      input.iv,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now,
      now
    );

    return selectOne<DbPersonaCredential>(db, 'SELECT * FROM persona_credentials WHERE id = ?', id)!;
  },

  update: (id: string, updates: Partial<CreateCredentialInput>): DbPersonaCredential | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.service_type !== undefined) mapped.service_type = updates.service_type;
    if (updates.encrypted_data !== undefined) mapped.encrypted_data = updates.encrypted_data;
    if (updates.iv !== undefined) mapped.iv = updates.iv;
    if (updates.metadata !== undefined) mapped.metadata = JSON.stringify(updates.metadata);

    const result = buildUpdateStatement(db, 'persona_credentials', mapped);
    if (!result) return personaCredentialRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);

    // Update last_used_at
    const now = getCurrentTimestamp();
    db.prepare('UPDATE persona_credentials SET last_used_at = ? WHERE id = ?').run(now, id);

    return selectOne<DbPersonaCredential>(db, 'SELECT * FROM persona_credentials WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_credentials WHERE id = ?').run(id);
    return result.changes > 0;
  },

  markUsed: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare('UPDATE persona_credentials SET last_used_at = ? WHERE id = ?').run(now, id);
  },

  /**
   * Find personas that reference a credential — via notification channels (credential_id)
   * or via assigned tools that require this credential's service_type.
   */
  findPersonasUsing: (credentialId: string): Array<{ id: string; name: string; usage: string }> => {
    const db = getDatabase();
    const credential = selectOne<DbPersonaCredential>(
      db, 'SELECT * FROM persona_credentials WHERE id = ?', credentialId
    );
    if (!credential) return [];

    const results: Array<{ id: string; name: string; usage: string }> = [];
    const seen = new Set<string>();

    // 1. Check notification_channels JSON for credential_id reference
    const allPersonas = selectAll<DbPersona>(
      db, 'SELECT id, name, notification_channels FROM personas'
    );
    for (const persona of allPersonas) {
      if (!persona.notification_channels) continue;
      try {
        const channels = JSON.parse(persona.notification_channels) as Array<{ credential_id?: string; type?: string }>;
        const match = channels.find(c => c.credential_id === credentialId);
        if (match) {
          results.push({ id: persona.id, name: persona.name, usage: `notification channel (${match.type || 'unknown'})` });
          seen.add(persona.id);
        }
      } catch { /* skip unparseable */ }
    }

    // 2. Check assigned tools that require this credential's service_type
    const toolPersonas = selectAll<{ persona_id: string; persona_name: string; tool_name: string }>(
      db,
      `SELECT DISTINCT p.id as persona_id, p.name as persona_name, ptd.name as tool_name
       FROM personas p
       INNER JOIN persona_tools pt ON pt.persona_id = p.id
       INNER JOIN persona_tool_definitions ptd ON ptd.id = pt.tool_id
       WHERE ptd.requires_credential_type = ?`,
      credential.service_type
    );
    for (const row of toolPersonas) {
      if (!seen.has(row.persona_id)) {
        results.push({ id: row.persona_id, name: row.persona_name, usage: `tool (${row.tool_name})` });
        seen.add(row.persona_id);
      }
    }

    return results;
  },
};

// ============================================================================
// Credential Event Repository
// ============================================================================

export const credentialEventRepository = {
  getAll: (): DbCredentialEvent[] => {
    const db = getDatabase();
    return selectAll<DbCredentialEvent>(db, 'SELECT * FROM credential_events ORDER BY created_at DESC');
  },

  getByCredentialId: (credentialId: string): DbCredentialEvent[] => {
    const db = getDatabase();
    return selectAll<DbCredentialEvent>(
      db,
      'SELECT * FROM credential_events WHERE credential_id = ? ORDER BY name',
      credentialId
    );
  },

  getById: (id: string): DbCredentialEvent | null => {
    const db = getDatabase();
    return selectOne<DbCredentialEvent>(db, 'SELECT * FROM credential_events WHERE id = ?', id);
  },

  getEnabled: (): DbCredentialEvent[] => {
    const db = getDatabase();
    return selectAll<DbCredentialEvent>(db, 'SELECT * FROM credential_events WHERE enabled = 1 ORDER BY name');
  },

  create: (input: CreateCredentialEventInput): DbCredentialEvent => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('cevent');

    db.prepare(`
      INSERT INTO credential_events (id, credential_id, event_template_id, name, config, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.credential_id,
      input.event_template_id,
      input.name,
      input.config ? JSON.stringify(input.config) : null,
      input.enabled !== false ? 1 : 0,
      now,
      now
    );

    return selectOne<DbCredentialEvent>(db, 'SELECT * FROM credential_events WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdateCredentialEventInput): DbCredentialEvent | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.config !== undefined) mapped.config = JSON.stringify(updates.config);
    if (updates.enabled !== undefined) mapped.enabled = updates.enabled ? 1 : 0;
    if (updates.last_polled_at !== undefined) mapped.last_polled_at = updates.last_polled_at;

    const result = buildUpdateStatement(db, 'credential_events', mapped);
    if (!result) return credentialEventRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);
    return selectOne<DbCredentialEvent>(db, 'SELECT * FROM credential_events WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM credential_events WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteByCredentialId: (credentialId: string): number => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM credential_events WHERE credential_id = ?').run(credentialId);
    return result.changes;
  },
};

// ============================================================================
// Manual Review Repository
// ============================================================================

export const manualReviewRepository = {
  getAll: (limit: number = 50, offset: number = 0): DbPersonaManualReview[] => {
    const db = getDatabase();
    return selectAll<DbPersonaManualReview>(
      db,
      'SELECT * FROM persona_manual_reviews ORDER BY created_at DESC LIMIT ? OFFSET ?',
      limit,
      offset
    );
  },

  getByStatus: (status: ManualReviewStatus, limit: number = 50): DbPersonaManualReview[] => {
    const db = getDatabase();
    return selectAll<DbPersonaManualReview>(
      db,
      'SELECT * FROM persona_manual_reviews WHERE status = ? ORDER BY created_at DESC LIMIT ?',
      status,
      limit
    );
  },

  getByPersonaId: (personaId: string): DbPersonaManualReview[] => {
    const db = getDatabase();
    return selectAll<DbPersonaManualReview>(
      db,
      'SELECT * FROM persona_manual_reviews WHERE persona_id = ? ORDER BY created_at DESC',
      personaId
    );
  },

  getById: (id: string): DbPersonaManualReview | null => {
    const db = getDatabase();
    return selectOne<DbPersonaManualReview>(db, 'SELECT * FROM persona_manual_reviews WHERE id = ?', id);
  },

  create: (input: CreateManualReviewInput): DbPersonaManualReview => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('mreview');

    db.prepare(`
      INSERT INTO persona_manual_reviews (id, execution_id, persona_id, title, description, severity, context_data, suggested_actions, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      input.execution_id,
      input.persona_id,
      input.title,
      input.description || null,
      input.severity || 'info',
      input.context_data ? JSON.stringify(input.context_data) : null,
      input.suggested_actions ? JSON.stringify(input.suggested_actions) : null,
      now,
      now
    );

    return selectOne<DbPersonaManualReview>(db, 'SELECT * FROM persona_manual_reviews WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdateManualReviewInput): DbPersonaManualReview | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.reviewer_notes !== undefined) mapped.reviewer_notes = updates.reviewer_notes;
    if (updates.resolved_at !== undefined) mapped.resolved_at = updates.resolved_at;

    // Auto-set resolved_at on terminal statuses
    if (updates.status && ['approved', 'rejected'].includes(updates.status) && !updates.resolved_at) {
      mapped.resolved_at = getCurrentTimestamp();
    }

    const result = buildUpdateStatement(db, 'persona_manual_reviews', mapped);
    if (!result) return manualReviewRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);
    return selectOne<DbPersonaManualReview>(db, 'SELECT * FROM persona_manual_reviews WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_manual_reviews WHERE id = ?').run(id);
    return result.changes > 0;
  },

  getPendingCount: (): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM persona_manual_reviews WHERE status = 'pending'"
    );
    return row?.count ?? 0;
  },

  getGlobalWithPersonaInfo: (limit: number = 50, offset: number = 0, status?: ManualReviewStatus): Array<DbPersonaManualReview & { persona_name?: string; persona_icon?: string; persona_color?: string }> => {
    const db = getDatabase();
    let query = `SELECT pmr.*, p.name as persona_name, p.icon as persona_icon, p.color as persona_color
      FROM persona_manual_reviews pmr
      LEFT JOIN personas p ON pmr.persona_id = p.id`;
    const params: unknown[] = [];

    if (status) {
      query += ' WHERE pmr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY pmr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return selectAll(db, query, ...params);
  },
};

// ============================================================================
// Connector Definition Repository
// ============================================================================

export const connectorDefinitionRepository = {
  getAll: (): DbConnectorDefinition[] => {
    const db = getDatabase();
    return selectAll<DbConnectorDefinition>(db, 'SELECT * FROM connector_definitions ORDER BY is_builtin DESC, name');
  },

  getById: (id: string): DbConnectorDefinition | null => {
    const db = getDatabase();
    return selectOne<DbConnectorDefinition>(db, 'SELECT * FROM connector_definitions WHERE id = ?', id);
  },

  getByName: (name: string): DbConnectorDefinition | null => {
    const db = getDatabase();
    return selectOne<DbConnectorDefinition>(db, 'SELECT * FROM connector_definitions WHERE name = ?', name);
  },

  getByCategory: (category: string): DbConnectorDefinition[] => {
    const db = getDatabase();
    return selectAll<DbConnectorDefinition>(
      db,
      'SELECT * FROM connector_definitions WHERE category = ? ORDER BY is_builtin DESC, name',
      category
    );
  },

  create: (input: CreateConnectorDefinitionInput): DbConnectorDefinition => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('conn');

    db.prepare(`
      INSERT INTO connector_definitions (id, name, label, icon_url, color, category, fields, healthcheck_config, services, events, metadata, is_builtin, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.label,
      input.icon_url ?? null,
      input.color || '#6B7280',
      input.category || 'general',
      JSON.stringify(input.fields),
      input.healthcheck_config ? JSON.stringify(input.healthcheck_config) : null,
      JSON.stringify(input.services || []),
      JSON.stringify(input.events || []),
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.is_builtin ? 1 : 0,
      now,
      now
    );

    return selectOne<DbConnectorDefinition>(db, 'SELECT * FROM connector_definitions WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdateConnectorDefinitionInput): DbConnectorDefinition | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.name !== undefined) mapped.name = updates.name;
    if (updates.label !== undefined) mapped.label = updates.label;
    if (updates.icon_url !== undefined) mapped.icon_url = updates.icon_url;
    if (updates.color !== undefined) mapped.color = updates.color;
    if (updates.category !== undefined) mapped.category = updates.category;
    if (updates.fields !== undefined) mapped.fields = JSON.stringify(updates.fields);
    if (updates.healthcheck_config !== undefined) mapped.healthcheck_config = updates.healthcheck_config ? JSON.stringify(updates.healthcheck_config) : null;
    if (updates.services !== undefined) mapped.services = JSON.stringify(updates.services);
    if (updates.events !== undefined) mapped.events = JSON.stringify(updates.events);
    if (updates.metadata !== undefined) mapped.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;

    const result = buildUpdateStatement(db, 'connector_definitions', mapped);
    if (!result) return connectorDefinitionRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);

    // Update timestamp
    const now = getCurrentTimestamp();
    db.prepare('UPDATE connector_definitions SET updated_at = ? WHERE id = ?').run(now, id);

    return selectOne<DbConnectorDefinition>(db, 'SELECT * FROM connector_definitions WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM connector_definitions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// Message Repository
// ============================================================================

export const personaMessageRepository = {
  getAll: (limit: number = 50, offset: number = 0): DbPersonaMessage[] => {
    const db = getDatabase();
    return selectAll<DbPersonaMessage>(
      db,
      'SELECT * FROM persona_messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      limit,
      offset
    );
  },

  getById: (id: string): DbPersonaMessage | null => {
    const db = getDatabase();
    return selectOne<DbPersonaMessage>(db, 'SELECT * FROM persona_messages WHERE id = ?', id);
  },

  getByPersonaId: (personaId: string, limit: number = 50): DbPersonaMessage[] => {
    const db = getDatabase();
    return selectAll<DbPersonaMessage>(
      db,
      'SELECT * FROM persona_messages WHERE persona_id = ? ORDER BY created_at DESC LIMIT ?',
      personaId,
      limit
    );
  },

  getByExecution: (executionId: string): DbPersonaMessage[] => {
    const db = getDatabase();
    return selectAll<DbPersonaMessage>(
      db,
      'SELECT * FROM persona_messages WHERE execution_id = ?',
      executionId
    );
  },

  getUnreadCount: (): number => {
    const db = getDatabase();
    const row = selectOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM persona_messages WHERE is_read = 0'
    );
    return row?.count ?? 0;
  },

  getGlobalWithPersonaInfo: (
    limit: number = 50,
    offset: number = 0,
    filter?: { is_read?: number; persona_id?: string; priority?: string }
  ): Array<DbPersonaMessage & { persona_name?: string; persona_icon?: string; persona_color?: string }> => {
    const db = getDatabase();
    let query = `SELECT pm.*, p.name as persona_name, p.icon as persona_icon, p.color as persona_color
      FROM persona_messages pm
      LEFT JOIN personas p ON pm.persona_id = p.id`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.is_read !== undefined) {
      conditions.push('pm.is_read = ?');
      params.push(filter.is_read);
    }
    if (filter?.persona_id) {
      conditions.push('pm.persona_id = ?');
      params.push(filter.persona_id);
    }
    if (filter?.priority) {
      conditions.push('pm.priority = ?');
      params.push(filter.priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pm.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return selectAll(db, query, ...params);
  },

  getGlobalCount: (filter?: { is_read?: number; persona_id?: string; priority?: string }): number => {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM persona_messages';
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.is_read !== undefined) {
      conditions.push('is_read = ?');
      params.push(filter.is_read);
    }
    if (filter?.persona_id) {
      conditions.push('persona_id = ?');
      params.push(filter.persona_id);
    }
    if (filter?.priority) {
      conditions.push('priority = ?');
      params.push(filter.priority);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const row = selectOne<{ count: number }>(db, query, ...params);
    return row?.count ?? 0;
  },

  create: (input: CreateMessageInput): DbPersonaMessage => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('pmsg');

    db.prepare(`
      INSERT INTO persona_messages (id, persona_id, execution_id, title, content, content_type, priority, is_read, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      input.persona_id,
      input.execution_id || null,
      input.title || null,
      input.content,
      input.content_type || 'text',
      input.priority || 'normal',
      input.metadata ? JSON.stringify(input.metadata) : null,
      now
    );

    return selectOne<DbPersonaMessage>(db, 'SELECT * FROM persona_messages WHERE id = ?', id)!;
  },

  markAsRead: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    db.prepare('UPDATE persona_messages SET is_read = 1, read_at = ? WHERE id = ?').run(now, id);
  },

  markAllAsRead: (personaId?: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    if (personaId) {
      db.prepare('UPDATE persona_messages SET is_read = 1, read_at = ? WHERE is_read = 0 AND persona_id = ?').run(now, personaId);
    } else {
      db.prepare('UPDATE persona_messages SET is_read = 1, read_at = ? WHERE is_read = 0').run(now);
    }
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_messages WHERE id = ?').run(id);
    return result.changes > 0;
  },
};

// ============================================================================
// Message Delivery Repository
// ============================================================================

export const personaMessageDeliveryRepository = {
  getByMessageId: (messageId: string): DbPersonaMessageDelivery[] => {
    const db = getDatabase();
    return selectAll<DbPersonaMessageDelivery>(
      db,
      'SELECT * FROM persona_message_deliveries WHERE message_id = ? ORDER BY created_at',
      messageId
    );
  },

  create: (input: {
    message_id: string;
    channel_type: string;
    status?: string;
    error_message?: string;
    external_id?: string;
    delivered_at?: string;
  }): DbPersonaMessageDelivery => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('pmdel');

    db.prepare(`
      INSERT INTO persona_message_deliveries (id, message_id, channel_type, status, error_message, external_id, delivered_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.message_id,
      input.channel_type,
      input.status || 'pending',
      input.error_message || null,
      input.external_id || null,
      input.delivered_at || null,
      now
    );

    return selectOne<DbPersonaMessageDelivery>(db, 'SELECT * FROM persona_message_deliveries WHERE id = ?', id)!;
  },

  updateStatus: (id: string, status: string, extra?: { error_message?: string; external_id?: string; delivered_at?: string }): void => {
    const db = getDatabase();
    const sets = ['status = ?'];
    const values: unknown[] = [status];

    if (extra?.error_message !== undefined) {
      sets.push('error_message = ?');
      values.push(extra.error_message);
    }
    if (extra?.external_id !== undefined) {
      sets.push('external_id = ?');
      values.push(extra.external_id);
    }
    if (extra?.delivered_at !== undefined) {
      sets.push('delivered_at = ?');
      values.push(extra.delivered_at);
    }

    values.push(id);
    db.prepare(`UPDATE persona_message_deliveries SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },
};

// ============================================================================
// Tool Usage Repository (Analytics)
// ============================================================================

export const personaToolUsageRepository = {
  record: (executionId: string, personaId: string, toolName: string, count: number = 1): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('ptuse');
    db.prepare(`
      INSERT INTO persona_tool_usage (id, execution_id, persona_id, tool_name, invocation_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, executionId, personaId, toolName, count, now);
  },

  /** Aggregate tool usage: total invocations, unique executions, unique personas */
  getToolUsageSummary: (days?: number, personaId?: string): Array<{ tool_name: string; total_invocations: number; unique_executions: number; unique_personas: number }> => {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (days) {
      conditions.push(`created_at >= datetime('now', '-${days} days')`);
    }
    if (personaId) {
      conditions.push('persona_id = ?');
      params.push(personaId);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    return selectAll(db, `
      SELECT
        tool_name,
        SUM(invocation_count) as total_invocations,
        COUNT(DISTINCT execution_id) as unique_executions,
        COUNT(DISTINCT persona_id) as unique_personas
      FROM persona_tool_usage
      ${where}
      GROUP BY tool_name
      ORDER BY total_invocations DESC
    `, ...params);
  },

  /** Daily tool usage for charting */
  getUsageOverTime: (days: number = 30, personaId?: string): Array<{ date: string; tool_name: string; invocations: number }> => {
    const db = getDatabase();
    const conditions: string[] = [`created_at >= datetime('now', '-${days} days')`];
    const params: unknown[] = [];

    if (personaId) {
      conditions.push('persona_id = ?');
      params.push(personaId);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    return selectAll(db, `
      SELECT
        date(created_at) as date,
        tool_name,
        SUM(invocation_count) as invocations
      FROM persona_tool_usage
      ${where}
      GROUP BY date(created_at), tool_name
      ORDER BY date ASC, tool_name
    `, ...params);
  },

  /** Per-persona usage summary */
  getPersonaUsageSummary: (days?: number): Array<{ persona_id: string; persona_name: string; persona_icon: string | null; persona_color: string | null; total_invocations: number; unique_tools: number }> => {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (days) {
      conditions.push(`ptu.created_at >= datetime('now', '-${days} days')`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    return selectAll(db, `
      SELECT
        ptu.persona_id,
        p.name as persona_name,
        p.icon as persona_icon,
        p.color as persona_color,
        SUM(ptu.invocation_count) as total_invocations,
        COUNT(DISTINCT ptu.tool_name) as unique_tools
      FROM persona_tool_usage ptu
      LEFT JOIN personas p ON ptu.persona_id = p.id
      ${where}
      GROUP BY ptu.persona_id
      ORDER BY total_invocations DESC
    `, ...params);
  },
};

// ============================================================================
// Event Bus Repository
// ============================================================================

export const personaEventRepository = {
  publish: (input: CreatePersonaEventInput): DbPersonaEvent => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('pevt');

    db.prepare(`
      INSERT INTO persona_events (id, project_id, event_type, source_type, source_id, target_persona_id, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      id,
      input.project_id || 'default',
      input.event_type,
      input.source_type,
      input.source_id || null,
      input.target_persona_id || null,
      input.payload ? JSON.stringify(input.payload) : null,
      now
    );

    return selectOne<DbPersonaEvent>(db, 'SELECT * FROM persona_events WHERE id = ?', id)!;
  },

  getById: (id: string): DbPersonaEvent | null => {
    const db = getDatabase();
    return selectOne<DbPersonaEvent>(db, 'SELECT * FROM persona_events WHERE id = ?', id);
  },

  getPending: (limit: number = 20, projectId?: string): DbPersonaEvent[] => {
    const db = getDatabase();
    if (projectId) {
      return selectAll<DbPersonaEvent>(
        db,
        "SELECT * FROM persona_events WHERE status = 'pending' AND project_id = ? ORDER BY created_at ASC LIMIT ?",
        projectId,
        limit
      );
    }
    return selectAll<DbPersonaEvent>(
      db,
      "SELECT * FROM persona_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
      limit
    );
  },

  updateStatus: (id: string, status: PersonaEventStatus, extra?: { error_message?: string; processed_at?: string }): void => {
    const db = getDatabase();
    const sets = ['status = ?'];
    const values: unknown[] = [status];

    if (extra?.error_message !== undefined) {
      sets.push('error_message = ?');
      values.push(extra.error_message);
    }
    if (extra?.processed_at !== undefined) {
      sets.push('processed_at = ?');
      values.push(extra.processed_at);
    }

    values.push(id);
    db.prepare(`UPDATE persona_events SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },

  getRecent: (limit: number = 50, projectId?: string): DbPersonaEvent[] => {
    const db = getDatabase();
    if (projectId) {
      return selectAll<DbPersonaEvent>(
        db,
        'SELECT * FROM persona_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
        projectId,
        limit
      );
    }
    return selectAll<DbPersonaEvent>(
      db,
      'SELECT * FROM persona_events ORDER BY created_at DESC LIMIT ?',
      limit
    );
  },

  getByType: (eventType: string, limit: number = 50): DbPersonaEvent[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEvent>(
      db,
      'SELECT * FROM persona_events WHERE event_type = ? ORDER BY created_at DESC LIMIT ?',
      eventType,
      limit
    );
  },

  getBySourceId: (sourceId: string): DbPersonaEvent[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEvent>(
      db,
      'SELECT * FROM persona_events WHERE source_id = ? ORDER BY created_at DESC',
      sourceId
    );
  },

  countPending: (projectId?: string): number => {
    const db = getDatabase();
    if (projectId) {
      const row = selectOne<{ count: number }>(
        db,
        "SELECT COUNT(*) as count FROM persona_events WHERE status = 'pending' AND project_id = ?",
        projectId
      );
      return row?.count ?? 0;
    }
    const row = selectOne<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM persona_events WHERE status = 'pending'"
    );
    return row?.count ?? 0;
  },

  getSince: (sinceTimestamp: string, limit: number = 50): DbPersonaEvent[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEvent>(
      db,
      'SELECT * FROM persona_events WHERE created_at > ? ORDER BY created_at ASC LIMIT ?',
      sinceTimestamp,
      limit
    );
  },

  getRecentlyProcessed: (sinceTimestamp: string, limit: number = 50): DbPersonaEvent[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEvent>(
      db,
      "SELECT * FROM persona_events WHERE processed_at > ? AND status IN ('completed', 'failed') ORDER BY processed_at ASC LIMIT ?",
      sinceTimestamp,
      limit
    );
  },

  cleanup: (olderThanDays: number = 30): number => {
    const db = getDatabase();
    const result = db.prepare(
      "DELETE FROM persona_events WHERE status IN ('completed', 'skipped', 'failed') AND created_at < datetime('now', '-' || ? || ' days')"
    ).run(olderThanDays);
    return result.changes;
  },
};

// ============================================================================
// Event Subscription Repository
// ============================================================================

export const eventSubscriptionRepository = {
  getById: (id: string): DbPersonaEventSubscription | null => {
    const db = getDatabase();
    return selectOne<DbPersonaEventSubscription>(db, 'SELECT * FROM persona_event_subscriptions WHERE id = ?', id);
  },

  getByPersonaId: (personaId: string): DbPersonaEventSubscription[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEventSubscription>(
      db,
      'SELECT * FROM persona_event_subscriptions WHERE persona_id = ? ORDER BY created_at DESC',
      personaId
    );
  },

  getByEventType: (eventType: string): DbPersonaEventSubscription[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEventSubscription>(
      db,
      'SELECT * FROM persona_event_subscriptions WHERE event_type = ? AND enabled = 1',
      eventType
    );
  },

  getEnabled: (): DbPersonaEventSubscription[] => {
    const db = getDatabase();
    return selectAll<DbPersonaEventSubscription>(
      db,
      'SELECT * FROM persona_event_subscriptions WHERE enabled = 1 ORDER BY created_at DESC'
    );
  },

  create: (input: CreateEventSubscriptionInput): DbPersonaEventSubscription => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = input.id || generateId('pesub');

    db.prepare(`
      INSERT INTO persona_event_subscriptions (id, persona_id, event_type, source_filter, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.persona_id,
      input.event_type,
      input.source_filter ? JSON.stringify(input.source_filter) : null,
      input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1,
      now,
      now
    );

    return selectOne<DbPersonaEventSubscription>(db, 'SELECT * FROM persona_event_subscriptions WHERE id = ?', id)!;
  },

  update: (id: string, updates: UpdateEventSubscriptionInput): DbPersonaEventSubscription | null => {
    const db = getDatabase();
    const mapped: Record<string, unknown> = {};

    if (updates.event_type !== undefined) mapped.event_type = updates.event_type;
    if (updates.source_filter !== undefined) mapped.source_filter = updates.source_filter ? JSON.stringify(updates.source_filter) : null;
    if (updates.enabled !== undefined) mapped.enabled = updates.enabled ? 1 : 0;

    const result = buildUpdateStatement(db, 'persona_event_subscriptions', mapped);
    if (!result) return eventSubscriptionRepository.getById(id);

    result.values.push(id);
    result.stmt.run(...result.values);

    const now = getCurrentTimestamp();
    db.prepare('UPDATE persona_event_subscriptions SET updated_at = ? WHERE id = ?').run(now, id);

    return selectOne<DbPersonaEventSubscription>(db, 'SELECT * FROM persona_event_subscriptions WHERE id = ?', id);
  },

  delete: (id: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM persona_event_subscriptions WHERE id = ?').run(id);
    return result.changes > 0;
  },
};
