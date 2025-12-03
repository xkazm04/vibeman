/**
 * Static Analyzer for Impact Simulation
 * Analyzes file dependencies and predicts impact of context moves
 */

import type { Context, ContextGroup } from '@/stores/contextStore';
import type {
  ProposedMove,
  ImpactAnalysisResult,
  ImportPathChange,
  TestBreakagePrediction,
  BuildImpact,
  RefactorEffortSummary,
  ImpactItem,
  ImpactSeverity,
  FileDependency,
  ParsedImport,
} from './types';

/**
 * Test file patterns
 */
const TEST_PATTERNS = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '__tests__',
  '.test.js',
  '.test.jsx',
];

/**
 * Check if a file is a test file
 */
function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Get the module/feature name from a file path
 */
function getModuleFromPath(filePath: string): string | null {
  // Try to extract feature name from common patterns
  const featureMatch = filePath.match(/features\/([^/]+)/);
  if (featureMatch) return featureMatch[1];

  const appMatch = filePath.match(/app\/([^/]+)/);
  if (appMatch) return appMatch[1];

  const componentsMatch = filePath.match(/components\/([^/]+)/);
  if (componentsMatch) return componentsMatch[1];

  return null;
}

/**
 * Analyze file path patterns to predict import changes
 */
function analyzeImportPatterns(
  contextFiles: string[],
  allContexts: Context[],
  sourceGroup: ContextGroup | null,
  targetGroup: ContextGroup
): ImportPathChange[] {
  const changes: ImportPathChange[] = [];

  // Get all files from other contexts that might reference these files
  const otherFiles = allContexts
    .filter(ctx => ctx.id !== contextFiles[0]) // Exclude current context
    .flatMap(ctx => ctx.filePaths || []);

  for (const movedFile of contextFiles) {
    const fileName = movedFile.split('/').pop() || movedFile;
    const movedModule = getModuleFromPath(movedFile);

    // Look for potential references in other files
    for (const otherFile of otherFiles) {
      // Simple heuristic: if files are in the same module/feature, they likely import each other
      const otherModule = getModuleFromPath(otherFile);

      if (movedModule && otherModule && movedModule === otherModule) {
        // Predict an import change
        const relativePath = movedFile.replace(/\.(tsx?|jsx?)$/, '');
        changes.push({
          filePath: otherFile,
          oldImport: `from './${fileName.replace(/\.(tsx?|jsx?)$/, '')}'`,
          newImport: `from '@/app/features/${targetGroup.name}/${fileName.replace(/\.(tsx?|jsx?)$/, '')}'`,
          line: 1, // Estimated line (would need actual file parsing for real line numbers)
        });
      }
    }

    // Check for index.ts exports
    if (movedFile.includes('/index.')) {
      changes.push({
        filePath: `${sourceGroup?.name || 'root'}/index.ts`,
        oldImport: `export * from './${fileName.replace(/\.(tsx?|jsx?)$/, '')}'`,
        newImport: `// Removed: export moved to ${targetGroup.name}`,
        line: 1,
      });
    }
  }

  return changes;
}

/**
 * Predict test breakages from context move
 */
function predictTestBreakages(
  contextFiles: string[],
  allContexts: Context[],
  sourceGroup: ContextGroup | null,
  targetGroup: ContextGroup
): TestBreakagePrediction[] {
  const predictions: TestBreakagePrediction[] = [];

  // Find test files in the context
  const testFiles = contextFiles.filter(isTestFile);
  const nonTestFiles = contextFiles.filter(f => !isTestFile(f));

  // Tests that move with the context
  for (const testFile of testFiles) {
    predictions.push({
      testFile,
      reason: 'Test file moves with context - import paths need updating',
      confidence: 85,
    });
  }

  // Look for external tests that might reference these files
  const allFiles = allContexts.flatMap(ctx => ctx.filePaths || []);
  const externalTests = allFiles.filter(f => isTestFile(f) && !contextFiles.includes(f));

  for (const externalTest of externalTests) {
    const testModule = getModuleFromPath(externalTest);

    for (const movedFile of nonTestFiles) {
      const movedModule = getModuleFromPath(movedFile);

      // If test is in same module as moved file, it might break
      if (testModule && movedModule && testModule === movedModule) {
        predictions.push({
          testFile: externalTest,
          reason: `May reference ${movedFile.split('/').pop()} which is being moved`,
          confidence: 60,
        });
      }
    }
  }

  // Layer change risk assessment
  if (sourceGroup?.type !== targetGroup.type && sourceGroup?.type && targetGroup.type) {
    const layerChangeRisk = getLayerChangeRisk(sourceGroup.type, targetGroup.type);
    if (layerChangeRisk > 50) {
      predictions.push({
        testFile: 'Integration tests',
        reason: `Layer change from ${sourceGroup.type} to ${targetGroup.type} may break integration tests`,
        confidence: layerChangeRisk,
      });
    }
  }

  return predictions;
}

