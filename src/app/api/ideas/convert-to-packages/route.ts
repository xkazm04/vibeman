import { NextRequest, NextResponse } from 'next/server';
import { ideaDb } from '@/app/db';
import { generatePackages } from '@/app/features/RefactorWizard/lib/packageGenerator';
import { loadProjectContext } from '@/app/features/RefactorWizard/lib/contextLoader';
import { buildDependencyGraph, topologicalSort } from '@/app/features/RefactorWizard/lib/dependencyAnalyzer';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { DbIdea } from '@/app/db';
import { logger } from '@/lib/logger';

/**
 * Map idea category to RefactorOpportunity category
 */
function mapIdeaCategoryToRefactor(category: string): RefactorOpportunity['category'] {
  const categoryMap: Record<string, RefactorOpportunity['category']> = {
    'functionality': 'architecture',
    'performance': 'performance',
    'maintenance': 'maintainability',
    'ui': 'code-quality',
    'code_quality': 'code-quality',
    'user_benefit': 'architecture',
    'security': 'security',
  };
  return categoryMap[category] || 'maintainability';
}

/**
 * Map idea effort (1-10) to RefactorOpportunity effort
 */
function mapIdeaEffortToRefactor(effort: number | null): RefactorOpportunity['effort'] {
  if (!effort) return 'medium';
  if (effort <= 3) return 'low';
  if (effort <= 6) return 'medium';
  return 'high';
}

/**
 * Map idea impact (1-10) to RefactorOpportunity severity
 */
function mapIdeaImpactToSeverity(impact: number | null): RefactorOpportunity['severity'] {
  if (!impact) return 'medium';
  if (impact <= 2) return 'low';
  if (impact <= 5) return 'medium';
  if (impact <= 8) return 'high';
  return 'critical';
}

/**
 * Convert a DbIdea to a RefactorOpportunity
 */
function ideaToOpportunity(idea: DbIdea): RefactorOpportunity {
  return {
    id: idea.id,
    title: idea.title,
    description: idea.description || idea.reasoning || '',
    category: mapIdeaCategoryToRefactor(idea.category),
    severity: mapIdeaImpactToSeverity(idea.impact),
    impact: idea.reasoning || idea.description || 'Automated from idea',
    effort: mapIdeaEffortToRefactor(idea.effort),
    files: [], // Ideas don't have file associations by default
    autoFixAvailable: false,
    suggestedFix: idea.description || undefined,
  };
}

