import { Scan, ScanData } from './types';

/**
 * Fetch all dependency scans
 */
export async function fetchScans(): Promise<Scan[]> {
  const response = await fetch('/api/dependencies/scans');
  const data = await response.json();
  return data.scans || [];
}

/**
 * Fetch scan data with stats
 */
export async function fetchScanData(scanId: string): Promise<ScanData> {
  const [scanResponse, statsResponse] = await Promise.all([
    fetch(`/api/dependencies/${scanId}`),
    fetch(`/api/dependencies/${scanId}/graph`)
  ]);

  const scanData = await scanResponse.json();
  const statsData = await statsResponse.json();

  return {
    ...scanData,
    stats: statsData.stats
  };
}

/**
 * Run a new dependency scan
 */
export async function runDependencyScan(
  projectIds: string[],
  scanName: string
): Promise<{ scanId: string }> {
  const response = await fetch('/api/dependencies/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectIds,
      scanName: scanName || `Scan ${new Date().toLocaleString()}`
    })
  });

  if (!response.ok) {
    throw new Error('Failed to run dependency scan');
  }

  return await response.json();
}

