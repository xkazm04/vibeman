'use client';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { TreeNode } from '../types';
import { isSupportedFile } from '../helpers/typeStyles';

/**
 * Selection Manager Store
 *
 * Manages tree-based selection state for file/folder hierarchies.
 * This is a reusable store for any tree-based selection UI throughout Vibeman.
 *
 * Separated from nodeStore.ts as part of the domain separation:
 * - SelectionManager: Tree selection state (this store)
 * - BacklogManager: Proposal/workflow lifecycle (backlogStore.ts)
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all child file nodes from a folder with supported extensions
 */
function getAllChildFiles(node: TreeNode, fileStructure: TreeNode | null): string[] {
  if (!fileStructure) return [];

  const childFiles: string[] = [];

  const traverseNode = (currentNode: TreeNode) => {
    if (currentNode.type === 'file' && isSupportedFile(currentNode.name)) {
      childFiles.push(currentNode.path);
    }
    if (currentNode.children) {
      currentNode.children.forEach(traverseNode);
    }
  };

  if (node.children) {
    node.children.forEach(traverseNode);
  }

  return childFiles;
}

/**
 * Find node by ID in tree structure
 */
function findNodeById(nodeId: string, fileStructure: TreeNode | null): TreeNode | null {
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
}

// ============================================================================
// Store Types
// ============================================================================

export interface SelectionState {
  /** Currently selected node IDs */
  selectedNodes: Set<string>;
  /** Nodes highlighted (e.g., by backlog items) */
  highlightedNodes: Set<string>;
}

export interface SelectionActions {
  /** Toggle selection of a single node */
  toggleNode: (nodeId: string) => void;
  /** Toggle node with folder support - selects/deselects all children for folders */
  toggleNodeWithFolder: (nodeId: string, fileStructure: TreeNode | null) => void;
  /** Set highlighted nodes */
  highlightNodes: (nodeIds: string[]) => void;
  /** Clear all highlights */
  clearHighlights: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select specific files by their paths */
  selectPaths: (filePaths: string[], fileStructure: TreeNode | null) => void;
  /** Get selected file paths from tree structure */
  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null) => string[];
  /** Check if a node is selected */
  isSelected: (nodeId: string) => boolean;
  /** Check if a node is highlighted */
  isHighlighted: (nodeId: string) => boolean;
  /** Get selection count */
  getSelectionCount: () => number;
}

export type SelectionStore = SelectionState & SelectionActions;

// ============================================================================
// Store Implementation
// ============================================================================

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
  // Initial state
  selectedNodes: new Set<string>(),
  highlightedNodes: new Set<string>(),

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
        const allSelected = childFiles.every(fileId => newSelectedNodes.has(fileId));

        if (allSelected) {
          childFiles.forEach(fileId => newSelectedNodes.delete(fileId));
        } else {
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

  clearSelection: () => set({ selectedNodes: new Set() }),

  selectPaths: (filePaths: string[], fileStructure: TreeNode | null) => {
    if (!fileStructure || filePaths.length === 0) return;

    const nodeIdsToSelect = new Set<string>();

    const findNodeIds = (node: TreeNode) => {
      const normalizedNodePath = node.id.replace(/\\/g, '/');
      if (node.type === 'file' && filePaths.some(path => {
        const normalizedPath = path.replace(/\\/g, '/');
        return normalizedNodePath === normalizedPath ||
               normalizedNodePath.endsWith('/' + normalizedPath) ||
               normalizedPath.endsWith('/' + normalizedNodePath);
      })) {
        nodeIdsToSelect.add(node.id);
      }

      if (node.children) {
        node.children.forEach(findNodeIds);
      }
    };

    findNodeIds(fileStructure);
    set({ selectedNodes: nodeIdsToSelect });
  },

  getSelectedFilePaths: (fileStructure: TreeNode | null, activeProjectId: string | null): string[] => {
    if (!fileStructure || !activeProjectId) return [];

    const state = get();
    const selectedPaths: string[] = [];

    const traverseTree = (node: TreeNode) => {
      if (node.type === 'file' && state.selectedNodes.has(node.id) && isSupportedFile(node.name)) {
        const normalizedPath = node.id.replace(/\\/g, '/');
        selectedPaths.push(normalizedPath);
      }

      if (node.children) {
        node.children.forEach(traverseTree);
      }
    };

    traverseTree(fileStructure);
    return selectedPaths;
  },

  isSelected: (nodeId: string): boolean => {
    return get().selectedNodes.has(nodeId);
  },

  isHighlighted: (nodeId: string): boolean => {
    return get().highlightedNodes.has(nodeId);
  },

  getSelectionCount: (): number => {
    return get().selectedNodes.size;
  },
}));

// Export shallow for convenience
export { useShallow };
