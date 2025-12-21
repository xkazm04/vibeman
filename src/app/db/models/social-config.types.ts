/**
 * Social Channel Configuration Types
 * Universal schema supporting Instagram, Facebook, X, Gmail, and Discord
 */

// Supported social channels
export type SocialChannelType = 'instagram' | 'facebook' | 'x' | 'gmail' | 'discord';

// Connection status
export type ConnectionStatus = 'untested' | 'connected' | 'failed' | 'expired';

// Base database type
export interface DbSocialChannelConfig {
  id: string;
  project_id: string;
  channel_type: SocialChannelType;
  name: string; // User-friendly name for this config
  is_enabled: number; // SQLite boolean

  // Encrypted credentials JSON (encrypted at rest)
  credentials_encrypted: string;

  // Channel-specific configuration as JSON
  config_json: string;

  // Connection status tracking
  connection_status: ConnectionStatus;
  last_connection_test: string | null;
  last_error: string | null;

  // Fetch tracking
  last_fetch_at: string | null;
  items_fetched_count: number;

  created_at: string;
  updated_at: string;
}

// Channel-specific credential types
export interface InstagramCredentials {
  accessToken: string;
  userId?: string;
}

export interface FacebookCredentials {
  accessToken: string;
  pageAccessToken?: string;
}

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

export interface GmailCredentials {
  // Service Account authentication (simpler for server-to-server)
  serviceAccountEmail: string;
  privateKey: string; // PEM format private key from service account JSON
  // The email address to impersonate (requires domain-wide delegation)
  delegatedEmail: string;
}

export interface DiscordCredentials {
  botToken: string;
  applicationId?: string;
}

export type ChannelCredentials =
  | { type: 'instagram'; data: InstagramCredentials }
  | { type: 'facebook'; data: FacebookCredentials }
  | { type: 'x'; data: XCredentials }
  | { type: 'gmail'; data: GmailCredentials }
  | { type: 'discord'; data: DiscordCredentials };

// Channel-specific configuration types
export interface InstagramConfig {
  businessAccountId?: string;
  monitorComments: boolean;
  monitorMentions: boolean;
  hashtagsToTrack?: string[];
}

export interface FacebookConfig {
  pageId?: string;
  monitorComments: boolean;
  monitorMessages: boolean;
  monitorReviews: boolean;
}

export interface XConfig {
  username?: string;
  monitorMentions: boolean;
  monitorReplies: boolean;
  monitorDMs: boolean;
  keywords?: string[];
  hashtags?: string[];
}

export interface GmailConfig {
  emailAddress?: string;
  subjectFilters?: string[]; // Subjects to monitor
  senderFilters?: string[]; // Specific senders
  labelFilters?: string[]; // Gmail labels
  excludeSpam: boolean;
  excludePromotions: boolean;
}

export interface DiscordConfig {
  serverId?: string;
  serverName?: string;
  channelIds: string[]; // Array of channel IDs to monitor
  channelNames?: string[]; // For display purposes
  monitorThreads: boolean;
}

export type ChannelConfig =
  | { type: 'instagram'; data: InstagramConfig }
  | { type: 'facebook'; data: FacebookConfig }
  | { type: 'x'; data: XConfig }
  | { type: 'gmail'; data: GmailConfig }
  | { type: 'discord'; data: DiscordConfig };

// API Response types (camelCase for frontend)
export interface SocialChannelConfigResponse {
  id: string;
  projectId: string;
  channelType: SocialChannelType;
  name: string;
  isEnabled: boolean;
  config: ChannelConfig['data'];
  connectionStatus: ConnectionStatus;
  lastConnectionTest: string | null;
  lastError: string | null;
  lastFetchAt: string | null;
  itemsFetchedCount: number;
  createdAt: string;
  updatedAt: string;
  // Note: credentials are never sent to frontend
}

// Create/Update request types
export interface CreateSocialChannelConfigRequest {
  projectId: string;
  channelType: SocialChannelType;
  name: string;
  credentials: ChannelCredentials['data'];
  config: ChannelConfig['data'];
}

export interface UpdateSocialChannelConfigRequest {
  name?: string;
  isEnabled?: boolean;
  credentials?: ChannelCredentials['data'];
  config?: ChannelConfig['data'];
}

// Test connection request/response
export interface TestConnectionRequest {
  channelType: SocialChannelType;
  credentials: ChannelCredentials['data'];
  config?: ChannelConfig['data'];
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  accountInfo?: {
    username?: string;
    displayName?: string;
    email?: string;
    serverName?: string;
    channelCount?: number;
  };
}

// Fetch options for retrieving available resources
export interface FetchResourcesRequest {
  channelType: SocialChannelType;
  credentials: ChannelCredentials['data'];
  resourceType: 'channels' | 'pages' | 'labels' | 'servers';
}

export interface FetchResourcesResponse {
  success: boolean;
  resources: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  error?: string;
}

// Default configurations per channel
export const DEFAULT_INSTAGRAM_CONFIG: InstagramConfig = {
  monitorComments: true,
  monitorMentions: true,
  hashtagsToTrack: [],
};

export const DEFAULT_FACEBOOK_CONFIG: FacebookConfig = {
  monitorComments: true,
  monitorMessages: true,
  monitorReviews: true,
};

export const DEFAULT_X_CONFIG: XConfig = {
  monitorMentions: true,
  monitorReplies: true,
  monitorDMs: false,
  keywords: [],
  hashtags: [],
};

export const DEFAULT_GMAIL_CONFIG: GmailConfig = {
  subjectFilters: [],
  senderFilters: [],
  labelFilters: [],
  excludeSpam: true,
  excludePromotions: true,
};

export const DEFAULT_DISCORD_CONFIG: DiscordConfig = {
  channelIds: [],
  channelNames: [],
  monitorThreads: true,
};

export function getDefaultConfig(channelType: SocialChannelType): ChannelConfig['data'] {
  switch (channelType) {
    case 'instagram':
      return DEFAULT_INSTAGRAM_CONFIG;
    case 'facebook':
      return DEFAULT_FACEBOOK_CONFIG;
    case 'x':
      return DEFAULT_X_CONFIG;
    case 'gmail':
      return DEFAULT_GMAIL_CONFIG;
    case 'discord':
      return DEFAULT_DISCORD_CONFIG;
  }
}
