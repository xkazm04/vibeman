import { create } from 'zustand';
import { StepperConfig, getStepperConfig } from '../lib/stepperConfig';

export interface ScanStatus {
  name: string;
  lastRun: number | null; // timestamp in ms, null if never run
  isRunning: boolean;
  progress: number; // 0-100
  hasError: boolean; // true if last scan failed
  errorMessage?: string; // error message from last scan
}

export interface TaskerProgress {
  isRunning: boolean;
  completedCount: number;
  totalCount: number;
}

interface BlueprintState {
  scans: Record<string, ScanStatus>;
  currentScan: string | null;
  scanProgress: number;
  taskerProgress: TaskerProgress; // Tasker module progress state

  // Stepper state (new)
  currentStepIndex: number;
  completedSteps: number[];
  stepperConfig: StepperConfig | null;

  // Tooltip state
  activeTooltip: string | null; // ID of column with active tooltip

  // Recommendation state (Annette AI assistant recommendations)
  recommendedScans: Record<string, number>; // scanId -> timestamp when recommended

  // Actions
  startScan: (scanName: string) => void;
  updateScanProgress: (progress: number) => void;
  completeScan: () => void;
  failScan: (error: string) => void;
  clearScanError: (scanName: string) => void;
  getScanStatus: (scanName: string) => ScanStatus;
  getFailedScans: () => ScanStatus[];
  getDaysAgo: (scanName: string) => number | null;
  loadScanEvents: (projectId: string, eventTitles: Record<string, string>) => Promise<void>;

  // Tasker progress actions
  updateTaskerProgress: (completedCount: number, totalCount: number) => void;
  setTaskerRunning: (isRunning: boolean) => void;
  resetTaskerProgress: () => void;

  // Stepper actions (new)
  setCurrentStep: (index: number) => void;
  markStepCompleted: (index: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetStepper: () => void;
  initStepperConfig: (projectType: 'nextjs' | 'fastapi' | 'react' | 'python' | 'other') => void;
  toggleGroup: (groupId: string, enabled: boolean) => void;

  // Tooltip actions
  showTooltip: (columnId: string) => void;
  hideTooltip: () => void;

  // Recommendation actions (Annette AI integration)
  recommendScan: (scanId: string) => void;
  clearRecommendation: (scanId: string) => void;
  isRecommended: (scanId: string) => boolean;
}

/**
 * Auto-generate default scans from stepper configuration
 * This eliminates the need to manually maintain scan lists
 */
function generateDefaultScans(config: StepperConfig): Record<string, ScanStatus> {
  const scans: Record<string, ScanStatus> = {};

  for (const group of config.groups) {
    for (const technique of group.techniques) {
      scans[technique.id] = {
        name: technique.label,
        lastRun: null,
        isRunning: false,
        progress: 0,
        hasError: false,
      };
    }
  }

  return scans;
}

// Initialize with a default Next.js config as fallback
const DEFAULT_STEPPER_CONFIG = getStepperConfig('nextjs');
const DEFAULT_SCANS: Record<string, ScanStatus> = generateDefaultScans(DEFAULT_STEPPER_CONFIG);

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  scans: DEFAULT_SCANS,
  currentScan: null,
  scanProgress: 0,
  taskerProgress: { isRunning: false, completedCount: 0, totalCount: 0 }, // Initialize tasker progress

  // Stepper state (new)
  currentStepIndex: 0,
  completedSteps: [],
  stepperConfig: null,

  // Tooltip state
  activeTooltip: null,

  // Recommendation state (Annette AI)
  recommendedScans: {},

  startScan: (scanName: string) => {
    set((state) => ({
      currentScan: scanName,
      scanProgress: 0,
      scans: {
        ...state.scans,
        [scanName]: {
          ...state.scans[scanName],
          isRunning: true,
          progress: 0,
          hasError: false, // Clear error when starting new scan
          errorMessage: undefined,
        },
      },
    }));
  },

  updateScanProgress: (progress: number) => {
    const { currentScan } = get();
    if (!currentScan) return;

    set((state) => ({
      scanProgress: progress,
      scans: {
        ...state.scans,
        [currentScan]: {
          ...state.scans[currentScan],
          progress,
        },
      },
    }));
  },

  completeScan: () => {
    const { currentScan } = get();
    if (!currentScan) return;

    set((state) => ({
      currentScan: null,
      scanProgress: 0,
      scans: {
        ...state.scans,
        [currentScan]: {
          ...state.scans[currentScan],
          isRunning: false,
          progress: 100,
          lastRun: Date.now(),
          hasError: false,
          errorMessage: undefined,
        },
      },
    }));
  },

  failScan: (error: string) => {
    const { currentScan } = get();
    if (!currentScan) return;

    set((state) => ({
      currentScan: null,
      scanProgress: 0,
      scans: {
        ...state.scans,
        [currentScan]: {
          ...state.scans[currentScan],
          isRunning: false,
          progress: 0,
          lastRun: Date.now(),
          hasError: true,
          errorMessage: error,
        },
      },
    }));
  },

  clearScanError: (scanName: string) => {
    set((state) => ({
      scans: {
        ...state.scans,
        [scanName]: {
          ...state.scans[scanName],
          hasError: false,
          errorMessage: undefined,
        },
      },
    }));
  },

