import { TreeNode } from '../../../../types';

/**
 * Count total nodes in a tree structure
 */
export function countTreeNodes(node: TreeNode | null): number {
  if (!node) return 0;
  
  const countNodes = (n: TreeNode): number => {
    let count = 1;
    if (n.children) {
      count += n.children.reduce((sum, child) => sum + countNodes(child), 0);
    }
    return count;
  };
  
  return countNodes(node) - 1; // Exclude root
}

/**
 * Search tree nodes by search term
 */
export function searchTreeNodes(
  node: TreeNode,
  searchTerm: string,
  currentPath: string = ''
): Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }> {
  const results: Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }> = [];
  const searchLower = searchTerm.toLowerCase();

  const searchNode = (n: TreeNode, path: string = '') => {
    const nodePath = path ? `${path}/${n.name}` : n.name;
    
    // Check name match
    if (n.name.toLowerCase().includes(searchLower)) {
      results.push({
        node: n,
        path: nodePath,
        matchType: 'name'
      });
    }
    // Check description match
    else if (n.description.toLowerCase().includes(searchLower)) {
      results.push({
        node: n,
        path: nodePath,
        matchType: 'description'
      });
    }

    // Search children
    if (n.children) {
      n.children.forEach(child => searchNode(child, nodePath));
    }
  };

  // Start search from children, not root
  if (node.children) {
    node.children.forEach(child => searchNode(child, currentPath));
  }

  return results;
}

/**
 * Sort search results by relevance
 */
export function sortSearchResults(
  results: Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }>,
  searchTerm: string,
  limit: number = 5
): Array<{ node: TreeNode; path: string; matchType: 'name' | 'description' }> {
  const searchLower = searchTerm.toLowerCase();
  
  return results
    .sort((a, b) => {
      const aExact = a.node.name.toLowerCase() === searchLower;
      const bExact = b.node.name.toLowerCase() === searchLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return a.path.length - b.path.length;
    })
    .slice(0, limit);
}

/**
 * Highlight matching text in search results
 */
export function highlightMatch(text: string, searchTerm: string): Array<{ text: string; isMatch: boolean }> {
  if (!searchTerm) return [{ text, isMatch: false }];
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map(part => ({
    text: part,
    isMatch: regex.test(part)
  }));
}
