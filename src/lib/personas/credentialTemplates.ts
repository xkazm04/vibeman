/**
 * Credential Template Registry
 * Static TypeScript registry defining templates for each credential service type.
 * Not stored in DB - serves as schema for UI forms and healthcheck logic.
 */

import type { CredentialServiceType } from '@/app/db/models/persona.types';

export interface CredentialTemplateField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'url';
  placeholder?: string;
  helpText?: string;
  required?: boolean;
}

export interface CredentialTemplateService {
  toolName: string;
  label: string;
}

export interface CredentialTemplateEvent {
  id: string;
  name: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
}

export interface CredentialTemplate {
  type: CredentialServiceType;
  label: string;
  icon: string;
  color: string;
  fields: CredentialTemplateField[];
  healthcheck: {
    description: string;
  };
  services: CredentialTemplateService[];
  events: CredentialTemplateEvent[];
  /** If set, this connector supports an OAuth authorize flow (e.g. 'google') */
  oauthType?: 'google';
}

const templates: Record<CredentialServiceType, CredentialTemplate> = {
  gmail: {
    type: 'gmail',
    label: 'Gmail',
    icon: 'Mail',
    color: '#EA4335',
    oauthType: 'google',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'OAuth client ID from Google Cloud Console', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'OAuth client secret', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'Auto-filled by Authorize button', required: true, helpText: 'Click "Authorize with Google" after entering Client ID and Secret' },
    ],
    healthcheck: {
      description: 'Validates token by fetching Gmail profile',
    },
    services: [
      { toolName: 'gmail_read', label: 'Read Emails' },
      { toolName: 'gmail_send', label: 'Send Emails' },
      { toolName: 'gmail_search', label: 'Search Emails' },
      { toolName: 'gmail_mark_read', label: 'Mark as Read' },
    ],
    events: [
      { id: 'gmail_new_email', name: 'New email received', description: 'Triggers when a new email arrives in inbox', defaultConfig: { pollingIntervalSeconds: 60, query: 'is:unread' } },
      { id: 'gmail_labeled', name: 'Email with label', description: 'Triggers when an email gets a specific label', defaultConfig: { pollingIntervalSeconds: 120, labelId: '' } },
    ],
  },
  google_calendar: {
    type: 'google_calendar',
    label: 'Google Calendar',
    icon: 'Calendar',
    color: '#4285F4',
    oauthType: 'google',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'OAuth client ID from Google Cloud Console', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'OAuth client secret', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'Auto-filled by Authorize button', required: true, helpText: 'Click "Authorize with Google" after entering Client ID and Secret' },
    ],
    healthcheck: {
      description: 'Validates token by refreshing access token',
    },
    services: [
      { toolName: 'google_calendar_read', label: 'Read Events' },
      { toolName: 'google_calendar_create', label: 'Create Events' },
    ],
    events: [
      { id: 'calendar_upcoming', name: 'Upcoming event', description: 'Triggers before a calendar event starts', defaultConfig: { pollingIntervalSeconds: 300, minutesBefore: 15 } },
    ],
  },
  google_drive: {
    type: 'google_drive',
    label: 'Google Drive',
    icon: 'HardDrive',
    color: '#0F9D58',
    oauthType: 'google',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'OAuth client ID from Google Cloud Console', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'OAuth client secret', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'Auto-filled by Authorize button', required: true, helpText: 'Click "Authorize with Google" after entering Client ID and Secret' },
    ],
    healthcheck: {
      description: 'Validates token by refreshing access token',
    },
    services: [
      { toolName: 'google_drive_read', label: 'Read Files' },
      { toolName: 'google_drive_upload', label: 'Upload Files' },
    ],
    events: [
      { id: 'drive_file_changed', name: 'File changed', description: 'Triggers when a file is modified in Drive', defaultConfig: { pollingIntervalSeconds: 300, folderId: '' } },
    ],
  },
  slack: {
    type: 'slack',
    label: 'Slack',
    icon: 'MessageSquare',
    color: '#4A154B',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true, helpText: 'Bot User OAuth Token from Slack app settings' },
      { key: 'signing_secret', label: 'Signing Secret', type: 'password', placeholder: 'Signing secret for verifying requests' },
    ],
    healthcheck: {
      description: 'Calls auth.test to verify bot token',
    },
    services: [
      { toolName: 'slack_send', label: 'Send Message' },
      { toolName: 'slack_read', label: 'Read Messages' },
    ],
    events: [
      { id: 'slack_new_message', name: 'New message in channel', description: 'Triggers on new messages in a Slack channel', defaultConfig: { pollingIntervalSeconds: 30, channel: '' } },
    ],
  },
  github: {
    type: 'github',
    label: 'GitHub',
    icon: 'Github',
    color: '#24292e',
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...', required: true, helpText: 'Fine-grained PAT with required permissions' },
    ],
    healthcheck: {
      description: 'Fetches /user to verify token validity',
    },
    services: [
      { toolName: 'github_api', label: 'GitHub API' },
    ],
    events: [
      { id: 'github_new_issue', name: 'New issue', description: 'Triggers when a new issue is created', defaultConfig: { pollingIntervalSeconds: 120, repo: '' } },
      { id: 'github_new_pr', name: 'New pull request', description: 'Triggers when a new PR is opened', defaultConfig: { pollingIntervalSeconds: 120, repo: '' } },
    ],
  },
  http: {
    type: 'http',
    label: 'HTTP / REST API',
    icon: 'Globe',
    color: '#3B82F6',
    fields: [
      { key: 'base_url', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', placeholder: '{"Authorization": "Bearer ..."}', helpText: 'Additional headers sent with every request' },
    ],
    healthcheck: {
      description: 'Sends GET to base URL to verify connectivity',
    },
    services: [
      { toolName: 'http_request', label: 'HTTP Request' },
    ],
    events: [],
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    icon: 'Settings',
    color: '#F59E0B',
    fields: [
      { key: 'data', label: 'Credential Data (JSON)', type: 'textarea', placeholder: '{"key": "value"}', required: true },
    ],
    healthcheck: {
      description: 'No automatic healthcheck available for custom credentials',
    },
    services: [],
    events: [],
  },
};

export function getCredentialTemplate(type: CredentialServiceType): CredentialTemplate {
  return templates[type];
}

export function getAllCredentialTemplates(): CredentialTemplate[] {
  return Object.values(templates);
}
