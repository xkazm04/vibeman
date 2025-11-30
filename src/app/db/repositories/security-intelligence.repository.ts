import { getDatabase } from '../connection';
import {
  DbSecurityIntelligence,
  DbSecurityAlert,
  DbStaleBranch,
  DbCommunitySecurityScore,
  SecurityIntelligence,
  SecurityAlert,
  StaleBranch,
  CommunitySecurityScore,
  SecurityDashboardSummary,
} from '../models/security-intelligence.types';

// Helper functions to convert between DB and app models
function dbToSecurityIntelligence(db: DbSecurityIntelligence): SecurityIntelligence {
  return {
    id: db.id,
    projectId: db.project_id,
    projectName: db.project_name,
    projectPath: db.project_path,
    totalVulnerabilities: db.total_vulnerabilities,
    criticalCount: db.critical_count,
    highCount: db.high_count,
    mediumCount: db.medium_count,
    lowCount: db.low_count,
    patchHealthScore: db.patch_health_score,
    ciStatus: db.ci_status,
    ciLastRun: db.ci_last_run ? new Date(db.ci_last_run) : null,
    riskScore: db.risk_score,
    riskTrend: db.risk_trend,
    lastScanAt: db.last_scan_at ? new Date(db.last_scan_at) : null,
    patchesPending: db.patches_pending,
    patchesApplied: db.patches_applied,
    staleBranchesCount: db.stale_branches_count,
    communityScore: db.community_score,
    lastCommunityUpdate: db.last_community_update ? new Date(db.last_community_update) : null,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

function dbToSecurityAlert(db: DbSecurityAlert): SecurityAlert {
  return {
    id: db.id,
    projectId: db.project_id,
    alertType: db.alert_type,
    severity: db.severity,
    title: db.title,
    message: db.message,
    source: db.source,
    acknowledged: db.acknowledged === 1,
    acknowledgedAt: db.acknowledged_at ? new Date(db.acknowledged_at) : null,
    acknowledgedBy: db.acknowledged_by,
    resolved: db.resolved === 1,
    resolvedAt: db.resolved_at ? new Date(db.resolved_at) : null,
    createdAt: new Date(db.created_at),
  };
}

function dbToStaleBranch(db: DbStaleBranch): StaleBranch {
  return {
    id: db.id,
    projectId: db.project_id,
    branchName: db.branch_name,
    lastCommitAt: new Date(db.last_commit_at),
    lastCommitAuthor: db.last_commit_author,
    daysStale: db.days_stale,
    hasVulnerabilities: db.has_vulnerabilities === 1,
    vulnerabilityCount: db.vulnerability_count,
    autoCloseEligible: db.auto_close_eligible === 1,
    autoClosed: db.auto_closed === 1,
    autoClosedAt: db.auto_closed_at ? new Date(db.auto_closed_at) : null,
    manuallyPreserved: db.manually_preserved === 1,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
  };
}

function dbToCommunitySecurityScore(db: DbCommunitySecurityScore): CommunitySecurityScore {
  return {
    id: db.id,
    projectId: db.project_id,
    packageName: db.package_name,
    packageVersion: db.package_version,
    communityScore: db.community_score,
    totalVotes: db.total_votes,
    positiveVotes: db.positive_votes,
    negativeVotes: db.negative_votes,
    source: db.source,
    notes: db.notes,
    lastUpdated: new Date(db.last_updated),
    createdAt: new Date(db.created_at),
  };
}

/**
 * Security Intelligence Repository
 */
export const securityIntelligenceRepository = {
  /**
   * Create or update security intelligence for a project
   */
  upsert(data: Omit<SecurityIntelligence, 'createdAt' | 'updatedAt'>): SecurityIntelligence {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM security_intelligence WHERE project_id = ?').get(data.projectId);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE security_intelligence SET
          project_name = ?, project_path = ?, total_vulnerabilities = ?,
          critical_count = ?, high_count = ?, medium_count = ?, low_count = ?,
          patch_health_score = ?, ci_status = ?, ci_last_run = ?,
          risk_score = ?, risk_trend = ?, last_scan_at = ?,
          patches_pending = ?, patches_applied = ?, stale_branches_count = ?,
          community_score = ?, last_community_update = ?, updated_at = ?
        WHERE project_id = ?
      `);

      stmt.run(
        data.projectName, data.projectPath, data.totalVulnerabilities,
        data.criticalCount, data.highCount, data.mediumCount, data.lowCount,
        data.patchHealthScore, data.ciStatus, data.ciLastRun?.toISOString() || null,
        data.riskScore, data.riskTrend, data.lastScanAt?.toISOString() || null,
        data.patchesPending, data.patchesApplied, data.staleBranchesCount,
        data.communityScore, data.lastCommunityUpdate?.toISOString() || null, now,
        data.projectId
      );

      return { ...data, createdAt: new Date(), updatedAt: new Date(now) };
    }

    const stmt = db.prepare(`
      INSERT INTO security_intelligence (
        id, project_id, project_name, project_path, total_vulnerabilities,
        critical_count, high_count, medium_count, low_count,
        patch_health_score, ci_status, ci_last_run,
        risk_score, risk_trend, last_scan_at,
        patches_pending, patches_applied, stale_branches_count,
        community_score, last_community_update, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id, data.projectId, data.projectName, data.projectPath, data.totalVulnerabilities,
      data.criticalCount, data.highCount, data.mediumCount, data.lowCount,
      data.patchHealthScore, data.ciStatus, data.ciLastRun?.toISOString() || null,
      data.riskScore, data.riskTrend, data.lastScanAt?.toISOString() || null,
      data.patchesPending, data.patchesApplied, data.staleBranchesCount,
      data.communityScore, data.lastCommunityUpdate?.toISOString() || null, now, now
    );

    return { ...data, createdAt: new Date(now), updatedAt: new Date(now) };
  },

  /**
   * Get security intelligence by project ID
   */
  getByProjectId(projectId: string): SecurityIntelligence | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_intelligence WHERE project_id = ?');
    const result = stmt.get(projectId) as DbSecurityIntelligence | undefined;
    return result ? dbToSecurityIntelligence(result) : null;
  },

  /**
   * Get all security intelligence records
   */
  getAll(): SecurityIntelligence[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_intelligence ORDER BY risk_score DESC');
    const results = stmt.all() as DbSecurityIntelligence[];
    return results.map(dbToSecurityIntelligence);
  },

  /**
   * Get projects at risk (risk score above threshold)
   */
  getProjectsAtRisk(threshold: number = 70): SecurityIntelligence[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_intelligence WHERE risk_score >= ? ORDER BY risk_score DESC');
    const results = stmt.all(threshold) as DbSecurityIntelligence[];
    return results.map(dbToSecurityIntelligence);
  },

  /**
   * Get dashboard summary across all projects
   */
  getDashboardSummary(): SecurityDashboardSummary {
    const db = getDatabase();

    const summaryStmt = db.prepare(`
      SELECT
        COUNT(*) as total_projects,
        SUM(CASE WHEN risk_score >= 70 THEN 1 ELSE 0 END) as projects_at_risk,
        SUM(total_vulnerabilities) as total_vulnerabilities,
        SUM(critical_count) as critical_vulnerabilities,
        AVG(risk_score) as avg_risk_score,
        AVG(patch_health_score) as avg_patch_health,
        SUM(CASE WHEN ci_status = 'passing' THEN 1 ELSE 0 END) as ci_passing,
        SUM(CASE WHEN ci_status = 'failing' THEN 1 ELSE 0 END) as ci_failing,
        SUM(stale_branches_count) as stale_branches_total
      FROM security_intelligence
    `);

    const summary = summaryStmt.get() as {
      total_projects: number;
      projects_at_risk: number;
      total_vulnerabilities: number;
      critical_vulnerabilities: number;
      avg_risk_score: number;
      avg_patch_health: number;
      ci_passing: number;
      ci_failing: number;
      stale_branches_total: number;
    };

    const alertsStmt = db.prepare(`
      SELECT COUNT(*) as pending FROM security_alerts WHERE acknowledged = 0 AND resolved = 0
    `);
    const alerts = alertsStmt.get() as { pending: number };

    const projects = this.getAll();

    return {
      totalProjects: summary.total_projects || 0,
      projectsAtRisk: summary.projects_at_risk || 0,
      totalVulnerabilities: summary.total_vulnerabilities || 0,
      criticalVulnerabilities: summary.critical_vulnerabilities || 0,
      averageRiskScore: summary.avg_risk_score || 0,
      averagePatchHealthScore: summary.avg_patch_health || 0,
      ciPassingCount: summary.ci_passing || 0,
      ciFailingCount: summary.ci_failing || 0,
      staleBranchesTotal: summary.stale_branches_total || 0,
      pendingAlerts: alerts.pending || 0,
      projects,
    };
  },

  /**
   * Delete security intelligence for a project
   */
  delete(projectId: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM security_intelligence WHERE project_id = ?');
    stmt.run(projectId);
  },
};

/**
 * Security Alerts Repository
 */
export const securityAlertRepository = {
  /**
   * Create a new security alert
   */
  create(alert: Omit<SecurityAlert, 'createdAt'>): SecurityAlert {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_alerts (
        id, project_id, alert_type, severity, title, message, source,
        acknowledged, acknowledged_at, acknowledged_by, resolved, resolved_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.id, alert.projectId, alert.alertType, alert.severity,
      alert.title, alert.message, alert.source,
      alert.acknowledged ? 1 : 0, alert.acknowledgedAt?.toISOString() || null,
      alert.acknowledgedBy, alert.resolved ? 1 : 0, alert.resolvedAt?.toISOString() || null,
      now
    );

    return { ...alert, createdAt: new Date(now) };
  },

  /**
   * Get alerts by project ID
   */
  getByProjectId(projectId: string): SecurityAlert[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM security_alerts
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const results = stmt.all(projectId) as DbSecurityAlert[];
    return results.map(dbToSecurityAlert);
  },

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledged(projectId?: string): SecurityAlert[] {
    const db = getDatabase();
    let stmt;

    if (projectId) {
      stmt = db.prepare(`
        SELECT * FROM security_alerts
        WHERE project_id = ? AND acknowledged = 0 AND resolved = 0
        ORDER BY CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END, created_at DESC
      `);
      return (stmt.all(projectId) as DbSecurityAlert[]).map(dbToSecurityAlert);
    }

    stmt = db.prepare(`
      SELECT * FROM security_alerts
      WHERE acknowledged = 0 AND resolved = 0
      ORDER BY CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END, created_at DESC
    `);
    return (stmt.all() as DbSecurityAlert[]).map(dbToSecurityAlert);
  },

  /**
   * Acknowledge an alert
   */
  acknowledge(id: string, acknowledgedBy?: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_alerts
      SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), acknowledgedBy || null, id);
  },

  /**
   * Resolve an alert
   */
  resolve(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_alerts
      SET resolved = 1, resolved_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
  },

  /**
   * Delete old resolved alerts (cleanup)
   */
  deleteOldResolved(daysOld: number = 30): number {
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const stmt = db.prepare(`
      DELETE FROM security_alerts
      WHERE resolved = 1 AND resolved_at < ?
    `);
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  },
};

