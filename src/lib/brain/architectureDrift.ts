/**
 * Architecture Drift Detection
 *
 * Compares declared context file paths against actual filesystem state
 * to detect structural drift. No LLM involved — purely deterministic
 * filesystem comparison.
 *
 * Drift types:
 * - missing_file: declared in context but doesn't exist on disk
 * - extra_file: exists in context directory but not declared
 * - orphaned_context: context has no valid files at all
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { contextRepository } from '@/app/db/repositories/context.repository';
import { projectDb } from '@/lib/project_database';

// ============================================================================
// Types
// ============================================================================

export interface DriftReport {
  projectId: string;
  projectName: string;
  projectPath: string;
  totalContexts: number;
  contextsChecked: number;
  drifts: DriftItem[];
  overallHealth: 'healthy' | 'minor_drift' | 'significant_drift';
  checkedAt: string;
}

export interface DriftItem {
  type: 'missing_file' | 'extra_file' | 'orphaned_context';
  severity: 'low' | 'medium' | 'high';
  contextId: string;
  contextName: string;
  description: string;
  filePath?: string;
}

// ============================================================================
// Drift Detection
// ============================================================================

/**
 * Detect architecture drift for a project by comparing declared
 * context file paths against actual filesystem state.
 */
export function detectArchitectureDrift(
  projectId: string,
  projectPath?: string
): DriftReport {
  // Resolve project path
  let resolvedPath = projectPath;
  let projectName = projectId;

  if (!resolvedPath) {
    const project = projectDb.getProject(projectId);
    if (!project) {
      return createEmptyReport(projectId, projectId, '');
    }
    resolvedPath = project.path;
    projectName = project.name;
  }

  // Get all contexts for this project
  const contexts = contextRepository.getContextsByProject(projectId);
  if (contexts.length === 0) {
    return createEmptyReport(projectId, projectName, resolvedPath);
  }

  const drifts: DriftItem[] = [];

  for (const context of contexts) {
    // Parse file_paths (stored as JSON string in DB)
    let filePaths: string[];
    try {
      filePaths = typeof context.file_paths === 'string'
        ? JSON.parse(context.file_paths)
        : context.file_paths || [];
    } catch {
      filePaths = [];
    }

    if (filePaths.length === 0) continue;

    let missingCount = 0;

    // Check each declared file
    for (const declaredFile of filePaths) {
      const absPath = path.resolve(resolvedPath, declaredFile);
      if (!fs.existsSync(absPath)) {
        missingCount++;
        drifts.push({
          type: 'missing_file',
          severity: 'medium',
          contextId: context.id,
          contextName: context.name,
          description: `Declared file not found on disk: ${declaredFile}`,
          filePath: declaredFile,
        });
      }
    }

    // If ALL files are missing, this is an orphaned context
    if (missingCount === filePaths.length && filePaths.length > 0) {
      // Upgrade to orphaned context (replace individual missing_file items)
      const contextDrifts = drifts.filter(
        d => d.contextId === context.id && d.type === 'missing_file'
      );
      for (const d of contextDrifts) {
        const idx = drifts.indexOf(d);
        if (idx >= 0) drifts.splice(idx, 1);
      }
      drifts.push({
        type: 'orphaned_context',
        severity: 'high',
        contextId: context.id,
        contextName: context.name,
        description: `Context "${context.name}" has no valid files (${filePaths.length} declared, all missing)`,
      });
    }

    // Check for undeclared files in the context's directories
    const contextDirs = extractUniqueDirectories(filePaths);
    for (const dir of contextDirs) {
      const absDir = path.resolve(resolvedPath, dir);
      if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) continue;

      try {
        const actualFiles = fs.readdirSync(absDir)
          .filter(f => /\.(ts|tsx|js|jsx)$/.test(f))
          .map(f => path.join(dir, f).replace(/\\/g, '/'));

        const declaredSet = new Set(filePaths.map(f => f.replace(/\\/g, '/')));
        for (const actualFile of actualFiles) {
          if (!declaredSet.has(actualFile)) {
            drifts.push({
              type: 'extra_file',
              severity: 'low',
              contextId: context.id,
              contextName: context.name,
              description: `File exists in context directory but not declared: ${actualFile}`,
              filePath: actualFile,
            });
          }
        }
      } catch {
        // Directory read failed — skip
      }
    }
  }

  // Determine overall health
  const highCount = drifts.filter(d => d.severity === 'high').length;
  const mediumCount = drifts.filter(d => d.severity === 'medium').length;
  let overallHealth: DriftReport['overallHealth'] = 'healthy';

  if (highCount > 0 || mediumCount > 5) {
    overallHealth = 'significant_drift';
  } else if (mediumCount > 0 || drifts.length > 3) {
    overallHealth = 'minor_drift';
  }

  return {
    projectId,
    projectName,
    projectPath: resolvedPath,
    totalContexts: contexts.length,
    contextsChecked: contexts.filter(c => {
      try {
        const fps = typeof c.file_paths === 'string'
          ? JSON.parse(c.file_paths) : c.file_paths || [];
        return fps.length > 0;
      } catch { return false; }
    }).length,
    drifts,
    overallHealth,
    checkedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function extractUniqueDirectories(filePaths: string[]): string[] {
  const dirs = new Set<string>();
  for (const fp of filePaths) {
    const normalized = fp.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    if (lastSlash >= 0) {
      dirs.add(normalized.substring(0, lastSlash));
    }
  }
  return Array.from(dirs);
}

function createEmptyReport(
  projectId: string,
  projectName: string,
  projectPath: string
): DriftReport {
  return {
    projectId,
    projectName,
    projectPath,
    totalContexts: 0,
    contextsChecked: 0,
    drifts: [],
    overallHealth: 'healthy',
    checkedAt: new Date().toISOString(),
  };
}
