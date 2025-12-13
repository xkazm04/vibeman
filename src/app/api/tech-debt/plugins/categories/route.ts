/**
 * Plugin Categories API
 * GET /api/tech-debt/plugins/categories - Get all available scan categories (built-in + plugin)
 */

import { NextResponse } from 'next/server';
import { getAvailableScanCategories } from '@/app/features/TechDebtRadar/lib/plugins';
import { logger } from '@/lib/logger';

/**
 * Built-in category metadata
 */
const BUILT_IN_CATEGORIES: Record<string, { label: string; description: string; icon: string }> = {
  code_quality: {
    label: 'Code Quality',
    description: 'Detects code quality issues like complexity, duplication, and bad patterns',
    icon: 'Code'
  },
  security: {
    label: 'Security',
    description: 'Identifies security vulnerabilities and unsafe patterns',
    icon: 'Shield'
  },
  performance: {
    label: 'Performance',
    description: 'Finds performance bottlenecks and optimization opportunities',
    icon: 'Zap'
  },
  testing: {
    label: 'Testing',
    description: 'Identifies testing gaps and coverage issues',
    icon: 'TestTube'
  },
  documentation: {
    label: 'Documentation',
    description: 'Detects missing or outdated documentation',
    icon: 'FileText'
  },
  dependencies: {
    label: 'Dependencies',
    description: 'Finds outdated or vulnerable dependencies',
    icon: 'Package'
  },
  architecture: {
    label: 'Architecture',
    description: 'Identifies architectural issues and anti-patterns',
    icon: 'Layers'
  },
  maintainability: {
    label: 'Maintainability',
    description: 'Detects code that is hard to maintain or understand',
    icon: 'Wrench'
  },
  accessibility: {
    label: 'Accessibility',
    description: 'Identifies accessibility issues and WCAG violations',
    icon: 'Eye'
  }
};

/**
 * GET - Get all available scan categories
 */
export async function GET() {
  try {
    const allCategories = getAvailableScanCategories();

    const categories = allCategories.map((category) => {
      const builtIn = BUILT_IN_CATEGORIES[category];
      if (builtIn) {
        return {
          id: category,
          ...builtIn,
          source: 'built-in'
        };
      }

      // Plugin category
      return {
        id: category,
        label: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        description: `Custom category from plugin`,
        icon: 'Puzzle',
        source: 'plugin'
      };
    });

    return NextResponse.json({
      success: true,
      categories,
      builtInCount: Object.keys(BUILT_IN_CATEGORIES).length,
      pluginCount: categories.filter((c) => c.source === 'plugin').length
    });
  } catch (error) {
    logger.error('Error fetching categories:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: String(error) },
      { status: 500 }
    );
  }
}
