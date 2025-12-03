/**
 * Photo Scan Backward Compatibility Wrapper
 *
 * Provides the legacy function-based API for PhotoScan
 */

import { PhotoScan, PhotoScanConfig, PhotoScanData } from '../components/scans/context/PhotoScan';
import { ScanResult } from '../components/scans/base/types';

// Re-export types for backward compatibility
export type { PhotoScanData as PhotoScanResultData };

export interface LegacyScanResult {
  success: boolean;
  error?: string;
  data?: PhotoScanData;
}

export interface LegacyDecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  contextId?: string;
  data?: PhotoScanData;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

// Store the last scan instance for buildDecisionData
let lastScanInstance: PhotoScan | null = null;
let lastScanResult: ScanResult<PhotoScanData> | null = null;

/**
 * Execute photo scan (legacy API)
 *
 * @deprecated Use PhotoScan class directly instead
 */
export async function executePhotoScan(
  projectId: string,
  projectPath: string,
  projectPort: number,
  contextId: string,
  contextName: string,
  _testScenario?: string,  // Not used in new API - scenario is fetched from context
  onProgress?: (progress: number, message?: string) => void
): Promise<LegacyScanResult> {
  const config: PhotoScanConfig = {
    projectId,
    projectPath,
    projectPort,
    contextId,
    contextName,
    onProgress,
  };

  const scan = new PhotoScan(config);
  lastScanInstance = scan;

  const result = await scan.execute();
  lastScanResult = result;

  return {
    success: result.success,
    error: result.error,
    data: result.data,
  };
}

/**
 * Build decision data from photo scan result (legacy API)
 *
 * @deprecated Use PhotoScan.buildDecision() directly instead
 */
export function buildPhotoDecisionData(result: LegacyScanResult): LegacyDecisionData | null {
  if (!lastScanInstance || !lastScanResult) {
    console.warn('[PhotoScan Compat] No scan instance available. Call executePhotoScan first.');
    return null;
  }

  const decision = lastScanInstance.buildDecision(lastScanResult);
  if (!decision) return null;

  return {
    type: decision.type,
    title: decision.title,
    description: decision.description,
    count: decision.count,
    severity: decision.severity,
    projectId: decision.projectId,
    projectPath: decision.projectPath,
    contextId: decision.contextId,
    data: decision.data,
    onAccept: decision.onAccept,
    onReject: decision.onReject || (async () => {}),
  };
}
