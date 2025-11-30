import { getDatabase } from '../connection';
import {
  DbMarketplaceUser,
  DbRefactoringPattern,
  DbRefactoringPatternWithAuthor,
  DbPatternVersion,
  DbPatternRating,
  DbPatternRatingWithUser,
  DbPatternApplication,
  DbBadge,
  DbUserBadge,
  DbUserBadgeWithDetails,
  DbPatternFavorite,
  DbPatternCollection,
  DbCollectionPattern,
  PatternCategory,
  PatternScope,
  PatternStatus,
} from '../models/marketplace.types';
import { getCurrentTimestamp, generateId } from './repository.utils';

// =============================================================================
// MARKETPLACE USER REPOSITORY
// =============================================================================

export const marketplaceUserRepository = {
  /**
   * Get user by ID
   */
  getById: (id: string): DbMarketplaceUser | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM marketplace_users WHERE id = ?');
    return (stmt.get(id) as DbMarketplaceUser) || null;
  },

  /**
   * Get user by username
   */
  getByUsername: (username: string): DbMarketplaceUser | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM marketplace_users WHERE username = ?');
    return (stmt.get(username) as DbMarketplaceUser) || null;
  },

  /**
   * Get or create a local user (for localhost mode)
   */
  getOrCreateLocalUser: (): DbMarketplaceUser => {
    const db = getDatabase();
    const localUsername = 'local_user';

    let user = marketplaceUserRepository.getByUsername(localUsername);
    if (!user) {
      const now = getCurrentTimestamp();
      const id = generateId('mp_user');

      const stmt = db.prepare(`
        INSERT INTO marketplace_users (id, username, display_name, joined_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, localUsername, 'Local Developer', now, now);
      user = marketplaceUserRepository.getById(id)!;
    }

    return user;
  },

  /**
   * Create a new user
   */
  create: (user: {
    username: string;
    display_name: string;
    email?: string;
    avatar_url?: string;
    bio?: string;
  }): DbMarketplaceUser => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('mp_user');

    const stmt = db.prepare(`
      INSERT INTO marketplace_users (
        id, username, display_name, email, avatar_url, bio,
        reputation_score, total_patterns, total_downloads, total_likes,
        joined_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `);

    stmt.run(
      id,
      user.username,
      user.display_name,
      user.email || null,
      user.avatar_url || null,
      user.bio || null,
      now,
      now
    );

    return marketplaceUserRepository.getById(id)!;
  },

  /**
   * Update user profile
   */
  update: (id: string, updates: Partial<{
    display_name: string;
    email: string;
    avatar_url: string;
    bio: string;
  }>): DbMarketplaceUser | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.display_name);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email || null);
    }
    if (updates.avatar_url !== undefined) {
      fields.push('avatar_url = ?');
      values.push(updates.avatar_url || null);
    }
    if (updates.bio !== undefined) {
      fields.push('bio = ?');
      values.push(updates.bio || null);
    }

    if (fields.length === 0) return marketplaceUserRepository.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE marketplace_users SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return marketplaceUserRepository.getById(id);
  },

  /**
   * Update user statistics
   */
  updateStats: (id: string, stats: {
    reputation_score?: number;
    total_patterns?: number;
    total_downloads?: number;
    total_likes?: number;
  }): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (stats.reputation_score !== undefined) {
      fields.push('reputation_score = ?');
      values.push(stats.reputation_score);
    }
    if (stats.total_patterns !== undefined) {
      fields.push('total_patterns = ?');
      values.push(stats.total_patterns);
    }
    if (stats.total_downloads !== undefined) {
      fields.push('total_downloads = ?');
      values.push(stats.total_downloads);
    }
    if (stats.total_likes !== undefined) {
      fields.push('total_likes = ?');
      values.push(stats.total_likes);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE marketplace_users SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  },

  /**
   * Get top contributors by reputation
   */
  getTopContributors: (limit: number = 10): DbMarketplaceUser[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM marketplace_users
      WHERE total_patterns > 0
      ORDER BY reputation_score DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DbMarketplaceUser[];
  },
};

// =============================================================================
// REFACTORING PATTERN REPOSITORY
// =============================================================================

export const refactoringPatternRepository = {
  /**
   * Get pattern by ID
   */
  getById: (id: string): DbRefactoringPattern | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM refactoring_patterns WHERE id = ?');
    return (stmt.get(id) as DbRefactoringPattern) || null;
  },

  /**
   * Get pattern by slug
   */
  getBySlug: (slug: string): DbRefactoringPattern | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM refactoring_patterns WHERE slug = ?');
    return (stmt.get(slug) as DbRefactoringPattern) || null;
  },

  /**
   * Get pattern with author info
   */
  getWithAuthor: (id: string): DbRefactoringPatternWithAuthor | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM refactoring_patterns p
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE p.id = ?
    `);
    return (stmt.get(id) as DbRefactoringPatternWithAuthor) || null;
  },

  /**
   * Get all published patterns with filtering and pagination
   */
  getPublished: (options: {
    category?: PatternCategory;
    scope?: PatternScope;
    language?: string;
    framework?: string;
    search?: string;
    sortBy?: 'rating' | 'downloads' | 'recent';
    limit?: number;
    offset?: number;
  } = {}): DbRefactoringPatternWithAuthor[] => {
    const db = getDatabase();
    const conditions: string[] = ["p.status IN ('published', 'featured')"];
    const values: (string | number)[] = [];

    if (options.category) {
      conditions.push('p.category = ?');
      values.push(options.category);
    }
    if (options.scope) {
      conditions.push('p.scope = ?');
      values.push(options.scope);
    }
    if (options.language) {
      conditions.push('p.language = ?');
      values.push(options.language);
    }
    if (options.framework) {
      conditions.push('p.framework = ?');
      values.push(options.framework);
    }
    if (options.search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)');
      const searchTerm = `%${options.search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    let orderBy = 'p.rating_average DESC, p.download_count DESC';
    if (options.sortBy === 'downloads') {
      orderBy = 'p.download_count DESC';
    } else if (options.sortBy === 'recent') {
      orderBy = 'p.published_at DESC';
    }

    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM refactoring_patterns p
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `);

    return stmt.all(...values, limit, offset) as DbRefactoringPatternWithAuthor[];
  },

  /**
   * Get featured patterns
   */
  getFeatured: (limit: number = 6): DbRefactoringPatternWithAuthor[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM refactoring_patterns p
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE p.status = 'featured'
      ORDER BY p.rating_average DESC
      LIMIT ?
    `);
    return stmt.all(limit) as DbRefactoringPatternWithAuthor[];
  },

  /**
   * Get patterns by author
   */
  getByAuthor: (authorId: string): DbRefactoringPattern[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM refactoring_patterns
      WHERE author_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(authorId) as DbRefactoringPattern[];
  },

  /**
   * Create a new pattern
   */
  create: (pattern: {
    author_id: string;
    name: string;
    title: string;
    description: string;
    detailed_description?: string;
    problem_statement: string;
    solution_approach: string;
    category: PatternCategory;
    scope: PatternScope;
    tags?: string[];
    language?: string;
    framework?: string;
    min_version?: string;
    detection_rules?: object[];
    transformation_rules?: object[];
    example_before?: string;
    example_after?: string;
    estimated_effort: 'low' | 'medium' | 'high';
    risk_level: 'low' | 'medium' | 'high';
    requires_review?: boolean;
    automated?: boolean;
    status?: PatternStatus;
  }): DbRefactoringPattern => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('pattern');

    // Generate slug from name
    const slug = pattern.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    const stmt = db.prepare(`
      INSERT INTO refactoring_patterns (
        id, author_id, name, slug, version, title, description,
        detailed_description, problem_statement, solution_approach,
        category, scope, tags, language, framework, min_version,
        detection_rules, transformation_rules, example_before, example_after,
        estimated_effort, risk_level, requires_review, automated,
        download_count, apply_count, rating_average, rating_count,
        status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      pattern.author_id,
      pattern.name,
      slug,
      '1.0.0',
      pattern.title,
      pattern.description,
      pattern.detailed_description || null,
      pattern.problem_statement,
      pattern.solution_approach,
      pattern.category,
      pattern.scope,
      JSON.stringify(pattern.tags || []),
      pattern.language || null,
      pattern.framework || null,
      pattern.min_version || null,
      JSON.stringify(pattern.detection_rules || []),
      JSON.stringify(pattern.transformation_rules || []),
      pattern.example_before || null,
      pattern.example_after || null,
      pattern.estimated_effort,
      pattern.risk_level,
      pattern.requires_review !== false ? 1 : 0,
      pattern.automated ? 1 : 0,
      0, // download_count
      0, // apply_count
      0.0, // rating_average
      0, // rating_count
      pattern.status || 'draft',
      now,
      now
    );

    return refactoringPatternRepository.getById(id)!;
  },

  /**
   * Update a pattern
   */
  update: (id: string, updates: Partial<{
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
    status: PatternStatus;
  }>): DbRefactoringPattern | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'tags' || key === 'detection_rules' || key === 'transformation_rules') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else if (key === 'requires_review' || key === 'automated') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value as string | number | null);
        }
      }
    });

    if (fields.length === 0) return refactoringPatternRepository.getById(id);

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE refactoring_patterns SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return refactoringPatternRepository.getById(id);
  },

  /**
   * Publish a pattern
   */
  publish: (id: string): DbRefactoringPattern | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE refactoring_patterns
      SET status = 'published', published_at = ?, updated_at = ?
      WHERE id = ? AND status = 'draft'
    `);
    stmt.run(now, now, id);

    // Update author's pattern count
    const pattern = refactoringPatternRepository.getById(id);
    if (pattern) {
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count FROM refactoring_patterns
        WHERE author_id = ? AND status IN ('published', 'featured')
      `);
      const result = countStmt.get(pattern.author_id) as { count: number };
      marketplaceUserRepository.updateStats(pattern.author_id, {
        total_patterns: result.count,
      });
    }

    return pattern;
  },

  /**
   * Increment download count
   */
  incrementDownloads: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE refactoring_patterns
      SET download_count = download_count + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(getCurrentTimestamp(), id);
  },

  /**
   * Increment apply count
   */
  incrementApplyCount: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE refactoring_patterns
      SET apply_count = apply_count + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(getCurrentTimestamp(), id);
  },

  /**
   * Update rating average
   */
  updateRatingStats: (id: string): void => {
    const db = getDatabase();

    const statsStmt = db.prepare(`
      SELECT AVG(rating) as average, COUNT(*) as count
      FROM pattern_ratings
      WHERE pattern_id = ?
    `);
    const stats = statsStmt.get(id) as { average: number | null; count: number };

    const updateStmt = db.prepare(`
      UPDATE refactoring_patterns
      SET rating_average = ?, rating_count = ?, updated_at = ?
      WHERE id = ?
    `);
    updateStmt.run(stats.average || 0, stats.count, getCurrentTimestamp(), id);
  },

  /**
   * Delete a pattern
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM refactoring_patterns WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get patterns compatible with the current project
   */
  getCompatiblePatterns: (options: {
    language?: string;
    framework?: string;
    categories?: PatternCategory[];
    limit?: number;
  }): DbRefactoringPatternWithAuthor[] => {
    const db = getDatabase();
    const conditions: string[] = ["p.status IN ('published', 'featured')"];
    const values: (string | number)[] = [];

    if (options.language) {
      conditions.push('(p.language IS NULL OR p.language = ?)');
      values.push(options.language);
    }
    if (options.framework) {
      conditions.push('(p.framework IS NULL OR p.framework = ?)');
      values.push(options.framework);
    }
    if (options.categories && options.categories.length > 0) {
      const placeholders = options.categories.map(() => '?').join(', ');
      conditions.push(`p.category IN (${placeholders})`);
      values.push(...options.categories);
    }

    const limit = options.limit || 10;

    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM refactoring_patterns p
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.rating_average DESC, p.download_count DESC
      LIMIT ?
    `);

    return stmt.all(...values, limit) as DbRefactoringPatternWithAuthor[];
  },
};

// =============================================================================
// PATTERN RATING REPOSITORY
// =============================================================================

export const patternRatingRepository = {
  /**
   * Get rating by ID
   */
  getById: (id: string): DbPatternRating | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM pattern_ratings WHERE id = ?');
    return (stmt.get(id) as DbPatternRating) || null;
  },

  /**
   * Get user's rating for a pattern
   */
  getUserRating: (patternId: string, userId: string): DbPatternRating | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pattern_ratings
      WHERE pattern_id = ? AND user_id = ?
    `);
    return (stmt.get(patternId, userId) as DbPatternRating) || null;
  },

  /**
   * Get all ratings for a pattern
   */
  getForPattern: (patternId: string): DbPatternRatingWithUser[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        r.*,
        u.username as user_username,
        u.display_name as user_display_name,
        u.avatar_url as user_avatar_url
      FROM pattern_ratings r
      LEFT JOIN marketplace_users u ON r.user_id = u.id
      WHERE r.pattern_id = ?
      ORDER BY r.created_at DESC
    `);
    return stmt.all(patternId) as DbPatternRatingWithUser[];
  },

  /**
   * Create or update a rating
   */
  upsert: (rating: {
    pattern_id: string;
    user_id: string;
    rating: number;
    review?: string;
  }): DbPatternRating => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const existing = patternRatingRepository.getUserRating(rating.pattern_id, rating.user_id);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE pattern_ratings
        SET rating = ?, review = ?, updated_at = ?
        WHERE id = ?
      `);
      stmt.run(rating.rating, rating.review || null, now, existing.id);

      // Update pattern rating stats
      refactoringPatternRepository.updateRatingStats(rating.pattern_id);

      return patternRatingRepository.getById(existing.id)!;
    } else {
      const id = generateId('rating');
      const stmt = db.prepare(`
        INSERT INTO pattern_ratings (id, pattern_id, user_id, rating, review, helpful_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `);
      stmt.run(id, rating.pattern_id, rating.user_id, rating.rating, rating.review || null, now, now);

      // Update pattern rating stats
      refactoringPatternRepository.updateRatingStats(rating.pattern_id);

      return patternRatingRepository.getById(id)!;
    }
  },

  /**
   * Mark a review as helpful
   */
  markHelpful: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE pattern_ratings
      SET helpful_count = helpful_count + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(getCurrentTimestamp(), id);
  },

  /**
   * Delete a rating
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const rating = patternRatingRepository.getById(id);
    if (!rating) return false;

    const stmt = db.prepare('DELETE FROM pattern_ratings WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      refactoringPatternRepository.updateRatingStats(rating.pattern_id);
    }

    return result.changes > 0;
  },
};

// =============================================================================
// PATTERN APPLICATION REPOSITORY
// =============================================================================

export const patternApplicationRepository = {
  /**
   * Record a pattern application
   */
  record: (application: {
    pattern_id: string;
    user_id: string;
    project_id: string;
    files_modified: number;
    lines_added: number;
    lines_removed: number;
    success: boolean;
    outcome_notes?: string;
  }): DbPatternApplication => {
    const db = getDatabase();
    const id = generateId('app');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO pattern_applications (
        id, pattern_id, user_id, project_id,
        files_modified, lines_added, lines_removed,
        success, outcome_notes, applied_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      application.pattern_id,
      application.user_id,
      application.project_id,
      application.files_modified,
      application.lines_added,
      application.lines_removed,
      application.success ? 1 : 0,
      application.outcome_notes || null,
      now
    );

    // Update pattern apply count
    refactoringPatternRepository.incrementApplyCount(application.pattern_id);

    // Update success rate
    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
      FROM pattern_applications
      WHERE pattern_id = ?
    `);
    const stats = statsStmt.get(application.pattern_id) as { total: number; successful: number };

    const updateStmt = db.prepare(`
      UPDATE refactoring_patterns
      SET success_rate = ?, updated_at = ?
      WHERE id = ?
    `);
    const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : null;
    updateStmt.run(successRate, now, application.pattern_id);

    const getStmt = db.prepare('SELECT * FROM pattern_applications WHERE id = ?');
    return getStmt.get(id) as DbPatternApplication;
  },

  /**
   * Get applications for a pattern
   */
  getForPattern: (patternId: string): DbPatternApplication[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pattern_applications
      WHERE pattern_id = ?
      ORDER BY applied_at DESC
    `);
    return stmt.all(patternId) as DbPatternApplication[];
  },

  /**
   * Get user's application history
   */
  getUserHistory: (userId: string, limit: number = 20): DbPatternApplication[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pattern_applications
      WHERE user_id = ?
      ORDER BY applied_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit) as DbPatternApplication[];
  },
};

