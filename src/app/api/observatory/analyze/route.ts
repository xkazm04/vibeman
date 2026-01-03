/**
 * Observatory Analyze API
 * Triggers a full analysis for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import {
  startAnalysisSnapshot,
  completeAnalysisSnapshot,
  failAnalysisSnapshot,
  recordHealthMetric,
} from '@/app/features/Observatory/lib/ObservationService';
import { collectAllSignals } from '@/app/features/Observatory/lib/signals';
import { generatePredictions, storePredictions } from '@/app/features/Observatory/lib/PredictionEngine';
import { generateAutoFixes } from '@/app/features/Observatory/lib/ActionEngine';
import { learnFromExecutions } from '@/app/features/Observatory/lib/LearningSystem';

// Get source files in a project
function getProjectFiles(projectPath: string): string[] {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'];
  const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'];
  const files: string[] = [];

  function walk(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(projectPath, fullPath);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(relativePath);
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  walk(projectPath);
  return files;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath } = body;

    if (!projectId || !projectPath) {
      return NextResponse.json(
        { error: 'projectId and projectPath are required' },
        { status: 400 }
      );
    }

    // Verify project path exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Start analysis snapshot
    const snapshotId = startAnalysisSnapshot({
      projectId,
      snapshotType: 'manual',
      triggerSource: 'api',
    });

    try {
      // Get project files
      const files = getProjectFiles(projectPath);

      // Collect signals
      const signals = await collectAllSignals(projectPath, files);

      // Generate predictions
      const predictions = await generatePredictions(projectPath, projectId, files);

      // Store predictions
      if (predictions.predictions.length > 0) {
        await storePredictions(projectId, null, predictions.predictions);
      }

      // Generate auto-fixes
      const autoFixes = await generateAutoFixes(projectId, predictions.predictions, {
        maxItems: 5,
        minConfidence: 0.5,
        minUrgency: 0.4,
      });

      // Record health metric
      recordHealthMetric(
        projectId,
        snapshotId,
        'overall_health',
        signals.aggregated.overallScore,
        { warning: 60, critical: 40 }
      );

      // Learn from past executions
      const learningResult = await learnFromExecutions(projectId);

      // Complete snapshot
      const duration = Date.now() - startTime;
      completeAnalysisSnapshot(snapshotId, {
        total_files_analyzed: files.length,
        total_issues_found: predictions.predictions.length,
        total_predictions_active: predictions.summary.filesWithPredictions,
        avg_health_score: signals.aggregated.overallScore,
        critical_count: predictions.summary.bySeverity.critical,
        high_count: predictions.summary.bySeverity.high,
        medium_count: predictions.summary.bySeverity.medium,
        low_count: predictions.summary.bySeverity.low,
        duration_ms: duration,
      });

      return NextResponse.json({
        success: true,
        snapshotId,
        duration,
        results: {
          filesAnalyzed: files.length,
          healthScore: signals.aggregated.overallScore,
          predictionsCreated: predictions.predictions.length,
          autoFixesGenerated: autoFixes.length,
          topConcerns: signals.aggregated.topConcerns.slice(0, 5),
          learning: {
            patternsCreated: learningResult.patternsCreated,
            patternsUpdated: learningResult.patternsUpdated,
            autoFixesEnabled: learningResult.autoFixesEnabled,
          },
        },
      });
    } catch (error) {
      // Mark snapshot as failed
      failAnalysisSnapshot(
        snapshotId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  } catch (error) {
    console.error('[Observatory Analyze] Error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
