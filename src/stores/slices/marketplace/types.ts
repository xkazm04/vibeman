/**
 * Shared types for marketplace store slices
 */

import type {
  DbRefactoringPatternWithAuthor,
  DbMarketplaceUser,
  DbUserBadgeWithDetails,
  PatternCategory,
  PatternScope,
} from '@/app/db/models/marketplace.types';

// Re-export for use in other slices
export type { PatternCategory, PatternScope };

// ============================================================================
// TYPES
// ============================================================================

export interface MarketplaceFilters {
  category: PatternCategory | 'all';
  scope: PatternScope | 'all';
  language: string | null;
  framework: string | null;
  search: string;
  sortBy: 'rating' | 'downloads' | 'recent';
}

export interface PatternFormData {
  name: string;
  title: string;
  description: string;
  detailed_description: string;
  problem_statement: string;
  solution_approach: string;
  category: PatternCategory;
  scope: PatternScope;
  tags: string[];
  language: string;
  framework: string;
  min_version: string;
  detection_rules: object[];
  transformation_rules: object[];
  example_before: string;
  example_after: string;
  estimated_effort: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  requires_review: boolean;
  automated: boolean;
}

export type MarketplaceView = 'browse' | 'my-patterns' | 'favorites' | 'collections' | 'create' | 'detail';

// ============================================================================
// SLICE STATE INTERFACES
// ============================================================================

export interface ViewSlice {
  currentView: MarketplaceView;
  selectedPatternId: string | null;
  isModalOpen: boolean;

  setCurrentView: (view: MarketplaceView) => void;
  setSelectedPattern: (patternId: string | null) => void;
  openModal: () => void;
  closeModal: () => void;
}

export interface DataSlice {
  patterns: DbRefactoringPatternWithAuthor[];
  featuredPatterns: DbRefactoringPatternWithAuthor[];
  myPatterns: DbRefactoringPatternWithAuthor[];
  favoritePatterns: DbRefactoringPatternWithAuthor[];
  currentUser: DbMarketplaceUser | null;
  userBadges: DbUserBadgeWithDetails[];
  isLoadingPatterns: boolean;
  isLoadingUser: boolean;

  fetchPatterns: () => Promise<void>;
  fetchFeaturedPatterns: () => Promise<void>;
  fetchMyPatterns: () => Promise<void>;
  fetchFavoritePatterns: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchUserBadges: () => Promise<void>;
}

export interface FiltersSlice {
  filters: MarketplaceFilters;
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;

  setFilter: (key: keyof MarketplaceFilters, value: string | PatternCategory | PatternScope | 'all' | null) => void;
  resetFilters: () => void;
  loadMore: () => Promise<void>;
}

export interface FormSlice {
  formData: Partial<PatternFormData>;
  formErrors: Record<string, string>;
  isPublishing: boolean;

  setFormData: (data: Partial<PatternFormData>) => void;
  clearFormData: () => void;
  validateForm: () => boolean;
}

export interface PatternActionsSlice {
  createPattern: (data: PatternFormData) => Promise<DbRefactoringPatternWithAuthor | null>;
  updatePattern: (id: string, data: Partial<PatternFormData>) => Promise<DbRefactoringPatternWithAuthor | null>;
  publishPattern: (id: string) => Promise<boolean>;
  deletePattern: (id: string) => Promise<boolean>;
  ratePattern: (patternId: string, rating: number, review?: string) => Promise<boolean>;
}

export interface FavoritesSlice {
  toggleFavorite: (patternId: string) => Promise<boolean>;
  isFavorite: (patternId: string) => boolean;
}

export interface UtilitySlice {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// Combined store type
export type MarketplaceState = ViewSlice & DataSlice & FiltersSlice & FormSlice & PatternActionsSlice & FavoritesSlice & UtilitySlice;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const defaultFilters: MarketplaceFilters = {
  category: 'all',
  scope: 'all',
  language: null,
  framework: null,
  search: '',
  sortBy: 'rating',
};

export const defaultFormData: Partial<PatternFormData> = {
  name: '',
  title: '',
  description: '',
  detailed_description: '',
  problem_statement: '',
  solution_approach: '',
  category: 'cleanup',
  scope: 'file',
  tags: [],
  language: '',
  framework: '',
  min_version: '',
  detection_rules: [],
  transformation_rules: [],
  example_before: '',
  example_after: '',
  estimated_effort: 'medium',
  risk_level: 'low',
  requires_review: true,
  automated: false,
};
