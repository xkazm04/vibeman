/**
 * Vision Scan Backward Compatibility Wrapper
 *
 * Provides the legacy function-based API for VisionScan
 */

import { VisionScan, VisionScanConfig, VisionScanData } from '../components/scans/project/VisionScan';
import { ScanResult, DecisionData } from '../components/scans/base/types';

// Re-export types for backward compatibility
export type { VisionScanData as VisionScanResultData };

export interface LegacyScanResult {
  success: boolean;
  error?: string;
  data?: VisionScanData;
}

export interface LegacyDecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  data?: VisionScanData;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

// Store the last scan instance for buildDecisionData
let lastScanInstance: VisionScan | null = null;
let lastScanResult: ScanResult<VisionScanData> | null = null;

/**
 * Execute vision scan (legacy API)
 *
 * @deprecated Use VisionScan class directly instead
 */
export async function executeVisionScan(
  projectId: string,
  projectPath: string,
  projectType: string,
  projectName: string,
  projectPort: number,
  onProgress?: (progress: number, message?: string) => void
): Promise<LegacyScanResult> {
  const config: VisionScanConfig = {
    projectId,
    projectPath,
    projectType,
    projectName,
    projectPort,
    onProgress,
  };

  const scan = new VisionScan(config);
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
 * Build decision data from vision scan result (legacy API)
 *
 * @deprecated Use VisionScan.buildDecision() directly instead
 */
export function buildVisionDecisionData(result: LegacyScanResult): LegacyDecisionData | null {
  if (!lastScanInstance || !lastScanResult) {
    console.warn('[VisionScan Compat] No scan instance available. Call executeVisionScan first.');
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
    data: decision.data,
    onAccept: decision.onAccept,
    onReject: decision.onReject || (async () => {}),
  };
}
