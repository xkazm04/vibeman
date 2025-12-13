import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import { logger } from '@/lib/logger';

interface ComponentInfo {
  name: string;
  path: string;
  category: string;
  hasExamples: boolean;
  hasStories: boolean;
  lineCount: number;
  exports: string[];
}

interface ScanResult {
  storybookComponents: ComponentInfo[];
  vibemanComponents: ComponentInfo[];
  coverage: {
    matched: number;
    partial: number;
    missing: number;
    unique: number;
    percentage: number;
  };
}

const STORYBOOK_PATH = 'C:\\Users\\kazda\\kiro\\storybook';
const VIBEMAN_UI_PATH = join(process.cwd(), 'src/components/ui');

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

async function scanDirectory(basePath: string, category: string = ''): Promise<ComponentInfo[]> {
  const components: ComponentInfo[] = [];

  try {
    const entries = await readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subComponents = await scanDirectory(fullPath, entry.name);
        components.push(...subComponents);
      } else if (
        entry.name.endsWith('.tsx') &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.stories.') &&
        !entry.name.includes('.examples.')
      ) {
        // Parse component file
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n').length;

        // Extract exports
        const exportMatches = content.match(/export\s+(default\s+)?(function|const|class)\s+(\w+)/g) || [];
        const componentExports = exportMatches.map(m => {
          const match = m.match(/(\w+)$/);
          return match ? match[1] : '';
        }).filter(Boolean);

        // Check for examples/stories files
        const baseName = entry.name.replace('.tsx', '');
        const hasExamples = await access(join(basePath, `${baseName}.examples.tsx`))
          .then(() => true).catch(() => false);
        const hasStories = await access(join(basePath, `${baseName}.stories.tsx`))
          .then(() => true).catch(() => false);

        components.push({
          name: baseName,
          path: fullPath,
          category: category || 'root',
          hasExamples,
          hasStories,
          lineCount: lines,
          exports: componentExports
        });
      }
    }
  } catch (error) {
    logger.error(`Error scanning ${basePath}:`, { error });
  }

  return components;
}

function calculateCoverage(storybook: ComponentInfo[], vibeman: ComponentInfo[]) {
  const storybookNames = new Set(storybook.map(c => c.name.toLowerCase()));
  const vibemanNames = new Set(vibeman.map(c => c.name.toLowerCase()));

  let matched = 0;
  let partial = 0;

  vibemanNames.forEach(name => {
    if (storybookNames.has(name)) {
      matched++;
    } else {
      // Check for partial matches (similar names)
      const similar = [...storybookNames].find(s =>
        s.includes(name) || name.includes(s) ||
        levenshteinDistance(s, name) <= 3
      );
      if (similar) partial++;
    }
  });

  const missing = Math.max(0, storybookNames.size - matched);
  const unique = Math.max(0, vibemanNames.size - matched - partial);
  const total = storybookNames.size || 1; // Avoid division by zero

  return {
    matched,
    partial,
    missing,
    unique,
    percentage: Math.round((matched / total) * 100)
  };
}

export async function GET(request: NextRequest) {
  try {
    const [storybookComponents, vibemanComponents] = await Promise.all([
      scanDirectory(STORYBOOK_PATH),
      scanDirectory(VIBEMAN_UI_PATH)
    ]);

    const coverage = calculateCoverage(storybookComponents, vibemanComponents);

    return NextResponse.json({
      storybookComponents,
      vibemanComponents,
      coverage
    } as ScanResult);
  } catch (error) {
    logger.error('Storybook scan error:', { error });
    return NextResponse.json(
      { error: 'Failed to scan components', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
