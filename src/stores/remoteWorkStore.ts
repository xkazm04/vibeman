/**
 * Remote Work Store
 * Manages remote directions, requirements, batches, events, and TaskRunner mode.
 * Split from emulatorStore for reduced re-render blast radius.
 */

import { create } from 'zustand';

// Remote direction (fetched from target device)
export interface RemoteDirection {
  id: string;
  summary: string;
  direction: string;
  context_name?: string;
  context_map_title?: string;
  project_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

// Remote requirement (fetched from target device)
export interface RemoteRequirement {
  id: string;
  name: string;
  project_id: string;
  project_name?: string;
  created_at: string;
  source?: 'direction' | 'idea' | 'manual';
}

// Remote batch status info
export interface RemoteBatchInfo {
  batch_id: string;
  session_id?: string;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  current_task?: string;
  started_at?: string;
}

// Remote event from event feed
export interface RemoteEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface TriageStats {
  reviewed: number;
  total: number;
  accepted: number;
  rejected: number;
}

interface RemoteWorkState {
  remoteDirections: RemoteDirection[];
  isLoadingDirections: boolean;
  directionsError: string | null;
  triageStats: TriageStats;

  remoteRequirements: RemoteRequirement[];
  isLoadingRequirements: boolean;
  requirementsError: string | null;
  selectedRequirementIds: string[];

  remoteBatches: RemoteBatchInfo[];
  isLoadingBatches: boolean;
  batchError: string | null;

  eventFeed: RemoteEvent[];
  isLoadingEvents: boolean;

  isRemoteTaskRunnerMode: boolean;
}

interface RemoteWorkActions {
  // Direction Actions
  setRemoteDirections: (directions: RemoteDirection[]) => void;
  setLoadingDirections: (loading: boolean) => void;
  setDirectionsError: (error: string | null) => void;
  updateTriageStats: (stats: Partial<TriageStats>) => void;
  removeDirection: (directionId: string) => void;

  // Requirement Actions
  setRemoteRequirements: (requirements: RemoteRequirement[]) => void;
  setLoadingRequirements: (loading: boolean) => void;
  setRequirementsError: (error: string | null) => void;
  toggleRequirementSelection: (requirementId: string) => void;
  selectAllRequirements: () => void;
  clearRequirementSelection: () => void;

  // Batch Actions
  setRemoteBatches: (batches: RemoteBatchInfo[]) => void;
  setLoadingBatches: (loading: boolean) => void;
  setBatchError: (error: string | null) => void;
  updateBatchStatus: (batchId: string, updates: Partial<RemoteBatchInfo>) => void;

  // Event Actions
  setEventFeed: (events: RemoteEvent[]) => void;
  addEvent: (event: RemoteEvent) => void;
  setLoadingEvents: (loading: boolean) => void;

  // TaskRunner Remote Mode
  setRemoteTaskRunnerMode: (mode: boolean) => void;

  // Reset
  reset: () => void;
}

export type RemoteWorkStore = RemoteWorkState & RemoteWorkActions;

const initialState: RemoteWorkState = {
  remoteDirections: [],
  isLoadingDirections: false,
  directionsError: null,
  triageStats: { reviewed: 0, total: 0, accepted: 0, rejected: 0 },

  remoteRequirements: [],
  isLoadingRequirements: false,
  requirementsError: null,
  selectedRequirementIds: [],

  remoteBatches: [],
  isLoadingBatches: false,
  batchError: null,

  eventFeed: [],
  isLoadingEvents: false,

  isRemoteTaskRunnerMode: false,
};

export const useRemoteWorkStore = create<RemoteWorkStore>()(
  (set, get) => ({
    ...initialState,

    // Direction Actions
    setRemoteDirections: (directions) =>
      set({
        remoteDirections: directions,
        triageStats: { ...get().triageStats, total: directions.length },
      }),
    setLoadingDirections: (loading) => set({ isLoadingDirections: loading }),
    setDirectionsError: (error) => set({ directionsError: error }),
    updateTriageStats: (stats) =>
      set({ triageStats: { ...get().triageStats, ...stats } }),
    removeDirection: (directionId) =>
      set({
        remoteDirections: get().remoteDirections.filter((d) => d.id !== directionId),
        triageStats: { ...get().triageStats, reviewed: get().triageStats.reviewed + 1 },
      }),

    // Requirement Actions
    setRemoteRequirements: (requirements) =>
      set({ remoteRequirements: requirements, isLoadingRequirements: false }),
    setLoadingRequirements: (loading) => set({ isLoadingRequirements: loading }),
    setRequirementsError: (error) => set({ requirementsError: error }),
    toggleRequirementSelection: (requirementId) => {
      const current = get().selectedRequirementIds;
      const isSelected = current.includes(requirementId);
      set({
        selectedRequirementIds: isSelected
          ? current.filter((id) => id !== requirementId)
          : [...current, requirementId],
      });
    },
    selectAllRequirements: () =>
      set({ selectedRequirementIds: get().remoteRequirements.map((r) => r.id) }),
    clearRequirementSelection: () => set({ selectedRequirementIds: [] }),

    // Batch Actions
    setRemoteBatches: (batches) =>
      set({ remoteBatches: batches, isLoadingBatches: false }),
    setLoadingBatches: (loading) => set({ isLoadingBatches: loading }),
    setBatchError: (error) => set({ batchError: error }),
    updateBatchStatus: (batchId, updates) =>
      set({
        remoteBatches: get().remoteBatches.map((b) =>
          b.batch_id === batchId ? { ...b, ...updates } : b
        ),
      }),

    // Event Actions
    setEventFeed: (events) => set({ eventFeed: events, isLoadingEvents: false }),
    addEvent: (event) =>
      set({ eventFeed: [event, ...get().eventFeed].slice(0, 50) }),
    setLoadingEvents: (loading) => set({ isLoadingEvents: loading }),

    // TaskRunner Remote Mode
    setRemoteTaskRunnerMode: (mode) => set({ isRemoteTaskRunnerMode: mode }),

    // Reset
    reset: () => set(initialState),
  })
);
