import { create } from 'zustand';

export interface ScanStatus {
  name: string;
  lastRun: number | null; // timestamp in ms, null if never run
  isRunning: boolean;
  progress: number; // 0-100
}

interface BlueprintState {
  scans: Record<string, ScanStatus>;
  currentScan: string | null;
  scanProgress: number;

  // Actions
  startScan: (scanName: string) => void;
  updateScanProgress: (progress: number) => void;
  completeScan: () => void;
  getScanStatus: (scanName: string) => ScanStatus;
  getDaysAgo: (scanName: string) => number | null;
}

const DEFAULT_SCANS: Record<string, ScanStatus> = {
  vision: { name: 'Vision', lastRun: null, isRunning: false, progress: 0 },
  contexts: { name: 'Contexts', lastRun: Date.now() - 2 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0 }, // 2 days ago
  structure: { name: 'Structure', lastRun: Date.now() - 5 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0 }, // 5 days ago
  build: { name: 'Build', lastRun: null, isRunning: false, progress: 0 },
  dependencies: { name: 'Dependencies', lastRun: Date.now() - 10 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0 }, // 10 days ago
  ideas: { name: 'Ideas', lastRun: Date.now() - 1 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0 }, // 1 day ago
  prototype: { name: 'Prototype', lastRun: null, isRunning: false, progress: 0 },
  contribute: { name: 'Contribute', lastRun: Date.now() - 7 * 24 * 60 * 60 * 1000, isRunning: false, progress: 0 }, // 7 days ago
  fix: { name: 'Fix', lastRun: null, isRunning: false, progress: 0 },
  photo: { name: 'Photo', lastRun: null, isRunning: false, progress: 0 },
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
}));