/**
 * Get risk level for layer changes
 */
function getLayerChangeRisk(
  from: 'pages' | 'client' | 'server' | 'external',
  to: 'pages' | 'client' | 'server' | 'external'
): number {
  const riskMatrix: Record<string, Record<string, number>> = {
    pages: { client: 30, server: 70, external: 80 },
    client: { pages: 40, server: 60, external: 70 },
    server: { pages: 80, client: 60, external: 50 },
    external: { pages: 85, client: 75, server: 55 },
  };

  return riskMatrix[from]?.[to] || 50;
}

/**
 * Estimate build impact
 */
function estimateBuildImpact(
  contextFiles: string[],
  sourceGroup: ContextGroup | null,
  targetGroup: ContextGroup
): BuildImpact {
  // Estimate based on file types and count
  const jsxFiles = contextFiles.filter(f => f.match(/\.[jt]sx$/)).length;
  const tsFiles = contextFiles.filter(f => f.match(/\.[jt]s$/)).length;

  // Pages layer files typically affect bundle more
  const layerMultiplier =
    targetGroup.type === 'pages' ? 1.5 :
    targetGroup.type === 'client' ? 1.2 :
    targetGroup.type === 'server' ? 0.8 :
    1.0;

  // Rough estimate: each JSX file adds ~5KB, TS files add ~2KB
  const baseSize = (jsxFiles * 5000 + tsFiles * 2000) * layerMultiplier;

  // If moving to a different chunk, there might be duplication
  const chunkChange = sourceGroup?.type !== targetGroup.type;

  return {
    bundleSizeChange: chunkChange ? Math.round(baseSize * 0.3) : 0,
    affectedChunks: chunkChange ? [sourceGroup?.name || 'main', targetGroup.name] : [],
    treeShakingImpact: jsxFiles > 5 ? 'significant' : jsxFiles > 2 ? 'minor' : 'none',
  };
}

/**
 * Calculate refactoring effort summary
 */
function calculateEffortSummary(
  contextFiles: string[],
  importChanges: ImportPathChange[],
  testBreakages: TestBreakagePrediction[]
): RefactorEffortSummary {
  const totalFiles = contextFiles.length + importChanges.length;
  const totalImportChanges = importChanges.length;

  // Estimate hours: ~5 min per file, ~2 min per import change, ~15 min per test fix
  const estimatedHours =
    (totalFiles * 5 + totalImportChanges * 2 + testBreakages.length * 15) / 60;

  // Determine complexity
  let complexity: RefactorEffortSummary['complexity'];
  if (totalFiles <= 3 && totalImportChanges <= 5) {
    complexity = 'trivial';
  } else if (totalFiles <= 10 && totalImportChanges <= 15) {
    complexity = 'simple';
  } else if (totalFiles <= 25 && totalImportChanges <= 40) {
    complexity = 'moderate';
  } else if (totalFiles <= 50) {
    complexity = 'complex';
  } else {
    complexity = 'very_complex';
  }

  // Determine risk level
  let riskLevel: ImpactSeverity;
  const highConfidenceBreakages = testBreakages.filter(t => t.confidence > 70).length;
  if (highConfidenceBreakages > 5 || totalImportChanges > 50) {
    riskLevel = 'critical';
  } else if (highConfidenceBreakages > 2 || totalImportChanges > 20) {
    riskLevel = 'high';
  } else if (highConfidenceBreakages > 0 || totalImportChanges > 10) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  return {
    totalFiles,
    totalImportChanges,
    estimatedHours: Math.round(estimatedHours * 10) / 10,
    complexity,
    riskLevel,
  };
}

