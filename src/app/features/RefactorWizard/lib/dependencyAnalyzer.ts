import { RefactoringPackage, DependencyGraph, DependencyNode, DependencyEdge } from './types';

/**
 * Build a dependency graph from refactoring packages
 */
export function buildDependencyGraph(packages: RefactoringPackage[]): DependencyGraph {
  const nodes: DependencyNode[] = packages.map((pkg) => ({
    id: pkg.id,
    label: pkg.name,
    level: pkg.executionOrder,
    selected: pkg.selected,
  }));

  const edges: DependencyEdge[] = [];
  for (const pkg of packages) {
    for (const depId of pkg.dependsOn) {
      // Verify dependency exists
      const depExists = packages.some(p => p.id === depId);
      if (depExists) {
        edges.push({
          from: depId, // prerequisite
          to: pkg.id,  // dependent
          type: 'required',
        });
      } else {
        console.warn(`[dependencyAnalyzer] Package ${pkg.id} depends on non-existent package ${depId}`);
      }
    }
  }

  console.log(`[dependencyAnalyzer] Built graph with ${nodes.length} nodes and ${edges.length} edges`);
  return { nodes, edges };
}

/**
 * Perform topological sort on packages to determine execution order
 * Returns array of package IDs in dependency order (foundational first)
 */
export function topologicalSort(packages: RefactoringPackage[]): string[] {
  console.log('[dependencyAnalyzer] Starting topological sort...');

  // Build adjacency list (reverse: dependent -> prerequisites)
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const pkg of packages) {
    graph.set(pkg.id, pkg.dependsOn);
    inDegree.set(pkg.id, 0);
  }

  // Calculate in-degrees (how many packages depend on this one)
  for (const pkg of packages) {
    for (const depId of pkg.dependsOn) {
      if (inDegree.has(depId)) {
        inDegree.set(depId, (inDegree.get(depId) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
      console.log(`[dependencyAnalyzer] Foundational package: ${id}`);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Get packages that depend on current
    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Check for cycles
  if (sorted.length !== packages.length) {
    const missing = packages.filter(p => !sorted.includes(p.id));
    console.error('[dependencyAnalyzer] Circular dependency detected!');
    console.error('[dependencyAnalyzer] Packages in cycle:', missing.map(p => p.name));

    // Return partial sort + remaining packages
    const remaining = packages.filter(p => !sorted.includes(p.id)).map(p => p.id);
    return [...sorted, ...remaining];
  }

  console.log('[dependencyAnalyzer] Topological sort complete:', sorted);
  return sorted;
}

/**
 * Validate that a set of selected packages has all prerequisites selected
 * Returns array of missing prerequisite package IDs
 */
export function validatePackageSelection(
  selectedPackageIds: Set<string>,
  allPackages: RefactoringPackage[]
): string[] {
  const missing: string[] = [];

  for (const pkgId of selectedPackageIds) {
    const pkg = allPackages.find(p => p.id === pkgId);
    if (!pkg) continue;

    for (const depId of pkg.dependsOn) {
      if (!selectedPackageIds.has(depId)) {
        missing.push(depId);
      }
    }
  }

  return [...new Set(missing)]; // Remove duplicates
}

/**
 * Get all packages that would be blocked if a package is not selected
 * Used for warning users about unselecting packages
 */
export function getBlockedPackages(
  packageId: string,
  allPackages: RefactoringPackage[]
): RefactoringPackage[] {
  const blocked: RefactoringPackage[] = [];

  const findBlocked = (pkgId: string) => {
    for (const pkg of allPackages) {
      if (pkg.dependsOn.includes(pkgId) && !blocked.includes(pkg)) {
        blocked.push(pkg);
        findBlocked(pkg.id); // Recursively find packages that depend on this
      }
    }
  };

  findBlocked(packageId);
  return blocked;
}

/**
 * Calculate execution levels (0 = foundational, higher = more dependent)
 */
export function calculateExecutionLevels(packages: RefactoringPackage[]): Map<string, number> {
  const levels = new Map<string, number>();

  // Initialize all to level 0
  for (const pkg of packages) {
    levels.set(pkg.id, 0);
  }

  // Calculate levels iteratively
  let changed = true;
  while (changed) {
    changed = false;
    for (const pkg of packages) {
      const currentLevel = levels.get(pkg.id) || 0;
      let maxDepLevel = 0;

      // Find max level of dependencies
      for (const depId of pkg.dependsOn) {
        const depLevel = levels.get(depId) || 0;
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      const newLevel = pkg.dependsOn.length > 0 ? maxDepLevel + 1 : 0;
      if (newLevel !== currentLevel) {
        levels.set(pkg.id, newLevel);
        changed = true;
      }
    }
  }

  return levels;
}
