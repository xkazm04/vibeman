/**
 * Migration 092: Connector Definitions
 * Creates the connector_definitions table for dynamic connector registration.
 * Seeds with 5 builtin connectors (gmail, slack, github, http, custom) from credentialTemplates.
 */

import { createTableIfNotExists, safeMigration, type MigrationLogger } from './migration.utils';
import { DbConnection } from '../drivers/types';

export function migrate092ConnectorDefinitions(
  db: DbConnection,
  logger?: MigrationLogger
): void {
  safeMigration('connector_definitions', () => {
    const created = createTableIfNotExists(db, 'connector_definitions', `
      CREATE TABLE IF NOT EXISTS connector_definitions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        icon_url TEXT,
        color TEXT NOT NULL DEFAULT '#6B7280',
        category TEXT DEFAULT 'general',
        fields TEXT NOT NULL,
        healthcheck_config TEXT,
        services TEXT DEFAULT '[]',
        events TEXT DEFAULT '[]',
        metadata TEXT,
        is_builtin INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    if (created) {
      logger?.info('Created connector_definitions table');

      // Create indexes
      try {
        db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_name ON connector_definitions(name)').run();
        db.prepare('CREATE INDEX IF NOT EXISTS idx_cd_category ON connector_definitions(category)').run();
        logger?.info('Created connector_definitions indexes');
      } catch {
        // Indexes may already exist
      }

      // Seed builtin connectors
      seedBuiltinConnectors(db, logger);
    }
  }, logger);
}

function seedBuiltinConnectors(db: DbConnection, logger?: MigrationLogger): void {
  const now = new Date().toISOString();

  const builtins = [
    {
      id: 'conn_builtin_gmail',
      name: 'gmail',
      label: 'Gmail',
      icon_url: 'https://cdn.simpleicons.org/gmail/EA4335',
      color: '#EA4335',
      category: 'communication',
      fields: JSON.stringify([
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'OAuth client ID', required: true },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'OAuth client secret', required: true },
        { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'OAuth refresh token', required: true, helpText: 'Obtain via OAuth consent flow' },
      ]),
      healthcheck_config: JSON.stringify({ description: 'Validates token by fetching Gmail profile' }),
      services: JSON.stringify([
        { toolName: 'gmail_read', label: 'Read Emails' },
        { toolName: 'gmail_send', label: 'Send Emails' },
        { toolName: 'gmail_search', label: 'Search Emails' },
      ]),
      events: JSON.stringify([
        { id: 'gmail_new_email', name: 'New email received', description: 'Triggers when a new email arrives in inbox', defaultConfig: { pollingIntervalSeconds: 60, query: 'is:unread' } },
        { id: 'gmail_labeled', name: 'Email with label', description: 'Triggers when an email gets a specific label', defaultConfig: { pollingIntervalSeconds: 120, labelId: '' } },
      ]),
    },
    {
      id: 'conn_builtin_slack',
      name: 'slack',
      label: 'Slack',
      icon_url: 'https://cdn.simpleicons.org/slack/4A154B',
      color: '#4A154B',
      category: 'communication',
      fields: JSON.stringify([
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true, helpText: 'Bot User OAuth Token from Slack app settings' },
        { key: 'signing_secret', label: 'Signing Secret', type: 'password', placeholder: 'Signing secret for verifying requests' },
      ]),
      healthcheck_config: JSON.stringify({ description: 'Calls auth.test to verify bot token' }),
      services: JSON.stringify([
        { toolName: 'slack_send', label: 'Send Message' },
        { toolName: 'slack_read', label: 'Read Messages' },
      ]),
      events: JSON.stringify([
        { id: 'slack_new_message', name: 'New message in channel', description: 'Triggers on new messages in a Slack channel', defaultConfig: { pollingIntervalSeconds: 30, channel: '' } },
      ]),
    },
    {
      id: 'conn_builtin_github',
      name: 'github',
      label: 'GitHub',
      icon_url: 'https://cdn.simpleicons.org/github/24292e',
      color: '#24292e',
      category: 'development',
      fields: JSON.stringify([
        { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true, helpText: 'Fine-grained PAT with required permissions' },
      ]),
      healthcheck_config: JSON.stringify({ description: 'Fetches /user to verify token validity' }),
      services: JSON.stringify([
        { toolName: 'github_api', label: 'GitHub API' },
      ]),
      events: JSON.stringify([
        { id: 'github_new_issue', name: 'New issue', description: 'Triggers when a new issue is created', defaultConfig: { pollingIntervalSeconds: 120, repo: '' } },
        { id: 'github_new_pr', name: 'New pull request', description: 'Triggers when a new PR is opened', defaultConfig: { pollingIntervalSeconds: 120, repo: '' } },
      ]),
    },
    {
      id: 'conn_builtin_http',
      name: 'http',
      label: 'HTTP / REST API',
      icon_url: null,
      color: '#3B82F6',
      category: 'general',
      fields: JSON.stringify([
        { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com', required: true },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
        { key: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}', helpText: 'Additional headers sent with every request' },
      ]),
      healthcheck_config: JSON.stringify({ description: 'Sends GET to base URL to verify connectivity' }),
      services: JSON.stringify([
        { toolName: 'http_request', label: 'HTTP Request' },
      ]),
      events: JSON.stringify([]),
    },
    {
      id: 'conn_builtin_custom',
      name: 'custom',
      label: 'Custom',
      icon_url: null,
      color: '#F59E0B',
      category: 'general',
      fields: JSON.stringify([
        { key: 'data', label: 'Credential Data (JSON)', type: 'textarea', placeholder: '{"key": "value"}', required: true },
      ]),
      healthcheck_config: JSON.stringify({ description: 'No automatic healthcheck available for custom credentials' }),
      services: JSON.stringify([]),
      events: JSON.stringify([]),
    },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO connector_definitions
      (id, name, label, icon_url, color, category, fields, healthcheck_config, services, events, metadata, is_builtin, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
  `);

  for (const c of builtins) {
    try {
      stmt.run(
        c.id, c.name, c.label, c.icon_url, c.color, c.category,
        c.fields, c.healthcheck_config, c.services, c.events,
        now, now
      );
    } catch {
      // May already exist
    }
  }

  logger?.info(`Seeded ${builtins.length} builtin connector definitions`);
}
