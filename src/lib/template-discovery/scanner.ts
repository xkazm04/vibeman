/**
 * Template File Scanner
 * Discovers TypeScript template config files in external projects
 *
 * Supports two folder structures:
 * 1. Categorized: src/templates/{category}/*.ts (e.g., templates/research/tech_market.ts)
 * 2. Legacy flat: src/templates/configs/*.ts (gets category="general")
 */

import 'server-only';
import { glob } from 'glob';
import path from 'path';

export interface DiscoveredFile {
  filePath: string;
  category: string;
}

export interface ScanResult {
  projectPath: string;
  files: DiscoveredFile[];
}

/**
 * Extract category from file path
 * templates/research/foo.ts -> "research"
 * templates/configs/foo.ts -> "general" (legacy)
 */
function extractCategory(relativePath: string): string {
  // Normalize to forward slashes
  const normalized = relativePath.replace(/\\/g, '/');

  // Pattern: src/templates/{category}/file.ts
  const match = normalized.match(/src\/templates\/([^/]+)\//);
  if (match) {
    const folder = match[1];
    // Legacy "configs" folder maps to "general"
    return folder === 'configs' ? 'general' : folder;
  }

  return 'general';
}

/**
 * Discover template config files in a project
 * Searches both categorized subfolders and legacy configs folder
 */
export async function discoverTemplateFiles(projectPath: string): Promise<ScanResult> {
  // Search for templates in any subfolder under templates/
  const patterns = [
    'src/templates/*/*.ts',        // Categorized: templates/research/*.ts
    'src/templates/*/*/*.ts',      // Nested: templates/research/v2/*.ts (if needed)
  ];

  const allMatches: DiscoveredFile[] = [];
  const seenPaths = new Set<string>();

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/index.ts', '**/types/**', '**/builder/**', '**/validation/**', '**/persistence/**'],
      nodir: true,
      absolute: false,
    });

    for (const match of matches) {
      const fullPath = path.join(projectPath, match).replace(/\\/g, '/');

      // Deduplicate
      if (seenPaths.has(fullPath)) continue;
      seenPaths.add(fullPath);

      allMatches.push({
        filePath: fullPath,
        category: extractCategory(match),
      });
    }
  }

  return {
    projectPath: projectPath.replace(/\\/g, '/'),
    files: allMatches,
  };
}
