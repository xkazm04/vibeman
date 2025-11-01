import { getDatabase } from '../connection';
import type {
  DbTechDebt,
  TechDebtCategory,
  TechDebtSeverity,
  TechDebtStatus,
  TechDebtStats
} from '../models/tech-debt.types';

/**
 * Technical Debt Repository
 * Handles all database operations for technical debt items
 */
export const techDebtRepository = {
  /**
   * Get all technical debt items for a project
   */
  getTechDebtByProject: (
    projectId: string,
    filters?: {
      status?: TechDebtStatus[];
      severity?: TechDebtSeverity[];
      category?: TechDebtCategory[];
    }
  ): DbTechDebt[] => {
    const db = getDatabase();
    let query = `SELECT * FROM tech_debt WHERE project_id = ?`;
    const params: any[] = [projectId];

    if (filters?.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => '?').join(',');
      query += ` AND status IN (${placeholders})`;
      params.push(...filters.status);
    }

    if (filters?.severity && filters.severity.length > 0) {
      const placeholders = filters.severity.map(() => '?').join(',');
      query += ` AND severity IN (${placeholders})`;
      params.push(...filters.severity);
    }

    if (filters?.category && filters.category.length > 0) {
      const placeholders = filters.category.map(() => '?').join(',');
      query += ` AND category IN (${placeholders})`;
      params.push(...filters.category);
    }

    query += ` ORDER BY risk_score DESC, created_at DESC`;

    const stmt = db.prepare(query);
    return stmt.all(...params) as DbTechDebt[];
  },

  /**
   * Get a single technical debt item by ID
   */
  getTechDebtById: (id: string): DbTechDebt | null => {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM tech_debt WHERE id = ?`);
    return (stmt.get(id) as DbTechDebt) || null;
  },

  /**
   * Create a new technical debt item
   */
  createTechDebt: (item: {
    id: string;
    project_id: string;
    scan_id?: string | null;
    category: TechDebtCategory;
    title: string;
    description: string;
    severity: TechDebtSeverity;
    risk_score: number;
    estimated_effort_hours?: number | null;
    impact_scope?: any[] | null;
    technical_impact?: string | null;
    business_impact?: string | null;
    detected_by: 'automated_scan' | 'manual_entry' | 'ai_analysis';
    detection_details?: any | null;
    file_paths?: string[] | null;
    status?: TechDebtStatus;
    remediation_plan?: any | null;
    remediation_steps?: any[] | null;
    estimated_completion_date?: string | null;
    backlog_item_id?: string | null;
    goal_id?: string | null;
  }): DbTechDebt => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO tech_debt (
        id, project_id, scan_id, category, title, description,
        severity, risk_score, estimated_effort_hours, impact_scope,
        technical_impact, business_impact, detected_by, detection_details,
        file_paths, status, remediation_plan, remediation_steps,
        estimated_completion_date, backlog_item_id, goal_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.project_id,
      item.scan_id || null,
      item.category,
      item.title,
      item.description,
      item.severity,
      item.risk_score,
      item.estimated_effort_hours || null,
      item.impact_scope ? JSON.stringify(item.impact_scope) : null,
      item.technical_impact || null,
      item.business_impact || null,
      item.detected_by,
      item.detection_details ? JSON.stringify(item.detection_details) : null,
      item.file_paths ? JSON.stringify(item.file_paths) : null,
      item.status || 'detected',
      item.remediation_plan ? JSON.stringify(item.remediation_plan) : null,
      item.remediation_steps ? JSON.stringify(item.remediation_steps) : null,
      item.estimated_completion_date || null,
      item.backlog_item_id || null,
      item.goal_id || null,
      now,
      now
    );

    const selectStmt = db.prepare('SELECT * FROM tech_debt WHERE id = ?');
    return selectStmt.get(item.id) as DbTechDebt;
  },

  /**
   * Update a technical debt item
   */
  updateTechDebt: (
    id: string,
    updates: {
      status?: TechDebtStatus;
      severity?: TechDebtSeverity;
      risk_score?: number;
      estimated_effort_hours?: number | null;
      remediation_plan?: any | null;
      remediation_steps?: any[] | null;
      estimated_completion_date?: string | null;
      backlog_item_id?: string | null;
      goal_id?: string | null;
      dismissal_reason?: string | null;
    }
  ): DbTechDebt | null => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);

      // Set resolved_at or dismissed_at based on status
      if (updates.status === 'resolved') {
        updateFields.push('resolved_at = ?');
        values.push(now);
      } else if (updates.status === 'dismissed') {
        updateFields.push('dismissed_at = ?');
        values.push(now);
      }
    }

    if (updates.severity !== undefined) {
      updateFields.push('severity = ?');
      values.push(updates.severity);
    }

    if (updates.risk_score !== undefined) {
      updateFields.push('risk_score = ?');
      values.push(updates.risk_score);
    }

    if (updates.estimated_effort_hours !== undefined) {
      updateFields.push('estimated_effort_hours = ?');
      values.push(updates.estimated_effort_hours);
    }

    if (updates.remediation_plan !== undefined) {
      updateFields.push('remediation_plan = ?');
      values.push(updates.remediation_plan ? JSON.stringify(updates.remediation_plan) : null);
    }

    if (updates.remediation_steps !== undefined) {
      updateFields.push('remediation_steps = ?');
      values.push(updates.remediation_steps ? JSON.stringify(updates.remediation_steps) : null);
    }

    if (updates.estimated_completion_date !== undefined) {
      updateFields.push('estimated_completion_date = ?');
      values.push(updates.estimated_completion_date);
    }

    if (updates.backlog_item_id !== undefined) {
      updateFields.push('backlog_item_id = ?');
      values.push(updates.backlog_item_id);
    }

    if (updates.goal_id !== undefined) {
      updateFields.push('goal_id = ?');
      values.push(updates.goal_id);
    }

    if (updates.dismissal_reason !== undefined) {
      updateFields.push('dismissal_reason = ?');
      values.push(updates.dismissal_reason);
    }

    if (updateFields.length === 0) {
      const selectStmt = db.prepare('SELECT * FROM tech_debt WHERE id = ?');
      return (selectStmt.get(id) as DbTechDebt) || null;
    }

    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE tech_debt
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      return null;
    }

    const selectStmt = db.prepare('SELECT * FROM tech_debt WHERE id = ?');
    return selectStmt.get(id) as DbTechDebt;
  },

  /**
   * Delete a technical debt item
   */
  deleteTechDebt: (id: string): boolean => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tech_debt WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get technical debt statistics for a project
   */
  getTechDebtStats: (projectId: string): TechDebtStats => {
    const db = getDatabase();

    // Get all active tech debt
    const items = db
      .prepare(
        `SELECT * FROM tech_debt
         WHERE project_id = ? AND status NOT IN ('resolved', 'dismissed')`
      )
      .all(projectId) as DbTechDebt[];

    // Count by category
    const byCategory: Record<TechDebtCategory, number> = {
      code_quality: 0,
      security: 0,
      performance: 0,
      maintainability: 0,
      testing: 0,
      documentation: 0,
      dependencies: 0,
      architecture: 0,
      accessibility: 0,
      other: 0
    };

    // Count by severity
    const bySeverity: Record<TechDebtSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    // Count by status
    const byStatus: Record<TechDebtStatus, number> = {
      detected: 0,
      acknowledged: 0,
      planned: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0
    };

    let totalRiskScore = 0;
    let totalEstimatedHours = 0;

    items.forEach((item) => {
      byCategory[item.category]++;
      bySeverity[item.severity]++;
      byStatus[item.status]++;
      totalRiskScore += item.risk_score;
      if (item.estimated_effort_hours) {
        totalEstimatedHours += item.estimated_effort_hours;
      }
    });

    // Get trend data for last 30 days
    const trendStmt = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as detected
      FROM tech_debt
      WHERE project_id = ?
        AND created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const resolvedTrendStmt = db.prepare(`
      SELECT
        DATE(resolved_at) as date,
        COUNT(*) as resolved
      FROM tech_debt
      WHERE project_id = ?
        AND resolved_at >= datetime('now', '-30 days')
        AND status = 'resolved'
      GROUP BY DATE(resolved_at)
      ORDER BY date DESC
    `);

    const detectedTrend = trendStmt.all(projectId) as Array<{ date: string; detected: number }>;
    const resolvedTrend = resolvedTrendStmt.all(projectId) as Array<{ date: string; resolved: number }>;

    // Merge trend data
    const trendMap = new Map<string, { detected: number; resolved: number }>();
    detectedTrend.forEach((t) => trendMap.set(t.date, { detected: t.detected, resolved: 0 }));
    resolvedTrend.forEach((t) => {
      const existing = trendMap.get(t.date) || { detected: 0, resolved: 0 };
      trendMap.set(t.date, { ...existing, resolved: t.resolved });
    });

    const trendData = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      detected: data.detected,
      resolved: data.resolved,
      totalActive: items.length // Simplified - could be calculated per day
    }));

    return {
      totalItems: items.length,
      byCategory,
      bySeverity,
      byStatus,
      averageRiskScore: items.length > 0 ? totalRiskScore / items.length : 0,
      totalEstimatedHours,
      criticalCount: bySeverity.critical,
      trendData
    };
  },

  /**
   * Get critical tech debt items (critical severity + high risk score)
   */
  getCriticalTechDebt: (projectId: string): DbTechDebt[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM tech_debt
      WHERE project_id = ?
        AND severity = 'critical'
        AND status NOT IN ('resolved', 'dismissed')
      ORDER BY risk_score DESC
      LIMIT 10
    `);
    return stmt.all(projectId) as DbTechDebt[];
  }
};
