import { getDatabase } from '../connection';
import { v4 as uuidv4 } from 'uuid';
import type { ScanResult, ScanFinding, ScanMetadata } from '@/lib/scan/types';

/**
 * Database model for scan results
 */
export interface DbScanResult {
  id: string;
  scan_id: string;
  project_id: string;
  category: string;
  findings_count: number;
  findings_json: string; // JSON stringified ScanFinding[]
  metadata_json: string; // JSON stringified ScanMetadata
  success: boolean;
  error_json?: string; // JSON stringified error if failed
  created_at: string;
  updated_at: string;
}

export interface DbScanFinding {
  id: string;
  scan_result_id: string;
  project_id: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  impact?: 'low' | 'medium' | 'high';
  effort?: 'low' | 'medium' | 'high';
  file_path?: string;
  line_number?: number;
  suggestion?: string;
  examples_json?: string; // JSON stringified string[]
  created_at: string;
}

/**
 * Scan Results Repository
 * Implements ScanRepository interface for unified scan system persistence
 */
export const scanResultRepository = {
  /**
   * Save a scan result to the database
   */
  saveScanResult: (projectId: string, result: ScanResult): DbScanResult => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    const dbResult: DbScanResult = {
      id,
      scan_id: result.scanId,
      project_id: projectId,
      category: result.category,
      findings_count: result.findings.length,
      findings_json: JSON.stringify(result.findings),
      metadata_json: JSON.stringify(result.metadata),
      success: result.success,
      error_json: result.error ? JSON.stringify(result.error) : undefined,
      created_at: now,
      updated_at: now
    };

    const stmt = db.prepare(`
      INSERT INTO scan_results (
        id, scan_id, project_id, category, findings_count,
        findings_json, metadata_json, success, error_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dbResult.id,
      dbResult.scan_id,
      dbResult.project_id,
      dbResult.category,
      dbResult.findings_count,
      dbResult.findings_json,
      dbResult.metadata_json,
      dbResult.success ? 1 : 0,
      dbResult.error_json,
      dbResult.created_at,
      dbResult.updated_at
    );

    // Also save individual findings for easier querying
    for (const finding of result.findings) {
      scanResultRepository.saveScanFinding(id, projectId, finding);
    }

    return dbResult;
  },

  /**
   * Save an individual scan finding
   */
  saveScanFinding: (scanResultId: string, projectId: string, finding: ScanFinding): DbScanFinding => {
    const db = getDatabase();
    const id = finding.id || uuidv4();
    const now = new Date().toISOString();

    const dbFinding: DbScanFinding = {
      id,
      scan_result_id: scanResultId,
      project_id: projectId,
      title: finding.title,
      description: finding.description,
      severity: finding.severity || 'info',
      impact: finding.impact,
      effort: finding.effort,
      file_path: finding.filePath,
      line_number: finding.lineNumber,
      suggestion: finding.suggestion,
      examples_json: finding.examples ? JSON.stringify(finding.examples) : undefined,
      created_at: now
    };

    const stmt = db.prepare(`
      INSERT INTO scan_findings (
        id, scan_result_id, project_id, title, description,
        severity, impact, effort, file_path, line_number,
        suggestion, examples_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dbFinding.id,
      dbFinding.scan_result_id,
      dbFinding.project_id,
      dbFinding.title,
      dbFinding.description,
      dbFinding.severity,
      dbFinding.impact,
      dbFinding.effort,
      dbFinding.file_path,
      dbFinding.line_number,
      dbFinding.suggestion,
      dbFinding.examples_json,
      dbFinding.created_at
    );

    return dbFinding;
  },

  /**
   * Get scan result by ID
   */
  getScanResultById: (id: string): (DbScanResult & { findings?: DbScanFinding[] }) | null => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_results WHERE id = ?
    `);
    const result = stmt.get(id) as DbScanResult | undefined;

    if (!result) return null;

    // Fetch associated findings
    const findingsStmt = db.prepare(`
      SELECT * FROM scan_findings WHERE scan_result_id = ?
      ORDER BY created_at DESC
    `);
    const findings = findingsStmt.all(id) as DbScanFinding[];

    return {
      ...result,
      findings,
      success: Boolean(result.success)
    };
  },

  /**
   * Get all scan results for a project
   */
  getScanResultsByProject: (projectId: string, limit = 50, offset = 0): DbScanResult[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_results
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const results = stmt.all(projectId, limit, offset) as DbScanResult[];
    return results.map(r => ({
      ...r,
      success: Boolean(r.success)
    }));
  },

  /**
   * Get scan results by category for a project
   */
  getScanResultsByCategory: (
    projectId: string,
    category: string,
    limit = 50,
    offset = 0
  ): DbScanResult[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_results
      WHERE project_id = ? AND category = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const results = stmt.all(projectId, category, limit, offset) as DbScanResult[];
    return results.map(r => ({
      ...r,
      success: Boolean(r.success)
    }));
  },

  /**
   * Get findings for a specific scan result
   */
  getScanFindings: (scanResultId: string, limit = 100, offset = 0): DbScanFinding[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_findings
      WHERE scan_result_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(scanResultId, limit, offset) as DbScanFinding[];
  },

  /**
   * Get findings by severity
   */
  getFindingsBySeverity: (
    projectId: string,
    severity: 'error' | 'warning' | 'info',
    limit = 100,
    offset = 0
  ): DbScanFinding[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_findings
      WHERE project_id = ? AND severity = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(projectId, severity, limit, offset) as DbScanFinding[];
  },

  /**
   * Get findings by file path
   */
  getFindingsByFile: (
    projectId: string,
    filePath: string,
    limit = 100,
    offset = 0
  ): DbScanFinding[] => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM scan_findings
      WHERE project_id = ? AND file_path = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(projectId, filePath, limit, offset) as DbScanFinding[];
  },

  /**
   * Count scan results for a project
   */
  countScanResults: (projectId: string): number => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM scan_results WHERE project_id = ?
    `);
    const result = stmt.get(projectId) as { count: number } | undefined;
    return result?.count || 0;
  },

  /**
   * Count findings by severity for a project
   */
  countFindingsBySeverity: (projectId: string): { error: number; warning: number; info: number } => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM scan_findings
      WHERE project_id = ?
      GROUP BY severity
    `);
    const results = stmt.all(projectId) as { severity: string; count: number }[];

    return {
      error: results.find(r => r.severity === 'error')?.count || 0,
      warning: results.find(r => r.severity === 'warning')?.count || 0,
      info: results.find(r => r.severity === 'info')?.count || 0
    };
  },

  /**
   * Delete scan result and associated findings
   */
  deleteScanResult: (id: string): boolean => {
    const db = getDatabase();

    // Delete findings first
    const findingsStmt = db.prepare(`
      DELETE FROM scan_findings WHERE scan_result_id = ?
    `);
    findingsStmt.run(id);

    // Delete result
    const resultStmt = db.prepare(`
      DELETE FROM scan_results WHERE id = ?
    `);
    const deleteResult = resultStmt.run(id);

    return deleteResult.changes > 0;
  },

  /**
   * Update scan result
   */
  updateScanResult: (id: string, updates: Partial<DbScanResult>): boolean => {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.findings_count !== undefined) {
      fields.push('findings_count = ?');
      values.push(updates.findings_count);
    }

    if (updates.success !== undefined) {
      fields.push('success = ?');
      values.push(updates.success ? 1 : 0);
    }

    if (updates.error_json !== undefined) {
      fields.push('error_json = ?');
      values.push(updates.error_json);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`
      UPDATE scan_results
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }
};
