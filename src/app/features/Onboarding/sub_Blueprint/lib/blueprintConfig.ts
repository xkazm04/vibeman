/**
 * Blueprint Configuration
 *
 * Dynamically builds blueprint columns from the ScanRegistry.
 * This eliminates hard-coded imports and enables framework-agnostic scan registration.
 *
 * Migration from legacy hard-coded scans to registry-based architecture.
 */

import {
  Eye,
  Layers,
  Box,
  Hammer,
  Sparkles,
  Code,
  Bug,
  Camera,
  Target,
  Trash2,
  LucideIcon,
} from 'lucide-react';
import { getInitializedRegistry } from './adapters';
import { createScanBuilder } from './adapters/ScanBuilder';

// Legacy imports for scans not yet migrated to adapters
import * as photoScan from './blueprintPhotoScan';
import * as visionScan from './blueprintVisionScan';
import * as selectorsScan from './blueprintSelectorsScan';
import * as unusedScan from './blueprintUnusedScan';

/**
 * Legacy scan result interface (for backward compatibility)
 */
export interface ScanResult {
  success: boolean;
  error?: string;
  violations?: unknown[];
  data?: Record<string, unknown>;
}

/**
 * Legacy decision data interface (for backward compatibility)
 */
export interface DecisionData {
  type: string;
  title: string;
  description: string;
  count?: number;
  severity?: 'info' | 'warning' | 'error';
  projectId?: string;
  projectPath?: string;
  projectType?: string;
  data?: Record<string, unknown>;
  onAccept: () => Promise<void>;
  onReject?: () => Promise<void>; // Optional - some decisions are info-only
}

/**
 * Scan handler interface
 */
export interface ScanHandler {
  execute: (contextId?: string) => Promise<ScanResult>;
  buildDecision: (result: ScanResult) => DecisionData | null;
}

/**
 * Button configuration interface
 */
export interface ButtonConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'cyan' | 'purple' | 'amber' | 'green' | 'red' | 'pink' | 'indigo';
  action: 'scan' | 'navigate';
  target?: 'ideas' | 'tinder' | 'tasker' | 'reflector';
  scanHandler?: ScanHandler;
  eventTitle?: string; // Event title to track last scan execution
  contextNeeded?: boolean; // If true, requires context selection before scan
}

/**
 * Column configuration interface
 */
export interface ColumnConfig {
  id: string;
  title: string;
  color: string;
  gradientFrom: string;
  gradientVia?: string;
  buttons: ButtonConfig[];
  reserved?: boolean;
}

/**
 * Build blueprint columns dynamically from the registry
 */
function buildBlueprintColumns(): ColumnConfig[] {
  const registry = getInitializedRegistry();
  const builder = createScanBuilder(registry);

  // Build columns from registry
  const columns = builder.buildColumns();

  // TEMPORARY: Manually inject legacy scan handlers for scans not yet in adapters
  // TODO: Migrate these scans to adapter system and remove this section
  return columns.map((col) => {
    const buttons = col.buttons.map((btn) => {
      // Inject legacy scan handlers
      if (btn.id === 'vision') {
        return {
          ...btn,
          scanHandler: {
            execute: visionScan.executeVisionScan,
            buildDecision: visionScan.buildDecisionData,
          },
        };
      }
      if (btn.id === 'photo') {
        return {
          ...btn,
          scanHandler: {
            execute: photoScan.executePhotoScan,
            buildDecision: photoScan.buildDecisionData,
          },
        };
      }
      if (btn.id === 'custom') {
        // Rename 'custom' to 'selectors'
        return {
          ...btn,
          id: 'selectors',
          label: 'Selectors',
          icon: Target,
          scanHandler: {
            execute: async () => {
              return {
                success: false,
                error: 'Context ID is required for this scan',
              };
            },
            buildDecision: selectorsScan.buildDecisionData,
          },
        };
      }

      return btn;
    });

    // Special handling for backlog column - add 'unused' button if not present
    if (col.id === 'backlog') {
      const hasUnused = buttons.some((btn) => btn.id === 'unused');
      if (!hasUnused) {
        buttons.push({
          id: 'unused',
          label: 'Unused',
          icon: Trash2,
          color: 'red',
          action: 'scan',
          eventTitle: 'Unused Code Scan Completed',
          scanHandler: {
            execute: unusedScan.executeUnusedScan,
            buildDecision: unusedScan.buildDecisionData,
          },
        });
      }
    }

    return { ...col, buttons };
  });
}

/**
 * Blueprint columns - dynamically generated from registry
 */
export const BLUEPRINT_COLUMNS: ColumnConfig[] = buildBlueprintColumns();
