import { llmManager } from '@/lib/llm';
import { RefactorOpportunity, RefactoringPackage, ProjectContext, PackagePhase } from './types';
import { calculateExecutionLevels } from './dependencyAnalyzer';

/**
 * Generate strategic refactoring packages using AI
 *
 * @param opportunities - All discovered refactoring opportunities
 * @param projectContext - Project context from CLAUDE.md, README, etc.
 * @param options - Generation options
 * @returns Array of strategic refactoring packages
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

  console.log('[packageGenerator] Starting package generation...');
  console.log('[packageGenerator] Total opportunities:', opportunities.length);
  console.log('[packageGenerator] Target packages:', maxPackages);

  try {
    // Step 1: Cluster opportunities by similarity
    const clusters = clusterOpportunities(opportunities, {
      minIssuesPerPackage,
      maxIssuesPerPackage,
    });
    console.log('[packageGenerator] Created', clusters.size, 'initial clusters');

    // Step 2: Build AI prompt with context
    const prompt = buildPackageGenerationPrompt(opportunities, projectContext, {
      maxPackages,
      minIssuesPerPackage,
      clusters,
      prioritizeCategory,
    });


    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Failed to generate valid prompt for LLM');
    }
    // Step 3: Call LLM
    console.log('[packageGenerator] Calling LLM for package analysis...');
    console.log('[packageGenerator] Provider:', provider);
    console.log('[packageGenerator] Model:', model);
    console.log('[packageGenerator] Prompt length:', prompt?.length || 0);
    console.log('[packageGenerator] Prompt type:', typeof prompt);

    const response = await llmManager.generate({
      prompt: prompt,
      provider: provider as any,
      model,
      temperature: 0.3,
      maxTokens: 8000,
    });

    console.log('[packageGenerator] LLM response received');
    console.log('[packageGenerator] Response success:', response.success);
    console.log('[packageGenerator] Response error:', response.error);

    // Step 4: Parse and validate response
    if (!response.success || !response.response) {
      throw new Error(response.error || 'LLM generation failed');
    }
    const packages = parsePackageResponse(response.response, opportunities);
    console.log('[packageGenerator] Parsed', packages.length, 'packages');

    // Step 5: Optimize packages
    const optimized = optimizePackages(packages, {
      minIssuesPerPackage,
      maxIssuesPerPackage,
    });
    console.log('[packageGenerator] Optimized to', optimized.length, 'packages');

    // Step 6: Calculate execution levels
    const levels = calculateExecutionLevels(optimized);
    for (const pkg of optimized) {
      pkg.executionOrder = (levels.get(pkg.id) || 0) + 1;
    }

    // Step 7: Resolve dependency references (replace package names with IDs)
    resolvePackageDependencies(optimized);

    console.log('[packageGenerator] Package generation complete!');
    return optimized;

  } catch (error) {
    console.error('[packageGenerator] AI generation failed:', error);
    console.log('[packageGenerator] Falling back to rule-based packaging...');

    // Fallback: Simple rule-based packaging
    return generateFallbackPackages(opportunities, {
      minIssuesPerPackage,
      maxIssuesPerPackage,
    });
  }
}

/**
 * Cluster opportunities by category, file patterns, and similarity
 */
function clusterOpportunities(
  opportunities: RefactorOpportunity[],
  options: { minIssuesPerPackage: number; maxIssuesPerPackage: number }
): Map<string, RefactorOpportunity[]> {
  const clusters = new Map<string, RefactorOpportunity[]>();

  // Cluster 1: By category (code-quality, security, performance, etc.)
  for (const opp of opportunities) {
    const key = `category:${opp.category}`;
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(opp);
  }

  // Cluster 2: By module (file path prefix)
  for (const opp of opportunities) {
    if (opp.files.length > 0) {
      const modulePath = extractModulePath(opp.files[0]);
      const key = `module:${modulePath}`;
      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(opp);
    }
  }

  // Filter out small clusters
  const filtered = new Map<string, RefactorOpportunity[]>();
  for (const [key, opps] of clusters.entries()) {
    if (opps.length >= options.minIssuesPerPackage) {
      filtered.set(key, opps);
    }
  }

  return filtered;
}

/**
 * Extract module path from file path (e.g., src/auth/login.tsx -> src/auth)
 */
function extractModulePath(filePath: string): string {
  const parts = filePath.split('/');
  if (parts.length <= 2) return filePath;
  return parts.slice(0, -1).join('/'); // Remove filename
}

/**
 * Build AI prompt for package generation
 */
