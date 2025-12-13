/**
 * Background Refactor Analysis API
 *
 * Performs refactor analysis in the background with progress tracking via scan queue.
 * This endpoint is designed to handle large codebases by:
 * - Processing files in chunks
 * - Reporting progress incrementally
 * - Using the scan queue infrastructure for status tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanQueueDb, scanDb } from '@/app/db';
import { analyzeProject, scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import { generateWizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import { createErrorResponse } from '@/lib/api-helpers';
import type { ProjectType } from '@/lib/scan';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export const maxDuration = 300; // 5 minutes for large codebases

/**
 * Background analysis handler
 * Updates scan queue item with progress as it proceeds
 */
export async function POST(request: NextRequest) {
  let queueId: string | undefined;

  try {
    const {
      queueId: requestQueueId,
      projectId,
      projectPath,
      projectType,
      useAI = true,
      provider = 'gemini',
      model,
      selectedGroups,
      selectedFolders = [] // Array of folder paths to scan (empty = scan all)
    } = await request.json();

    queueId = requestQueueId;

    if (!queueId || !projectPath) {
      return createErrorResponse('Queue ID and project path are required', 400);
    }

    // Update queue item to running
    scanQueueDb.updateStatus(queueId, 'running');

    // Phase 1: File Scanning (0-30%)
    const scanMessage = selectedFolders.length > 0
      ? `Initializing file scanner for ${selectedFolders.length} folder(s)...`
      : 'Initializing file scanner...';
    scanQueueDb.updateProgress(queueId, 5, scanMessage);

    const files = await scanProjectFiles(projectPath, projectType as ProjectType, selectedFolders);

    const fileCountMessage = selectedFolders.length > 0
      ? `Scanned ${files.length} files in ${selectedFolders.length} folder(s)`
      : `Scanned ${files.length} files`;
    scanQueueDb.updateProgress(queueId, 30, fileCountMessage);

    // Phase 2: Wizard Plan Generation (30-50%)
    let wizardPlan = null;
    if (useAI && files.length > 0) {
      scanQueueDb.updateProgress(queueId, 35, 'Generating AI-powered analysis plan...');

      const planResult = await generateWizardPlan(files, provider, model);
      if (planResult.success && planResult.plan) {
        wizardPlan = planResult.plan;
      }

      scanQueueDb.updateProgress(queueId, 50, 'Analysis plan generated');
    } else {
      scanQueueDb.updateProgress(queueId, 50, 'Skipping AI plan generation');
    }

    // Phase 3: Pattern Detection & Analysis (50-80%)
    scanQueueDb.updateProgress(queueId, 55, 'Analyzing code patterns...');

    const result = await analyzeProject(
      projectPath,
      useAI,
      provider,
      model,
      selectedGroups,
      projectType as ProjectType,
      async (analysisProgress) => {
        // Calculate progress within the 55-80% range
        const progressInPhase = (analysisProgress.processed / analysisProgress.total) * 100;
        const overallProgress = 55 + (progressInPhase * 0.25); // 55% + up to 25% = 80%

        scanQueueDb.updateProgress(
          queueId || '',
          Math.round(overallProgress),
          analysisProgress.message
        );
      },
      selectedFolders
    );

    scanQueueDb.updateProgress(queueId, 80, `Found ${result.opportunities.length} refactoring opportunities`);

    // Phase 4: Package Generation (80-100%)
    let packages = [];
    let context = null;
    let dependencyGraph = null;

    if (useAI && result.opportunities.length > 0) {
      scanQueueDb.updateProgress(queueId, 85, 'Generating refactor packages...');

      try {
        const packageResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/refactor/generate-packages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              opportunities: result.opportunities,
              projectPath,
              userPreferences: {
                provider,
                model,
              },
            }),
          }
        );

        if (packageResponse.ok) {
          const packageData = await packageResponse.json();
          packages = packageData.packages || [];
          context = packageData.context || null;
          dependencyGraph = packageData.dependencyGraph || null;

          scanQueueDb.updateProgress(queueId, 95, `Generated ${packages.length} refactor packages`);
        }
      } catch (error) {
        logger.error('[Background Analysis] Package generation failed:', { error });
        // Non-fatal, continue without packages
        scanQueueDb.updateProgress(queueId, 95, 'Package generation skipped');
      }
    } else {
      scanQueueDb.updateProgress(queueId, 95, 'Skipping package generation');
    }

    // Complete the scan
    const resultSummary = `${result.opportunities.length} opportunities found`;

    // Store results in queue item metadata
    const analysisResults = {
      opportunities: result.opportunities,
      summary: result.summary,
      wizardPlan,
      packages,
      context,
      dependencyGraph,
    };

    // Save results to temporary file for retrieval
    const resultsDir = path.join(process.cwd(), 'temp', 'refactor-results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      const resultsPath = path.join(resultsDir, `${queueId}.json`);
      await fs.writeFile(resultsPath, JSON.stringify(analysisResults, null, 2), 'utf-8');
    } catch (error) {
      logger.error('[Background Analysis] Failed to save results:', { error });
    }

    // Create scan record first (required for foreign key constraint)
    const scanId = `refactor-${Date.now()}`;
    scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: 'refactor',
      summary: resultSummary,
    });

    scanQueueDb.updateProgress(queueId, 100, 'Analysis completed');
    scanQueueDb.updateStatus(queueId, 'completed');
    scanQueueDb.linkScan(queueId, scanId, resultSummary);

    // Create success notification
    scanQueueDb.createNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queue_item_id: queueId,
      project_id: projectId,
      notification_type: 'scan_completed',
      title: 'Refactor Analysis Completed',
      message: resultSummary,
      data: {
        opportunityCount: result.opportunities.length,
        packageCount: packages.length,
      },
    });

    return NextResponse.json({
      success: true,
      queueId,
      ...analysisResults,
    });

  } catch (error) {
    logger.error('[Background Analysis] Error:', { error });

    // Update queue item to failed
    if (queueId) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      scanQueueDb.updateStatus(queueId, 'failed', errorMessage);

      // Create error notification
      try {
        const queueItem = scanQueueDb.getQueueItemById(queueId);
        if (queueItem) {
          scanQueueDb.createNotification({
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            queue_item_id: queueId,
            project_id: queueItem.project_id,
            notification_type: 'scan_failed',
            title: 'Refactor Analysis Failed',
            message: errorMessage,
          });
        }
      } catch (notifError) {
        logger.error('[Background Analysis] Failed to create error notification:', { notifError });
      }
    }

    return createErrorResponse(
      error instanceof Error ? error.message : 'Analysis failed',
      500
    );
  }
}
