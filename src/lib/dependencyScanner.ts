import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { projectDb } from './project_database';

export interface DependencyScanResult {
  projectId: string;
  projectName: string;
  dependencies: {
    name: string;
    version: string;
    type: 'npm' | 'python' | 'shared_module' | 'local_import' | 'external_library';
    isDevDependency: boolean;
    usageCount: number;
    files: string[];
  }[];
  imports: {
    source: string;
    target: string;
    type: 'relative' | 'absolute' | 'package';
    count: number;
  }[];
  codePatterns: {
    hash: string;
    type: string;
    snippet: string;
    filePath: string;
    lineStart: number;
    lineEnd: number;
  }[];
}

export interface SharedDependencyAnalysis {
  name: string;
  type: string;
  projects: {
    id: string;
    name: string;
    version: string;
  }[];
  versionConflicts: boolean;
  refactoringOpportunity: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CodeDuplicateAnalysis {
  patternHash: string;
  patternType: string;
  codeSnippet: string;
  similarityScore: number;
  occurrences: {
    projectId: string;
    projectName: string;
    filePath: string;
    lineStart: number;
    lineEnd: number;
  }[];
  refactoringSuggestion: string;
  estimatedSavings: string;
}

/**
 * Scans a project for dependencies
 */
export async function scanProjectDependencies(projectPath: string, projectId: string): Promise<DependencyScanResult> {
  const projectName = path.basename(projectPath);
  const dependencies: DependencyScanResult['dependencies'] = [];
  const imports: DependencyScanResult['imports'] = [];
  const codePatterns: DependencyScanResult['codePatterns'] = [];

  // Check if path exists
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }

  // Scan for package.json (Node.js/npm projects)
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Add production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'npm',
          isDevDependency: false,
          usageCount: 0,
          files: []
        });
      }
    }

    // Add dev dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependencies.push({
          name,
          version: version as string,
          type: 'npm',
          isDevDependency: true,
          usageCount: 0,
          files: []
        });
      }
    }
  }

  // Scan for requirements.txt (Python projects)
  const requirementsPath = path.join(projectPath, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    const requirements = fs.readFileSync(requirementsPath, 'utf-8').split('\n');
    for (const req of requirements) {
      const trimmed = req.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9\-_]+)([>=<~!]=?.*)?$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2] || '*',
            type: 'python',
            isDevDependency: false,
            usageCount: 0,
            files: []
          });
        }
      }
    }
  }

  // Scan source files for imports and code patterns
  const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rb'];
  const scannedFiles = await scanDirectory(projectPath, sourceExtensions, projectPath);

  // Analyze imports
  const importMap = new Map<string, { count: number; type: 'relative' | 'absolute' | 'package' }>();

  for (const file of scannedFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Track which dependencies are actually used
    for (const dep of dependencies) {
      const importRegex = new RegExp(`from ['"]${dep.name}['"]|import.*['"]${dep.name}['"]|require\\(['"]${dep.name}['"]\\)`, 'g');
      const matches = content.match(importRegex);
      if (matches) {
        dep.usageCount += matches.length;
        dep.files.push(path.relative(projectPath, file));
      }
    }

    // Extract import statements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // JavaScript/TypeScript imports
      const jsImportMatch = line.match(/(?:import|from)\s+['"]([^'"]+)['"]/);
      if (jsImportMatch) {
        const importPath = jsImportMatch[1];
        const type = importPath.startsWith('.') ? 'relative' :
                     importPath.startsWith('@') || !importPath.includes('/') ? 'package' :
                     'absolute';

        const key = `${file}:${importPath}`;
        const existing = importMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          importMap.set(key, { count: 1, type });
        }
      }

      // Python imports
      const pyImportMatch = line.match(/(?:from|import)\s+([a-zA-Z0-9_\.]+)/);
      if (pyImportMatch && file.endsWith('.py')) {
        const importPath = pyImportMatch[1];
        const type = importPath.startsWith('.') ? 'relative' : 'package';

        const key = `${file}:${importPath}`;
        const existing = importMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          importMap.set(key, { count: 1, type });
        }
      }
    }

    // Extract code patterns (functions, classes, common utilities)
    extractCodePatterns(content, file, projectPath, codePatterns);
  }

  // Convert import map to array
  for (const [key, data] of Array.from(importMap.entries())) {
    const [source, target] = key.split(':');
    imports.push({
      source: path.relative(projectPath, source),
      target,
      type: data.type,
      count: data.count
    });
  }

  return {
    projectId,
    projectName,
    dependencies,
    imports,
    codePatterns
  };
}

/**
 * Recursively scan directory for files with specific extensions
 */
