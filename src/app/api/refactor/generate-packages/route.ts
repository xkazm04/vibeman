import { NextRequest, NextResponse } from 'next/server';
import { generatePackages } from '@/app/features/RefactorWizard/lib/packageGenerator';
import { loadProjectContext } from '@/app/features/RefactorWizard/lib/contextLoader';
import { buildDependencyGraph, topologicalSort } from '@/app/features/RefactorWizard/lib/dependencyAnalyzer';

/**
 * POST /api/refactor/generate-packages
 * Generate strategic refactoring packages from opportunities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunities, projectPath, userPreferences = {} } = body;

    console.log('[API /generate-packages] Request received');
    console.log('[API /generate-packages] Opportunities:', opportunities?.length);
    console.log('[API /generate-packages] Project path:', projectPath);

    // Validation
    if (!opportunities || !Array.isArray(opportunities)) {
      return NextResponse.json(
        { success: false, error: 'opportunities array is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectPath is required' },
        { status: 400 }
      );
    }

    if (opportunities.length === 0) {
      return NextResponse.json({
        success: true,
        packages: [],
        dependencyGraph: { nodes: [], edges: [] },
        recommendedOrder: [],
        message: 'No opportunities to package'
      });
    }

    // Load project context
    console.log('[API /generate-packages] Loading project context...');
    const context = await loadProjectContext(projectPath);

    // Generate packages
    console.log('[API /generate-packages] Generating packages...');
    const packages = await generatePackages(opportunities, context, {
      maxPackages: userPreferences.maxPackages || 10,
      minIssuesPerPackage: userPreferences.minIssuesPerPackage || 5,
      provider: userPreferences.provider || 'gemini',
      model: userPreferences.model,
      prioritizeCategory: userPreferences.prioritizeCategory,
    });

    // Build dependency graph
    console.log('[API /generate-packages] Building dependency graph...');
    const dependencyGraph = buildDependencyGraph(packages);

    // Calculate recommended order
    console.log('[API /generate-packages] Calculating execution order...');
    const recommendedOrder = topologicalSort(packages);

    console.log('[API /generate-packages] Success!');
    console.log('[API /generate-packages] Generated', packages.length, 'packages');

    return NextResponse.json({
      success: true,
      packages,
      context,
      dependencyGraph,
      recommendedOrder,
      reasoning: packages.length > 0
        ? `Generated ${packages.length} strategic packages with ${packages.reduce((sum, p) => sum + p.issueCount, 0)} total issues`
        : 'Unable to generate packages from available opportunities'
    });

  } catch (error) {
    console.error('[API /generate-packages] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate packages'
      },
      { status: 500 }
    );
  }
}
