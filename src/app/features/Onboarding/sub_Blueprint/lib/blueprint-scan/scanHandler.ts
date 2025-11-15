/**
 * Blueprint scan handler logic
 * Extracted from DarkBlueprintLayout for better code organization
 *
 * This module dynamically loads and executes scans based on scan IDs.
 * All scan configurations are defined in stepperConfig.ts.
 */

import { StepperConfig } from '../stepperConfig';

export interface ScanHandlerCallbacks {
  startScan: (scanId: string) => void;
  completeScan: () => void;
  failScan: (error: string) => void;
  addDecision: (decision: any) => void;
}

/**
 * Execute a scan by ID
 *
 * @param scanId - The ID of the scan to execute
 * @param stepperConfig - Stepper configuration containing technique definitions
 * @param callbacks - Callbacks for scan lifecycle events
 * @param activeProject - Active project information
 * @param contextId - Optional context ID for context-dependent scans
 */
export async function executeScan(
  scanId: string,
  stepperConfig: StepperConfig | null,
  callbacks: ScanHandlerCallbacks,
  activeProject: any,
  contextId?: string
): Promise<void> {
  // Find technique definition in stepper config
  let buttonConfig = null;

  if (stepperConfig) {
    for (const group of stepperConfig.groups) {
      const technique = group.techniques.find(t => t.id === scanId);
      if (technique) {
        // Convert technique to button config format
        buttonConfig = {
          id: technique.id,
          label: technique.label,
          icon: technique.icon,
          color: technique.color,
          action: 'scan' as const,
          eventTitle: technique.eventTitle,
          contextNeeded: technique.contextNeeded,
          // Scan handler will be dynamically loaded
        };
        break;
      }
    }
  }

  if (!buttonConfig) {
    console.error(`[Blueprint] No technique config found for scan: ${scanId}`);
    console.error(`[Blueprint] Make sure the scan is defined in stepperConfig.ts`);
    return;
  }

  // Start scan
  callbacks.startScan(scanId);

  // Execute scan in background (non-blocking)
  (async () => {
    try {
      console.log(`[Blueprint] Starting scan: ${scanId}`);

      // Execute scan (with contextId if needed)
      let result;
      try {
        // Dynamically load scan based on scan ID
          if (buttonConfig.contextNeeded && contextId) {
            // For context-dependent scans
            if (scanId === 'selectors') {
              const { executeSelectorsScan } = await import('../blueprintSelectorsScan');
              result = await executeSelectorsScan(contextId);
            } else if (scanId === 'photo') {
              const { executePhotoScan } = await import('../context-scans/blueprintPhotoScan');
              result = await executePhotoScan(contextId);
            } else if (scanId === 'test') {
              const { executeTestScan } = await import('../context-scans/blueprintTestScan');
              result = await executeTestScan(contextId);
            } else if (scanId === 'separator') {
              const { executeSeparatorScan } = await import('../context-scans/blueprintSeparatorScan');
              result = await executeSeparatorScan(contextId);
            } else if (scanId === 'testDesign') {
              const { executeTestDesignScan } = await import('../context-scans/blueprintTestDesign');
              result = await executeTestDesignScan(contextId);
            } else {
              result = {
                success: false,
                error: `No scan implementation found for: ${scanId}`,
              };
            }
          } else {
            // For non-context scans, dynamically import based on scan ID
            result = await executeScanById(scanId);
          }
      } catch (scanError) {
        // Catch execution errors and convert to failed result
        const errorMsg = scanError instanceof Error ? scanError.message : 'Scan execution failed';
        console.error(`[Blueprint] Scan execution error for ${scanId}:`, scanError);
        result = {
          success: false,
          error: errorMsg,
        };
      }

      // Handle failure
      if (!result.success) {
        const errorMsg = result.error || 'Scan failed';
        console.error(`[Blueprint] Scan ${scanId} failed:`, errorMsg);
        callbacks.failScan(errorMsg);
        return;
      }

      // Mark as complete
      callbacks.completeScan();

      // Build decision data by dynamically loading buildDecision function
      let decisionData = null;
      try {
        if (buttonConfig.contextNeeded && contextId) {
            // For context-dependent scans
            if (scanId === 'separator') {
              const { buildDecisionData } = await import('../context-scans/blueprintSeparatorScan');
              decisionData = buildDecisionData(result);
            } else if (scanId === 'testDesign') {
              const { buildDecisionData } = await import('../context-scans/blueprintTestDesign');
              decisionData = buildDecisionData(result);
            } else if (scanId === 'photo') {
              const { buildDecisionData } = await import('../context-scans/blueprintPhotoScan');
              decisionData = buildDecisionData(result);
            } else if (scanId === 'test') {
              const { buildDecisionData } = await import('../context-scans/blueprintTestScan');
              decisionData = buildDecisionData(result);
            } else if (scanId === 'selectors') {
              const { buildDecisionData } = await import('../blueprintSelectorsScan');
              decisionData = buildDecisionData(result);
            }
        } else {
          // For non-context scans
          decisionData = await buildDecisionById(scanId, result);
        }
      } catch (buildError) {
        console.error(`[Blueprint] Error building decision for ${scanId}:`, buildError);
      }

      // If decision data exists, wrap onAccept to create event after successful acceptance
      if (decisionData) {
        const originalOnAccept = decisionData.onAccept;

        // Wrap onAccept to create event after successful acceptance
        decisionData.onAccept = async () => {
          try {
            // Execute original accept logic
            await originalOnAccept();

            // Create event only after successful acceptance
            if (buttonConfig.eventTitle && activeProject) {
              await createScanEvent(
                buttonConfig.eventTitle,
                scanId,
                activeProject,
                contextId
              );
            }
          } catch (acceptError) {
            console.error(`[Blueprint] Error in onAccept for ${scanId}:`, acceptError);
            throw acceptError;
          }
        };

        // Add to decision queue
        callbacks.addDecision(decisionData);
      } else {
        // If no decision needed, create event immediately
        if (buttonConfig.eventTitle && activeProject) {
          await createScanEvent(
            buttonConfig.eventTitle,
            scanId,
            activeProject,
            contextId
          );
        }
      }
    } catch (error) {
      // Top-level catch for any unexpected errors
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Blueprint] Unexpected error in scan ${scanId}:`, error);
      callbacks.failScan(errorMsg);
    }
  })();
}

/**
 * Execute scan by ID (dynamic import based on scan type)
 */
async function executeScanById(scanId: string): Promise<any> {
  switch (scanId) {
    case 'vision': {
      const { executeVisionScan } = await import('../blueprintVisionScan');
      return await executeVisionScan();
    }
    case 'contexts': {
      const { executeContextsScan } = await import('../blueprintContextsScan');
      return await executeContextsScan();
    }
    case 'structure': {
      const { executeStructureScan } = await import('../context-scans/blueprintStructureScan');
      return await executeStructureScan();
    }
    case 'build': {
      const { executeBuildScan } = await import('../blueprintBuildScan');
      return await executeBuildScan();
    }
    case 'unused': {
      const { executeUnusedScan } = await import('../blueprintUnusedScan');
      return await executeUnusedScan();
    }
    default:
      return {
        success: false,
        error: `No scan implementation found for: ${scanId}`,
      };
  }
}

/**
 * Build decision by ID (dynamic import based on scan type)
 */
async function buildDecisionById(scanId: string, result: any): Promise<any> {
  switch (scanId) {
    case 'vision': {
      const { buildDecisionData } = await import('../blueprintVisionScan');
      return buildDecisionData(result);
    }
    case 'contexts': {
      const { buildDecisionData } = await import('../blueprintContextsScan');
      return buildDecisionData(result);
    }
    case 'structure': {
      const { buildDecisionData } = await import('../context-scans/blueprintStructureScan');
      return buildDecisionData(result);
    }
    case 'build': {
      const { buildDecisionData } = await import('../blueprintBuildScan');
      return buildDecisionData(result);
    }
    case 'unused': {
      const { buildDecisionData } = await import('../blueprintUnusedScan');
      return buildDecisionData(result);
    }
    default:
      return null;
  }
}

/**
 * Create a scan event in the database
 */
export async function createScanEvent(
  eventTitle: string,
  scanId: string,
  activeProject: any,
  contextId?: string
): Promise<void> {
  if (!activeProject) return;

  try {
    const response = await fetch('/api/blueprint/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: eventTitle,
        description: `Scan completed successfully`,
        type: 'success',
        agent: 'blueprint',
        message: `${scanId} scan executed via Blueprint`,
        context_id: contextId || null,
      }),
    });

    if (!response.ok) {
      return;
    }

    const result = await response.json();

    if (result.success) {
      console.log(`[Blueprint] Created scan event for ${scanId}`);
    }
  } catch (error) {
    // Silent error handling
    console.error('[Blueprint] Error creating scan event:', error);
  }
}