async function scanDirectory(dir: string, extensions: string[], rootPath: string, maxDepth: number = 10, currentDepth: number = 0): Promise<string[]> {
  if (currentDepth > maxDepth) return [];

  const files: string[] = [];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', 'env'];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          const subFiles = await scanDirectory(fullPath, extensions, rootPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return files;
}

/**
 * Extract code patterns for duplicate detection
 */
function extractCodePatterns(
  content: string,
  filePath: string,
  projectPath: string,
  patterns: DependencyScanResult['codePatterns']
): void {
  const lines = content.split('\n');

  // Extract functions
  const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*(?:=>)?\s*\{/g;
  let match;

  while ((match = functionRegex.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length - 1;
    const endLine = findClosingBrace(lines, startLine);

    if (endLine > startLine && endLine - startLine < 50) { // Only track functions < 50 lines
      const snippet = lines.slice(startLine, endLine + 1).join('\n');
      const hash = crypto.createHash('md5').update(snippet.replace(/\s+/g, '')).digest('hex');

      patterns.push({
        hash,
        type: 'function',
        snippet: snippet.substring(0, 500), // Limit snippet size
        filePath: path.relative(projectPath, filePath),
        lineStart: startLine + 1,
        lineEnd: endLine + 1
      });
    }
  }

  // Extract classes
  const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g;

  while ((match = classRegex.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length - 1;
    const endLine = findClosingBrace(lines, startLine);

    if (endLine > startLine && endLine - startLine < 100) { // Only track classes < 100 lines
      const snippet = lines.slice(startLine, endLine + 1).join('\n');
      const hash = crypto.createHash('md5').update(snippet.replace(/\s+/g, '')).digest('hex');

      patterns.push({
        hash,
        type: 'class',
        snippet: snippet.substring(0, 500),
        filePath: path.relative(projectPath, filePath),
        lineStart: startLine + 1,
        lineEnd: endLine + 1
      });
    }
  }

  // Extract React components
  const componentRegex = /(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z]\w+)\s*[=:]?\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*(?:=>)?\s*\{/g;

  while ((match = componentRegex.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length - 1;
    const endLine = findClosingBrace(lines, startLine);

    if (endLine > startLine && endLine - startLine < 80) { // Only track components < 80 lines
      const snippet = lines.slice(startLine, endLine + 1).join('\n');
      const hash = crypto.createHash('md5').update(snippet.replace(/\s+/g, '')).digest('hex');

      patterns.push({
        hash,
        type: 'component',
        snippet: snippet.substring(0, 500),
        filePath: path.relative(projectPath, filePath),
        lineStart: startLine + 1,
        lineEnd: endLine + 1
      });
    }
  }
}

/**
 * Find the closing brace for a code block
 */
function findClosingBrace(lines: string[], startLine: number): number {
  let braceCount = 0;
  let inBlock = false;

  for (let i = startLine; i < lines.length && i < startLine + 200; i++) {
    const line = lines[i];

    for (const char of line) {
      if (char === '{') {
        braceCount++;
        inBlock = true;
      } else if (char === '}') {
        braceCount--;
        if (inBlock && braceCount === 0) {
          return i;
        }
      }
    }
  }

  return startLine; // Fallback
}

/**
 * Analyze shared dependencies across multiple projects
 */
export function analyzeSharedDependencies(scanResults: DependencyScanResult[]): SharedDependencyAnalysis[] {
  const dependencyMap = new Map<string, Map<string, { projectId: string; projectName: string; version: string }>>();

  // Build dependency map
  for (const result of scanResults) {
    for (const dep of result.dependencies) {
      if (!dependencyMap.has(dep.name)) {
        dependencyMap.set(dep.name, new Map());
      }

      dependencyMap.get(dep.name)!.set(result.projectId, {
        projectId: result.projectId,
        projectName: result.projectName,
        version: dep.version
      });
    }
  }

  // Analyze shared dependencies
  const sharedDependencies: SharedDependencyAnalysis[] = [];

  for (const [name, projectsMap] of Array.from(dependencyMap.entries())) {
    if (projectsMap.size > 1) {
      const projects = Array.from(projectsMap.values());
      const versions = new Set(projects.map((p: any) => p.version));
      const versionConflicts = versions.size > 1;

      // Determine priority
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (versionConflicts) {
        priority = projectsMap.size > 3 ? 'critical' : 'high';
      } else {
        priority = projectsMap.size > 5 ? 'medium' : 'low';
      }

      // Generate refactoring opportunity
      let refactoringOpportunity: string | null = null;
      if (versionConflicts) {
        refactoringOpportunity = `Version conflict detected. Consider standardizing to a single version across all ${projectsMap.size} projects.`;
      } else if (projectsMap.size > 3) {
        refactoringOpportunity = `Shared across ${projectsMap.size} projects. Consider extracting to a shared library.`;
      }

      sharedDependencies.push({
        name,
        type: (projects[0] as any).projectId.includes('python') ? 'python' : 'npm',
        projects: projects as any,
        versionConflicts,
        refactoringOpportunity,
        priority
      });
    }
  }

  return sharedDependencies.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Detect code duplicates across projects
 */
export function detectCodeDuplicates(scanResults: DependencyScanResult[]): CodeDuplicateAnalysis[] {
  const patternMap = new Map<string, {
    type: string;
    snippet: string;
    occurrences: {
      projectId: string;
      projectName: string;
      filePath: string;
      lineStart: number;
      lineEnd: number;
    }[];
  }>();

  // Build pattern map
  for (const result of scanResults) {
    for (const pattern of result.codePatterns) {
      if (!patternMap.has(pattern.hash)) {
        patternMap.set(pattern.hash, {
          type: pattern.type,
          snippet: pattern.snippet,
          occurrences: []
        });
      }

      patternMap.get(pattern.hash)!.occurrences.push({
        projectId: result.projectId,
        projectName: result.projectName,
        filePath: pattern.filePath,
        lineStart: pattern.lineStart,
        lineEnd: pattern.lineEnd
      });
    }
  }

  // Find duplicates (patterns appearing in multiple locations)
  const duplicates: CodeDuplicateAnalysis[] = [];

  for (const [hash, data] of Array.from(patternMap.entries())) {
    if (data.occurrences.length > 1) {
      const linesOfCode = data.snippet.split('\n').length;
      const fileCount = new Set(data.occurrences.map(o => `${o.projectId}:${o.filePath}`)).size;

      const refactoringSuggestion = generateRefactoringSuggestion(data.type, data.occurrences.length, fileCount);
      const estimatedSavings = `~${linesOfCode * (data.occurrences.length - 1)} LOC, ${fileCount} files`;

      duplicates.push({
        patternHash: hash,
        patternType: data.type,
        codeSnippet: data.snippet,
        similarityScore: 1.0, // Exact match
        occurrences: data.occurrences,
        refactoringSuggestion,
        estimatedSavings
      });
    }
  }

  return duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length);
}

/**
 * Generate refactoring suggestions based on duplicate patterns
 */
function generateRefactoringSuggestion(patternType: string, occurrences: number, fileCount: number): string {
  const suggestions = {
    function: `Extract this function into a shared utility module. Found in ${occurrences} locations across ${fileCount} files.`,
    class: `Consider creating a shared base class or moving this to a common package. Duplicated ${occurrences} times.`,
    component: `This component appears ${occurrences} times. Consider creating a shared component library.`,
    utility: `Extract to a shared utility package to reduce duplication across ${fileCount} files.`
  };

  return suggestions[patternType as keyof typeof suggestions] ||
         `Code pattern duplicated ${occurrences} times. Consider refactoring into a shared module.`;
}

/**
 * Scan multiple projects and generate comprehensive analysis
 */
export async function scanMultipleProjects(projectIds: string[]): Promise<{
  scanResults: DependencyScanResult[];
  sharedDependencies: SharedDependencyAnalysis[];
  codeDuplicates: CodeDuplicateAnalysis[];
  summary: {
    totalProjects: number;
    totalDependencies: number;
    sharedDependencies: number;
    codeDuplicates: number;
    estimatedSavings: string;
  };
}> {
  const scanResults: DependencyScanResult[] = [];
  const projects = projectDb.getAllProjects();

  // Scan each project
  for (const projectId of projectIds) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      console.warn(`Project not found: ${projectId}`);
      continue;
    }

    try {
      const result = await scanProjectDependencies(project.path, project.id);
      scanResults.push(result);
    } catch (error) {
      console.error(`Error scanning project ${project.name}:`, error);
    }
  }

  // Analyze shared dependencies
  const sharedDependencies = analyzeSharedDependencies(scanResults);

  // Detect code duplicates
  const codeDuplicates = detectCodeDuplicates(scanResults);

  // Calculate summary
  const totalDependencies = scanResults.reduce((sum, r) => sum + r.dependencies.length, 0);
  const totalDuplicateLines = codeDuplicates.reduce((sum, d) => {
    const lines = d.codeSnippet.split('\n').length;
    return sum + (lines * (d.occurrences.length - 1));
  }, 0);

  return {
    scanResults,
    sharedDependencies,
    codeDuplicates,
    summary: {
      totalProjects: scanResults.length,
      totalDependencies,
      sharedDependencies: sharedDependencies.length,
      codeDuplicates: codeDuplicates.length,
      estimatedSavings: `~${totalDuplicateLines} lines of code could be refactored`
    }
  };
}