/**
 * Generate impact items for display
 */
function generateImpactItems(
  importChanges: ImportPathChange[],
  testBreakages: TestBreakagePrediction[],
  buildImpact: BuildImpact,
  summary: RefactorEffortSummary
): ImpactItem[] {
  const items: ImpactItem[] = [];

  // Import path changes
  if (importChanges.length > 0) {
    items.push({
      id: 'import-paths',
      category: 'import_path',
      severity: importChanges.length > 20 ? 'high' : importChanges.length > 10 ? 'medium' : 'low',
      title: `${importChanges.length} Import Path Changes`,
      description: 'Files that need their import statements updated',
      affectedFiles: [...new Set(importChanges.map(c => c.filePath))],
      estimatedEffort: {
        files: importChanges.length,
        lines: importChanges.length,
        hours: importChanges.length * 2 / 60,
      },
    });
  }

  // Test breakages
  if (testBreakages.length > 0) {
    const highConfidence = testBreakages.filter(t => t.confidence > 70);
    items.push({
      id: 'test-breakages',
      category: 'test_breakage',
      severity: highConfidence.length > 3 ? 'critical' : highConfidence.length > 0 ? 'high' : 'medium',
      title: `${testBreakages.length} Potential Test Breakages`,
      description: `${highConfidence.length} high-confidence and ${testBreakages.length - highConfidence.length} possible breakages`,
      affectedFiles: testBreakages.map(t => t.testFile),
      estimatedEffort: {
        files: testBreakages.length,
        lines: testBreakages.length * 10,
        hours: testBreakages.length * 15 / 60,
      },
    });
  }

  // Build impact
  if (buildImpact.bundleSizeChange !== 0 || buildImpact.affectedChunks.length > 0) {
    const sizeKB = Math.abs(buildImpact.bundleSizeChange / 1024);
    items.push({
      id: 'build-impact',
      category: 'build_impact',
      severity: sizeKB > 100 ? 'high' : sizeKB > 50 ? 'medium' : 'low',
      title: `Build Size Impact: ${buildImpact.bundleSizeChange > 0 ? '+' : ''}${sizeKB.toFixed(1)}KB`,
      description: `Tree-shaking impact: ${buildImpact.treeShakingImpact}`,
      affectedFiles: buildImpact.affectedChunks,
    });
  }

  // Overall refactoring effort
  items.push({
    id: 'refactor-effort',
    category: 'refactor_effort',
    severity: summary.riskLevel,
    title: `Refactoring Effort: ${summary.complexity}`,
    description: `Estimated ${summary.estimatedHours} hours for ${summary.totalFiles} files`,
    affectedFiles: [],
    estimatedEffort: {
      files: summary.totalFiles,
      lines: summary.totalImportChanges,
      hours: summary.estimatedHours,
    },
  });

  return items;
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(
  proposedMove: ProposedMove,
  importChanges: ImportPathChange[],
  testBreakages: TestBreakagePrediction[],
  summary: RefactorEffortSummary
): string[] {
  const warnings: string[] = [];

  // Layer change warnings
  if (proposedMove.sourceLayer !== proposedMove.targetLayer) {
    if (proposedMove.sourceLayer === 'server' && proposedMove.targetLayer === 'client') {
      warnings.push('Moving server code to client layer may expose sensitive logic');
    }
    if (proposedMove.sourceLayer === 'client' && proposedMove.targetLayer === 'server') {
      warnings.push('Client-specific code (hooks, browser APIs) will not work on server');
    }
    if (proposedMove.targetLayer === 'pages') {
      warnings.push('Pages layer code has routing implications');
    }
  }

  // Risk warnings
  if (summary.riskLevel === 'critical') {
    warnings.push('This is a high-risk refactoring with many potential breaking changes');
  }

  // Test warnings
  const highConfidenceBreakages = testBreakages.filter(t => t.confidence > 80);
  if (highConfidenceBreakages.length > 0) {
    warnings.push(`${highConfidenceBreakages.length} tests are very likely to break`);
  }

  // Import warnings
  if (importChanges.length > 30) {
    warnings.push('Large number of import changes may indicate tight coupling');
  }

  return warnings;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  proposedMove: ProposedMove,
  importChanges: ImportPathChange[],
  summary: RefactorEffortSummary
): string[] {
  const recommendations: string[] = [];

  // Always recommend testing
  recommendations.push('Run full test suite after refactoring');

  // Complexity-based recommendations
  if (summary.complexity === 'complex' || summary.complexity === 'very_complex') {
    recommendations.push('Consider breaking this into smaller, incremental moves');
    recommendations.push('Create a rollback plan before proceeding');
  }

  // Import-based recommendations
  if (importChanges.length > 10) {
    recommendations.push('Use IDE refactoring tools for bulk import updates');
  }

  // Layer-based recommendations
  if (proposedMove.sourceLayer !== proposedMove.targetLayer) {
    recommendations.push('Review code for layer-specific dependencies before moving');
  }

  // General best practices
  if (summary.estimatedHours > 2) {
    recommendations.push('Commit changes incrementally with clear commit messages');
  }

  return recommendations;
}

/**
 * Main function to analyze the impact of moving a context to a different group
 */
export function analyzeContextMoveImpact(
  context: Context,
  sourceGroup: ContextGroup | null,
  targetGroup: ContextGroup,
  allContexts: Context[],
  allGroups: ContextGroup[]
): ImpactAnalysisResult {
  const contextFiles = context.filePaths || [];

  // Create proposed move object
  const proposedMove: ProposedMove = {
    contextId: context.id,
    contextName: context.name,
    sourceGroupId: sourceGroup?.id || null,
    sourceGroupName: sourceGroup?.name || 'Ungrouped',
    targetGroupId: targetGroup.id,
    targetGroupName: targetGroup.name,
    sourceLayer: sourceGroup?.type || null,
    targetLayer: targetGroup.type || null,
  };

  // Run analyses
  const importPathChanges = analyzeImportPatterns(
    contextFiles,
    allContexts,
    sourceGroup,
    targetGroup
  );

  const testBreakages = predictTestBreakages(
    contextFiles,
    allContexts,
    sourceGroup,
    targetGroup
  );

  const buildImpact = estimateBuildImpact(contextFiles, sourceGroup, targetGroup);

  const summary = calculateEffortSummary(contextFiles, importPathChanges, testBreakages);

  const impactItems = generateImpactItems(
    importPathChanges,
    testBreakages,
    buildImpact,
    summary
  );

  const warnings = generateWarnings(proposedMove, importPathChanges, testBreakages, summary);
  const recommendations = generateRecommendations(proposedMove, importPathChanges, summary);

  return {
    proposedMove,
    timestamp: new Date(),
    analysisComplete: true,
    importPathChanges,
    testBreakages,
    buildImpact,
    summary,
    impactItems,
    warnings,
    recommendations,
  };
}

/**
 * Quick analysis for immediate feedback during drag
 */
export function quickAnalyzeMove(
  context: Context,
  targetGroup: ContextGroup
): { severity: ImpactSeverity; fileCount: number; hasLayerChange: boolean } {
  const fileCount = context.filePaths?.length || 0;
  const sourceLayer = context.groupId ? 'client' : null; // Simplified for quick analysis
  const hasLayerChange = sourceLayer !== targetGroup.type;

  let severity: ImpactSeverity = 'low';
  if (fileCount > 20 || (hasLayerChange && fileCount > 5)) {
    severity = 'high';
  } else if (fileCount > 10 || hasLayerChange) {
    severity = 'medium';
  }

  return { severity, fileCount, hasLayerChange };
}
