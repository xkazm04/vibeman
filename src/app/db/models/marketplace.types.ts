/**
 * Marketplace Database Types
 * Types for the refactoring pattern marketplace system
 */

// =============================================================================
// USER PROFILE (LOCAL CONTRIBUTOR)
// =============================================================================

/**
 * Local user profile for the marketplace
 * In localhost mode, this represents the machine user's profile
 */
export interface DbMarketplaceUser {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  reputation_score: number; // Calculated from contributions
  total_patterns: number;
  total_downloads: number;
  total_likes: number;
  joined_at: string;
  updated_at: string;
}

// =============================================================================
// REFACTORING PATTERNS
// =============================================================================

/**
 * Pattern category for filtering and organization
 */
export type PatternCategory =
  | 'migration'
  | 'cleanup'
  | 'security'
  | 'performance'
  | 'architecture'
  | 'testing'
  | 'accessibility'
  | 'modernization'
  | 'best-practices';

/**
 * Pattern scope - what level of the codebase does it target
 */
export type PatternScope = 'file' | 'module' | 'project' | 'framework';

/**
 * Pattern status in the marketplace
 */
export type PatternStatus =
  | 'draft'
  | 'published'
  | 'featured'
  | 'deprecated'
  | 'archived';

/**
 * A refactoring pattern that can be shared and reused
 */
export interface DbRefactoringPattern {
  id: string;
  author_id: string;

  // Pattern identity
  name: string;
  slug: string; // URL-friendly unique identifier
  version: string; // semver e.g., "1.0.0"

  // Description and documentation
  title: string;
  description: string;
  detailed_description: string | null; // Markdown content
  problem_statement: string; // What problem does this solve
  solution_approach: string; // How does it solve it

  // Classification
  category: PatternCategory;
  scope: PatternScope;
  tags: string; // JSON array of tags

  // Technical details
  language: string | null; // "typescript", "javascript", "python", etc.
  framework: string | null; // "nextjs", "react", "express", etc.
  min_version: string | null; // Minimum framework version

  // Pattern definition
  detection_rules: string; // JSON - how to detect applicable code
  transformation_rules: string; // JSON - how to transform the code
  example_before: string | null; // Code example before refactoring
  example_after: string | null; // Code example after refactoring

  // Metadata
  estimated_effort: 'low' | 'medium' | 'high';
  risk_level: 'low' | 'medium' | 'high';
  requires_review: number; // 0 or 1 - requires manual review after application
  automated: number; // 0 or 1 - can be fully automated

  // Statistics
  download_count: number;
  apply_count: number; // How many times it was applied
  success_rate: number | null; // 0-100 percentage

  // Ratings
  rating_average: number; // 0.0 to 5.0
  rating_count: number;

  // Status
  status: PatternStatus;

  // Relationships
  parent_pattern_id: string | null; // If this is a fork/variant

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Pattern with author information (from JOIN query)
 */
export interface DbRefactoringPatternWithAuthor extends DbRefactoringPattern {
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_reputation_score: number;
}

// =============================================================================
// PATTERN VERSIONS
// =============================================================================

/**
 * Version history for patterns
 */
export interface DbPatternVersion {
  id: string;
  pattern_id: string;
  version: string;
  changelog: string;
  detection_rules: string;
  transformation_rules: string;
  created_at: string;
}

// =============================================================================
// RATINGS & REVIEWS
// =============================================================================

/**
 * User rating for a pattern
 */
export interface DbPatternRating {
  id: string;
  pattern_id: string;
  user_id: string;
  rating: number; // 1-5
  review: string | null;
  helpful_count: number; // How many found this review helpful
  created_at: string;
  updated_at: string;
}

/**
 * Rating with user information (from JOIN query)
 */
export interface DbPatternRatingWithUser extends DbPatternRating {
  user_username: string;
  user_display_name: string;
  user_avatar_url: string | null;
}

// =============================================================================
// PATTERN APPLICATIONS
// =============================================================================

/**
 * Record of when a pattern was applied to a project
 */
export interface DbPatternApplication {
  id: string;
  pattern_id: string;
  user_id: string;
  project_id: string;

  // Application details
  files_modified: number;
  lines_added: number;
  lines_removed: number;

  // Outcome
  success: number; // 0 or 1
  outcome_notes: string | null;

  // Timestamps
  applied_at: string;
}

// =============================================================================
// BADGES & ACHIEVEMENTS
// =============================================================================

/**
 * Badge definition
 */
export type BadgeType =
  | 'contributor'
  | 'pioneer'
  | 'popular'
  | 'quality'
  | 'helpful'
  | 'expert'
  | 'mentor'
  | 'innovator';

export interface DbBadge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string; // Emoji or icon class
  color: string; // Tailwind color class
  threshold: number; // Numeric threshold to earn
  created_at: string;
}

/**
 * User's earned badges
 */
export interface DbUserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

/**
 * User badge with badge details (from JOIN query)
 */
export interface DbUserBadgeWithDetails extends DbUserBadge {
  badge_type: BadgeType;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  badge_color: string;
}

// =============================================================================
// COLLECTIONS & FAVORITES
// =============================================================================

/**
 * User's favorite patterns
 */
export interface DbPatternFavorite {
  id: string;
  user_id: string;
  pattern_id: string;
  created_at: string;
}

/**
 * Named collection of patterns
 */
export interface DbPatternCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

/**
 * Patterns in a collection
 */
export interface DbCollectionPattern {
  id: string;
  collection_id: string;
  pattern_id: string;
  added_at: string;
}

// =============================================================================
// MARKETPLACE SYNC (for future community features)
// =============================================================================

/**
 * Sync status for community patterns
 * When community server is available, tracks what's been synced
 */
export interface DbMarketplaceSync {
  id: string;
  entity_type: 'pattern' | 'user' | 'rating';
  local_id: string;
  remote_id: string | null;
  sync_status: 'pending' | 'synced' | 'failed' | 'conflict';
  last_synced_at: string | null;
  created_at: string;
}

// =============================================================================
// HELPER TYPES
// =============================================================================

/**
 * Detection rule structure
 */
export interface PatternDetectionRule {
  type: 'regex' | 'ast' | 'semantic';
  pattern: string;
  filePattern?: string; // glob pattern for files to search
  minMatches?: number;
  maxMatches?: number;
}

/**
 * Transformation rule structure
 */
export interface PatternTransformationRule {
  type: 'regex-replace' | 'ast-transform' | 'template';
  search?: string;
  replace?: string;
  template?: string;
  conditions?: Record<string, string>;
}

/**
 * Complete pattern data for export/import
 */
export interface PatternExport {
  pattern: Omit<DbRefactoringPattern, 'id' | 'author_id' | 'download_count' | 'apply_count' | 'success_rate' | 'rating_average' | 'rating_count' | 'created_at' | 'updated_at' | 'published_at'>;
  versions: Array<Omit<DbPatternVersion, 'id' | 'pattern_id' | 'created_at'>>;
}
