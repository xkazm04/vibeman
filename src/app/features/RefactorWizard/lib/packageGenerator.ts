import { llmManager } from '@/lib/llm';
import { RefactorOpportunity, RefactoringPackage, ProjectContext, PackagePhase } from './types';
import { calculateExecutionLevels } from './dependencyAnalyzer';

/**
 * Generate strategic refactoring packages using Map-Reduce AI approach
 * 
 * 1. MAP: Cluster issues locally by Category, Module, and Pattern
 * 2. REDUCE: Send cluster summaries to AI to generate high-level Package Definitions
 * 3. ASSIGN: Map actual issues to the generated packages
 */
export async function generatePackages(
  opportunities: RefactorOpportunity[],
  projectContext: ProjectContext,
  options: {
    maxPackages?: number;
    minIssuesPerPackage?: number;
    maxIssuesPerPackage?: number;
    provider?: string;
    model?: string;
    prioritizeCategory?: 'security' | 'performance' | 'maintainability';
  } = {}
): Promise<RefactoringPackage[]> {
  const {
    maxPackages = 10,
    minIssuesPerPackage = 5,
    maxIssuesPerPackage = 50,
    provider = 'gemini',
    model = 'gemini-2.0-flash-exp',
    prioritizeCategory,
  } = options;

  console.log('[packageGenerator] Starting Map-Reduce package generation...');
  console.log('[packageGenerator] Total opportunities:', opportunities.length);

  try {
    // ========================================================================
    // STEP 1: MAP (Local Clustering)
    // ========================================================================
    console.log('[packageGenerator] Step 1: Local Clustering (Map)');
    const clusters = generateClusters(opportunities);
    const clusterSummaries = summarizeClusters(clusters);

    console.log(`[packageGenerator] Generated ${clusters.length} clusters`);

    // ========================================================================
    // STEP 2: REDUCE (AI Strategy Generation)
    // ========================================================================
    console.log('[packageGenerator] Step 2: AI Strategy Generation (Reduce)');
    const prompt = buildStrategyPrompt(clusterSummaries, projectContext, {
      maxPackages,
      prioritizeCategory
    });

    const response = await llmManager.generate({
      prompt,
      provider: provider as any,
      model,
      temperature: 0.3,
      maxTokens: 8000,
    });

    if (!response.success || !response.response) {
      throw new Error(response.error || 'LLM generation failed');
    }

    const packageDefinitions = parsePackageDefinitions(response.response);
    console.log(`[packageGenerator] AI proposed ${packageDefinitions.length} packages`);

    // ========================================================================
    // STEP 3: ASSIGN (Map Issues to Packages)
    // ========================================================================
    console.log('[packageGenerator] Step 3: Assigning issues to packages');
    const packages = assignIssuesToPackages(packageDefinitions, opportunities, clusters, {
      minIssuesPerPackage,
      maxIssuesPerPackage
    });

    // ========================================================================
    // STEP 4: OPTIMIZE & FINALIZE
    // ========================================================================
    console.log('[packageGenerator] Step 4: Optimization');

    // Calculate execution levels
    const levels = calculateExecutionLevels(packages);
    for (const pkg of packages) {
      pkg.executionOrder = (levels.get(pkg.id) || 0) + 1;
    }

    // Resolve dependencies
    resolvePackageDependencies(packages);

    console.log('[packageGenerator] Generation complete:', packages.length, 'packages');
    return packages;

  } catch (error) {
    console.error('[packageGenerator] AI generation failed:', error);
    console.log('[packageGenerator] Falling back to rule-based packaging...');
    return generateFallbackPackages(opportunities, { minIssuesPerPackage, maxIssuesPerPackage });
  }
}

// ============================================================================
// LOCAL CLUSTERING LOGIC
// ============================================================================

interface IssueCluster {
  id: string;
  type: 'category' | 'module' | 'pattern';
  name: string;
  count: number;
  sampleIssues: RefactorOpportunity[];
  issueIds: Set<string>;
}