// =============================================================================
// BADGE REPOSITORY
// =============================================================================

export const badgeRepository = {
  /**
   * Get all badges
   */
  getAll: (): DbBadge[] => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM badges ORDER BY type, threshold');
    return stmt.all() as DbBadge[];
  },

  /**
   * Get badge by ID
   */
  getById: (id: string): DbBadge | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM badges WHERE id = ?');
    return (stmt.get(id) as DbBadge) || null;
  },

  /**
   * Get user's badges
   */
  getUserBadges: (userId: string): DbUserBadgeWithDetails[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        ub.*,
        b.type as badge_type,
        b.name as badge_name,
        b.description as badge_description,
        b.icon as badge_icon,
        b.color as badge_color
      FROM user_badges ub
      LEFT JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `);
    return stmt.all(userId) as DbUserBadgeWithDetails[];
  },

  /**
   * Award badge to user
   */
  awardBadge: (userId: string, badgeId: string): DbUserBadge | null => {
    const db = getDatabase();

    // Check if user already has this badge
    const existingStmt = db.prepare(`
      SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?
    `);
    const existing = existingStmt.get(userId, badgeId);
    if (existing) return null;

    const id = generateId('ub');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO user_badges (id, user_id, badge_id, earned_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, userId, badgeId, now);

    const getStmt = db.prepare('SELECT * FROM user_badges WHERE id = ?');
    return getStmt.get(id) as DbUserBadge;
  },

  /**
   * Check and award eligible badges for a user
   */
  checkAndAwardBadges: (userId: string): DbUserBadge[] => {
    const db = getDatabase();
    const awarded: DbUserBadge[] = [];
    const user = marketplaceUserRepository.getById(userId);
    if (!user) return awarded;

    // Get all badges
    const badges = badgeRepository.getAll();
    const userBadges = badgeRepository.getUserBadges(userId);
    const earnedBadgeIds = new Set(userBadges.map(b => b.badge_id));

    // Check contributor badges
    for (const badge of badges.filter(b => b.type === 'contributor')) {
      if (!earnedBadgeIds.has(badge.id) && user.total_patterns >= badge.threshold) {
        const userBadge = badgeRepository.awardBadge(userId, badge.id);
        if (userBadge) awarded.push(userBadge);
      }
    }

    // Check popular badges
    for (const badge of badges.filter(b => b.type === 'popular')) {
      if (!earnedBadgeIds.has(badge.id) && user.total_downloads >= badge.threshold) {
        const userBadge = badgeRepository.awardBadge(userId, badge.id);
        if (userBadge) awarded.push(userBadge);
      }
    }

    // Check quality badge (average rating > 4.5)
    const qualityBadge = badges.find(b => b.type === 'quality');
    if (qualityBadge && !earnedBadgeIds.has(qualityBadge.id)) {
      const avgStmt = db.prepare(`
        SELECT AVG(rating_average) as avg_rating
        FROM refactoring_patterns
        WHERE author_id = ? AND rating_count >= 3
      `);
      const result = avgStmt.get(userId) as { avg_rating: number | null };
      if (result.avg_rating && result.avg_rating >= 4.5) {
        const userBadge = badgeRepository.awardBadge(userId, qualityBadge.id);
        if (userBadge) awarded.push(userBadge);
      }
    }

    // Update reputation score
    const newReputationScore = badgeRepository.calculateReputationScore(userId);
    marketplaceUserRepository.updateStats(userId, { reputation_score: newReputationScore });

    return awarded;
  },

  /**
   * Calculate reputation score for a user
   */
  calculateReputationScore: (userId: string): number => {
    const db = getDatabase();
    const user = marketplaceUserRepository.getById(userId);
    if (!user) return 0;

    // Base score from patterns
    let score = user.total_patterns * 100;

    // Bonus from downloads
    score += Math.floor(user.total_downloads / 10);

    // Bonus from ratings
    const ratingStmt = db.prepare(`
      SELECT SUM(rating_average * rating_count) as weighted_sum, SUM(rating_count) as total_ratings
      FROM refactoring_patterns
      WHERE author_id = ?
    `);
    const ratings = ratingStmt.get(userId) as { weighted_sum: number | null; total_ratings: number };
    if (ratings.weighted_sum && ratings.total_ratings > 0) {
      const avgRating = ratings.weighted_sum / ratings.total_ratings;
      score += Math.floor(avgRating * ratings.total_ratings * 10);
    }

    // Bonus from badges
    const badgeCount = badgeRepository.getUserBadges(userId).length;
    score += badgeCount * 50;

    return score;
  },
};

// =============================================================================
// PATTERN FAVORITES REPOSITORY
// =============================================================================

export const patternFavoriteRepository = {
  /**
   * Add pattern to favorites
   */
  add: (userId: string, patternId: string): DbPatternFavorite | null => {
    const db = getDatabase();

    // Check if already favorited
    const existingStmt = db.prepare(`
      SELECT * FROM pattern_favorites WHERE user_id = ? AND pattern_id = ?
    `);
    if (existingStmt.get(userId, patternId)) return null;

    const id = generateId('fav');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO pattern_favorites (id, user_id, pattern_id, created_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, userId, patternId, now);

    const getStmt = db.prepare('SELECT * FROM pattern_favorites WHERE id = ?');
    return getStmt.get(id) as DbPatternFavorite;
  },

  /**
   * Remove pattern from favorites
   */
  remove: (userId: string, patternId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM pattern_favorites WHERE user_id = ? AND pattern_id = ?
    `);
    const result = stmt.run(userId, patternId);
    return result.changes > 0;
  },

  /**
   * Check if pattern is favorited
   */
  isFavorite: (userId: string, patternId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 1 FROM pattern_favorites WHERE user_id = ? AND pattern_id = ?
    `);
    return !!stmt.get(userId, patternId);
  },

  /**
   * Get user's favorites
   */
  getUserFavorites: (userId: string): DbRefactoringPatternWithAuthor[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM pattern_favorites f
      LEFT JOIN refactoring_patterns p ON f.pattern_id = p.id
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `);
    return stmt.all(userId) as DbRefactoringPatternWithAuthor[];
  },
};

