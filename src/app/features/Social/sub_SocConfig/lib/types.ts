/**
 * Types for Social Channel Configuration UI
 */

// Re-export database types
export type {
  SocialChannelType,
  ConnectionStatus,
  ChannelCredentials,
  ChannelConfig,
  InstagramCredentials,
  FacebookCredentials,
  XCredentials,
  GmailCredentials,
  DiscordCredentials,
  InstagramConfig,
  FacebookConfig,
  XConfig,
  GmailConfig,
  DiscordConfig,
  SocialChannelConfigResponse,
  CreateSocialChannelConfigRequest,
  UpdateSocialChannelConfigRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  FetchResourcesRequest,
  FetchResourcesResponse,
} from '@/app/db/models/social-config.types';

export {
  DEFAULT_INSTAGRAM_CONFIG,
  DEFAULT_FACEBOOK_CONFIG,
  DEFAULT_X_CONFIG,
  DEFAULT_GMAIL_CONFIG,
  DEFAULT_DISCORD_CONFIG,
  getDefaultConfig,
} from '@/app/db/models/social-config.types';

// Channel metadata for UI
export interface ChannelInfo {
  type: SocialChannelType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  credentialFields: CredentialField[];
  configFields: ConfigField[];
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'boolean' | 'text' | 'textarea' | 'array' | 'select';
  defaultValue?: boolean | string | string[];
  options?: { value: string; label: string }[];
  helpText?: string;
}

import type { SocialChannelType } from '@/app/db/models/social-config.types';

