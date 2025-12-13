/**
 * Architecture Graph Analyzer
 * Analyzes codebase structure and builds a living architecture graph
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  DbArchitectureNode,
  DbArchitectureEdge,
  ArchitectureNodeType,
  DependencyWeight,
  ImportTypeInfo,
} from '@/app/db/models/architecture-graph.types';

// File extensions to scan
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', '.claude'];

// Regular expressions for import extraction
const ES_IMPORT_REGEX = /import\s+(?:(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?\s*from\s+)?['"]([^'"]+)['"]/g;
const ES_EXPORT_FROM_REGEX = /export\s+(?:\{[^}]+\}|\*)\s+from\s+['"]([^'"]+)['"]/g;
const REQUIRE_REGEX = /(?:const|let|var)\s+(?:(\w+)|\{([^}]+)\})\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_REGEX = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export interface AnalyzedImport {
  source: string;
  target: string;
  importTypes: ImportTypeInfo[];
  isDynamic: boolean;
}

export interface AnalyzedFile {
  path: string;
  name: string;
  nodeType: ArchitectureNodeType;
  layer: string | null;
  loc: number;
  imports: AnalyzedImport[];
  exports: string[];
}

export interface GraphAnalysisResult {
  nodes: Array<Omit<DbArchitectureNode, 'created_at' | 'updated_at'>>;
  edges: Array<Omit<DbArchitectureEdge, 'created_at' | 'updated_at'>>;
  circularDependencies: string[][];
  stats: {
    totalFiles: number;
    totalImports: number;
    circularCount: number;
    avgComplexity: number;
    avgCoupling: number;
  };
}

/**
 * Determine the node type based on file path and content
 */
function determineNodeType(filePath: string, _content: string): ArchitectureNodeType {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  const fileName = path.basename(filePath);

  // API routes
  if (normalizedPath.includes('/api/') && fileName === 'route.ts') {
    return 'api_route';
  }

  // Hooks
  if (normalizedPath.includes('/hooks/') || fileName.startsWith('use')) {
    return 'hook';
  }

  // Stores (Zustand, Redux, etc.)
  if (normalizedPath.includes('/stores/') || normalizedPath.includes('/store/')) {
    return 'store';
  }

  // Repositories
  if (normalizedPath.includes('/repositories/') || fileName.includes('.repository.')) {
    return 'repository';
  }

  // Services
  if (normalizedPath.includes('/services/') || fileName.includes('.service.')) {
    return 'service';
  }

  // Utilities and libs
  if (normalizedPath.includes('/lib/') || normalizedPath.includes('/utils/') || normalizedPath.includes('/helpers/')) {
    return 'utility';
  }

  // Config files
  if (fileName.includes('config') || fileName.includes('.config.')) {
    return 'config';
  }

  // React components (capitalized files in component-like paths)
  if (
    (normalizedPath.includes('/components/') ||
      normalizedPath.includes('/features/') ||
      normalizedPath.includes('/app/')) &&
    /^[A-Z]/.test(fileName)
  ) {
    return 'component';
  }

  // Default to module
  return 'module';
}

/**
 * Determine the architecture layer based on file path
 */
function determineLayer(filePath: string): string | null {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  // Pages layer
  if (normalizedPath.includes('/pages/') || normalizedPath.match(/\/app\/[^/]+\/page\.tsx?$/)) {
    return 'pages';
  }

  // Server layer
  if (
    normalizedPath.includes('/api/') ||
    normalizedPath.includes('/server/') ||
    normalizedPath.includes('/repositories/') ||
    normalizedPath.includes('/db/')
  ) {
    return 'server';
  }

  // External layer
  if (normalizedPath.includes('/external/') || normalizedPath.includes('/integrations/')) {
    return 'external';
  }

  // Client layer (default for components, hooks, stores)
  if (
    normalizedPath.includes('/components/') ||
    normalizedPath.includes('/features/') ||
    normalizedPath.includes('/hooks/') ||
    normalizedPath.includes('/stores/')
  ) {
    return 'client';
  }

  return null;
}

/**
 * Calculate cyclomatic complexity approximation
 */
