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
import { useActiveProjectStore } from '@/stores/activeProjectStore';

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
 * All scans are now registered in the ScanRegistry - no hard-coded imports needed!
 */
function buildBlueprintColumns(): ColumnConfig[] {
  const registry = getInitializedRegistry();
  const builder = createScanBuilder(registry);

  // Build columns from registry
  const columns = builder.buildColumns();

  // Enhance buttons with registry-backed scan handlers
  return columns.map((col) => {
    const buttons = col.buttons.map((btn) => {
      // For buttons with adapters, create scan handlers that use the registry
      if (btn.scanHandler) {
        return {
          ...btn,
          scanHandler: {
            execute: async (contextId?: string) => {
              const { activeProject } = useActiveProjectStore.getState();
              if (!activeProject) {
                return {
                  success: false,
                  error: 'No active project selected',
                };
              }

              // Execute scan via registry
              const result = await registry.executeScan(
                activeProject,
                btn.id as any,
                { contextId }
              );

              return {
                success: result.success,
                error: result.error,
                data: result.data,
                violations: result.data?.violations,
              };
            },
            buildDecision: (result: ScanResult) => {
              const { activeProject } = useActiveProjectStore.getState();
              if (!activeProject) {
                return null;
              }

              // Get the best adapter for this scan category
              const adapter = registry.getBestAdapter(activeProject, btn.id as any);
              if (!adapter) {
                return null;
              }

              // Build decision using the adapter
              return adapter.buildDecision(
                {
                  success: result.success,
                  error: result.error,
                  data: result.data,
                },
                activeProject
              );
            },
          },
        };
      }

      // Handle 'custom' category buttons (selectors, unused)
      if (btn.id === 'custom') {
        // Check if we have a selectors adapter registered
        const { activeProject } = useActiveProjectStore.getState();
        if (activeProject) {
          const selectorsAdapter = registry.getAdapter('nextjs-selectors');
          if (selectorsAdapter) {
            return {
              ...btn,
              id: 'selectors',
              label: 'Selectors',
              icon: Target,
              scanHandler: {
                execute: async (contextId?: string) => {
                  if (!activeProject) {
                    return { success: false, error: 'No active project selected' };
                  }
                  if (!contextId) {
                    return { success: false, error: 'Context ID is required for this scan' };
                  }

                  const result = await registry.executeAdapter(selectorsAdapter, activeProject, {
                    contextId,
                  });

                  return {
                    success: result.success,
                    error: result.error,
                    data: result.data,
                  };
                },
                buildDecision: (result: ScanResult) => {
                  if (!activeProject) return null;
                  return selectorsAdapter.buildDecision(
                    { success: result.success, error: result.error, data: result.data },
                    activeProject
                  );
                },
              },
            };
          }
        }
      }

      return btn;
    });

    // Special handling for backlog column - add 'unused' button from registry
    if (col.id === 'backlog') {
      const hasUnused = buttons.some((btn) => btn.id === 'unused');
      if (!hasUnused) {
        const { activeProject } = useActiveProjectStore.getState();
        if (activeProject) {
          const unusedAdapter = registry.getAdapter('nextjs-unused');
          if (unusedAdapter) {
            buttons.push({
              id: 'unused',
              label: 'Unused',
              icon: Trash2,
              color: 'red',
              action: 'scan',
              eventTitle: 'Unused Code Scan Completed',
              scanHandler: {
                execute: async () => {
                  if (!activeProject) {
                    return { success: false, error: 'No active project selected' };
                  }

                  const result = await registry.executeAdapter(unusedAdapter, activeProject);

                  return {
                    success: result.success,
                    error: result.error,
                    data: result.data,
                  };
                },
                buildDecision: (result: ScanResult) => {
                  if (!activeProject) return null;
                  return unusedAdapter.buildDecision(
                    { success: result.success, error: result.error, data: result.data },
                    activeProject
                  );
                },
              },
            });
          }
        }
      }
    }

    return { ...col, buttons };
  });
}

/**
 * Blueprint columns - dynamically generated from registry
 */
export const BLUEPRINT_COLUMNS: ColumnConfig[] = buildBlueprintColumns();