  getScanStatus: (scanName: string) => {
    const { scans } = get();
    return scans[scanName] || DEFAULT_SCANS[scanName] || {
      name: scanName,
      lastRun: null,
      isRunning: false,
      progress: 0,
      hasError: false,
    };
  },

  getFailedScans: () => {
    const { scans } = get();
    return Object.values(scans).filter(scan => scan.hasError);
  },

  getDaysAgo: (scanName: string) => {
    const { scans } = get();
    const scan = scans[scanName];
    if (!scan || !scan.lastRun) return null;

    const days = Math.floor((Date.now() - scan.lastRun) / (24 * 60 * 60 * 1000));
    return days;
  },

  loadScanEvents: async (projectId: string, eventTitles: Record<string, string>) => {
    try {
      // Build comma-separated list of event titles
      const titles = Object.values(eventTitles).join(',');

      if (!titles) {
        return;
      }

      const response = await fetch(`/api/blueprint/events?projectId=${projectId}&titles=${encodeURIComponent(titles)}`);

      if (!response.ok) {
        return;
      }

      const result = await response.json();

      if (!result.success || !result.events) {
        return;
      }

      // Update scans with last run times from events
      set((state) => {
        const updatedScans = { ...state.scans };

        // Map event titles back to scan IDs
        for (const [scanId, eventTitle] of Object.entries(eventTitles)) {
          const event = result.events[eventTitle];

          if (event && event.created_at && updatedScans[scanId]) {
            // Parse created_at to timestamp
            const timestamp = new Date(event.created_at).getTime();
            updatedScans[scanId] = {
              ...updatedScans[scanId],
              lastRun: timestamp,
            };
          }
        }

        return { scans: updatedScans };
      });
    } catch (error) {
      // Error loading events - fail silently
    }
  },

  // Tasker progress management
  updateTaskerProgress: (completedCount: number, totalCount: number) => {
    set({
      taskerProgress: {
        isRunning: true,
        completedCount,
        totalCount,
      },
    });
  },

  setTaskerRunning: (isRunning: boolean) => {
    set((state) => ({
      taskerProgress: {
        ...state.taskerProgress,
        isRunning,
      },
    }));
  },

  resetTaskerProgress: () => {
    set({
      taskerProgress: {
        isRunning: false,
        completedCount: 0,
        totalCount: 0,
      },
    });
  },

  // Stepper actions (new)
  setCurrentStep: (index: number) => {
    set({ currentStepIndex: index });
  },

  markStepCompleted: (index: number) => {
    set((state) => {
      if (!state.completedSteps.includes(index)) {
        return { completedSteps: [...state.completedSteps, index] };
      }
      return state;
    });
  },

  nextStep: () => {
    const { currentStepIndex, stepperConfig } = get();
    if (!stepperConfig) return;

    const totalSteps = stepperConfig.groups
      .filter(g => g.enabled)
      .reduce((acc, g) => acc + g.techniques.length, 0);

    if (currentStepIndex < totalSteps - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  previousStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  resetStepper: () => {
    set({
      currentStepIndex: 0,
      completedSteps: [],
    });
  },

  initStepperConfig: (projectType: 'nextjs' | 'fastapi' | 'react' | 'python' | 'other') => {
    const config = getStepperConfig(projectType);
    // Auto-generate scans from the new config
    const scans = generateDefaultScans(config);
    set({ stepperConfig: config, scans });
  },

  toggleGroup: (groupId: string, enabled: boolean) => {
    set((state) => {
      if (!state.stepperConfig) return state;

      return {
        stepperConfig: {
          ...state.stepperConfig,
          groups: state.stepperConfig.groups.map((group) =>
            group.id === groupId ? { ...group, enabled } : group
          ),
        },
      };
    });
  },

  // Tooltip actions
  showTooltip: (columnId: string) => {
    set({ activeTooltip: columnId });
  },

  hideTooltip: () => {
    set({ activeTooltip: null });
  },

  // Recommendation actions (Annette AI integration)
  recommendScan: (scanId: string) => {
    console.log('[BlueprintStore] recommendScan called for:', scanId);
    const timestamp = Date.now();
    set((state) => {
      console.log('[BlueprintStore] Current recommendedScans:', state.recommendedScans);
      const newState = {
        recommendedScans: {
          ...state.recommendedScans,
          [scanId]: timestamp,
        },
      };
      console.log('[BlueprintStore] New recommendedScans:', newState.recommendedScans);
      return newState;
    });

    // Auto-clear after 20 seconds
    setTimeout(() => {
      set((state) => {
        // Only clear if timestamp matches (prevent clearing newer recommendations)
        if (state.recommendedScans[scanId] === timestamp) {
          console.log('[BlueprintStore] Auto-clearing recommendation for:', scanId);
          const { [scanId]: _, ...rest } = state.recommendedScans;
          return { recommendedScans: rest };
        }
        return state;
      });
    }, 20000); // 20 seconds
  },

  clearRecommendation: (scanId: string) => {
    set((state) => {
      const { [scanId]: _, ...rest } = state.recommendedScans;
      return { recommendedScans: rest };
    });
  },

  isRecommended: (scanId: string) => {
    const { recommendedScans } = get();
    const isRecommended = scanId in recommendedScans;
    // Only log if recommended to avoid spam
    if (isRecommended) {
      console.log('[BlueprintStore] isRecommended check for', scanId, ':', isRecommended);
    }
    return isRecommended;
  },
}));