/**
 * Stale Branches Repository
 */
export const staleBranchRepository = {
  /**
   * Create or update a stale branch record
   */
  upsert(data: Omit<StaleBranch, 'createdAt' | 'updatedAt'>): StaleBranch {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db.prepare(
      'SELECT id FROM stale_branches WHERE project_id = ? AND branch_name = ?'
    ).get(data.projectId, data.branchName);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE stale_branches SET
          last_commit_at = ?, last_commit_author = ?, days_stale = ?,
          has_vulnerabilities = ?, vulnerability_count = ?, auto_close_eligible = ?,
          auto_closed = ?, auto_closed_at = ?, manually_preserved = ?, updated_at = ?
        WHERE project_id = ? AND branch_name = ?
      `);

      stmt.run(
        data.lastCommitAt.toISOString(), data.lastCommitAuthor, data.daysStale,
        data.hasVulnerabilities ? 1 : 0, data.vulnerabilityCount, data.autoCloseEligible ? 1 : 0,
        data.autoClosed ? 1 : 0, data.autoClosedAt?.toISOString() || null,
        data.manuallyPreserved ? 1 : 0, now,
        data.projectId, data.branchName
      );

      return { ...data, createdAt: new Date(), updatedAt: new Date(now) };
    }

    const stmt = db.prepare(`
      INSERT INTO stale_branches (
        id, project_id, branch_name, last_commit_at, last_commit_author,
        days_stale, has_vulnerabilities, vulnerability_count, auto_close_eligible,
        auto_closed, auto_closed_at, manually_preserved, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id, data.projectId, data.branchName, data.lastCommitAt.toISOString(),
      data.lastCommitAuthor, data.daysStale, data.hasVulnerabilities ? 1 : 0,
      data.vulnerabilityCount, data.autoCloseEligible ? 1 : 0,
      data.autoClosed ? 1 : 0, data.autoClosedAt?.toISOString() || null,
      data.manuallyPreserved ? 1 : 0, now, now
    );

    return { ...data, createdAt: new Date(now), updatedAt: new Date(now) };
  },

  /**
   * Get stale branches by project
   */
  getByProjectId(projectId: string): StaleBranch[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM stale_branches
      WHERE project_id = ? AND auto_closed = 0
      ORDER BY days_stale DESC
    `);
    const results = stmt.all(projectId) as DbStaleBranch[];
    return results.map(dbToStaleBranch);
  },

  /**
   * Get auto-close eligible branches
   */
  getAutoCloseEligible(projectId?: string): StaleBranch[] {
    const db = getDatabase();
    let stmt;

    if (projectId) {
      stmt = db.prepare(`
        SELECT * FROM stale_branches
        WHERE project_id = ? AND auto_close_eligible = 1 AND auto_closed = 0 AND manually_preserved = 0
        ORDER BY days_stale DESC
      `);
      return (stmt.all(projectId) as DbStaleBranch[]).map(dbToStaleBranch);
    }

    stmt = db.prepare(`
      SELECT * FROM stale_branches
      WHERE auto_close_eligible = 1 AND auto_closed = 0 AND manually_preserved = 0
      ORDER BY days_stale DESC
    `);
    return (stmt.all() as DbStaleBranch[]).map(dbToStaleBranch);
  },

  /**
   * Mark branch as auto-closed
   */
  markAutoClosed(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE stale_branches
      SET auto_closed = 1, auto_closed_at = ?, updated_at = ?
      WHERE id = ?
    `);
    const now = new Date().toISOString();
    stmt.run(now, now, id);
  },

  /**
   * Mark branch as manually preserved
   */
  markPreserved(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE stale_branches
      SET manually_preserved = 1, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
  },

  /**
   * Delete branch record
   */
  delete(projectId: string, branchName: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM stale_branches WHERE project_id = ? AND branch_name = ?');
    stmt.run(projectId, branchName);
  },
};