/**
 * POST /api/ideas/convert-to-packages
 *
 * Convert accepted ideas to RefactorWizard packages using the Map-Reduce AI pattern.
 * This endpoint groups ideas by category/module and generates strategic implementation packages.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      projectPath,
      ideaIds,  // Optional: specific idea IDs to convert
      status = 'accepted',  // Default to accepted ideas
      userPreferences = {}
    } = body;

    logger.info('[API /ideas/convert-to-packages] Request received');
    logger.info('[API /ideas/convert-to-packages] Project ID:', { data: projectId });
    logger.info('[API /ideas/convert-to-packages] Project path:', { data: projectPath });
    logger.info('[API /ideas/convert-to-packages] Idea IDs:', { data: ideaIds?.length || 'all' });

    // Validation
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'projectPath is required' },
        { status: 400 }
      );
    }

    // Fetch ideas based on criteria
    let ideas: DbIdea[];

    if (ideaIds && Array.isArray(ideaIds) && ideaIds.length > 0) {
      // Fetch specific ideas by ID
      ideas = [];
      for (const id of ideaIds) {
        const idea = ideaDb.getIdeaById(id);
        if (idea && idea.project_id === projectId) {
          ideas.push(idea);
        }
      }
    } else {
      // Fetch all ideas for project with given status
      const allIdeas = ideaDb.getIdeasByProject(projectId);
      ideas = allIdeas.filter(idea => idea.status === status);
    }

    logger.info('[API /ideas/convert-to-packages] Found', { arg0: ideas.length, arg1: 'ideas to convert' });

    if (ideas.length === 0) {
      return NextResponse.json({
        success: true,
        packages: [],
        dependencyGraph: { nodes: [], edges: [] },
        recommendedOrder: [],
        message: 'No ideas found matching criteria',
        stats: {
          ideasProcessed: 0,
          packagesGenerated: 0,
        }
      });
    }

    // Convert ideas to RefactorOpportunities
    const opportunities: RefactorOpportunity[] = ideas.map(ideaToOpportunity);

    logger.info('[API /ideas/convert-to-packages] Converted', { arg0: opportunities.length, arg1: 'ideas to opportunities' });

    // Load project context for AI package generation
    logger.info('[API /ideas/convert-to-packages] Loading project context...');
    const context = await loadProjectContext(projectPath);

    // Generate packages using the Map-Reduce AI pattern
    logger.info('[API /ideas/convert-to-packages] Generating packages...');
    const packages = await generatePackages(opportunities, context, {
      maxPackages: userPreferences.maxPackages || 10,
      minIssuesPerPackage: userPreferences.minIssuesPerPackage || 3, // Lower threshold for ideas
      provider: userPreferences.provider || 'gemini',
      model: userPreferences.model,
      prioritizeCategory: userPreferences.prioritizeCategory,
    });

    // Build dependency graph
    logger.info('[API /ideas/convert-to-packages] Building dependency graph...');
    const dependencyGraph = buildDependencyGraph(packages);

    // Calculate recommended execution order
    logger.info('[API /ideas/convert-to-packages] Calculating execution order...');
    const recommendedOrder = topologicalSort(packages);

    // Create idea-to-package mapping for UI reference
    const ideaPackageMapping: Record<string, string[]> = {};
    for (const pkg of packages) {
      for (const opp of pkg.opportunities) {
        if (!ideaPackageMapping[opp.id]) {
          ideaPackageMapping[opp.id] = [];
        }
        ideaPackageMapping[opp.id].push(pkg.id);
      }
    }

    logger.info('[API /ideas/convert-to-packages] Success!');
    logger.info('[API /ideas/convert-to-packages] Generated', { arg0: packages.length, arg1: 'packages from', arg2: ideas.length, arg3: 'ideas' });

    return NextResponse.json({
      success: true,
      packages,
      context,
      dependencyGraph,
      recommendedOrder,
      ideaPackageMapping,
      stats: {
        ideasProcessed: ideas.length,
        packagesGenerated: packages.length,
        totalIssuesInPackages: packages.reduce((sum, p) => sum + p.issueCount, 0),
      },
      reasoning: packages.length > 0
        ? `Generated ${packages.length} strategic packages from ${ideas.length} ideas with ${packages.reduce((sum, p) => sum + p.issueCount, 0)} total grouped items`
        : 'Unable to generate packages from available ideas - try accepting more ideas or adjusting preferences'
    });

  } catch (error) {
    logger.error('[API /ideas/convert-to-packages] Error:', { data: error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert ideas to packages'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ideas/convert-to-packages
 *
 * Check how many ideas are eligible for package conversion
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'accepted';

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const allIdeas = ideaDb.getIdeasByProject(projectId);
    const eligibleIdeas = allIdeas.filter(idea => idea.status === status);

    // Group by category for preview
    const categoryGroups: Record<string, number> = {};
    for (const idea of eligibleIdeas) {
      const category = idea.category || 'uncategorized';
      categoryGroups[category] = (categoryGroups[category] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      eligibleCount: eligibleIdeas.length,
      categoryGroups,
      canGenerate: eligibleIdeas.length >= 3, // Minimum for meaningful packages
    });

  } catch (error) {
    logger.error('[API /ideas/convert-to-packages] GET Error:', { data: error });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check eligible ideas'
      },
      { status: 500 }
    );
  }
}
