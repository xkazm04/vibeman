import type { ScanRepository, ScanResult } from '@/lib/scan/types';
import { scanResultDb } from '@/app/db';

/**
 * Database-backed implementation of ScanRepository
 * Persists scan results to SQLite via scanResultDb
 */
export class DatabaseScanRepository implements ScanRepository {
  /**
   * Save a scan result
   */
  async save(result: ScanResult): Promise<void> {
    // Extract project ID from result metadata if available
    // Otherwise use the scan ID as default
    const projectId = (result.metadata as any)?.projectId || result.scanId;
    scanResultDb.saveScanResult(projectId, result);
  }

  /**
   * Get a scan result by ID
   */
  async getById(scanId: string): Promise<ScanResult | null> {
    const dbResult = scanResultDb.getScanResultById(scanId);
    if (!dbResult) return null;

    // Reconstruct ScanResult from database record
    return {
      success: dbResult.success,
      scanId: dbResult.scan_id,
      category: dbResult.category as any,
      findings: dbResult.findings?.map(f => ({
        id: f.id,
        title: f.title,
        description: f.description,
        severity: f.severity as any,
        impact: f.impact as any,
        effort: f.effort as any,
        filePath: f.file_path || undefined,
        lineNumber: f.line_number || undefined,
        suggestion: f.suggestion || undefined,
        examples: f.examples_json ? JSON.parse(f.examples_json) : undefined
      })) || [],
      metadata: JSON.parse(dbResult.metadata_json),
      error: dbResult.error_json ? JSON.parse(dbResult.error_json) : undefined
    };
  }

  /**
   * Get all scan results for a project
   */
  async listByProject(projectId: string, limit = 50): Promise<ScanResult[]> {
    const dbResults = scanResultDb.getScanResultsByProject(projectId, limit, 0);

    return dbResults.map(dbResult => ({
      success: dbResult.success,
      scanId: dbResult.scan_id,
      category: dbResult.category as any,
      findings: JSON.parse(dbResult.findings_json),
      metadata: JSON.parse(dbResult.metadata_json),
      error: dbResult.error_json ? JSON.parse(dbResult.error_json) : undefined
    }));
  }

  /**
   * Delete a scan result
   */
  async delete(scanId: string): Promise<void> {
    scanResultDb.deleteScanResult(scanId);
  }
}

// Export singleton instance
export const databaseScanRepository = new DatabaseScanRepository();