function generateClusters(opportunities: RefactorOpportunity[]): IssueCluster[] {
  const clusters = new Map<string, IssueCluster>();

  const addToCluster = (type: 'category' | 'module' | 'pattern', name: string, opp: RefactorOpportunity) => {
    const id = `${type}:${name}`;
    if (!clusters.has(id)) {
      clusters.set(id, {
        id,
        type,
        name,
        count: 0,
        sampleIssues: [],
        issueIds: new Set()
      });
    }
    const cluster = clusters.get(id)!;
    cluster.count++;
    cluster.issueIds.add(opp.id);
    if (cluster.sampleIssues.length < 3) {
      cluster.sampleIssues.push(opp);
    }
  };

  for (const opp of opportunities) {
    // 1. Cluster by Category
    addToCluster('category', opp.category, opp);

    // 2. Cluster by Module (Top-level directory)
    if (opp.files.length > 0) {
      const modulePath = extractModulePath(opp.files[0]);
      addToCluster('module', modulePath, opp);
    }

    // 3. Cluster by Pattern (Title similarity - simplified)
    // In a real implementation, we might use embeddings or strict pattern IDs
    // Here we use the title as a proxy for pattern
    addToCluster('pattern', opp.title, opp);
  }

  // Filter out insignificant clusters
  return Array.from(clusters.values()).filter(c => c.count >= 3);
}

function extractModulePath(filePath: string): string {
  // src/features/Auth/Login.tsx -> src/features/Auth
  const parts = filePath.split('/');
  if (parts.length > 3) return parts.slice(0, 3).join('/');
  if (parts.length > 2) return parts.slice(0, 2).join('/');
  return 'root';
}

function summarizeClusters(clusters: IssueCluster[]): any[] {
  return clusters.map(c => ({
    type: c.type,
    name: c.name,
    count: c.count,
    examples: c.sampleIssues.map(i => i.title)
  })).sort((a, b) => b.count - a.count); // Send largest clusters first
}

// ============================================================================
// AI PROMPTING
// ============================================================================

function buildStrategyPrompt(
  clusterSummaries: any[],
  context: ProjectContext,
  options: { maxPackages: number; prioritizeCategory?: string }
): string {
  return `You are a senior software architect creating a strategic refactoring plan.

## Project Context
Type: ${context.projectType}
Stack: ${context.techStack.join(', ')}
Architecture: ${context.architecture.slice(0, 500)}

## Issue Clusters (Map Phase Results)
We have analyzed the codebase and grouped issues into the following clusters. 
Use these clusters to form logical "Refactoring Packages".

${JSON.stringify(clusterSummaries.slice(0, 50), null, 2)}

## Task
Create **${options.maxPackages}** strategic refactoring packages.
${options.prioritizeCategory ? `**PRIORITY**: Focus on ${options.prioritizeCategory} issues first.` : ''}

## Rules
1. **Combine Clusters**: A package can target multiple related clusters (e.g., "Auth Module Cleanup" combines "module:src/auth" and "category:security").
2. **Strategic Goals**: Each package must have a clear goal (e.g., "Migrate to TypeScript Strict Mode", "Secure API Endpoints").
3. **Dependencies**: Identify which packages block others (Foundational -> Infrastructure -> Feature).

## Output Format (JSON Only)
{
  "packages": [
    {
      "name": "Package Name",
      "description": "Description",
      "targetClusters": [
        {"type": "module", "name": "src/auth"},
        {"type": "category", "name": "security"}
      ],
      "strategy": {
        "type": "module-based",
        "rationale": "Why this grouping?",
        "approach": "Implementation steps"
      },
      "category": "security",
      "impact": "high",
      "effort": "medium",
      "dependsOn": [], 
      "strategicGoal": "Goal description",
      "expectedOutcomes": ["outcome 1", "outcome 2"]
    }
  ]
}`;
}

// ============================================================================
// PACKAGE ASSIGNMENT
// ============================================================================

interface PackageDefinition {
  name: string;
  description: string;
  targetClusters: { type: string; name: string }[];
  strategy: any;
  category: any;
  impact: any;
  effort: any;
  dependsOn: string[];
  strategicGoal: string;
  expectedOutcomes: string[];
}

function parsePackageDefinitions(response: string): PackageDefinition[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.packages || [];
  } catch (e) {
    console.error('Failed to parse AI response', e);
    return [];
  }
}

