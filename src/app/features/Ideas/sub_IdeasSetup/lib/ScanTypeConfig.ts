/**
 * Scan Type Configuration
 * Re-exports centralized config for backwards compatibility
 */

import {
  type ScanType,
  type ScanTypeConfig,
  SCAN_TYPE_CONFIGS,
  getScanTypeConfig,
} from '@/app/features/Ideas/lib/scanTypes';

// Re-export for backwards compatibility
export type ScanTypeOption = ScanTypeConfig;
export const SCAN_TYPES: ScanTypeOption[] = SCAN_TYPE_CONFIGS;
export { getScanTypeConfig };
export type { ScanType };
