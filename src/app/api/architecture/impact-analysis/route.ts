/**
 * Impact Analysis API
 * Analyzes the predicted impact of moving a context to a different group
 *
 * POST /api/architecture/impact-analysis
 * Body: { contextId, targetGroupId, projectId }
 * Returns: Impact analysis result with predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { contextQueries, contextGroupQueries } from '@/lib/queries/contextQueries';
import { createErrorResponse } from '@/lib/api-helpers';

// Types for the analysis
interface ImpactSeverity {
  level: 'low' | 'medium' | 'high' | 'critical';
}

interface ImportPathChange {
  filePath: string;
  oldImport: string;
  newImport: string;
  line: number;
}

interface TestBreakagePrediction {
  testFile: string;
  testName?: string;
  reason: string;
  confidence: number;
}

interface ImpactAnalysisResult {
  proposedMove: {
    contextId: string;
    contextName: string;
    sourceGroupId: string | null;
    sourceGroupName: string;
    targetGroupId: string;
    targetGroupName: string;
    sourceLayer: string | null;
    targetLayer: string | null;
  };
  summary: {
    totalFiles: number;
    totalImportChanges: number;
    estimatedHours: number;
    complexity: string;
    riskLevel: string;
  };
  importPathChanges: ImportPathChange[];
  testBreakages: TestBreakagePrediction[];
  warnings: string[];
  recommendations: string[];
}

// Test file patterns
const TEST_PATTERNS = [
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '__tests__',
];

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getModuleFromPath(filePath: string): string | null {
  const featureMatch = filePath.match(/features\/([^/]+)/);
  if (featureMatch) return featureMatch[1];

  const appMatch = filePath.match(/app\/([^/]+)/);
  if (appMatch) return appMatch[1];

  return null;
}

// POST /api/architecture/impact-analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contextId, targetGroupId, projectId } = body;

    if (!contextId || !targetGroupId || !projectId) {
      return createErrorResponse('Missing required fields: contextId, targetGroupId, projectId', 400);
    }

    // Fetch context and groups data
    const [contexts, groups] = await Promise.all([
      contextQueries.getContextsByProject(projectId),
      contextGroupQueries.getGroupsByProject(projectId),
    ]);

    const context = contexts.find(c => c.id === contextId);
    if (!context) {
      return createErrorResponse('Context not found', 404);
    }

    const targetGroup = groups.find(g => g.id === targetGroupId);
    if (!targetGroup) {
      return createErrorResponse('Target group not found', 404);
    }

    const sourceGroup = context.groupId
      ? groups.find(g => g.id === context.groupId) || null
      : null;

    // Perform analysis
    const contextFiles = context.filePaths || [];

    // Analyze import patterns
    const importPathChanges: ImportPathChange[] = [];
    const otherFiles = contexts
      .filter(ctx => ctx.id !== contextId)
      .flatMap(ctx => ctx.filePaths || []);

    for (const movedFile of contextFiles) {
      const fileName = movedFile.split('/').pop() || movedFile;
      const movedModule = getModuleFromPath(movedFile);

      for (const otherFile of otherFiles) {
        const otherModule = getModuleFromPath(otherFile);

        if (movedModule && otherModule && movedModule === otherModule) {
          importPathChanges.push({
            filePath: otherFile,
            oldImport: `from './${fileName.replace(/\.(tsx?|jsx?)$/, '')}'`,
            newImport: `from '@/app/features/${targetGroup.name}/${fileName.replace(/\.(tsx?|jsx?)$/, '')}'`,
            line: 1,
          });
        }
      }
    }

    // Predict test breakages
    const testBreakages: TestBreakagePrediction[] = [];
    const testFiles = contextFiles.filter(isTestFile);
    const nonTestFiles = contextFiles.filter(f => !isTestFile(f));

    for (const testFile of testFiles) {
      testBreakages.push({
        testFile,
        reason: 'Test file moves with context - import paths need updating',
        confidence: 85,
      });
    }

    const allFiles = contexts.flatMap(ctx => ctx.filePaths || []);
    const externalTests = allFiles.filter(f => isTestFile(f) && !contextFiles.includes(f));

    for (const externalTest of externalTests) {
      const testModule = getModuleFromPath(externalTest);

      for (const movedFile of nonTestFiles) {
        const movedModule = getModuleFromPath(movedFile);

        if (testModule && movedModule && testModule === movedModule) {
          testBreakages.push({
            testFile: externalTest,
            reason: `May reference ${movedFile.split('/').pop()} which is being moved`,
            confidence: 60,
          });
        }
      }
    }

    // Layer change risk
    if (sourceGroup?.type !== targetGroup.type && sourceGroup?.type && targetGroup.type) {
      testBreakages.push({
        testFile: 'Integration tests',
        reason: `Layer change from ${sourceGroup.type} to ${targetGroup.type} may break integration tests`,
        confidence: 70,
      });
    }

    // Calculate effort summary
    const totalFiles = contextFiles.length + importPathChanges.length;
    const totalImportChanges = importPathChanges.length;
    const estimatedHours = (totalFiles * 5 + totalImportChanges * 2 + testBreakages.length * 15) / 60;

    let complexity: string;
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

    const highConfidenceBreakages = testBreakages.filter(t => t.confidence > 70).length;
    let riskLevel: string;
    if (highConfidenceBreakages > 5 || totalImportChanges > 50) {
      riskLevel = 'critical';
    } else if (highConfidenceBreakages > 2 || totalImportChanges > 20) {
      riskLevel = 'high';
    } else if (highConfidenceBreakages > 0 || totalImportChanges > 10) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Generate warnings
    const warnings: string[] = [];
    if (sourceGroup?.type !== targetGroup.type) {
      if (sourceGroup?.type === 'server' && targetGroup.type === 'client') {
        warnings.push('Moving server code to client layer may expose sensitive logic');
      }
      if (sourceGroup?.type === 'client' && targetGroup.type === 'server') {
        warnings.push('Client-specific code (hooks, browser APIs) will not work on server');
      }
      if (targetGroup.type === 'pages') {
        warnings.push('Pages layer code has routing implications');
      }
    }

    if (riskLevel === 'critical') {
      warnings.push('This is a high-risk refactoring with many potential breaking changes');
    }

    if (importPathChanges.length > 30) {
      warnings.push('Large number of import changes may indicate tight coupling');
    }

    // Generate recommendations
    const recommendations: string[] = ['Run full test suite after refactoring'];

    if (complexity === 'complex' || complexity === 'very_complex') {
      recommendations.push('Consider breaking this into smaller, incremental moves');
      recommendations.push('Create a rollback plan before proceeding');
    }

    if (importPathChanges.length > 10) {
      recommendations.push('Use IDE refactoring tools for bulk import updates');
    }

    if (sourceGroup?.type !== targetGroup.type) {
      recommendations.push('Review code for layer-specific dependencies before moving');
    }

    if (estimatedHours > 2) {
      recommendations.push('Commit changes incrementally with clear commit messages');
    }

    const result: ImpactAnalysisResult = {
      proposedMove: {
        contextId: context.id,
        contextName: context.name,
        sourceGroupId: sourceGroup?.id || null,
        sourceGroupName: sourceGroup?.name || 'Ungrouped',
        targetGroupId: targetGroup.id,
        targetGroupName: targetGroup.name,
        sourceLayer: sourceGroup?.type || null,
        targetLayer: targetGroup.type || null,
      },
      summary: {
        totalFiles,
        totalImportChanges,
        estimatedHours: Math.round(estimatedHours * 10) / 10,
        complexity,
        riskLevel,
      },
      importPathChanges,
      testBreakages,
      warnings,
      recommendations,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to analyze impact:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze impact' },
      { status: 500 }
    );
  }
}
