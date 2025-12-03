/**
 * Developer Mind-Meld Repository
 * Handles database operations for the personalized AI learning system
 */

import { getDatabase } from '../connection';
import type {
  DbDeveloperProfile,
  DbDeveloperDecision,
  DbLearningInsight,
  DbCodePatternUsage,
  DbConsistencyRule,
  DbSkillTracking,
} from '../models/types';
import { generateId, getCurrentTimestamp, selectOne, selectAll } from './repository.utils';

/**
 * Developer Profile Repository
 */
export const developerProfileRepository = {
  /**
   * Get or create a developer profile for a project
   */
  getOrCreate: (projectId: string): DbDeveloperProfile => {
    const db = getDatabase();
    let profile = selectOne<DbDeveloperProfile>(
      db,
      'SELECT * FROM developer_profiles WHERE project_id = ?',
      projectId
    );

    if (!profile) {
      const now = getCurrentTimestamp();
      const id = generateId('profile');

      const stmt = db.prepare(`
        INSERT INTO developer_profiles (
          id, project_id, enabled, preferred_scan_types, avoided_scan_types,
          preferred_patterns, formatting_preferences, security_posture, performance_threshold,
          total_decisions, total_accepted, total_rejected, learning_confidence,
          last_profile_update, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        projectId,
        1, // enabled by default
        '[]', // empty preferred_scan_types
        '[]', // empty avoided_scan_types
        '[]', // empty preferred_patterns
        '{}', // empty formatting_preferences
        'balanced', // default security_posture
        'medium', // default performance_threshold
        0, // total_decisions
        0, // total_accepted
        0, // total_rejected
        0, // learning_confidence
        now,
        now,
        now
      );

      profile = selectOne<DbDeveloperProfile>(db, 'SELECT * FROM developer_profiles WHERE id = ?', id)!;
    }

    return profile;
  },

  /**
   * Get profile by ID
   */
  getById: (id: string): DbDeveloperProfile | null => {
    const db = getDatabase();
    return selectOne<DbDeveloperProfile>(db, 'SELECT * FROM developer_profiles WHERE id = ?', id);
  },

  /**
   * Get profile by project
   */
  getByProject: (projectId: string): DbDeveloperProfile | null => {
    const db = getDatabase();
    return selectOne<DbDeveloperProfile>(
      db,
      'SELECT * FROM developer_profiles WHERE project_id = ?',
      projectId
    );
  },

  /**
   * Update profile
   */
  update: (id: string, updates: Partial<{
    enabled: boolean;
    preferred_scan_types: string[];
    avoided_scan_types: string[];
    preferred_patterns: string[];
    formatting_preferences: Record<string, unknown>;
    security_posture: 'strict' | 'balanced' | 'relaxed';
    performance_threshold: 'high' | 'medium' | 'low';
  }>): DbDeveloperProfile | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?', 'last_profile_update = ?'];
    const values: (string | number)[] = [now, now];

    if (updates.enabled !== undefined) {
      updateFields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }
    if (updates.preferred_scan_types !== undefined) {
      updateFields.push('preferred_scan_types = ?');
      values.push(JSON.stringify(updates.preferred_scan_types));
    }
    if (updates.avoided_scan_types !== undefined) {
      updateFields.push('avoided_scan_types = ?');
      values.push(JSON.stringify(updates.avoided_scan_types));
    }
    if (updates.preferred_patterns !== undefined) {
      updateFields.push('preferred_patterns = ?');
      values.push(JSON.stringify(updates.preferred_patterns));
    }
    if (updates.formatting_preferences !== undefined) {
      updateFields.push('formatting_preferences = ?');
      values.push(JSON.stringify(updates.formatting_preferences));
    }
    if (updates.security_posture !== undefined) {
      updateFields.push('security_posture = ?');
      values.push(updates.security_posture);
    }
    if (updates.performance_threshold !== undefined) {
      updateFields.push('performance_threshold = ?');
      values.push(updates.performance_threshold);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE developer_profiles SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbDeveloperProfile>(db, 'SELECT * FROM developer_profiles WHERE id = ?', id);
  },

  /**
   * Update learning stats
   */
  updateLearningStats: (id: string, accepted: boolean): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE developer_profiles
      SET total_decisions = total_decisions + 1,
          total_accepted = total_accepted + ?,
          total_rejected = total_rejected + ?,
          learning_confidence = MIN(100, (total_decisions + 1) / 2),
          last_profile_update = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      accepted ? 1 : 0,
      accepted ? 0 : 1,
      now,
      now,
      id
    );
  },

  /**
   * Toggle profile enabled state
   */
  toggleEnabled: (id: string): DbDeveloperProfile | null => {
    const db = getDatabase();
    const profile = selectOne<DbDeveloperProfile>(db, 'SELECT * FROM developer_profiles WHERE id = ?', id);
    if (!profile) return null;

    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE developer_profiles SET enabled = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(profile.enabled ? 0 : 1, now, id);

    return selectOne<DbDeveloperProfile>(db, 'SELECT * FROM developer_profiles WHERE id = ?', id);
  },
};

/**
 * Developer Decision Repository
 */
export const developerDecisionRepository = {
  /**
   * Record a new decision
   */
  create: (decision: {
    profile_id: string;
    project_id: string;
    decision_type: DbDeveloperDecision['decision_type'];
    entity_id: string;
    entity_type: string;
    scan_type?: string | null;
    category?: string | null;
    effort?: number | null;
    impact?: number | null;
    accepted: boolean;
    feedback?: string | null;
    context_snapshot?: Record<string, unknown> | null;
  }): DbDeveloperDecision => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('decision');

    const stmt = db.prepare(`
      INSERT INTO developer_decisions (
        id, profile_id, project_id, decision_type, entity_id, entity_type,
        scan_type, category, effort, impact, accepted, feedback,
        context_snapshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      decision.profile_id,
      decision.project_id,
      decision.decision_type,
      decision.entity_id,
      decision.entity_type,
      decision.scan_type ?? null,
      decision.category ?? null,
      decision.effort ?? null,
      decision.impact ?? null,
      decision.accepted ? 1 : 0,
      decision.feedback ?? null,
      decision.context_snapshot ? JSON.stringify(decision.context_snapshot) : null,
      now
    );

    return selectOne<DbDeveloperDecision>(db, 'SELECT * FROM developer_decisions WHERE id = ?', id)!;
  },

  /**
   * Get decisions by profile
   */
  getByProfile: (profileId: string, limit?: number): DbDeveloperDecision[] => {
    const db = getDatabase();
    const query = limit
      ? 'SELECT * FROM developer_decisions WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM developer_decisions WHERE profile_id = ? ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    return (limit ? stmt.all(profileId, limit) : stmt.all(profileId)) as DbDeveloperDecision[];
  },

  /**
   * Get decisions by scan type for pattern analysis
   */
  getByScanType: (profileId: string, scanType: string): DbDeveloperDecision[] => {
    const db = getDatabase();
    return selectAll<DbDeveloperDecision>(
      db,
      'SELECT * FROM developer_decisions WHERE profile_id = ? AND scan_type = ? ORDER BY created_at DESC',
      profileId,
      scanType
    );
  },

  /**
   * Get decisions by category
   */
  getByCategory: (profileId: string, category: string): DbDeveloperDecision[] => {
    const db = getDatabase();
    return selectAll<DbDeveloperDecision>(
      db,
      'SELECT * FROM developer_decisions WHERE profile_id = ? AND category = ? ORDER BY created_at DESC',
      profileId,
      category
    );
  },

  /**
   * Get acceptance rate by scan type
   */
  getAcceptanceRateByScanType: (profileId: string): Array<{ scan_type: string; acceptance_rate: number; count: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        scan_type,
        ROUND(AVG(accepted) * 100, 2) as acceptance_rate,
        COUNT(*) as count
      FROM developer_decisions
      WHERE profile_id = ? AND scan_type IS NOT NULL
      GROUP BY scan_type
      ORDER BY count DESC
    `);
    return stmt.all(profileId) as Array<{ scan_type: string; acceptance_rate: number; count: number }>;
  },

  /**
   * Get acceptance rate by category
   */
  getAcceptanceRateByCategory: (profileId: string): Array<{ category: string; acceptance_rate: number; count: number }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        category,
        ROUND(AVG(accepted) * 100, 2) as acceptance_rate,
        COUNT(*) as count
      FROM developer_decisions
      WHERE profile_id = ? AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);
    return stmt.all(profileId) as Array<{ category: string; acceptance_rate: number; count: number }>;
  },

  /**
   * Get recent decision patterns
   */
  getRecentPatterns: (profileId: string, days: number = 30): {
    totalDecisions: number;
    acceptanceRate: number;
    topAcceptedCategories: string[];
    topRejectedCategories: string[];
  } => {
    const db = getDatabase();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const statsStmt = db.prepare(`
      SELECT
        COUNT(*) as total,
        ROUND(AVG(accepted) * 100, 2) as rate
      FROM developer_decisions
      WHERE profile_id = ? AND created_at >= ?
    `);
    const stats = statsStmt.get(profileId, cutoffDate) as { total: number; rate: number } | undefined;

    const acceptedStmt = db.prepare(`
      SELECT category, COUNT(*) as cnt
      FROM developer_decisions
      WHERE profile_id = ? AND created_at >= ? AND accepted = 1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY cnt DESC
      LIMIT 5
    `);
    const acceptedCats = acceptedStmt.all(profileId, cutoffDate) as Array<{ category: string; cnt: number }>;

    const rejectedStmt = db.prepare(`
      SELECT category, COUNT(*) as cnt
      FROM developer_decisions
      WHERE profile_id = ? AND created_at >= ? AND accepted = 0 AND category IS NOT NULL
      GROUP BY category
      ORDER BY cnt DESC
      LIMIT 5
    `);
    const rejectedCats = rejectedStmt.all(profileId, cutoffDate) as Array<{ category: string; cnt: number }>;

    return {
      totalDecisions: stats?.total ?? 0,
      acceptanceRate: stats?.rate ?? 0,
      topAcceptedCategories: acceptedCats.map(c => c.category),
      topRejectedCategories: rejectedCats.map(c => c.category),
    };
  },
};

/**
 * Learning Insight Repository
 */
export const learningInsightRepository = {
  /**
   * Create a new insight
   */
  create: (insight: {
    profile_id: string;
    project_id: string;
    insight_type: DbLearningInsight['insight_type'];
    title: string;
    description: string;
    data: Record<string, unknown>;
    confidence: number;
    importance: 'high' | 'medium' | 'low';
    related_entity_type?: string | null;
    related_entity_id?: string | null;
  }): DbLearningInsight => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('insight');

    const stmt = db.prepare(`
      INSERT INTO learning_insights (
        id, profile_id, project_id, insight_type, title, description,
        data, confidence, importance, status, related_entity_type,
        related_entity_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      insight.profile_id,
      insight.project_id,
      insight.insight_type,
      insight.title,
      insight.description,
      JSON.stringify(insight.data),
      insight.confidence,
      insight.importance,
      'active',
      insight.related_entity_type ?? null,
      insight.related_entity_id ?? null,
      now,
      now
    );

    return selectOne<DbLearningInsight>(db, 'SELECT * FROM learning_insights WHERE id = ?', id)!;
  },

  /**
   * Get active insights for a profile
   */
  getActiveByProfile: (profileId: string): DbLearningInsight[] => {
    const db = getDatabase();
    return selectAll<DbLearningInsight>(
      db,
      'SELECT * FROM learning_insights WHERE profile_id = ? AND status = ? ORDER BY importance DESC, confidence DESC',
      profileId,
      'active'
    );
  },

  /**
   * Get insights by type
   */
  getByType: (profileId: string, insightType: DbLearningInsight['insight_type']): DbLearningInsight[] => {
    const db = getDatabase();
    return selectAll<DbLearningInsight>(
      db,
      'SELECT * FROM learning_insights WHERE profile_id = ? AND insight_type = ? ORDER BY created_at DESC',
      profileId,
      insightType
    );
  },

  /**
   * Update insight status
   */
  updateStatus: (id: string, status: DbLearningInsight['status']): DbLearningInsight | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare('UPDATE learning_insights SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, now, id);

    return selectOne<DbLearningInsight>(db, 'SELECT * FROM learning_insights WHERE id = ?', id);
  },

  /**
   * Dismiss insight
   */
  dismiss: (id: string): DbLearningInsight | null => {
    return learningInsightRepository.updateStatus(id, 'dismissed');
  },

  /**
   * Acknowledge insight
   */
  acknowledge: (id: string): DbLearningInsight | null => {
    return learningInsightRepository.updateStatus(id, 'acknowledged');
  },

  /**
   * Get high importance insights
   */
  getHighImportance: (profileId: string): DbLearningInsight[] => {
    const db = getDatabase();
    return selectAll<DbLearningInsight>(
      db,
      'SELECT * FROM learning_insights WHERE profile_id = ? AND importance = ? AND status = ? ORDER BY confidence DESC',
      profileId,
      'high',
      'active'
    );
  },
};

/**
 * Code Pattern Usage Repository
 */
export const codePatternUsageRepository = {
  /**
   * Record or update pattern usage
   */
  recordUsage: (usage: {
    profile_id: string;
    project_id: string;
    pattern_name: string;
    pattern_signature: string;
    file_path: string;
    category: string;
  }): DbCodePatternUsage => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Check if pattern already exists
    let existing = selectOne<DbCodePatternUsage>(
      db,
      'SELECT * FROM code_pattern_usage WHERE profile_id = ? AND pattern_signature = ?',
      usage.profile_id,
      usage.pattern_signature
    );

    if (existing) {
      // Update existing pattern
      const filePaths = JSON.parse(existing.file_paths) as string[];
      if (!filePaths.includes(usage.file_path)) {
        filePaths.push(usage.file_path);
      }

      const stmt = db.prepare(`
        UPDATE code_pattern_usage
        SET usage_count = usage_count + 1,
            last_used_at = ?,
            file_paths = ?,
            updated_at = ?
        WHERE id = ?
      `);
      stmt.run(now, JSON.stringify(filePaths), now, existing.id);

      return selectOne<DbCodePatternUsage>(db, 'SELECT * FROM code_pattern_usage WHERE id = ?', existing.id)!;
    } else {
      // Create new pattern
      const id = generateId('pattern');
      const stmt = db.prepare(`
        INSERT INTO code_pattern_usage (
          id, profile_id, project_id, pattern_name, pattern_signature,
          usage_count, last_used_at, first_used_at, file_paths, category,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        usage.profile_id,
        usage.project_id,
        usage.pattern_name,
        usage.pattern_signature,
        1,
        now,
        now,
        JSON.stringify([usage.file_path]),
        usage.category,
        now,
        now
      );

      return selectOne<DbCodePatternUsage>(db, 'SELECT * FROM code_pattern_usage WHERE id = ?', id)!;
    }
  },

  /**
   * Get most used patterns
   */
  getMostUsed: (profileId: string, limit: number = 10): DbCodePatternUsage[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM code_pattern_usage
      WHERE profile_id = ?
      ORDER BY usage_count DESC
      LIMIT ?
    `);
    return stmt.all(profileId, limit) as DbCodePatternUsage[];
  },

  /**
   * Get patterns by category
   */
  getByCategory: (profileId: string, category: string): DbCodePatternUsage[] => {
    const db = getDatabase();
    return selectAll<DbCodePatternUsage>(
      db,
      'SELECT * FROM code_pattern_usage WHERE profile_id = ? AND category = ? ORDER BY usage_count DESC',
      profileId,
      category
    );
  },

  /**
   * Find similar patterns (for consistency checking)
   */
  findSimilarPatterns: (profileId: string, patternName: string): DbCodePatternUsage[] => {
    const db = getDatabase();
    return selectAll<DbCodePatternUsage>(
      db,
      'SELECT * FROM code_pattern_usage WHERE profile_id = ? AND pattern_name = ? ORDER BY usage_count DESC',
      profileId,
      patternName
    );
  },
};

/**
 * Consistency Rule Repository
 */
export const consistencyRuleRepository = {
  /**
   * Create a new consistency rule
   */
  create: (rule: {
    profile_id: string;
    project_id: string;
    rule_name: string;
    rule_type: DbConsistencyRule['rule_type'];
    description: string;
    pattern_template: Record<string, unknown>;
    example_code?: string | null;
    severity?: 'error' | 'warning' | 'suggestion';
    auto_suggest?: boolean;
  }): DbConsistencyRule => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const id = generateId('rule');

    const stmt = db.prepare(`
      INSERT INTO consistency_rules (
        id, profile_id, project_id, rule_name, rule_type, description,
        pattern_template, example_code, enabled, severity, auto_suggest,
        violations_detected, violations_fixed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      rule.profile_id,
      rule.project_id,
      rule.rule_name,
      rule.rule_type,
      rule.description,
      JSON.stringify(rule.pattern_template),
      rule.example_code ?? null,
      1, // enabled by default
      rule.severity ?? 'suggestion',
      (rule.auto_suggest ?? true) ? 1 : 0,
      0, // violations_detected
      0, // violations_fixed
      now,
      now
    );

    return selectOne<DbConsistencyRule>(db, 'SELECT * FROM consistency_rules WHERE id = ?', id)!;
  },

  /**
   * Get enabled rules by profile
   */
  getEnabledByProfile: (profileId: string): DbConsistencyRule[] => {
    const db = getDatabase();
    return selectAll<DbConsistencyRule>(
      db,
      'SELECT * FROM consistency_rules WHERE profile_id = ? AND enabled = 1 ORDER BY severity DESC',
      profileId
    );
  },

  /**
   * Get rules by type
   */
  getByType: (profileId: string, ruleType: DbConsistencyRule['rule_type']): DbConsistencyRule[] => {
    const db = getDatabase();
    return selectAll<DbConsistencyRule>(
      db,
      'SELECT * FROM consistency_rules WHERE profile_id = ? AND rule_type = ? ORDER BY created_at DESC',
      profileId,
      ruleType
    );
  },

  /**
   * Toggle rule enabled state
   */
  toggleEnabled: (id: string): DbConsistencyRule | null => {
    const db = getDatabase();
    const rule = selectOne<DbConsistencyRule>(db, 'SELECT * FROM consistency_rules WHERE id = ?', id);
    if (!rule) return null;

    const now = getCurrentTimestamp();
    const stmt = db.prepare('UPDATE consistency_rules SET enabled = ?, updated_at = ? WHERE id = ?');
    stmt.run(rule.enabled ? 0 : 1, now, id);

    return selectOne<DbConsistencyRule>(db, 'SELECT * FROM consistency_rules WHERE id = ?', id);
  },

  /**
   * Record violation
   */
  recordViolation: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE consistency_rules
      SET violations_detected = violations_detected + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);
  },

  /**
   * Record fix
   */
  recordFix: (id: string): void => {
    const db = getDatabase();
    const now = getCurrentTimestamp();
    const stmt = db.prepare(`
      UPDATE consistency_rules
      SET violations_fixed = violations_fixed + 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(now, id);
  },

  /**
   * Update rule
   */
  update: (id: string, updates: Partial<{
    rule_name: string;
    description: string;
    pattern_template: Record<string, unknown>;
    example_code: string | null;
    severity: 'error' | 'warning' | 'suggestion';
    auto_suggest: boolean;
  }>): DbConsistencyRule | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const updateFields: string[] = ['updated_at = ?'];
    const values: (string | number)[] = [now];

    if (updates.rule_name !== undefined) {
      updateFields.push('rule_name = ?');
      values.push(updates.rule_name);
    }
    if (updates.description !== undefined) {
      updateFields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.pattern_template !== undefined) {
      updateFields.push('pattern_template = ?');
      values.push(JSON.stringify(updates.pattern_template));
    }
    if (updates.example_code !== undefined) {
      updateFields.push('example_code = ?');
      values.push(updates.example_code ?? '');
    }
    if (updates.severity !== undefined) {
      updateFields.push('severity = ?');
      values.push(updates.severity);
    }
    if (updates.auto_suggest !== undefined) {
      updateFields.push('auto_suggest = ?');
      values.push(updates.auto_suggest ? 1 : 0);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE consistency_rules SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return selectOne<DbConsistencyRule>(db, 'SELECT * FROM consistency_rules WHERE id = ?', id);
  },

  /**
   * Delete rule
   */
  delete: (id: string): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM consistency_rules WHERE id = ?');
    stmt.run(id);
  },
};

/**
 * Skill Tracking Repository
 */
export const skillTrackingRepository = {
  /**
   * Get or create skill tracking record
   */
  getOrCreate: (data: {
    profile_id: string;
    project_id: string;
    skill_area: string;
    sub_skill?: string | null;
  }): DbSkillTracking => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    let skill = data.sub_skill
      ? selectOne<DbSkillTracking>(
          db,
          'SELECT * FROM skill_tracking WHERE profile_id = ? AND skill_area = ? AND sub_skill = ?',
          data.profile_id,
          data.skill_area,
          data.sub_skill
        )
      : selectOne<DbSkillTracking>(
          db,
          'SELECT * FROM skill_tracking WHERE profile_id = ? AND skill_area = ? AND sub_skill IS NULL',
          data.profile_id,
          data.skill_area
        );

    if (!skill) {
      const id = generateId('skill');
      const stmt = db.prepare(`
        INSERT INTO skill_tracking (
          id, profile_id, project_id, skill_area, sub_skill,
          proficiency_score, implementations_count, success_count, failure_count,
          trend, last_activity_at, improvement_suggestions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        data.profile_id,
        data.project_id,
        data.skill_area,
        data.sub_skill ?? null,
        0, // proficiency_score
        0, // implementations_count
        0, // success_count
        0, // failure_count
        'stable',
        now,
        null,
        now,
        now
      );

      skill = selectOne<DbSkillTracking>(db, 'SELECT * FROM skill_tracking WHERE id = ?', id)!;
    }

    return skill;
  },

  /**
   * Record skill activity
   */
  recordActivity: (id: string, success: boolean): DbSkillTracking | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    // Get current state
    const current = selectOne<DbSkillTracking>(db, 'SELECT * FROM skill_tracking WHERE id = ?', id);
    if (!current) return null;

    // Calculate new values
    const newSuccessCount = current.success_count + (success ? 1 : 0);
    const newFailureCount = current.failure_count + (success ? 0 : 1);
    const newImplCount = current.implementations_count + 1;
    const newProficiency = Math.round((newSuccessCount / newImplCount) * 100);

    // Determine trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    const prevProficiency = current.proficiency_score;
    if (newImplCount >= 5) {
      if (newProficiency > prevProficiency + 5) trend = 'improving';
      else if (newProficiency < prevProficiency - 5) trend = 'declining';
    }

    const stmt = db.prepare(`
      UPDATE skill_tracking
      SET implementations_count = ?,
          success_count = ?,
          failure_count = ?,
          proficiency_score = ?,
          trend = ?,
          last_activity_at = ?,
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(newImplCount, newSuccessCount, newFailureCount, newProficiency, trend, now, now, id);

    return selectOne<DbSkillTracking>(db, 'SELECT * FROM skill_tracking WHERE id = ?', id);
  },

  /**
   * Get all skills for a profile
   */
  getByProfile: (profileId: string): DbSkillTracking[] => {
    const db = getDatabase();
    return selectAll<DbSkillTracking>(
      db,
      'SELECT * FROM skill_tracking WHERE profile_id = ? ORDER BY proficiency_score DESC',
      profileId
    );
  },

  /**
   * Get skills needing improvement
   */
  getNeedingImprovement: (profileId: string, threshold: number = 50): DbSkillTracking[] => {
    const db = getDatabase();
    return selectAll<DbSkillTracking>(
      db,
      `SELECT * FROM skill_tracking
       WHERE profile_id = ? AND proficiency_score < ? AND implementations_count >= 3
       ORDER BY proficiency_score ASC`,
      profileId,
      threshold
    );
  },

  /**
   * Get declining skills
   */
  getDeclining: (profileId: string): DbSkillTracking[] => {
    const db = getDatabase();
    return selectAll<DbSkillTracking>(
      db,
      "SELECT * FROM skill_tracking WHERE profile_id = ? AND trend = 'declining' ORDER BY proficiency_score ASC",
      profileId
    );
  },

  /**
   * Update improvement suggestions
   */
  updateSuggestions: (id: string, suggestions: string[]): DbSkillTracking | null => {
    const db = getDatabase();
    const now = getCurrentTimestamp();

    const stmt = db.prepare(`
      UPDATE skill_tracking SET improvement_suggestions = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(JSON.stringify(suggestions), now, id);

    return selectOne<DbSkillTracking>(db, 'SELECT * FROM skill_tracking WHERE id = ?', id);
  },
};
