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
      return {
        success: false,
        error: data.error || 'Structure scan failed',
      };
    }

    return {
      success: true,
      message: data.message,
      violations: data.violations,
      requirementFiles: data.requirementFiles || [],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Failed to start structure scan';
    return {
      success: false,
      error,
    };
  }
}
