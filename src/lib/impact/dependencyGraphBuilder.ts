/**
 * Dependency Graph Builder
 * Builds file relationship models for impact analysis
 */

import type {
  ImpactNode,
  ImpactEdge,
  ImpactGraph,
  ImpactStats,
  ImpactLevel,
  FileDependency,
  FileImportExport,
  ImpactAnalysisConfig,
} from './types';
import { DEFAULT_IMPACT_CONFIG } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * DependencyGraphBuilder class
 * Builds and manages file dependency graphs for impact visualization
 */
export class DependencyGraphBuilder {
  private config: ImpactAnalysisConfig;
  private nodes: Map<string, ImpactNode> = new Map();
  private edges: Map<string, ImpactEdge> = new Map();

  constructor(config: Partial<ImpactAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_IMPACT_CONFIG, ...config };
  }

  /**
   * Build a dependency graph from file content analysis
   */
  buildFromFiles(
    fileContents: Map<string, string>,
    sourceFiles: string[]
  ): ImpactGraph {
    this.nodes.clear();
    this.edges.clear();

    // Create nodes for all files
    for (const [path, content] of fileContents) {
      const node = this.createNode(path, sourceFiles.includes(path));
      node.lineCount = content.split('\n').length;
      this.nodes.set(path, node);
    }

    // Analyze imports/exports to build edges
    for (const [path, content] of fileContents) {
      const imports = this.parseImports(content, path);
      for (const imp of imports) {
        this.addEdge(path, imp.target, imp.type);
      }
    }

    // Calculate impact levels based on distance from source files
    this.calculateImpactLevels(sourceFiles);

    // Calculate statistics
    const stats = this.calculateStats();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      stats,
    };
  }

  /**
   * Build graph from pre-analyzed dependencies
   */
  buildFromDependencies(
    dependencies: FileDependency[],
    allFiles: string[],
    sourceFiles: string[]
  ): ImpactGraph {
    this.nodes.clear();
    this.edges.clear();

    // Create nodes for all files
    for (const path of allFiles) {
      const node = this.createNode(path, sourceFiles.includes(path));
      this.nodes.set(path, node);
    }

    // Add edges from dependencies
    for (const dep of dependencies) {
      this.addEdge(dep.source, dep.target, dep.type);
    }

    // Calculate impact levels
    this.calculateImpactLevels(sourceFiles);

    // Calculate statistics
    const stats = this.calculateStats();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      stats,
    };
  }

  /**
   * Create a node for a file
   */
  private createNode(path: string, isSource: boolean): ImpactNode {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    const directory = parts.slice(0, -1).join('/');
    const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';

    return {
      id: path,
      path,
      fileName,
      directory,
      extension,
      level: isSource ? 'direct' : 'potential',
      status: isSource ? 'modified' : 'unchanged',
      isSource,
      depth: isSource ? 0 : Infinity,
      changeCount: 0,
    };
  }

  /**
   * Add an edge between two files
   */
  private addEdge(source: string, target: string, type: ImpactEdge['type']): void {
    const edgeId = `${source}->${target}`;
    if (this.edges.has(edgeId)) {
      return; // Edge already exists
    }

    const edge: ImpactEdge = {
      id: edgeId,
      source,
      target,
      type,
      weight: this.calculateEdgeWeight(type),
      isAffected: false,
    };

    this.edges.set(edgeId, edge);
  }

  /**
   * Calculate edge weight based on dependency type
   */
  private calculateEdgeWeight(type: ImpactEdge['type']): number {
    const weights: Record<ImpactEdge['type'], number> = {
      import: 0.8,
      export: 0.7,
      extends: 1.0,
      implements: 0.9,
      uses: 0.6,
      calls: 0.5,
    };
    return weights[type];
  }

  /**
   * Parse imports from TypeScript/JavaScript content
   */
  private parseImports(content: string, currentFile: string): FileDependency[] {
    const dependencies: FileDependency[] = [];
    const lines = content.split('\n');

    // Regular import patterns
    const importPatterns = [
      // import X from 'module'
      /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g,
      // require('module')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // dynamic import('module')
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of importPatterns) {
        let match;
        // Reset lastIndex for global regex
        pattern.lastIndex = 0;
        while ((match = pattern.exec(line)) !== null) {
          const importPath = match[1];
          const resolvedPath = this.resolveImportPath(importPath, currentFile);
          if (resolvedPath) {
            dependencies.push({
              source: currentFile,
              target: resolvedPath,
              type: 'import',
              line: i + 1,
            });
          }
        }
      }
    }

    // Parse extends/implements
    const extendsPattern = /(?:extends|implements)\s+([\w]+)/g;
    let match;
    while ((match = extendsPattern.exec(content)) !== null) {
      // This would need symbol resolution to be accurate
      // For now, we skip class inheritance edges
    }

    return dependencies;
  }

  /**
   * Resolve an import path to an actual file path
   */
  private resolveImportPath(importPath: string, currentFile: string): string | null {
    // Skip node_modules unless configured to include
    if (!this.config.includeNodeModules && !importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return null;
    }

    // Handle alias paths like @/
    if (importPath.startsWith('@/')) {
      const resolved = importPath.replace('@/', 'src/');
      return this.addExtension(resolved);
    }

    // Handle relative paths
    if (importPath.startsWith('.')) {
      const currentDir = currentFile.split('/').slice(0, -1).join('/');
      const resolved = this.resolvePath(currentDir, importPath);
      return this.addExtension(resolved);
    }

    return null;
  }

  /**
   * Resolve relative path segments
   */
  private resolvePath(base: string, relative: string): string {
    const parts = base.split('/');
    const relativeParts = relative.split('/');

    for (const part of relativeParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.') {
        parts.push(part);
      }
    }

    return parts.join('/');
  }

  /**
   * Add extension to a path if not present
   */
  private addExtension(path: string): string {
    // If path already has extension, return as-is
    if (/\.(ts|tsx|js|jsx|json)$/.test(path)) {
      return path;
    }

    // Common extensions to try (in order of preference)
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

    // For now, just add .ts as default - in production this would check file existence
    return `${path}.ts`;
  }

  /**
   * Calculate impact levels using BFS from source files
   */
  private calculateImpactLevels(sourceFiles: string[]): void {
    // Build adjacency list for traversal (both directions for dependency propagation)
    const adjacencyList = new Map<string, string[]>();
    const reverseAdjacencyList = new Map<string, string[]>();

    for (const edge of this.edges.values()) {
      // Forward: source -> target (import direction)
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);

      // Reverse: target -> source (impact propagation direction)
      if (!reverseAdjacencyList.has(edge.target)) {
        reverseAdjacencyList.set(edge.target, []);
      }
      reverseAdjacencyList.get(edge.target)!.push(edge.source);
    }

    // BFS to calculate depths and impact levels
    const visited = new Set<string>();
    const queue: { node: string; depth: number }[] = [];

    // Start with source files
    for (const source of sourceFiles) {
      if (this.nodes.has(source)) {
        queue.push({ node: source, depth: 0 });
        const node = this.nodes.get(source)!;
        node.depth = 0;
        node.level = 'direct';
        node.status = 'modified';
        visited.add(source);
      }
    }

    // BFS traversal
    while (queue.length > 0) {
      const { node: currentId, depth } = queue.shift()!;

      // Get files that import this file (reverse direction for impact propagation)
      const dependents = reverseAdjacencyList.get(currentId) || [];

      for (const dependentId of dependents) {
        if (visited.has(dependentId)) {
          continue;
        }

        const dependent = this.nodes.get(dependentId);
        if (!dependent) {
          continue;
        }

        // Check depth limit
        if (depth + 1 > this.config.maxDepth) {
          continue;
        }

        visited.add(dependentId);
        dependent.depth = depth + 1;

        // Set impact level based on depth
        if (depth + 1 === 1) {
          dependent.level = 'indirect';
          dependent.status = 'affected';
        } else if (depth + 1 <= 3) {
          dependent.level = 'indirect';
          dependent.status = 'affected';
        } else {
          dependent.level = 'potential';
          dependent.status = 'unchanged';
        }

        // Mark edges as affected
        const edgeId = `${dependentId}->${currentId}`;
        const edge = this.edges.get(edgeId);
        if (edge) {
          edge.isAffected = true;
        }

        queue.push({ node: dependentId, depth: depth + 1 });
      }
    }
  }

  /**
   * Calculate statistics for the graph
   */
  private calculateStats(): ImpactStats {
    const nodes = Array.from(this.nodes.values());

    const directlyAffected = nodes.filter(n => n.level === 'direct').length;
    const indirectlyAffected = nodes.filter(n => n.level === 'indirect').length;
    const potentiallyAffected = nodes.filter(n => n.level === 'potential' && n.depth !== Infinity).length;

    const totalLines = nodes.reduce((sum, n) => sum + (n.lineCount || 0), 0);
    const affectedLines = nodes
      .filter(n => n.level === 'direct' || n.level === 'indirect')
      .reduce((sum, n) => sum + (n.lineCount || 0), 0);

    // Calculate risk score based on impact
    const riskScore = this.calculateRiskScore(nodes);

    return {
      totalFiles: nodes.length,
      directlyAffected,
      indirectlyAffected,
      potentiallyAffected,
      totalLines,
      affectedLines,
      complexity: {
        before: 0, // Would require AST analysis
        after: 0,
        change: 0,
      },
      riskScore,
    };
  }

  /**
   * Calculate risk score (0-100) based on impact analysis
   */
  private calculateRiskScore(nodes: ImpactNode[]): number {
    const directCount = nodes.filter(n => n.level === 'direct').length;
    const indirectCount = nodes.filter(n => n.level === 'indirect').length;
    const totalCount = nodes.length;

    if (totalCount === 0) {
      return 0;
    }

    // Risk factors:
    // - Percentage of files affected
    // - Number of direct changes
    // - Depth of impact propagation
    const affectedPercentage = ((directCount + indirectCount) / totalCount) * 100;
    const directWeight = directCount * 5;
    const indirectWeight = indirectCount * 2;
    const maxDepth = Math.max(...nodes.map(n => n.depth === Infinity ? 0 : n.depth));
    const depthWeight = maxDepth * 10;

    const rawScore = (affectedPercentage * 0.4) + (directWeight * 0.3) + (indirectWeight * 0.2) + (depthWeight * 0.1);

    return Math.min(100, Math.round(rawScore));
  }

  /**
   * Update node scope (include/exclude)
   */
  updateNodeScope(nodeId: string, excluded: boolean): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = excluded ? 'excluded' : (node.isSource ? 'modified' : 'affected');
    }
  }

  /**
   * Get connected component for a node
   */
  getConnectedComponent(nodeId: string): ImpactNode[] {
    const visited = new Set<string>();
    const component: ImpactNode[] = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (node) {
        component.push(node);
      }

      // Add neighbors
      for (const edge of this.edges.values()) {
        if (edge.source === current && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
        if (edge.target === current && !visited.has(edge.source)) {
          queue.push(edge.source);
        }
      }
    }

    return component;
  }

  /**
   * Get nodes at a specific impact level
   */
  getNodesByLevel(level: ImpactLevel): ImpactNode[] {
    return Array.from(this.nodes.values()).filter(n => n.level === level);
  }

  /**
   * Get all edges connected to a node
   */
  getNodeEdges(nodeId: string): ImpactEdge[] {
    return Array.from(this.edges.values()).filter(
      e => e.source === nodeId || e.target === nodeId
    );
  }
}

// Export singleton instance with default config
export const dependencyGraphBuilder = new DependencyGraphBuilder();