function assignIssuesToPackages(
  definitions: PackageDefinition[],
  allOpportunities: RefactorOpportunity[],
  clusters: IssueCluster[],
  options: { minIssuesPerPackage: number; maxIssuesPerPackage: number }
): RefactoringPackage[] {
  const packages: RefactoringPackage[] = [];
  const assignedIssueIds = new Set<string>();

  for (const def of definitions) {
    const pkgIssues = new Set<RefactorOpportunity>();

    // Find issues matching target clusters
    for (const target of def.targetClusters) {
      const cluster = clusters.find(c => c.type === target.type && c.name === target.name);
      if (cluster) {
        for (const issueId of cluster.issueIds) {
          if (!assignedIssueIds.has(issueId)) {
            const issue = allOpportunities.find(o => o.id === issueId);
            if (issue) pkgIssues.add(issue);
          }
        }
      }
    }

    const issuesArray = Array.from(pkgIssues);

    if (issuesArray.length >= options.minIssuesPerPackage) {
      // Mark as assigned
      issuesArray.forEach(i => assignedIssueIds.add(i.id));

      // Create Package Object
      packages.push({
        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: def.name,
        description: def.description,
        strategy: def.strategy,
        category: def.category,
        scope: 'project', // Default
        opportunities: issuesArray,
        issueCount: issuesArray.length,
        impact: def.impact,
        effort: def.effort,
        estimatedHours: issuesArray.length * 0.5, // Rough estimate
        dependsOn: def.dependsOn,
        enables: [],
        executionOrder: 0,
        strategicGoal: def.strategicGoal,
        expectedOutcomes: def.expectedOutcomes,
        relatedDocs: [],
        selected: false,
        executed: false
      });
    }
  }

  // Create a "Leftovers" package if needed
  const unassigned = allOpportunities.filter(o => !assignedIssueIds.has(o.id));
  if (unassigned.length > options.minIssuesPerPackage) {
    packages.push({
      id: `pkg-misc-${Date.now()}`,
      name: "Miscellaneous Improvements",
      description: "Remaining issues that didn't fit into strategic packages",
      strategy: { type: 'custom', rationale: 'Cleanup', approach: 'Batch fix' },
      category: 'cleanup',
      scope: 'project',
      opportunities: unassigned,
      issueCount: unassigned.length,
      impact: 'low',
      effort: 'small',
      estimatedHours: unassigned.length * 0.5,
      dependsOn: [],
      enables: [],
      executionOrder: 99,
      strategicGoal: "Clean up remaining technical debt",
      expectedOutcomes: ["Zero remaining issues"],
      relatedDocs: [],
      selected: false,
      executed: false
    });
  }

  return packages;
}

// ============================================================================
// HELPERS
// ============================================================================

function resolvePackageDependencies(packages: RefactoringPackage[]): void {
  const nameToId = new Map(packages.map(p => [p.name, p.id]));

  for (const pkg of packages) {
    const resolvedDeps: string[] = [];
    for (const depName of pkg.dependsOn) {
      const id = nameToId.get(depName);
      if (id) resolvedDeps.push(id);
    }
    pkg.dependsOn = resolvedDeps;
  }
}

function generateFallbackPackages(
  opportunities: RefactorOpportunity[],
  options: { minIssuesPerPackage: number; maxIssuesPerPackage: number }
): RefactoringPackage[] {
  // Simple fallback: Group by Category
  const byCategory = new Map<string, RefactorOpportunity[]>();
  opportunities.forEach(o => {
    if (!byCategory.has(o.category)) byCategory.set(o.category, []);
    byCategory.get(o.category)!.push(o);
  });

  return Array.from(byCategory.entries())
    .filter(([_, opps]) => opps.length >= options.minIssuesPerPackage)
    .map(([cat, opps]) => ({
      id: `pkg-fallback-${cat}`,
      name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Fixes`,
      description: `Fix all ${cat} issues`,
      strategy: { type: 'pattern-based', rationale: 'Fallback grouping', approach: 'Direct fix' },
      category: cat as any,
      scope: 'project',
      opportunities: opps,
      issueCount: opps.length,
      impact: 'medium',
      effort: 'medium',
      estimatedHours: opps.length * 0.5,
      dependsOn: [],
      enables: [],
      executionOrder: 1,
      strategicGoal: `Fix ${cat} issues`,
      expectedOutcomes: [],
      relatedDocs: [],
      selected: false,
      executed: false
    }));
}
