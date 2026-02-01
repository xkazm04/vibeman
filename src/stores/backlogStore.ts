'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { EventLogEntry, CustomBacklogItem, BacklogProposal } from '../types';

/**
 * Backlog Manager Store
 *
 * Manages proposal lifecycle and workflow state.
 * Handles backlog proposals, custom items, and event logging.
 *
 * Separated from nodeStore.ts as part of the domain separation:
 * - SelectionManager: Tree selection state (selectionStore.ts)
 * - BacklogManager: Proposal/workflow lifecycle (this store)
 */

// ============================================================================
// Store Types
// ============================================================================

export interface BacklogState {
  /** Event log entries */
  eventLog: EventLogEntry[];
  /** Pending and processed proposals */
  backlogProposals: BacklogProposal[];
  /** Proposals that are being worked on */
  inProgressProposals: BacklogProposal[];
  /** User-created backlog items */
  customBacklogItems: CustomBacklogItem[];
}

export interface BacklogActions {
  /** Add an event to the log */
  addEvent: (event: EventLogEntry) => void;
  /** Accept a proposal (marks as accepted, logs event) */
  acceptProposal: (proposalId: string) => void;
  /** Reject a proposal (removes it, logs event) */
  rejectProposal: (proposalId: string) => void;
  /** Add a custom backlog item */
  addCustomBacklogItem: (item: CustomBacklogItem) => void;
  /** Move an accepted proposal to in-progress */
  moveToInProgress: (proposalId: string) => void;
  /** Get pending proposals */
  getPendingProposals: () => BacklogProposal[];
  /** Get accepted proposals */
  getAcceptedProposals: () => BacklogProposal[];
  /** Clear all proposals */
  clearProposals: () => void;
  /** Clear event log */
  clearEventLog: () => void;
}

export type BacklogStore = BacklogState & BacklogActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useBacklogStore = create<BacklogStore>()((set, get) => ({
  // Initial state
  eventLog: [],
  backlogProposals: [],
  inProgressProposals: [],
  customBacklogItems: [],

  addEvent: (event: EventLogEntry) => set(state => ({
    eventLog: [event, ...state.eventLog].slice(0, 100)
  })),

  acceptProposal: (proposalId: string) => set(state => {
    const proposal = state.backlogProposals.find(p => p.id === proposalId);
    if (!proposal) return state;

    // Update the proposal status to accepted
    const updatedProposals = state.backlogProposals.map(p =>
      p.id === proposalId
        ? { ...p, status: 'accepted' as const, acceptedAt: new Date() }
        : p
    );

    // Add to event log
    const event: EventLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'proposal_accepted',
      message: `Accepted proposal: ${proposal.title}`,
      agent: proposal.agent,
      title: 'Proposal Accepted',
      description: `Accepted proposal: ${proposal.title}`
    };

    return {
      backlogProposals: updatedProposals,
      eventLog: [event, ...state.eventLog].slice(0, 100)
    };
  }),

  rejectProposal: (proposalId: string) => set(state => {
    const proposal = state.backlogProposals.find(p => p.id === proposalId);
    if (!proposal) return state;

    // Add to event log before removing
    const event: EventLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'proposal_rejected',
      message: `Rejected proposal: ${proposal.title}`,
      agent: proposal.agent,
      title: 'Proposal Rejected',
      description: `Rejected proposal: ${proposal.title}`
    };

    return {
      backlogProposals: state.backlogProposals.filter(p => p.id !== proposalId),
      eventLog: [event, ...state.eventLog].slice(0, 100)
    };
  }),

  addCustomBacklogItem: (item: CustomBacklogItem) => set(state => ({
    customBacklogItems: [item, ...state.customBacklogItems]
  })),

  moveToInProgress: (proposalId: string) => set(state => {
    const proposal = state.backlogProposals.find(p => p.id === proposalId);
    if (!proposal || proposal.status !== 'accepted') return state;

    return {
      inProgressProposals: [...state.inProgressProposals, { ...proposal, status: 'in_progress' as const }]
    };
  }),

  getPendingProposals: (): BacklogProposal[] => {
    return get().backlogProposals.filter(p => !p.status || p.status === 'pending');
  },

  getAcceptedProposals: (): BacklogProposal[] => {
    return get().backlogProposals.filter(p => p.status === 'accepted');
  },

  clearProposals: () => set({
    backlogProposals: [],
    inProgressProposals: [],
    customBacklogItems: []
  }),

  clearEventLog: () => set({ eventLog: [] }),
}));

// Export shallow for convenience
export { useShallow };
