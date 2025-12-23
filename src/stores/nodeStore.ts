'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { AppState, AppStore, EventLogEntry, CustomBacklogItem, BacklogProposal, TreeNode } from '../types';
import { isSupportedFile } from '../helpers/typeStyles';

// Mock data for backlog proposals with status and impacted files
const mockBacklogProposals: BacklogProposal[] = [
  {
    id: '1',
    agent: 'developer',
    title: 'Optimize component re-renders',
    description: 'Implement React.memo and useCallback to reduce unnecessary re-renders in the tree structure. This will improve performance significantly, especially for large component trees.',
    timestamp: new Date(Date.now() - 300000),
    status: 'pending',
    impactedFiles: [
      { filepath: 'components/agent-manager/AgentManager.tsx', type: 'update' },
      { filepath: 'components/agent-manager/AgentButton.tsx', type: 'update' }
    ]
  },
  {
    id: '2',
    agent: 'tester',
    title: 'Add unit tests for state management',
    description: 'Create comprehensive test suite covering all Zustand store actions and state mutations. Include edge cases and error scenarios.',
    timestamp: new Date(Date.now() - 600000),
    status: 'pending',
    impactedFiles: [
      { filepath: 'lib/store/app-store.ts', type: 'update' },
      { filepath: 'lib/utils.ts', type: 'update' },
      { filepath: 'tests/store.test.ts', type: 'create' }
    ]
  },
  {
    id: '3',
    agent: 'artist',
    title: 'Enhance accessibility features',
    description: 'Implement keyboard navigation and screen reader support for the code structure viewer. Add ARIA labels and focus management.',
    timestamp: new Date(Date.now() - 900000),
    status: 'accepted',
    impactedFiles: [
      { filepath: 'components/ui/GlowCard.tsx', type: 'update' },
      { filepath: 'components/ui/Button.tsx', type: 'update' },
      { filepath: 'components/ui/Input.tsx', type: 'update' }
    ]
  },
  {
    id: '4',
    agent: 'mastermind',
    title: 'Integrate real-time collaboration',
    description: 'Add WebSocket support for multi-user agent coordination and shared state management. Include conflict resolution and synchronization.',
    timestamp: new Date(Date.now() - 1200000),
    status: 'pending',
    impactedFiles: [
      { filepath: 'lib/api.ts', type: 'update' },
      { filepath: 'components/layout/MainLayout.tsx', type: 'update' },
      { filepath: 'lib/websocket.ts', type: 'create' }
    ]
  },
  {
    id: '5',
    agent: 'developer',
    title: 'Implement code splitting',
    description: 'Add dynamic imports and lazy loading for better performance. Split routes and components to reduce initial bundle size.',
    timestamp: new Date(Date.now() - 1500000),
    status: 'accepted',
    impactedFiles: [
      { filepath: 'components/layout/MainLayout.tsx', type: 'update' },
      { filepath: 'components/layout/Sidebar.tsx', type: 'update' }
    ]
  }
];

// Helper function to normalize paths for comparison
const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/');
};

// Helper function to get all child file nodes from a folder
const getAllChildFiles = (node: TreeNode, fileStructure: TreeNode | null): string[] => {
  if (!fileStructure) return [];

  const childFiles: string[] = [];

  const traverseNode = (currentNode: TreeNode) => {
    // Only include files with supported extensions
    if (currentNode.type === 'file' && isSupportedFile(currentNode.name)) {
      childFiles.push(currentNode.path);
    }

    // Recursively check children
    if (currentNode.children) {
      currentNode.children.forEach(traverseNode);
    }
  };

  // Start traversing from the given node
  if (node.children) {
    node.children.forEach(traverseNode);
  }

  return childFiles;
};

// Helper function to find node by ID in tree structure
const findNodeById = (nodeId: string, fileStructure: TreeNode | null): TreeNode | null => {
  if (!fileStructure) return null;

  const traverse = (node: TreeNode): TreeNode | null => {
    if (node.id === nodeId) return node;

    if (node.children) {
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return found;
      }
    }

    return null;
  };

  return traverse(fileStructure);
};

interface NodeStoreState extends AppState {
  setActiveTab: (tabId: string) => void;
  toggleAgent: (agentId: string) => void;
  toggleNode: (nodeId: string) => void;
  toggleNodeWithFolder: (nodeId: string, fileStructure: TreeNode | null) => void;
  highlightNodes: (nodeIds: string[]) => void;
  clearHighlights: () => void;
  clearSelection: () => void;
  selectPaths: (filePaths: string[], fileStructure: TreeNode | null) => void;
  addEvent: (event: EventLogEntry) => void;
  acceptProposal: (proposalId: string) => void;
  rejectProposal: (proposalId: string) => void;
  addCustomBacklogItem: (item: CustomBacklogItem) => void;
  moveToInProgress: (proposalId: string) => void;
  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null) => string[];
}