function calculateComplexity(content: string): number {
  let complexity = 1; // Base complexity

  // Control flow statements
  const controlPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+\s*:/g, // Ternary operator
    /&&/g,
    /\|\|/g,
  ];

  for (const pattern of controlPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  // Normalize to 0-100 scale
  return Math.min(Math.round(complexity * 2), 100);
}

/**
 * Extract imports from file content
 */
function extractImports(filePath: string, content: string): AnalyzedImport[] {
  const imports: AnalyzedImport[] = [];
  const dir = path.dirname(filePath);

  // ES6 imports
  let match;
  const esImportRegex = new RegExp(ES_IMPORT_REGEX.source, 'g');
  while ((match = esImportRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const importPath = match[3];

    const importTypes: ImportTypeInfo[] = [];

    if (defaultImport) {
      importTypes.push({ type: 'default', identifiers: [defaultImport] });
    }

    if (namedImports) {
      const identifiers = namedImports
        .split(',')
        .map(s => s.trim().split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      if (identifiers.length > 0) {
        importTypes.push({ type: 'named', identifiers });
      }
    }

    if (importTypes.length === 0 && importPath) {
      // Side effect import
      importTypes.push({ type: 'side_effect', identifiers: [] });
    }

    imports.push({
      source: filePath,
      target: resolveImportPath(importPath, dir),
      importTypes,
      isDynamic: false,
    });
  }

  // Export from
  const exportFromRegex = new RegExp(ES_EXPORT_FROM_REGEX.source, 'g');
  while ((match = exportFromRegex.exec(content)) !== null) {
    imports.push({
      source: filePath,
      target: resolveImportPath(match[1], dir),
      importTypes: [{ type: 'namespace', identifiers: [] }],
      isDynamic: false,
    });
  }

  // CommonJS require
  const requireRegex = new RegExp(REQUIRE_REGEX.source, 'g');
  while ((match = requireRegex.exec(content)) !== null) {
    const importPath = match[3];
    imports.push({
      source: filePath,
      target: resolveImportPath(importPath, dir),
      importTypes: [{ type: 'default', identifiers: [match[1] || 'default'] }],
      isDynamic: false,
    });
  }

  // Dynamic imports
  const dynamicRegex = new RegExp(DYNAMIC_IMPORT_REGEX.source, 'g');
  while ((match = dynamicRegex.exec(content)) !== null) {
    imports.push({
      source: filePath,
      target: resolveImportPath(match[1], dir),
      importTypes: [{ type: 'default', identifiers: ['dynamic'] }],
      isDynamic: true,
    });
  }

  return imports;
}

/**
 * Resolve import path to absolute path
 */
function resolveImportPath(importPath: string, sourceDir: string): string {
  // Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return `external:${importPath}`;
  }

  // Handle @ alias (Next.js convention)
  if (importPath.startsWith('@/')) {
    return importPath; // Keep as-is, will be resolved later
  }

  // Resolve relative path
  return path.resolve(sourceDir, importPath);
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(
  nodes: Map<string, { id: string; path: string }>,
  edges: Array<{ source: string; target: string }>
): string[][] {
  const adjList = new Map<string, string[]>();

  // Build adjacency list
  edges.forEach(edge => {
    if (!adjList.has(edge.source)) {
      adjList.set(edge.source, []);
    }
    adjList.get(edge.source)!.push(edge.target);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (recStack.has(node)) {
      // Found cycle
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path]);
    }

    recStack.delete(node);
  }

  // Run DFS from each node
  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

/**
 * Scan directory recursively for source files
 */
async function scanDirectory(
  dir: string,
  projectPath: string,
  maxDepth: number = 15,
  currentDepth: number = 0
): Promise<string[]> {
  if (currentDepth > maxDepth) return [];

  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          const subFiles = await scanDirectory(fullPath, projectPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (SOURCE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Silently continue on permission errors
  }

  return files;
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath: string, projectPath: string): AnalyzedFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(projectPath, filePath);
    const lines = content.split('\n');

    return {
      path: relativePath,
      name: path.basename(filePath, path.extname(filePath)),
      nodeType: determineNodeType(filePath, content),
      layer: determineLayer(filePath),
      loc: lines.length,
      imports: extractImports(filePath, content),
      exports: [], // Could extract exports if needed
    };
  } catch (error) {
    return null;
  }
}

/**
 * Main analysis function
 */
export async function analyzeProjectArchitecture(
  projectId: string,
  projectPath: string
): Promise<GraphAnalysisResult> {
  // Verify path exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }

  // Scan for files
  const files = await scanDirectory(projectPath, projectPath);
  const analyzedFiles: AnalyzedFile[] = [];

  // Analyze each file
  for (const filePath of files) {
    const analyzed = analyzeFile(filePath, projectPath);
    if (analyzed) {
      analyzedFiles.push(analyzed);
    }
  }

  // Create path to node ID mapping
  const pathToNodeId = new Map<string, string>();
  const nodes: Array<Omit<DbArchitectureNode, 'created_at' | 'updated_at'>> = [];

  // Build nodes
  for (const file of analyzedFiles) {
    const nodeId = uuidv4();
    pathToNodeId.set(file.path, nodeId);

    nodes.push({
      id: nodeId,
      project_id: projectId,
      path: file.path,
      name: file.name,
      node_type: file.nodeType,
      layer: file.layer,
      context_group_id: null,
      complexity_score: 0, // Will be calculated
      stability_score: 50,
      coupling_score: 0, // Will be calculated
      cohesion_score: 50,
      loc: file.loc,
      incoming_count: 0,
      outgoing_count: 0,
      is_active: 1,
      last_modified: null,
    });
  }

  // Build edges and count connections
  const edges: Array<Omit<DbArchitectureEdge, 'created_at' | 'updated_at'>> = [];
  const edgeMap = new Map<string, { count: number; types: ImportTypeInfo[] }>();
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();

  for (const file of analyzedFiles) {
    const sourceNodeId = pathToNodeId.get(file.path);
    if (!sourceNodeId) continue;

    for (const imp of file.imports) {
      // Skip external imports
      if (imp.target.startsWith('external:')) continue;

      // Resolve @ alias
      let targetPath = imp.target;
      if (targetPath.startsWith('@/')) {
        targetPath = targetPath.replace('@/', '');
      } else {
        targetPath = path.relative(projectPath, imp.target);
      }

      // Try to find the target file (with various extensions)
      let targetNodeId: string | undefined;
      const possiblePaths = [
        targetPath,
        `${targetPath}.ts`,
        `${targetPath}.tsx`,
        `${targetPath}/index.ts`,
        `${targetPath}/index.tsx`,
      ];

      for (const possiblePath of possiblePaths) {
        const normalizedPath = possiblePath.replace(/\\/g, '/');
        targetNodeId = pathToNodeId.get(normalizedPath);
        if (targetNodeId) break;
      }

      if (!targetNodeId || targetNodeId === sourceNodeId) continue;

      const edgeKey = `${sourceNodeId}->${targetNodeId}`;

      if (edgeMap.has(edgeKey)) {
        const existing = edgeMap.get(edgeKey)!;
        existing.count++;
        existing.types.push(...imp.importTypes);
      } else {
        edgeMap.set(edgeKey, {
          count: 1,
          types: [...imp.importTypes],
        });

        // Update counts
        outgoingCounts.set(sourceNodeId, (outgoingCounts.get(sourceNodeId) || 0) + 1);
        incomingCounts.set(targetNodeId, (incomingCounts.get(targetNodeId) || 0) + 1);
      }
    }
  }

  // Create edge objects
  for (const [edgeKey, data] of edgeMap) {
    const [sourceNodeId, targetNodeId] = edgeKey.split('->');

    edges.push({
      id: uuidv4(),
      project_id: projectId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      weight: data.count > 5 ? 'strong' : data.count > 2 ? 'required' : 'weak',
      import_count: data.count,
      import_types: JSON.stringify(data.types),
      is_circular: 0,
      strength: Math.min(data.count * 10, 100),
    });
  }

  // Detect circular dependencies
  const nodeMap = new Map(nodes.map(n => [n.id, { id: n.id, path: n.path }]));
  const edgeList = edges.map(e => ({ source: e.source_node_id, target: e.target_node_id }));
  const circularDependencies = detectCircularDependencies(nodeMap, edgeList);

  // Mark circular edges
  const circularNodePairs = new Set<string>();
  for (const cycle of circularDependencies) {
    for (let i = 0; i < cycle.length - 1; i++) {
      circularNodePairs.add(`${cycle[i]}->${cycle[i + 1]}`);
    }
  }

  for (const edge of edges) {
    if (circularNodePairs.has(`${edge.source_node_id}->${edge.target_node_id}`)) {
      edge.is_circular = 1;
      edge.weight = 'circular';
    }
  }

  // Update node metrics
  let totalComplexity = 0;
  let totalCoupling = 0;

  for (const node of nodes) {
    // Read file to calculate complexity
    const fullPath = path.join(projectPath, node.path);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      node.complexity_score = calculateComplexity(content);
      totalComplexity += node.complexity_score;
    } catch {
      node.complexity_score = 0;
    }

    // Update connection counts
    node.incoming_count = incomingCounts.get(node.id) || 0;
    node.outgoing_count = outgoingCounts.get(node.id) || 0;

    // Calculate coupling score (based on total connections)
    const totalConnections = node.incoming_count + node.outgoing_count;
    node.coupling_score = Math.min(totalConnections * 5, 100);
    totalCoupling += node.coupling_score;
  }

  return {
    nodes,
    edges,
    circularDependencies,
    stats: {
      totalFiles: analyzedFiles.length,
      totalImports: edges.length,
      circularCount: circularDependencies.length,
      avgComplexity: nodes.length > 0 ? Math.round(totalComplexity / nodes.length) : 0,
      avgCoupling: nodes.length > 0 ? Math.round(totalCoupling / nodes.length) : 0,
    },
  };
}

