'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { AppState, EventLogEntry, CustomBacklogItem, TreeNode } from '../types';
import { isSupportedFile } from '../helpers/typeStyles';

/**
 * Node Store - Unified Facade
 *
 * This store provides backward compatibility by combining:
 * - SelectionManager (selectionStore.ts) - Tree selection state
 * - BacklogManager (backlogStore.ts) - Proposal/workflow lifecycle
 *
 * For new code, prefer using the specialized stores directly:
 * - import { useSelectionStore } from '@/stores/selectionStore';
 * - import { useBacklogStore } from '@/stores/backlogStore';
 *
 * This facade is maintained for existing code that depends on the unified interface.
 */

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
  backlogProposals: [],
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
 * const { selectedNodes, highlightedNodes } = useStore(useShallow(state => ({
 *   selectedNodes: state.selectedNodes,
 *   highlightedNodes: state.highlightedNodes
 * })));
 *
 * // Get actions (stable references, won't cause re-renders)
 * const toggleNode = useStore(state => state.toggleNode);
 *
 * MIGRATION NOTE:
 * For new code, prefer the specialized stores:
 * - useSelectionStore for tree selection state
 * - useBacklogStore for proposal workflows
 */
export const useStore = useStoreBase;

// Export shallow for convenience
export { useShallow };

// Re-export specialized stores for gradual migration
export { useSelectionStore } from './selectionStore';
export { useBacklogStore } from './backlogStore';