function buildPackageGenerationPrompt(
  opportunities: RefactorOpportunity[],
  context: ProjectContext,
  options: {
    maxPackages: number;
    minIssuesPerPackage: number;
    clusters: Map<string, RefactorOpportunity[]>;
    prioritizeCategory?: string;
  }
): string {
  // Summarize opportunities (limit to avoid token overflow)
  const issuesSummary = opportunities.slice(0, 200).map((opp) => ({
    id: opp.id,
    title: opp.title,
    category: opp.category,
    severity: opp.severity,
    effort: opp.effort,
    files: opp.files.slice(0, 3),
    description: opp.description?.slice(0, 150),
  }));

  // Get cluster info
  const clusterInfo = Array.from(options.clusters.entries())
    .map(([key, opps]) => ({
      type: key.split(':')[0],
      name: key.split(':')[1],
      count: opps.length,
    }))
    .slice(0, 20);

  // Validate inputs
  if (!opportunities || opportunities.length === 0) {
    throw new Error('Cannot build prompt: no opportunities provided');
  }

  if (!context) {
    throw new Error('Cannot build prompt: projectContext is required');
  }

  // Create safe context with defaults for all fields
  const safeContext = {
    projectType: context.projectType || 'unknown',
    techStack: context.techStack || [],
    architecture: context.architecture || 'Not specified',
    priorities: context.priorities || [],
    conventions: context.conventions || [],
    claudeMd: context.claudeMd || '',
    readme: context.readme || '',
  };

  const prompt = `You are a senior software architect creating a systematic refactoring plan.

## Project Context

**Project Type**: ${safeContext.projectType}
**Technology Stack**: ${safeContext.techStack.join(', ')}

### Architecture
${safeContext.architecture.slice(0, 1000)}

### Priorities
${safeContext.priorities.slice(0, 10).map(p => `- ${p}`).join('\n')}

### Code Conventions
${safeContext.conventions.slice(0, 10).map(c => `- ${c}`).join('\n')}

${safeContext.claudeMd ? `### From CLAUDE.md (excerpt)\n${safeContext.claudeMd.slice(0, 2000)}` : ''}

---

## Discovered Issues

**Total**: ${opportunities.length} issues
**Sample** (first 200):
${JSON.stringify(issuesSummary, null, 2)}

## Pre-computed Clusters

These are initial groupings to help you understand patterns:
${JSON.stringify(clusterInfo, null, 2)}

---

## Task

Create **${options.maxPackages}** strategic refactoring packages by grouping related issues.

${options.prioritizeCategory ? `**PRIORITY**: Focus on ${options.prioritizeCategory} issues first.\n` : ''}

### Package Requirements

Each package MUST:
1. **Group issues with a coherent theme** (not random)
   - Pattern-based: All issues of same type (e.g., "TypeScript strict mode")
   - Module-based: All issues in specific folder/domain (e.g., "Authentication cleanup")
   - Migration: Upgrade to new tech/pattern (e.g., "Next.js App Router migration")
   - Tech-upgrade: Framework updates (e.g., "React 19 upgrade")

2. **Have a clear strategic goal** (not just "fix stuff")
   - Example: "Eliminate all implicit any types and enable strict null checks"
   - NOT: "Fix various TypeScript issues"

3. **Contain ${options.minIssuesPerPackage}-50 issues**
   - Prefer 10-30 issues per package (manageable size)
   - Split larger packages into phases

4. **Have clear dependencies**
   - Identify which packages must be completed first
   - Foundational packages (shared utilities) come before leaf packages (UI components)

5. **Have measurable outcomes**
   - Example: "Zero 'any' types in shared utilities"
   - Example: "100% explicit return types"

### Package Types Priority

1. **Foundational** (dependencies: none, execution order: 1)
   - Shared utilities, core types, base configurations

2. **Infrastructure** (dependencies: foundational, execution order: 2)
   - API layer, data layer, state management

3. **Feature** (dependencies: infrastructure, execution order: 3)
   - UI components, feature modules, pages

### Output Format

Return ONLY valid JSON, no markdown, no explanations outside JSON:

{
  "packages": [
    {
      "name": "TypeScript Strict Mode Migration",
      "description": "Comprehensive migration to TypeScript strict mode for improved type safety and maintainability",
      "strategy": {
        "type": "pattern-based",
        "rationale": "All 'any' types and missing return types can be fixed systematically as a single initiative. This is foundational work that will improve type safety across the entire codebase.",
        "approach": "Fix shared utilities first (no dependencies), then API layer, then UI components. Enable strict mode flags incrementally."
      },
      "category": "migration",
      "scope": "project",
      "modulePattern": null,
      "opportunityIds": ["opp-1", "opp-5", "opp-12", "..."],
      "impact": "high",
      "effort": "medium",
      "estimatedHours": 8,
      "dependsOn": [],
      "enables": ["API Error Handling Package", "React Props Typing Package"],
      "strategicGoal": "Eliminate all implicit any types and enable strict null checks across the codebase",
      "expectedOutcomes": [
        "Zero 'any' types in shared utilities",
        "100% explicit return types in all functions",
        "Type-safe API contracts",
        "Reduced runtime errors by ~40%"
      ],
      "relatedDocs": ["tsconfig.json", ".claude/CLAUDE.md"],
      "phases": [
        {
          "id": "phase-1-utils",
          "name": "Phase 1: Shared Utilities",
          "description": "Fix all type issues in src/lib/ and src/utils/",
          "opportunityIds": ["opp-1", "opp-2", "opp-3"],
          "order": 1
        },
        {
          "id": "phase-2-api",
          "name": "Phase 2: API Layer",
          "description": "Add proper types to all API routes and responses",
          "opportunityIds": ["opp-5", "opp-6"],
          "order": 2,
          "dependsOnPhase": "phase-1-utils"
        }
      ]
    }
  ],
  "reasoning": "I organized packages into foundational (TypeScript strict mode), infrastructure (API error handling), and feature (component improvements) layers. The TypeScript package is first because it affects all other code. Security issues are bundled into a dedicated package given their high priority."
}

IMPORTANT:
- Return ONLY the JSON object above
- Do NOT wrap in markdown code blocks
- Do NOT add explanatory text before/after JSON
- Ensure all opportunityIds reference real IDs from the input
- Package names in "dependsOn" and "enables" will be converted to IDs later
`;

  return prompt;
}

/**
 * Parse AI response into RefactoringPackage objects
 */
function parsePackageResponse(
  response: string,
  opportunities: RefactorOpportunity[]
): RefactoringPackage[] {
  try {
    console.log('[packageGenerator] Parsing AI response...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = response.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    // Find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.packages || !Array.isArray(parsed.packages)) {
      throw new Error('Invalid response: missing packages array');
    }

    const packages: RefactoringPackage[] = [];
    const opportunityMap = new Map(opportunities.map(o => [o.id, o]));

    for (const pkgData of parsed.packages) {
      // Map opportunity IDs to full opportunities
      const pkgOpportunities: RefactorOpportunity[] = [];
      for (const oppId of pkgData.opportunityIds || []) {
        const opp = opportunityMap.get(oppId);
        if (opp) {
          pkgOpportunities.push(opp);
        } else {
          console.warn(`[packageGenerator] Opportunity ${oppId} not found`);
        }
      }

      // Skip packages with no valid opportunities
      if (pkgOpportunities.length === 0) {
        console.warn(`[packageGenerator] Skipping package "${pkgData.name}" - no valid opportunities`);
        continue;
      }

      // Parse phases if present
      let phases: PackagePhase[] | undefined;
      if (pkgData.phases && Array.isArray(pkgData.phases)) {
        phases = pkgData.phases.map((phase: any) => ({
          id: phase.id || `phase-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: phase.name,
          description: phase.description,
          opportunities: phase.opportunityIds
            ?.map((id: string) => opportunityMap.get(id))
            .filter((o: any) => o !== undefined) || [],
          order: phase.order || 1,
          dependsOnPhase: phase.dependsOnPhase,
        }));
      }

      const pkg: RefactoringPackage = {
        id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: pkgData.name,
        description: pkgData.description,
        strategy: pkgData.strategy,
        category: pkgData.category,
        scope: pkgData.scope,
        modulePattern: pkgData.modulePattern,
        opportunities: pkgOpportunities,
        issueCount: pkgOpportunities.length,
        impact: pkgData.impact,
        effort: pkgData.effort,
        estimatedHours: pkgData.estimatedHours || 4,
        dependsOn: Array.isArray(pkgData.dependsOn) ? pkgData.dependsOn : [],
        enables: Array.isArray(pkgData.enables) ? pkgData.enables : [],
        executionOrder: 0, // Will be calculated later
        strategicGoal: pkgData.strategicGoal,
        expectedOutcomes: pkgData.expectedOutcomes || [],
        relatedDocs: pkgData.relatedDocs || [],
        phases,
        selected: false,
        executed: false,
      };

      packages.push(pkg);
    }

    console.log('[packageGenerator] Successfully parsed', packages.length, 'packages');
    return packages;

  } catch (error) {
    console.error('[packageGenerator] Failed to parse AI response:', error);
    console.error('[packageGenerator] Response was:', response.slice(0, 500));
    throw new Error(`Failed to parse package response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Optimize packages (merge small, split large, validate)
 */
function optimizePackages(
  packages: RefactoringPackage[],
  options: { minIssuesPerPackage: number; maxIssuesPerPackage: number }
): RefactoringPackage[] {
  console.log('[packageGenerator] Optimizing packages...');

  const optimized: RefactoringPackage[] = [];

  // Step 1: Split large packages into phases if not already phased
  for (const pkg of packages) {
    if (pkg.issueCount > options.maxIssuesPerPackage && !pkg.phases) {
      console.log(`[packageGenerator] Splitting large package "${pkg.name}" (${pkg.issueCount} issues)`);

      // Create phases (split by 30 issues each)
      const phases: PackagePhase[] = [];
      const chunkSize = 30;
      for (let i = 0; i < pkg.opportunities.length; i += chunkSize) {
        const chunk = pkg.opportunities.slice(i, i + chunkSize);
        phases.push({
          id: `phase-${i / chunkSize + 1}`,
          name: `Phase ${i / chunkSize + 1}`,
          description: `Issues ${i + 1} to ${Math.min(i + chunkSize, pkg.opportunities.length)}`,
          opportunities: chunk,
          order: i / chunkSize + 1,
          dependsOnPhase: i > 0 ? `phase-${i / chunkSize}` : undefined,
        });
      }
      pkg.phases = phases;
    }
    optimized.push(pkg);
  }

  // Step 2: Remove packages with too few issues (edge case)
  const filtered = optimized.filter(pkg => {
    if (pkg.issueCount < options.minIssuesPerPackage) {
      console.warn(`[packageGenerator] Removing small package "${pkg.name}" (${pkg.issueCount} issues)`);
      return false;
    }
    return true;
  });

  console.log('[packageGenerator] Optimization complete:', filtered.length, 'packages');
  return filtered;
}

/**
 * Resolve package dependencies (convert package names to IDs)
 */
function resolvePackageDependencies(packages: RefactoringPackage[]): void {
  console.log('[packageGenerator] Resolving package dependencies...');

  // Build name -> ID map
  const nameToId = new Map<string, string>();
  for (const pkg of packages) {
    nameToId.set(pkg.name, pkg.id);
  }

  // Resolve dependsOn (currently package names, need IDs)
  for (const pkg of packages) {
    const resolvedDeps: string[] = [];
    for (const dep of pkg.dependsOn) {
      const depId = nameToId.get(dep);
      if (depId) {
        resolvedDeps.push(depId);
      } else {
        // Might already be an ID, keep it
        if (packages.some(p => p.id === dep)) {
          resolvedDeps.push(dep);
        } else {
          console.warn(`[packageGenerator] Package "${pkg.name}" depends on unknown package "${dep}"`);
        }
      }
    }
    pkg.dependsOn = resolvedDeps;

    // Same for enables
    const resolvedEnables: string[] = [];
    for (const enable of pkg.enables) {
      const enableId = nameToId.get(enable);
      if (enableId) {
        resolvedEnables.push(enableId);
      } else if (packages.some(p => p.id === enable)) {
        resolvedEnables.push(enable);
      }
    }
    pkg.enables = resolvedEnables;
  }

  console.log('[packageGenerator] Dependencies resolved');
}

/**
 * Fallback: Generate packages using simple rules (no AI)
 */
function generateFallbackPackages(
  opportunities: RefactorOpportunity[],
  options: { minIssuesPerPackage: number; maxIssuesPerPackage: number }
): RefactoringPackage[] {
  console.log('[packageGenerator] Using fallback packaging strategy');

  const packages: RefactoringPackage[] = [];
  const byCategory = new Map<string, RefactorOpportunity[]>();

  // Group by category
  for (const opp of opportunities) {
    if (!byCategory.has(opp.category)) {
      byCategory.set(opp.category, []);
    }
    byCategory.get(opp.category)!.push(opp);
  }

  // Create packages from categories
  for (const [category, opps] of byCategory.entries()) {
    if (opps.length >= options.minIssuesPerPackage) {
      packages.push({
        id: `pkg-fallback-${category}-${Date.now()}`,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Improvements`,
        description: `Address ${opps.length} ${category} issues`,
        strategy: {
          type: 'pattern-based',
          rationale: `Grouped by ${category} category`,
          approach: 'Fix issues systematically by priority',
        },
        category: 'cleanup',
        scope: 'project',
        opportunities: opps.slice(0, options.maxIssuesPerPackage),
        issueCount: Math.min(opps.length, options.maxIssuesPerPackage),
        impact: 'medium',
        effort: 'medium',
        estimatedHours: opps.length * 0.5,
        dependsOn: [],
        enables: [],
        executionOrder: 1,
        strategicGoal: `Improve ${category} across the codebase`,
        expectedOutcomes: [`${opps.length} ${category} issues resolved`],
        relatedDocs: [],
        selected: false,
        executed: false,
      });
    }
  }

  console.log('[packageGenerator] Generated', packages.length, 'fallback packages');
  return packages;
}
