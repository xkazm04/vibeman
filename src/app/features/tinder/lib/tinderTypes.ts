/**
 * Type definitions for unified Tinder system (Ideas + Directions)
 */

import { DbIdea, DbDirection } from '@/app/db';

// Discriminated union types for item identification
export type TinderItemType = 'idea' | 'direction' | 'direction_pair';

export interface TinderIdea {
  type: 'idea';
  data: DbIdea;
}

export interface TinderDirection {
  type: 'direction';
  data: DbDirection;
}

// Paired directions - two alternative solutions for the same problem
export interface TinderDirectionPair {
  type: 'direction_pair';
  data: {
    pairId: string;
    problemStatement: string | null;
    directionA: DbDirection;
    directionB: DbDirection;
  };
}

export type TinderItem = TinderIdea | TinderDirection | TinderDirectionPair;

// Filter mode for the tab switcher
export type TinderFilterMode = 'ideas' | 'directions' | 'both';

// Stats tracking separated by type
export interface TinderItemStats {
  ideas: {
    accepted: number;
    rejected: number;
    deleted: number;
  };
  directions: {
    accepted: number;
    rejected: number;
    deleted: number;
  };
}

// Combined stats for display
export interface TinderCombinedStats {
  accepted: number;
  rejected: number;
  deleted: number;
}

// API response type for unified items endpoint
export interface TinderItemsResponse {
  items: TinderItem[];
  hasMore: boolean;
  total: number;
  counts: {
    ideas: number;
    directions: number;
  };
  /** Map of goal_id -> goal_title for batch-fetched goals (avoids N+1 queries) */
  goalTitlesMap: Record<string, string>;
}

// Category count for filtering
export interface CategoryCount {
  category: string;
  count: number;
}

// Hook result type
export interface UseTinderItemsResult {
  items: TinderItem[];
  currentIndex: number;
  loading: boolean;
  processing: boolean;
  hasMore: boolean;
  total: number;
  stats: TinderItemStats;
  combinedStats: TinderCombinedStats;
  remainingCount: number;
  currentItem: TinderItem | undefined;
  filterMode: TinderFilterMode;
  counts: { ideas: number; directions: number };
  /** Map of goal_id -> goal_title for batch-fetched goals */
  goalTitlesMap: Record<string, string>;
  // Category filtering for ideas
  selectedCategory: string | null;
  categories: CategoryCount[];
  categoriesLoading: boolean;
  setCategory: (category: string | null) => void;
  setFilterMode: (mode: TinderFilterMode) => void;
  handleAccept: () => Promise<void>;
  handleReject: (rejectionReason?: string) => Promise<void>;
  handleDelete: () => Promise<void>;
  // Idea variant handler (scope: MVP / Standard / Ambitious)
  handleAcceptIdeaVariant: (ideaId: string, variant: { title: string; description: string; effort: number; impact: number; risk: number; scope: string }) => Promise<void>;
  // Paired direction handlers
  handleAcceptPairVariant: (pairId: string, variant: 'A' | 'B') => Promise<void>;
  handleRejectPair: (pairId: string) => Promise<void>;
  handleDeletePair: (pairId: string) => Promise<void>;
  resetStats: () => void;
  loadItems: () => Promise<void>;
}

// Helper type guards
export function isIdeaItem(item: TinderItem): item is TinderIdea {
  return item.type === 'idea';
}

export function isDirectionItem(item: TinderItem): item is TinderDirection {
  return item.type === 'direction';
}

export function isDirectionPairItem(item: TinderItem): item is TinderDirectionPair {
  return item.type === 'direction_pair';
}

// Helper to get item ID regardless of type
export function getTinderItemId(item: TinderItem): string {
  if (isDirectionPairItem(item)) {
    return item.data.pairId;
  }
  return item.data.id;
}

// Helper to get item created_at regardless of type
export function getTinderItemCreatedAt(item: TinderItem): string {
  if (isDirectionPairItem(item)) {
    return item.data.directionA.created_at;
  }
  return item.data.created_at;
}

// Helper to get project_id regardless of type
export function getTinderItemProjectId(item: TinderItem): string {
  if (isDirectionPairItem(item)) {
    return item.data.directionA.project_id;
  }
  return item.data.project_id;
}

// Initial stats state
export const initialTinderItemStats: TinderItemStats = {
  ideas: { accepted: 0, rejected: 0, deleted: 0 },
  directions: { accepted: 0, rejected: 0, deleted: 0 },
};
