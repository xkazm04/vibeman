/**
 * Scan Techniques - Stub for backward compatibility
 */

export interface ScanTechnique {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export function getScanTechniques(): ScanTechnique[] {
  return [];
}
