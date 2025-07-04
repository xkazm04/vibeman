'use client';
import { useState, useEffect } from 'react';
import { AppState, AppStore, EventLogEntry, CustomBacklogItem, BacklogProposal } from '../types';

// Mock data for backlog proposals with status and impacted files
const mockBacklogProposals: BacklogProposal[] = [
  {
    id: '1',
    agent: 'developer',
    title: 'Optimize component re-renders',
    description: 'Implement React.memo and useCallback to reduce unnecessary re-renders in the tree structure. This will improve performance significantly, especially for large component trees.',
    timestamp: new Date(Date.now() - 300000),
    status: 'pending',
    impactedFiles: ['components', 'agent-manager', 'AgentManager.tsx', 'AgentButton.tsx']
  },
  {
    id: '2',
    agent: 'tester',
    title: 'Add unit tests for state management',
    description: 'Create comprehensive test suite covering all Zustand store actions and state mutations. Include edge cases and error scenarios.',
    timestamp: new Date(Date.now() - 600000),
    status: 'pending',
    impactedFiles: ['lib', 'store', 'app-store.ts', 'utils.ts']
  },
  {
    id: '3',
    agent: 'artist',
    title: 'Enhance accessibility features',
    description: 'Implement keyboard navigation and screen reader support for the code structure viewer. Add ARIA labels and focus management.',
    timestamp: new Date(Date.now() - 900000),
    status: 'accepted',
    impactedFiles: ['components', 'ui', 'GlowCard.tsx', 'Button.tsx', 'Input.tsx']
  },
  {
    id: '4',
    agent: 'mastermind',
    title: 'Integrate real-time collaboration',
    description: 'Add WebSocket support for multi-user agent coordination and shared state management. Include conflict resolution and synchronization.',
    timestamp: new Date(Date.now() - 1200000),
    status: 'pending',
    impactedFiles: ['lib', 'api.ts', 'components', 'layout', 'MainLayout.tsx']
  },
  {
    id: '5',
    agent: 'developer',
    title: 'Implement code splitting',
    description: 'Add dynamic imports and lazy loading for better performance. Split routes and components to reduce initial bundle size.',
    timestamp: new Date(Date.now() - 1500000),
    status: 'accepted',
    impactedFiles: ['components', 'layout', 'MainLayout.tsx', 'Sidebar.tsx']
  }
];

// Zustand-like state management
export const useStore = (() => {
  let state: AppState = {
    activeTab: 'developer',
    activeAgents: new Set(),
    selectedNodes: new Set(),
    highlightedNodes: new Set(),
    eventLog: [],
    backlogProposals: [...mockBacklogProposals],
    inProgressProposals: [],
    customBacklogItems: []
  };
  
  const listeners = new Set<(state: AppState) => void>();
  
  const setState = (updater: ((prev: AppState) => AppState) | Partial<AppState>) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    listeners.forEach(listener => listener(state));
  };
  
  const subscribe = (listener: (state: AppState) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  
  return (): AppStore => {
    const [, forceUpdate] = useState({});
    
    useEffect(() => {
      const unsubscribe = subscribe(() => forceUpdate({}));
      return () => {
        unsubscribe();
      };
    }, []);
    
    return {
      ...state,
      setActiveTab: (tabId: string) => setState(prev => ({ ...prev, activeTab: tabId })),
      toggleAgent: (agentId: string) => setState(prev => {
        const newActiveAgents = new Set(prev.activeAgents);
        if (newActiveAgents.has(agentId)) {
          newActiveAgents.delete(agentId);
        } else {
          newActiveAgents.add(agentId);
        }
        return { ...prev, activeAgents: newActiveAgents };
      }),
      toggleNode: (nodeId: string) => setState(prev => {
        const newSelectedNodes = new Set(prev.selectedNodes);
        if (newSelectedNodes.has(nodeId)) {
          newSelectedNodes.delete(nodeId);
        } else {
          newSelectedNodes.add(nodeId);
        }
        return { ...prev, selectedNodes: newSelectedNodes };
      }),
      highlightNodes: (nodeIds: string[]) => setState(prev => ({
        ...prev,
        highlightedNodes: new Set(nodeIds)
      })),
      clearHighlights: () => setState(prev => ({
        ...prev,
        highlightedNodes: new Set()
      })),
      addEvent: (event: EventLogEntry) => setState(prev => ({
        ...prev,
        eventLog: [event, ...prev.eventLog].slice(0, 100)
      })),
      acceptProposal: (proposalId: string) => setState(prev => {
        const proposal = prev.backlogProposals.find(p => p.id === proposalId);
        if (!proposal) return prev;
        
        // Update the proposal status to accepted instead of removing it
        const updatedProposals = prev.backlogProposals.map(p => 
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
          ...prev,
          backlogProposals: updatedProposals,
          eventLog: [event, ...prev.eventLog].slice(0, 100)
        };
      }),
      rejectProposal: (proposalId: string) => setState(prev => {
        const proposal = prev.backlogProposals.find(p => p.id === proposalId);
        if (!proposal) return prev;
        
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
          ...prev,
          backlogProposals: prev.backlogProposals.filter(p => p.id !== proposalId),
          eventLog: [event, ...prev.eventLog].slice(0, 100)
        };
      }),
      addCustomBacklogItem: (item: CustomBacklogItem) => setState(prev => ({
        ...prev,
        customBacklogItems: [item, ...prev.customBacklogItems]
      })),
      moveToInProgress: (proposalId: string) => setState(prev => {
        const proposal = prev.backlogProposals.find(p => p.id === proposalId);
        if (!proposal || proposal.status !== 'accepted') return prev;
        
        return {
          ...prev,
          inProgressProposals: [...prev.inProgressProposals, { ...proposal, status: 'in_progress' as const }]
        };
      })
    };
  };
})();