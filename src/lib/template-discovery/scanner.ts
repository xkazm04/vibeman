/**
 * Template File Scanner
 * Discovers TypeScript template config files in external projects
 */

import 'server-only';
import { glob } from 'glob';
import path from 'path';

export interface ScanResult {
  projectPath: string;
  files: string[];
}

/**
 * Discover template config files in a project
 * Pattern: src/templates/configs/*.ts (excluding index.ts barrel files)
 */
export async function discoverTemplateFiles(projectPath: string): Promise<ScanResult> {
  const pattern = 'src/templates/configs/*.ts';

  const matches = await glob(pattern, {
    cwd: projectPath,
    ignore: ['**/index.ts'], // Skip barrel files
    nodir: true,
    absolute: false,
  });

  // Return full paths normalized to forward slashes
  const files = matches.map(match => {
    const fullPath = path.join(projectPath, match);
    return fullPath.replace(/\\/g, '/'); // Normalize for cross-platform
  });

  return {
    projectPath: projectPath.replace(/\\/g, '/'),
    files,
  };
}
