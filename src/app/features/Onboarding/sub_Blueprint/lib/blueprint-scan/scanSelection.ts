/**
 * Blueprint scan selection logic
 * Handles scan selection, context requirements, and decision creation
 */

import { ColumnConfig } from '../blueprintConfig';
import { StepperConfig } from '../stepperConfig';

export interface ScanSelectionCallbacks {
  addDecision: (decision: any) => void;
  setShowContextSelector: (show: boolean) => void;
  setPendingScanId: (scanId: string | null) => void;
  executeScan: (scanId: string, contextId?: string) => Promise<void>;
}

/**
 * Handle scan selection
 * Checks if context is needed and shows appropriate UI
 */
export function handleScanSelection(
  scanId: string,
  columns: ColumnConfig[],
  stepperConfig: StepperConfig | null,
  selectedScanId: string | null,
  setSelectedScanId: (scanId: string | null) => void,
  callbacks: ScanSelectionCallbacks
): void {
  // If already selected, deselect
  if (selectedScanId === scanId) {
    setSelectedScanId(null);
    return;
  }

  // Find button config
  let buttonConfig = null;
  let buttonLabel = scanId;

  // Search in columns first
  for (const column of columns) {
    const button = column.buttons.find(b => b.id === scanId);
    if (button) {
      buttonConfig = button;
      buttonLabel = button.label;
      break;
    }
  }

  // If not found, search in stepper config
  if (!buttonConfig && stepperConfig) {
    for (const group of stepperConfig.groups) {
      const technique = group.techniques.find(t => t.id === scanId);
      if (technique) {
        buttonConfig = {
          id: technique.id,
          label: technique.label,
          contextNeeded: technique.contextNeeded,
        };
        buttonLabel = technique.label;
        break;
      }
    }
  }

  if (!buttonConfig) {
    console.error(`[Blueprint] No button config found for scan: ${scanId}`);
    return;
  }

  // Select the scan
  setSelectedScanId(scanId);

  // If context is needed, show context selector
  if (buttonConfig.contextNeeded) {
    callbacks.setPendingScanId(scanId);
    callbacks.setShowContextSelector(true);
    return;
  }

  // Otherwise, add pre-scan decision to queue
  callbacks.addDecision({
    type: 'pre-scan',
    title: `Execute ${buttonLabel} Scan?`,
    description: `Click Accept to start the ${buttonLabel.toLowerCase()} scan for this project.`,
    severity: 'info',
    data: { scanId },
    onAccept: async () => {
      setSelectedScanId(null);
      await callbacks.executeScan(scanId);
    },
    onReject: async () => {
      setSelectedScanId(null);
    },
  });
}

/**
 * Handle context selection for context-dependent scans
 */
export function handleContextSelection(
  contextId: string,
  contextName: string,
  pendingScanId: string | null,
  columns: ColumnConfig[],
  stepperConfig: StepperConfig | null,
  setSelectedScanId: (scanId: string | null) => void,
  setPendingScanId: (scanId: string | null) => void,
  callbacks: {
    addDecision: (decision: any) => void;
    executeScan: (scanId: string, contextId?: string) => Promise<void>;
  }
): void {
  if (!pendingScanId) return;

  const scanId = pendingScanId;

  // Find button config
  let buttonLabel = scanId;

  // Search in columns
  for (const column of columns) {
    const button = column.buttons.find(b => b.id === scanId);
    if (button) {
      buttonLabel = button.label;
      break;
    }
  }

  // Search in stepper config if not found
  if (buttonLabel === scanId && stepperConfig) {
    for (const group of stepperConfig.groups) {
      const technique = group.techniques.find(t => t.id === scanId);
      if (technique) {
        buttonLabel = technique.label;
        break;
      }
    }
  }

  // Add pre-scan decision with context info
  callbacks.addDecision({
    type: 'pre-scan',
    title: `Execute ${buttonLabel} Scan?`,
    description: `Context: "${contextName}"\n\nClick Accept to start the ${buttonLabel.toLowerCase()} scan for this context.`,
    severity: 'info',
    data: { scanId, contextId },
    onAccept: async () => {
      setSelectedScanId(null);
      setPendingScanId(null);
      await callbacks.executeScan(scanId, contextId);
    },
    onReject: async () => {
      setSelectedScanId(null);
      setPendingScanId(null);
    },
  });
}