/**
 * Community Security Score Repository
 */
export const communitySecurityScoreRepository = {
  /**
   * Create or update a community score
   */
  upsert(data: Omit<CommunitySecurityScore, 'createdAt'>): CommunitySecurityScore {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db.prepare(
      'SELECT id FROM community_security_scores WHERE project_id = ? AND package_name = ? AND package_version = ?'
    ).get(data.projectId, data.packageName, data.packageVersion);

    if (existing) {
      const stmt = db.prepare(`
        UPDATE community_security_scores SET
          community_score = ?, total_votes = ?, positive_votes = ?, negative_votes = ?,
          source = ?, notes = ?, last_updated = ?
        WHERE project_id = ? AND package_name = ? AND package_version = ?
      `);

      stmt.run(
        data.communityScore, data.totalVotes, data.positiveVotes, data.negativeVotes,
        data.source, data.notes, now,
        data.projectId, data.packageName, data.packageVersion
      );

      return { ...data, lastUpdated: new Date(now), createdAt: new Date() };
    }

    const stmt = db.prepare(`
      INSERT INTO community_security_scores (
        id, project_id, package_name, package_version, community_score,
        total_votes, positive_votes, negative_votes, source, notes,
        last_updated, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id, data.projectId, data.packageName, data.packageVersion,
      data.communityScore, data.totalVotes, data.positiveVotes, data.negativeVotes,
      data.source, data.notes, now, now
    );

    return { ...data, lastUpdated: new Date(now), createdAt: new Date(now) };
  },

  /**
   * Get scores by project
   */
  getByProjectId(projectId: string): CommunitySecurityScore[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM community_security_scores
      WHERE project_id = ?
      ORDER BY community_score DESC
    `);
    const results = stmt.all(projectId) as DbCommunitySecurityScore[];
    return results.map(dbToCommunitySecurityScore);
  },

  /**
   * Get score for a specific package
   */
  getByPackage(packageName: string, packageVersion?: string): CommunitySecurityScore[] {
    const db = getDatabase();
    let stmt;

    if (packageVersion) {
      stmt = db.prepare(`
        SELECT * FROM community_security_scores
        WHERE package_name = ? AND package_version = ?
        ORDER BY last_updated DESC
      `);
      return (stmt.all(packageName, packageVersion) as DbCommunitySecurityScore[]).map(dbToCommunitySecurityScore);
    }

    stmt = db.prepare(`
      SELECT * FROM community_security_scores
      WHERE package_name = ?
      ORDER BY package_version DESC, last_updated DESC
    `);
    return (stmt.all(packageName) as DbCommunitySecurityScore[]).map(dbToCommunitySecurityScore);
  },

  /**
   * Submit a vote for a package
   */
  submitVote(
    projectId: string,
    packageName: string,
    packageVersion: string,
    vote: 'positive' | 'negative',
    source: string = 'internal'
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();

    const existing = db.prepare(
      'SELECT * FROM community_security_scores WHERE project_id = ? AND package_name = ? AND package_version = ?'
    ).get(projectId, packageName, packageVersion) as DbCommunitySecurityScore | undefined;

    if (existing) {
      const newPositive = vote === 'positive' ? existing.positive_votes + 1 : existing.positive_votes;
      const newNegative = vote === 'negative' ? existing.negative_votes + 1 : existing.negative_votes;
      const newTotal = existing.total_votes + 1;
      const newScore = Math.round((newPositive / newTotal) * 100);

      const stmt = db.prepare(`
        UPDATE community_security_scores SET
          community_score = ?, total_votes = ?, positive_votes = ?, negative_votes = ?,
          last_updated = ?
        WHERE id = ?
      `);
      stmt.run(newScore, newTotal, newPositive, newNegative, now, existing.id);
    } else {
      const id = `css_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const stmt = db.prepare(`
        INSERT INTO community_security_scores (
          id, project_id, package_name, package_version, community_score,
          total_votes, positive_votes, negative_votes, source, notes,
          last_updated, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const score = vote === 'positive' ? 100 : 0;
      const positive = vote === 'positive' ? 1 : 0;
      const negative = vote === 'negative' ? 1 : 0;

      stmt.run(
        id, projectId, packageName, packageVersion, score,
        1, positive, negative, source, null, now, now
      );
    }
  },

  /**
   * Get aggregated score for a package across all projects
   */
  getAggregatedScore(packageName: string, packageVersion?: string): {
    aggregatedScore: number;
    totalVotes: number;
    breakdown: { positive: number; negative: number };
    sources: string[];
  } | null {
    const db = getDatabase();
    let stmt;

    if (packageVersion) {
      stmt = db.prepare(`
        SELECT
          AVG(community_score) as avg_score,
          SUM(total_votes) as total_votes,
          SUM(positive_votes) as positive,
          SUM(negative_votes) as negative,
          GROUP_CONCAT(DISTINCT source) as sources
        FROM community_security_scores
        WHERE package_name = ? AND package_version = ?
      `);
      const result = stmt.get(packageName, packageVersion) as {
        avg_score: number | null;
        total_votes: number | null;
        positive: number | null;
        negative: number | null;
        sources: string | null;
      };

      if (!result.avg_score) return null;

      return {
        aggregatedScore: Math.round(result.avg_score),
        totalVotes: result.total_votes || 0,
        breakdown: {
          positive: result.positive || 0,
          negative: result.negative || 0,
        },
        sources: result.sources ? result.sources.split(',') : [],
      };
    }

    stmt = db.prepare(`
      SELECT
        AVG(community_score) as avg_score,
        SUM(total_votes) as total_votes,
        SUM(positive_votes) as positive,
        SUM(negative_votes) as negative,
        GROUP_CONCAT(DISTINCT source) as sources
      FROM community_security_scores
      WHERE package_name = ?
    `);
    const result = stmt.get(packageName) as {
      avg_score: number | null;
      total_votes: number | null;
      positive: number | null;
      negative: number | null;
      sources: string | null;
    };

    if (!result.avg_score) return null;

    return {
      aggregatedScore: Math.round(result.avg_score),
      totalVotes: result.total_votes || 0,
      breakdown: {
        positive: result.positive || 0,
        negative: result.negative || 0,
      },
      sources: result.sources ? result.sources.split(',') : [],
    };
  },
};
