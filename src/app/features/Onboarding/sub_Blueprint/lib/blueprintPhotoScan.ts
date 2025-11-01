/**
 * Blueprint Photo Scan Library
 * Handles screenshot capture of all application modules
 */

export interface ScanResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Execute photo scan (screenshots of all 5 modules)
 */
export async function executePhotoScan(): Promise<ScanResult> {
  try {
    console.log('[PhotoScan] Capturing screenshots...');

    const response = await fetch('/api/tester/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executeAll: true }), // Capture all 5 modules
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Screenshot request failed',
      };
    }

    const result = await response.json();
    console.log('[PhotoScan] Screenshots completed:', result);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('[PhotoScan] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Photo scan doesn't need user decision - it runs directly
 * Returns null to indicate no decision panel needed
 */
export function buildDecisionData(): null {
  return null;
}
