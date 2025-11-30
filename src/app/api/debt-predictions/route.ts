/**
 * Debt Predictions API
 * GET: Fetch predictions for a project
 * POST: Create/scan for new predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  debtPredictionDb,
  debtPatternDb,
  opportunityCardDb,
} from '@/app/db';
import {
  analyzeFile,
  createPredictions,
  initializePredefinedPatterns,
} from '@/app/features/DebtPrediction/lib/predictionEngine';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// GET: Fetch predictions
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type');
    const filePath = searchParams.get('filePath');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let predictions;

    if (filePath) {
      // Get predictions for specific file
      predictions = debtPredictionDb.getByFile(projectId, filePath);
    } else if (type) {
      // Get predictions by type
      predictions = debtPredictionDb.getByType(
        projectId,
        type as 'emerging' | 'accelerating' | 'imminent' | 'exists'
      );
    } else if (status === 'urgent') {
      // Get urgent predictions
      predictions = debtPredictionDb.getUrgent(projectId, 70);
    } else if (status === 'active') {
      // Get all active predictions
      predictions = debtPredictionDb.getActiveByProject(projectId);
    } else {
      // Get by status counts
      const counts = debtPredictionDb.getCountByStatus(projectId);
      return NextResponse.json({ counts });
    }

    // Get opportunity cards
    const opportunityCards = opportunityCardDb.getActiveByProject(projectId);

    // Get patterns for enrichment
    const patterns = debtPatternDb.getByProject(projectId);
    const patternMap = new Map(patterns.map(p => [p.id, p]));

    // Enrich predictions with pattern info
    const enrichedPredictions = predictions.slice(0, limit).map(p => ({
      ...p,
      pattern: p.pattern_id ? patternMap.get(p.pattern_id) : null,
    }));

    return NextResponse.json({
      predictions: enrichedPredictions,
      opportunityCards: opportunityCards.slice(0, 10),
      total: predictions.length,
      summary: {
        emerging: predictions.filter(p => p.prediction_type === 'emerging').length,
        accelerating: predictions.filter(p => p.prediction_type === 'accelerating').length,
        imminent: predictions.filter(p => p.prediction_type === 'imminent').length,
        exists: predictions.filter(p => p.prediction_type === 'exists').length,
        urgent: predictions.filter(p => p.urgency_score >= 70).length,
      },
    });
  } catch (error) {
    console.error('[DebtPredictions API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Scan for new predictions
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, projectPath, files, contextId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Initialize predefined patterns if needed
    await initializePredefinedPatterns(projectId);

    // Analyze files
    const analysisResults = [];

    if (files && Array.isArray(files)) {
      // Analyze provided files with content
      for (const file of files) {
        if (file.path && file.content) {
          const result = analyzeFile(file.path, file.content);
          analysisResults.push(result);
        }
      }
    } else if (projectPath) {
      // Scan project directory
      const filesToAnalyze = await scanProjectFiles(projectPath);

      for (const filePath of filesToAnalyze) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const relativePath = path.relative(projectPath, filePath);
          const result = analyzeFile(relativePath, content);
          analysisResults.push(result);
        } catch (err) {
          console.warn(`[DebtPredictions] Failed to read file: ${filePath}`);
        }
      }
    }

    if (analysisResults.length === 0) {
      return NextResponse.json({
        predictions: [],
        opportunityCards: [],
        metrics: {
          filesAnalyzed: 0,
          issuesFound: 0,
          predictionsCreated: 0,
          urgentCount: 0,
        },
      });
    }

    // Create predictions from analysis
    const result = createPredictions(projectId, analysisResults, contextId);

    // Create opportunity cards in database
    for (const card of result.opportunityCards) {
      // Find matching prediction
      const matchingPrediction = result.predictions.find(
        p => p.title === card.title
      );

      if (matchingPrediction) {
        opportunityCardDb.create({
          project_id: projectId,
          prediction_id: matchingPrediction.id,
          card_type: card.cardType,
          priority: card.priority,
          title: card.title,
          summary: card.summary,
          action_type: card.actionType as any,
          action_description: card.actionDescription,
          estimated_time_minutes: card.estimatedTimeMinutes,
          affected_files: JSON.stringify([matchingPrediction.file_path]),
          related_patterns: JSON.stringify([]),
          shown_count: 0,
          clicked: 0,
          acted_upon: 0,
          feedback: null,
          expires_at: null,
        });
      }
    }

    return NextResponse.json({
      predictions: result.predictions,
      opportunityCards: result.opportunityCards,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error('[DebtPredictions API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create predictions' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function scanProjectFiles(projectPath: string): Promise<string[]> {
  const files: string[] = [];
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  const ignoreDirs = ['node_modules', '.next', 'dist', '.git', 'coverage', '__tests__'];

  function walkDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.warn(`[DebtPredictions] Failed to read directory: ${dir}`);
    }
  }

  walkDir(projectPath);

  // Limit to first 100 files to avoid overwhelming analysis
  return files.slice(0, 100);
}
