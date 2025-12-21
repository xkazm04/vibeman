/**
 * Discovery Configuration Types
 * For searching and discovering content on social channels
 */

export interface DiscoveryConfig {
  id: string;
  projectId: string;
  name: string;
  channel: 'x'; // Only X supported for now
  query: string; // Natural language query
  isActive: boolean;
  lastSearchAt: string | null;
  resultsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbDiscoveryConfig {
  id: string;
  project_id: string;
  name: string;
  channel: string;
  query: string;
  is_active: number;
  last_search_at: string | null;
  results_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscoveredTweet {
  id: string;
  text: string;
  authorUsername: string;
  authorName: string;
  authorProfileImage?: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  url: string;
}

export interface DiscoverySearchRequest {
  configId?: string;
  query: string;
  projectId: string;
}

export interface DiscoverySearchResponse {
  success: boolean;
  tweets: DiscoveredTweet[];
  searchQuery: string;
  error?: string;
}

export interface SaveTweetsRequest {
  projectId: string;
  configId: string;
  tweets: DiscoveredTweet[];
}

export interface SaveTweetsResponse {
  success: boolean;
  savedCount: number;
  error?: string;
}

// Form state for creating/editing discovery configs
export interface DiscoveryFormState {
  name: string;
  query: string;
}

export const DEFAULT_DISCOVERY_FORM: DiscoveryFormState = {
  name: '',
  query: '',
};

// Map DB row to frontend type
export function mapDbToDiscoveryConfig(row: DbDiscoveryConfig): DiscoveryConfig {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    channel: row.channel as 'x',
    query: row.query,
    isActive: row.is_active === 1,
    lastSearchAt: row.last_search_at,
    resultsCount: row.results_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