const useStoreBase = create<NodeStoreState>()((set, get) => ({
  // Initial state
  activeTab: 'developer',
  activeAgents: new Set<string>(),
  selectedNodes: new Set<string>(),
  highlightedNodes: new Set<string>(),
  eventLog: [],
  backlogProposals: [...mockBacklogProposals],
  inProgressProposals: [],
  customBacklogItems: [],

  setActiveTab: (tabId: string) => set({ activeTab: tabId }),

  toggleAgent: (agentId: string) => set(state => {
    const newActiveAgents = new Set(state.activeAgents);
    if (newActiveAgents.has(agentId)) {
      newActiveAgents.delete(agentId);
    } else {
      newActiveAgents.add(agentId);
    }
    return { activeAgents: newActiveAgents };
  }),

  toggleNode: (nodeId: string) => set(state => {
    const newSelectedNodes = new Set(state.selectedNodes);
    if (newSelectedNodes.has(nodeId)) {
      newSelectedNodes.delete(nodeId);
    } else {
      newSelectedNodes.add(nodeId);
    }
    return { selectedNodes: newSelectedNodes };
  }),

  toggleNodeWithFolder: (nodeId: string, fileStructure: TreeNode | null) => {
    if (!fileStructure) {
      // Fallback to regular toggle if no file structure
      set(state => {
        const newSelectedNodes = new Set(state.selectedNodes);
        if (newSelectedNodes.has(nodeId)) {
          newSelectedNodes.delete(nodeId);
        } else {
          newSelectedNodes.add(nodeId);
        }
        return { selectedNodes: newSelectedNodes };
      });
      return;
    }

    // Find the node in the tree
    const node = findNodeById(nodeId, fileStructure);

    if (!node) {
      // Node not found, fallback to regular toggle
      set(state => {
        const newSelectedNodes = new Set(state.selectedNodes);
        if (newSelectedNodes.has(nodeId)) {
          newSelectedNodes.delete(nodeId);
        } else {
          newSelectedNodes.add(nodeId);
        }
        return { selectedNodes: newSelectedNodes };
      });
      return;
    }

    set(state => {
      const newSelectedNodes = new Set(state.selectedNodes);

      if (node.type === 'folder') {
        // For folders, select/deselect all child files with supported extensions
        const childFiles = getAllChildFiles(node, fileStructure);

        // Check if all child files are already selected
        const allSelected = childFiles.every(fileId => newSelectedNodes.has(fileId));

        if (allSelected) {
          // Deselect all child files
          childFiles.forEach(fileId => newSelectedNodes.delete(fileId));
        } else {
          // Select all child files
          childFiles.forEach(fileId => newSelectedNodes.add(fileId));
        }
      } else {
        // For files, toggle normally only if it's a supported file type
        if (isSupportedFile(node.name)) {
          if (newSelectedNodes.has(nodeId)) {
            newSelectedNodes.delete(nodeId);
          } else {
            newSelectedNodes.add(nodeId);
          }
        }
      }

      return { selectedNodes: newSelectedNodes };
    });
  },

  highlightNodes: (nodeIds: string[]) => set({ highlightedNodes: new Set(nodeIds) }),

  clearHighlights: () => set({ highlightedNodes: new Set() }),

  // Clear all selected nodes
  clearSelection: () => set({ selectedNodes: new Set() }),

  // Select specific files by their paths
  selectPaths: (filePaths: string[], fileStructure: TreeNode | null) => {
    if (!fileStructure || filePaths.length === 0) return;

    const nodeIdsToSelect = new Set<string>();

    // Helper function to find node IDs for given file paths
    const findNodeIds = (node: TreeNode) => {
      // Check if this node's ID (which represents the path) matches any of our target paths
      const normalizedNodePath = node.id.replace(/\\/g, '/');
      if (node.type === 'file' && filePaths.some(path => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedNodePath === normalizedPath || normalizedNodePath.endsWith('/' + normalizedPath) || normalizedPath.endsWith('/' + normalizedNodePath);
      })) {
        nodeIdsToSelect.add(node.id);
      }

      // Recursively check children
      if (node.children) {
        node.children.forEach(findNodeIds);
      }
    };

    findNodeIds(fileStructure);

    set({ selectedNodes: nodeIdsToSelect });
  },

  addEvent: (event: EventLogEntry) => set(state => ({
    eventLog: [event, ...state.eventLog].slice(0, 100)
  })),

  acceptProposal: (proposalId: string) => set(state => {
    const proposal = state.backlogProposals.find(p => p.id === proposalId);
    if (!proposal) return state;

    // Update the proposal status to accepted instead of removing it
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

  // Helper function to get selected file paths from tree structure
  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null): string[] => {
    if (!fileStructure || !activeProjectId) return [];

    const state = get();
    const selectedPaths: string[] = [];

    const traverseTree = (node: TreeNode) => {
      // Only include files (not folders) with supported extensions that are selected
      if (node.type === 'file' && state.selectedNodes.has(node.id) && isSupportedFile(node.name)) {
        // Normalize path separators: convert backslashes to forward slashes for backend compatibility
        const normalizedPath = node.id.replace(/\\/g, '/');
        selectedPaths.push(normalizedPath);
      }

      // Recursively check children
      if (node.children) {
        node.children.forEach(traverseTree);
      }
    };

    traverseTree(fileStructure);
    return selectedPaths;
  },
}));

/**
 * Hook to use the node store with proper selector support
 *
 * Usage examples:
 * // Subscribe to specific state (recommended for performance)
 * const selectedNodes = useStore(state => state.selectedNodes);
 * const activeTab = useStore(state => state.activeTab);
 *
 * // Subscribe to multiple values with shallow comparison
 * const { selectedNodes, highlightedNodes } = useStore(useShallow(state => ({ selectedNodes: state.selectedNodes, highlightedNodes: state.highlightedNodes })));
 *
 * // Get actions (stable references, won't cause re-renders)
 * const toggleNode = useStore(state => state.toggleNode);
 */
export const useStore = useStoreBase;

// Export shallow for convenience
export { useShallow };
