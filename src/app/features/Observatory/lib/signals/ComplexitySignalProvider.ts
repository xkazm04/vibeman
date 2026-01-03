/**
 * Complexity Signal Provider
 * Calculates code complexity metrics for files
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SignalProvider, SignalResult, FileSignal } from './types';

// Complexity thresholds
const THRESHOLDS = {
  linesOfCode: { warning: 200, critical: 500 },
  cyclomaticComplexity: { warning: 10, critical: 20 },
  dependencyCount: { warning: 10, critical: 20 },
  nestingDepth: { warning: 4, critical: 6 },
};

/**
 * Calculate cyclomatic complexity estimate from code
 * This is a simplified heuristic based on control flow keywords
 */
function estimateCyclomaticComplexity(code: string): number {
  const controlFlowPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\?/g, // Nullish coalescing
    /\?[^:]/g, // Ternary operator (rough)
    /&&/g,
    /\|\|/g,
  ];

  let complexity = 1; // Base complexity

  for (const pattern of controlFlowPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Count import/require statements
 */
function countDependencies(code: string): number {
  const importPattern = /^import\s+/gm;
  const requirePattern = /require\s*\(/g;

  const imports = (code.match(importPattern) || []).length;
  const requires = (code.match(requirePattern) || []).length;

  return imports + requires;
}

/**
 * Estimate maximum nesting depth
 */
function estimateNestingDepth(code: string): number {
  let maxDepth = 0;
  let currentDepth = 0;

  for (const char of code) {
    if (char === '{') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maxDepth;
}

/**
 * Analyze a single file for complexity
 */
function analyzeFile(filePath: string, content: string): FileSignal {
  const lines = content.split('\n');
  const linesOfCode = lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length;
  const cyclomaticComplexity = estimateCyclomaticComplexity(content);
  const dependencyCount = countDependencies(content);
  const nestingDepth = estimateNestingDepth(content);

  // Calculate normalized score (0-100, higher is better)
  let score = 100;

  // Penalize based on thresholds
  if (linesOfCode > THRESHOLDS.linesOfCode.critical) {
    score -= 25;
  } else if (linesOfCode > THRESHOLDS.linesOfCode.warning) {
    score -= 10;
  }

  if (cyclomaticComplexity > THRESHOLDS.cyclomaticComplexity.critical) {
    score -= 30;
  } else if (cyclomaticComplexity > THRESHOLDS.cyclomaticComplexity.warning) {
    score -= 15;
  }

  if (dependencyCount > THRESHOLDS.dependencyCount.critical) {
    score -= 20;
  } else if (dependencyCount > THRESHOLDS.dependencyCount.warning) {
    score -= 10;
  }

  if (nestingDepth > THRESHOLDS.nestingDepth.critical) {
    score -= 25;
  } else if (nestingDepth > THRESHOLDS.nestingDepth.warning) {
    score -= 10;
  }

  // Generate flags
  const flags: string[] = [];
  if (linesOfCode > THRESHOLDS.linesOfCode.critical) flags.push('very-long-file');
  if (cyclomaticComplexity > THRESHOLDS.cyclomaticComplexity.critical) flags.push('high-complexity');
  if (dependencyCount > THRESHOLDS.dependencyCount.critical) flags.push('many-dependencies');
  if (nestingDepth > THRESHOLDS.nestingDepth.critical) flags.push('deep-nesting');

  return {
    filePath,
    score: Math.max(0, score),
    metrics: {
      linesOfCode,
      cyclomaticComplexity,
      dependencyCount,
      nestingDepth,
    },
    flags,
  };
}

/**
 * Complexity Signal Provider
 */
export const ComplexitySignalProvider: SignalProvider = {
  id: 'complexity',
  name: 'Code Complexity',
  description: 'Analyzes code complexity metrics including cyclomatic complexity, nesting depth, and dependencies',
  weight: 0.3, // 30% weight in overall calculation

  async isAvailable(_projectPath: string): Promise<boolean> {
    return true; // Always available
  },

  async collect(projectPath: string, files?: string[]): Promise<SignalResult> {
    const targetFiles = files || (await getProjectFiles(projectPath));
    const fileSignals = await this.getFileSignals(projectPath, targetFiles);

    // Calculate aggregates
    const scores = fileSignals.map((f) => f.score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;

    // Count distribution
    const distribution = {
      critical: fileSignals.filter((f) => f.score < 25).length,
      warning: fileSignals.filter((f) => f.score >= 25 && f.score < 50).length,
      acceptable: fileSignals.filter((f) => f.score >= 50 && f.score < 75).length,
      good: fileSignals.filter((f) => f.score >= 75).length,
    };

    // Find most complex files
    const mostComplex = [...fileSignals]
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((f) => ({
        file: f.filePath,
        score: f.score,
        flags: f.flags,
      }));

    return {
      providerId: this.id,
      timestamp: new Date().toISOString(),
      confidence: 0.8, // Static analysis is fairly reliable
      weight: this.weight,
      data: {
        averageScore: avgScore,
        filesAnalyzed: fileSignals.length,
        distribution,
        mostComplex,
        totalFlags: fileSignals.reduce((acc, f) => acc + f.flags.length, 0),
      },
    };
  },

  async getFileSignals(projectPath: string, files: string[]): Promise<FileSignal[]> {
    const results: FileSignal[] = [];

    for (const file of files) {
      const fullPath = path.isAbsolute(file) ? file : path.join(projectPath, file);

      try {
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push(analyzeFile(file, content));
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return results;
  },
};

/**
 * Get source files in a project
 */
async function getProjectFiles(projectPath: string): Promise<string[]> {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'];
  const files: string[] = [];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(relativePath);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  walk(projectPath);
  return files;
}

export default ComplexitySignalProvider;
