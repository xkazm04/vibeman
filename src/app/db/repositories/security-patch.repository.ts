import { getDatabase } from '../connection';
import {
  DbSecurityScan,
  DbSecurityPatch,
  DbSecurityPr,
  SecurityScan,
  SecurityPatch,
  SecurityPr
} from '../models/security-patch.types';

/**
 * Security Scan Repository
 */
function dbToSecurityScan(db: DbSecurityScan): SecurityScan {
  return {
    id: db.id,
    projectId: db.project_id,
    scanDate: new Date(db.scan_date),
    totalVulnerabilities: db.total_vulnerabilities,
    criticalCount: db.critical_count,
    highCount: db.high_count,
    mediumCount: db.medium_count,
    lowCount: db.low_count,
    scanOutput: JSON.parse(db.scan_output),
    status: db.status,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at)
  };
}

function dbToSecurityPatch(db: DbSecurityPatch): SecurityPatch {
  return {
    id: db.id,
    scanId: db.scan_id,
    projectId: db.project_id,
    vulnerabilityId: db.vulnerability_id,
    packageName: db.package_name,
    currentVersion: db.current_version,
    fixedVersion: db.fixed_version,
    severity: db.severity,
    description: db.description,
    aiAnalysis: db.ai_analysis,
    patchProposal: db.patch_proposal,
    patchApplied: db.patch_applied === 1,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at)
  };
}

function dbToSecurityPr(db: DbSecurityPr): SecurityPr {
  return {
    id: db.id,
    scanId: db.scan_id,
    projectId: db.project_id,
    prNumber: db.pr_number,
    prUrl: db.pr_url,
    branchName: db.branch_name,
    commitSha: db.commit_sha,
    testStatus: db.test_status,
    testOutput: db.test_output ? JSON.parse(db.test_output) : null,
    mergeStatus: db.merge_status,
    mergeError: db.merge_error,
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at)
  };
}

/**
 * Security Scan Operations
 */
export const securityScanRepository = {
  /**
   * Create a new security scan
   */
  create(scan: Omit<SecurityScan, 'createdAt' | 'updatedAt'>): SecurityScan {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_scans (
        id, project_id, scan_date, total_vulnerabilities,
        critical_count, high_count, medium_count, low_count,
        scan_output, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scan.id,
      scan.projectId,
      scan.scanDate.toISOString(),
      scan.totalVulnerabilities,
      scan.criticalCount,
      scan.highCount,
      scan.mediumCount,
      scan.lowCount,
      JSON.stringify(scan.scanOutput),
      scan.status,
      now,
      now
    );

    return {
      ...scan,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
  },

  /**
   * Get security scan by ID
   */
  getById(id: string): SecurityScan | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_scans WHERE id = ?');
    const result = stmt.get(id) as DbSecurityScan | undefined;

    return result ? dbToSecurityScan(result) : null;
  },

  /**
   * Get all security scans for a project
   */
  getByProjectId(projectId: string): SecurityScan[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM security_scans
      WHERE project_id = ?
      ORDER BY scan_date DESC
    `);
    const results = stmt.all(projectId) as DbSecurityScan[];

    return results.map(dbToSecurityScan);
  },

  /**
   * Update security scan status
   */
  updateStatus(id: string, status: DbSecurityScan['status']): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_scans
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, new Date().toISOString(), id);
  },

  /**
   * Delete security scan
   */
  delete(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM security_scans WHERE id = ?');
    stmt.run(id);
  }
};

/**
 * Security Patch Operations
 */
export const securityPatchRepository = {
  /**
   * Create a new security patch
   */
  create(patch: Omit<SecurityPatch, 'createdAt' | 'updatedAt'>): SecurityPatch {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_patches (
        id, scan_id, project_id, vulnerability_id, package_name,
        current_version, fixed_version, severity, description,
        ai_analysis, patch_proposal, patch_applied, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      patch.id,
      patch.scanId,
      patch.projectId,
      patch.vulnerabilityId,
      patch.packageName,
      patch.currentVersion,
      patch.fixedVersion,
      patch.severity,
      patch.description,
      patch.aiAnalysis,
      patch.patchProposal,
      patch.patchApplied ? 1 : 0,
      now,
      now
    );

    return {
      ...patch,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
  },

  /**
   * Get patches by scan ID
   */
  getByScanId(scanId: string): SecurityPatch[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_patches WHERE scan_id = ?');
    const results = stmt.all(scanId) as DbSecurityPatch[];

    return results.map(dbToSecurityPatch);
  },

  /**
   * Get patches by project ID
   */
  getPatchesByProject(projectId: string): SecurityPatch[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_patches WHERE project_id = ? ORDER BY created_at DESC');
    const results = stmt.all(projectId) as DbSecurityPatch[];

    return results.map(dbToSecurityPatch);
  },

  /**
   * Update patch proposal
   */
  updateProposal(id: string, aiAnalysis: string, patchProposal: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_patches
      SET ai_analysis = ?, patch_proposal = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(aiAnalysis, patchProposal, new Date().toISOString(), id);
  },

  /**
   * Mark patch as applied
   */
  markApplied(id: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_patches
      SET patch_applied = 1, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(new Date().toISOString(), id);
  }
};

/**
 * Security PR Operations
 */
export const securityPrRepository = {
  /**
   * Create a new security PR
   */
  create(pr: Omit<SecurityPr, 'createdAt' | 'updatedAt'>): SecurityPr {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO security_prs (
        id, scan_id, project_id, pr_number, pr_url, branch_name,
        commit_sha, test_status, test_output, merge_status,
        merge_error, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      pr.id,
      pr.scanId,
      pr.projectId,
      pr.prNumber,
      pr.prUrl,
      pr.branchName,
      pr.commitSha,
      pr.testStatus,
      pr.testOutput ? JSON.stringify(pr.testOutput) : null,
      pr.mergeStatus,
      pr.mergeError,
      now,
      now
    );

    return {
      ...pr,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    };
  },

  /**
   * Get PR by scan ID
   */
  getByScanId(scanId: string): SecurityPr | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM security_prs WHERE scan_id = ?');
    const result = stmt.get(scanId) as DbSecurityPr | undefined;

    return result ? dbToSecurityPr(result) : null;
  },

  /**
   * Update PR details
   */
  updatePr(id: string, prNumber: number, prUrl: string, commitSha: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_prs
      SET pr_number = ?, pr_url = ?, commit_sha = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(prNumber, prUrl, commitSha, new Date().toISOString(), id);
  },

  /**
   * Update test status
   */
  updateTestStatus(id: string, testStatus: DbSecurityPr['test_status'], testOutput?: Record<string, unknown>): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_prs
      SET test_status = ?, test_output = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      testStatus,
      testOutput ? JSON.stringify(testOutput) : null,
      new Date().toISOString(),
      id
    );
  },

  /**
   * Update merge status
   */
  updateMergeStatus(
    id: string,
    mergeStatus: DbSecurityPr['merge_status'],
    mergeError?: string
  ): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE security_prs
      SET merge_status = ?, merge_error = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(mergeStatus, mergeError || null, new Date().toISOString(), id);
  }
};