// Channel definitions
export const CHANNEL_INFO: Record<SocialChannelType, ChannelInfo> = {
  instagram: {
    type: 'instagram',
    name: 'Instagram',
    description: 'Monitor comments, mentions, and DMs from Instagram Business accounts',
    icon: 'Instagram',
    color: 'text-pink-500',
    credentialFields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'Instagram Graph API access token',
        required: true,
        helpText: 'Get from Meta Developer Console - requires Business account',
      },
      {
        key: 'userId',
        label: 'User ID',
        type: 'text',
        placeholder: 'Instagram User ID (optional)',
        required: false,
        helpText: 'Will be fetched automatically if not provided',
      },
    ],
    configFields: [
      { key: 'monitorComments', label: 'Monitor Comments', type: 'boolean', defaultValue: true },
      { key: 'monitorMentions', label: 'Monitor Mentions', type: 'boolean', defaultValue: true },
      { key: 'hashtagsToTrack', label: 'Hashtags to Track', type: 'array', helpText: 'Enter hashtags without #' },
    ],
  },
  facebook: {
    type: 'facebook',
    name: 'Facebook',
    description: 'Monitor page comments, messages, and reviews',
    icon: 'Facebook',
    color: 'text-blue-600',
    credentialFields: [
      {
        key: 'accessToken',
        label: 'User Access Token',
        type: 'password',
        placeholder: 'Facebook user access token',
        required: true,
        helpText: 'From Meta Developer Console with pages_read_engagement permission',
      },
      {
        key: 'pageAccessToken',
        label: 'Page Access Token',
        type: 'password',
        placeholder: 'Page-specific access token (optional)',
        required: false,
        helpText: 'Generated from user token - will be fetched if you have page access',
      },
    ],
    configFields: [
      { key: 'pageId', label: 'Page ID', type: 'text', helpText: 'Will be populated from available pages' },
      { key: 'monitorComments', label: 'Monitor Comments', type: 'boolean', defaultValue: true },
      { key: 'monitorMessages', label: 'Monitor Messages', type: 'boolean', defaultValue: true },
      { key: 'monitorReviews', label: 'Monitor Reviews', type: 'boolean', defaultValue: true },
    ],
  },
  x: {
    type: 'x',
    name: 'X (Twitter)',
    description: 'Monitor mentions, replies, and direct messages',
    icon: 'Twitter',
    color: 'text-gray-100',
    credentialFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        placeholder: 'Consumer API Key',
        required: true,
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        placeholder: 'Consumer API Secret',
        required: true,
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'OAuth Access Token',
        required: true,
      },
      {
        key: 'accessTokenSecret',
        label: 'Access Token Secret',
        type: 'password',
        placeholder: 'OAuth Access Token Secret',
        required: true,
      },
      {
        key: 'bearerToken',
        label: 'Bearer Token',
        type: 'password',
        placeholder: 'Bearer token for v2 API (optional)',
        required: false,
        helpText: 'Required for some v2 endpoints',
      },
    ],
    configFields: [
      { key: 'username', label: 'Username to Monitor', type: 'text', helpText: 'Without @ symbol' },
      { key: 'monitorMentions', label: 'Monitor Mentions', type: 'boolean', defaultValue: true },
      { key: 'monitorReplies', label: 'Monitor Replies', type: 'boolean', defaultValue: true },
      { key: 'monitorDMs', label: 'Monitor DMs', type: 'boolean', defaultValue: false },
      { key: 'keywords', label: 'Keywords to Track', type: 'array' },
      { key: 'hashtags', label: 'Hashtags to Track', type: 'array', helpText: 'Without # symbol' },
    ],
  },
  gmail: {
    type: 'gmail',
    name: 'Gmail',
    description: 'Monitor emails matching specific subjects or senders (requires Google Workspace)',
    icon: 'Mail',
    color: 'text-red-500',
    credentialFields: [
      {
        key: 'serviceAccountEmail',
        label: 'Service Account Email',
        type: 'text',
        placeholder: 'my-service@project.iam.gserviceaccount.com',
        required: true,
        helpText: 'From Google Cloud Console > IAM > Service Accounts',
      },
      {
        key: 'privateKey',
        label: 'Private Key',
        type: 'textarea',
        placeholder: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
        required: true,
        helpText: 'Copy from the downloaded JSON key file (private_key field)',
      },
      {
        key: 'delegatedEmail',
        label: 'Email to Monitor',
        type: 'text',
        placeholder: 'user@yourdomain.com',
        required: true,
        helpText: 'The email address to impersonate (requires domain-wide delegation)',
      },
    ],
    configFields: [
      { key: 'subjectFilters', label: 'Subject Filters', type: 'array', helpText: 'Emails containing these subjects' },
      { key: 'senderFilters', label: 'Sender Filters', type: 'array', helpText: 'Specific email addresses' },
      { key: 'labelFilters', label: 'Gmail Labels', type: 'array', helpText: 'Only process emails with these labels' },
      { key: 'excludeSpam', label: 'Exclude Spam', type: 'boolean', defaultValue: true },
      { key: 'excludePromotions', label: 'Exclude Promotions', type: 'boolean', defaultValue: true },
    ],
  },
  discord: {
    type: 'discord',
    name: 'Discord',
    description: 'Monitor messages from specific Discord channels',
    icon: 'MessageCircle',
    color: 'text-indigo-500',
    credentialFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: 'Discord Bot Token',
        required: true,
        helpText: 'From Discord Developer Portal > Bot section',
      },
      {
        key: 'applicationId',
        label: 'Application ID',
        type: 'text',
        placeholder: 'Discord Application ID (optional)',
        required: false,
      },
    ],
    configFields: [
      { key: 'serverId', label: 'Server ID', type: 'text', helpText: 'Will be populated from available servers' },
      { key: 'channelIds', label: 'Channel IDs', type: 'array', helpText: 'Select channels to monitor' },
      { key: 'monitorThreads', label: 'Monitor Threads', type: 'boolean', defaultValue: true },
    ],
  },
};

// Get all supported channels
export const SUPPORTED_CHANNELS = Object.values(CHANNEL_INFO);

// Get channel info by type
export function getChannelInfo(type: SocialChannelType): ChannelInfo {
  return CHANNEL_INFO[type];
}