// =============================================================================
// PATTERN COLLECTION REPOSITORY
// =============================================================================

export const patternCollectionRepository = {
  /**
   * Create a collection
   */
  create: (collection: {
    user_id: string;
    name: string;
    description?: string;
    is_public?: boolean;
  }): DbPatternCollection => {
    const db = getDatabase();
    const id = generateId('col');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO pattern_collections (id, user_id, name, description, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      collection.user_id,
      collection.name,
      collection.description || null,
      collection.is_public ? 1 : 0,
      now,
      now
    );

    const getStmt = db.prepare('SELECT * FROM pattern_collections WHERE id = ?');
    return getStmt.get(id) as DbPatternCollection;
  },

  /**
   * Get user's collections
   */
  getUserCollections: (userId: string): DbPatternCollection[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pattern_collections
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(userId) as DbPatternCollection[];
  },

  /**
   * Add pattern to collection
   */
  addPattern: (collectionId: string, patternId: string): DbCollectionPattern | null => {
    const db = getDatabase();

    // Check if already in collection
    const existingStmt = db.prepare(`
      SELECT * FROM collection_patterns WHERE collection_id = ? AND pattern_id = ?
    `);
    if (existingStmt.get(collectionId, patternId)) return null;

    const id = generateId('cp');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO collection_patterns (id, collection_id, pattern_id, added_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, collectionId, patternId, now);

    const getStmt = db.prepare('SELECT * FROM collection_patterns WHERE id = ?');
    return getStmt.get(id) as DbCollectionPattern;
  },

  /**
   * Remove pattern from collection
   */
  removePattern: (collectionId: string, patternId: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM collection_patterns WHERE collection_id = ? AND pattern_id = ?
    `);
    const result = stmt.run(collectionId, patternId);
    return result.changes > 0;
  },

  /**
   * Get patterns in a collection
   */
  getPatterns: (collectionId: string): DbRefactoringPatternWithAuthor[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.avatar_url as author_avatar_url,
        u.reputation_score as author_reputation_score
      FROM collection_patterns cp
      LEFT JOIN refactoring_patterns p ON cp.pattern_id = p.id
      LEFT JOIN marketplace_users u ON p.author_id = u.id
      WHERE cp.collection_id = ?
      ORDER BY cp.added_at DESC
    `);
    return stmt.all(collectionId) as DbRefactoringPatternWithAuthor[];
  },

  /**
   * Delete a collection
   */
  delete: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM pattern_collections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};

// =============================================================================
// PATTERN VERSION REPOSITORY
// =============================================================================

export const patternVersionRepository = {
  /**
   * Create a new version
   */
  create: (version: {
    pattern_id: string;
    version: string;
    changelog: string;
    detection_rules: object[];
    transformation_rules: object[];
  }): DbPatternVersion => {
    const db = getDatabase();
    const id = generateId('ver');
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO pattern_versions (id, pattern_id, version, changelog, detection_rules, transformation_rules, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      version.pattern_id,
      version.version,
      version.changelog,
      JSON.stringify(version.detection_rules),
      JSON.stringify(version.transformation_rules),
      now
    );

    // Update pattern version
    const updateStmt = db.prepare(`
      UPDATE refactoring_patterns SET version = ?, updated_at = ? WHERE id = ?
    `);
    updateStmt.run(version.version, now, version.pattern_id);

    const getStmt = db.prepare('SELECT * FROM pattern_versions WHERE id = ?');
    return getStmt.get(id) as DbPatternVersion;
  },

  /**
   * Get all versions for a pattern
   */
  getForPattern: (patternId: string): DbPatternVersion[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pattern_versions
      WHERE pattern_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(patternId) as DbPatternVersion[];
  },
};
