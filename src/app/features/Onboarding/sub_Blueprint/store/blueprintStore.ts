import { create } from 'zustand';

export interface ScanStatus {
  name: string;
  lastRun: number | null; // timestamp in ms, null if never run
  isRunning: boolean;
  progress: number; // 0-100
  hasError: boolean; // true if last scan failed
  errorMessage?: string; // error message from last scan
}

interface BlueprintState {
  scans: Record<string, ScanStatus>;
  currentScan: string | null;
  scanProgress: number;

  // Actions
  startScan: (scanName: string) => void;
  updateScanProgress: (progress: number) => void;
  completeScan: () => void;
  failScan: (error: string) => void;
  getScanStatus: (scanName: string) => ScanStatus;
  getDaysAgo: (scanName: string) => number | null;
  loadScanEvents: (projectId: string, eventTitles: Record<string, string>) => Promise<void>;
}

const DEFAULT_SCANS: Record<string, ScanStatus> = {
  vision: { name: 'Vision', lastRun: null, isRunning: false, progress: 0, hasError: false },
  contexts: { name: 'Contexts', lastRun: Date.now() - 2 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0, hasError: false }, // 2 days ago
  structure: { name: 'Structure', lastRun: Date.now() - 5 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0, hasError: false }, // 5 days ago
  build: { name: 'Build', lastRun: null, isRunning: false, progress: 0, hasError: false },
  dependencies: { name: 'Dependencies', lastRun: Date.now() - 10 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0, hasError: false }, // 10 days ago
  ideas: { name: 'Ideas', lastRun: Date.now() - 1 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0, hasError: false }, // 1 day ago
  prototype: { name: 'Prototype', lastRun: null, isRunning: false, progress: 0, hasError: false },
  contribute: { name: 'Contribute', lastRun: Date.now() - 7 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0, hasError: false }, // 7 days ago
  fix: { name: 'Fix', lastRun: null, isRunning: false, progress: 0, hasError: false },
  photo: { name: 'Photo', lastRun: null, isRunning: false, progress: 0, hasError: false },
};

export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  scans: DEFAULT_SCANS,
  currentScan: null,
  scanProgress: 0,

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

  getScanStatus: (scanName: string) => {
    const { scans } = get();
    return scans[scanName] || DEFAULT_SCANS[scanName];
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
        console.error('[BlueprintStore] Failed to fetch events');
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

      console.log('[BlueprintStore] ✅ Loaded scan events');
    } catch (error) {
      console.error('[BlueprintStore] Error loading events:', error);
    }
  },
}));
