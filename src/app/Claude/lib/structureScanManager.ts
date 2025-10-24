/**
 * Structure Scan Manager
 * Handles structure scanning and requirement generation
 */

export interface StructureScanResult {
  success: boolean;
  message?: string;
  violations?: number;
  requirementFiles?: string[];
  error?: string;
}

/**
 * Start a structure scan
 */
export async function startStructureScan(
  projectPath: string,
  projectType: 'nextjs' | 'fastapi',
  projectId?: string
): Promise<StructureScanResult> {
  console.log('[StructureScan] 🎯 Starting structure scan...');

  try {
    const response = await fetch('/api/structure-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        projectType,
        projectId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[StructureScan] ❌ Scan failed:', data.error);
      return {
        success: false,
        error: data.error || 'Structure scan failed',
      };
    }

    console.log('[StructureScan] ✅ Scan completed:', data);
    return {
      success: true,
      message: data.message,
      violations: data.violations,
      requirementFiles: data.requirementFiles || [],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to start structure scan';
    console.error('[StructureScan] 💥 Error:', error);
    return {
      success: false,
      error,
    };
  }
}
