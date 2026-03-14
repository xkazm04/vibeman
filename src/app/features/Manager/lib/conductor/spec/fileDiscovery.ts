/**
 * File Discovery — ts-morph AST analysis for affected file detection
 *
 * Analyzes import chains from entry files to determine which files
 * a spec will affect. Uses depth-limited traversal with circular loop protection.
 */

import { Project } from 'ts-morph';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { AffectedFiles } from '../types';

/**
 * Discover affected files by traversing import chains from entry files.
 *
 * @param projectPath - Absolute path to the project root
 * @param entryFiles - Relative file paths mentioned in the backlog item
 * @param maxDepth - Maximum import chain depth to traverse (default 2)
 * @returns Categorized affected files (create/modify/delete)
 */
export function discoverAffectedFiles(
  projectPath: string,
  entryFiles: string[],
  maxDepth: number = 2
): AffectedFiles {
  const create: string[] = [];
  const modify: string[] = [];
  const visited = new Set<string>();

  // Classify entry files first
  for (const file of entryFiles) {
    const absPath = path.resolve(projectPath, file);
    const normalized = path.relative(projectPath, absPath).replace(/\\/g, '/');

    if (fs.existsSync(absPath)) {
      modify.push(normalized);
    } else {
      create.push(normalized);
    }
    visited.add(absPath);
  }

  // Only do ts-morph analysis if there are existing files to analyze
  const existingEntries = entryFiles
    .map(f => path.resolve(projectPath, f))
    .filter(f => fs.existsSync(f));

  if (existingEntries.length > 0) {
    // Create ts-morph Project with skipAddingFilesFromTsConfig for performance
    const tsConfigPath = path.join(projectPath, 'tsconfig.json');
    const projectOptions: ConstructorParameters<typeof Project>[0] = {
      skipAddingFilesFromTsConfig: true,
    };

    if (fs.existsSync(tsConfigPath)) {
      projectOptions.tsConfigFilePath = tsConfigPath;
    }

    const project = new Project(projectOptions);

    // Add entry files
    for (const absPath of existingEntries) {
      project.addSourceFileAtPathIfExists(absPath);
    }

    // Traverse imports up to maxDepth
    const toProcess: Array<{ absPath: string; depth: number }> = existingEntries.map(p => ({
      absPath: p,
      depth: 0,
    }));

    while (toProcess.length > 0) {
      const current = toProcess.shift()!;
      if (current.depth >= maxDepth) continue;

      const sourceFile = project.getSourceFile(current.absPath);
      if (!sourceFile) continue;

      const importDeclarations = sourceFile.getImportDeclarations();
      for (const importDecl of importDeclarations) {
        try {
          const moduleSourceFile = importDecl.getModuleSpecifierSourceFile();
          if (!moduleSourceFile) continue;

          const importedPath = moduleSourceFile.getFilePath();
          if (visited.has(importedPath)) continue;

          visited.add(importedPath);

          // Only include files within the project
          const relative = path.relative(projectPath, importedPath).replace(/\\/g, '/');
          if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
            modify.push(relative);

            // Add to processing queue for deeper traversal
            project.addSourceFileAtPathIfExists(importedPath);
            toProcess.push({ absPath: importedPath, depth: current.depth + 1 });
          }
        } catch {
          // Skip unresolvable imports (e.g., external packages)
        }
      }
    }
  }

  return { create, modify, delete: [] };
}

/**
 * Validate affected files against the filesystem.
 * - Files in `modify` and `delete` must exist on disk
 * - Files in `create` must NOT exist on disk
 */
export function validateAffectedFiles(
  affectedFiles: AffectedFiles,
  projectPath: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const file of affectedFiles.modify) {
    if (!fs.existsSync(path.join(projectPath, file))) {
      errors.push(`modify: ${file} does not exist`);
    }
  }

  for (const file of affectedFiles.delete) {
    if (!fs.existsSync(path.join(projectPath, file))) {
      errors.push(`delete: ${file} does not exist`);
    }
  }

  for (const file of affectedFiles.create) {
    if (fs.existsSync(path.join(projectPath, file))) {
      errors.push(`create: ${file} already exists`);
    }
  }

  return { valid: errors.length === 0, errors };
}