/**
 * Find modules that would benefit from extraction
 */
export function findExtractionCandidates(
  nodes: DbArchitectureNode[],
  edges: DbArchitectureEdge[]
): Array<{
  nodeId: string;
  reason: string;
  score: number;
}> {
  const candidates: Array<{ nodeId: string; reason: string; score: number }> = [];

  for (const node of nodes) {
    let score = 0;
    const reasons: string[] = [];

    // High coupling
    if (node.coupling_score > 70) {
      score += 30;
      reasons.push('High coupling score');
    }

    // Many outgoing dependencies
    if (node.outgoing_count > 10) {
      score += 25;
      reasons.push('Too many dependencies');
    }

    // Many incoming dependencies (important module)
    if (node.incoming_count > 15) {
      score += 20;
      reasons.push('Critical dependency');
    }

    // High complexity
    if (node.complexity_score > 60) {
      score += 25;
      reasons.push('High complexity');
    }

    // Large file
    if (node.loc > 500) {
      score += 15;
      reasons.push('Large file');
    }

    if (score > 30) {
      candidates.push({
        nodeId: node.id,
        reason: reasons.join(', '),
        score,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Analyze layer violations
 */
export function findLayerViolations(
  nodes: DbArchitectureNode[],
  edges: DbArchitectureEdge[]
): Array<{
  edgeId: string;
  sourceNode: string;
  targetNode: string;
  violation: string;
}> {
  const violations: Array<{
    edgeId: string;
    sourceNode: string;
    targetNode: string;
    violation: string;
  }> = [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Layer hierarchy: pages -> client -> server -> external
  const layerOrder = ['pages', 'client', 'server', 'external'];

  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source_node_id);
    const targetNode = nodeMap.get(edge.target_node_id);

    if (!sourceNode || !targetNode) continue;
    if (!sourceNode.layer || !targetNode.layer) continue;

    const sourceLevel = layerOrder.indexOf(sourceNode.layer);
    const targetLevel = layerOrder.indexOf(targetNode.layer);

    if (sourceLevel === -1 || targetLevel === -1) continue;

    // Server should not depend on client
    if (sourceNode.layer === 'server' && targetNode.layer === 'client') {
      violations.push({
        edgeId: edge.id,
        sourceNode: sourceNode.path,
        targetNode: targetNode.path,
        violation: 'Server layer importing from client layer',
      });
    }

    // External should not depend on internal layers
    if (sourceNode.layer === 'external' && targetLevel < sourceLevel) {
      violations.push({
        edgeId: edge.id,
        sourceNode: sourceNode.path,
        targetNode: targetNode.path,
        violation: 'External layer importing from internal layer',
      });
    }
  }

  return violations;
}
