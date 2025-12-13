/**
 * API Route: /api/refactor-suggestions/auto-scan
 *
 * Automatic refactor scanning triggered when new features or ideas
 * are added to the codebase. Integrates with Vibeman automation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import {
  analyzeForRefactorSuggestions,
  type SuggestionEngineConfig,
} from '@/app/features/RefactorSuggestion/lib/refactorSuggestionEngine';
import {
  generateIdeasFromSuggestions,
} from '@/app/features/RefactorSuggestion/lib/ideaGenerator';
import { scanDb } from '@/app/db';
import type { ProjectType } from '@/lib/scan';
import { logger } from '@/lib/logger';

// Generate unique scan ID
function generateScanId(triggerSource: string): string {
  return `scan_auto_${triggerSource}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface AutoScanRequest {
  projectId: string;
  projectPath: string;
  projectType?: ProjectType;
  triggerSource: 'feature-add' | 'idea-implement' | 'manual' | 'scheduled';
  changedFiles?: string[];
  contextId?: string;
  maxSuggestions?: number;
  autoGenerateIdeas?: boolean;
}

interface AutoScanResult {
  success: boolean;
  scanId: string;
  suggestionsFound: number;
  ideasGenerated: number;
  summary: {
    antiPatterns: number;
    duplications: number;
    couplingIssues: number;
    complexityIssues: number;
    cleanCodeViolations: number;
  };
  topSuggestions: Array<{
    title: string;
    severity: string;
    category: string;
    files: string[];
  }>;
}

function validateRequest(body: Partial<AutoScanRequest>): string | null {
  if (!body.projectId) return 'projectId is required';
  if (!body.projectPath) return 'projectPath is required';
  if (!body.triggerSource) return 'triggerSource is required';
  return null;
}

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

function successResponse(data: AutoScanResult) {
  return NextResponse.json(data);
}

/**
 * POST /api/refactor-suggestions/auto-scan
 *
 * Triggered automatically when:
 * - New features are added
 * - Ideas are implemented
 * - Scheduled maintenance scans
 * - Manual trigger from UI
 */
export async function POST(request: NextRequest) {
  try {
    const body: AutoScanRequest = await request.json();

    const validationError = validateRequest(body);
    if (validationError) {
      return errorResponse(validationError);
    }

    const {
      projectId,
      projectPath,
      projectType,
      triggerSource,
      changedFiles,
      maxSuggestions = 20,
      autoGenerateIdeas = true,
    } = body;

    // Create scan record
    const scanId = generateScanId(triggerSource);
    const scan = scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: `refactor_auto_scan_${triggerSource}`,
      input_tokens: 0,
      output_tokens: 0,
    });

    try {
      // Determine which folders to scan
      let selectedFolders: string[] = [];
      if (changedFiles && changedFiles.length > 0) {
        // Extract unique directories from changed files
        const dirs = new Set<string>();
        changedFiles.forEach(file => {
          const parts = file.split(/[/\\]/);
          if (parts.length > 1) {
            dirs.add(parts.slice(0, -1).join('/'));
          }
        });
        selectedFolders = Array.from(dirs);
      }

      // Scan project files
      const files = await scanProjectFiles(projectPath, projectType, selectedFolders);

      if (files.length === 0) {
        return successResponse({
          success: true,
          scanId: scan.id,
          suggestionsFound: 0,
          ideasGenerated: 0,
          summary: {
            antiPatterns: 0,
            duplications: 0,
            couplingIssues: 0,
            complexityIssues: 0,
            cleanCodeViolations: 0,
          },
          topSuggestions: [],
        });
      }

      // Configure scan based on trigger source
      const config: Partial<SuggestionEngineConfig> = {
        maxSuggestions,
        severityThreshold: triggerSource === 'scheduled' ? 'low' : 'medium',
      };

      // Run analysis
      const result = await analyzeForRefactorSuggestions(files, config);

      // Generate ideas if enabled
      let ideasGenerated = 0;
      if (autoGenerateIdeas && result.suggestions.length > 0) {
        const ideaResult = generateIdeasFromSuggestions(
          result.suggestions,
          projectId,
          {
            maxIdeas: Math.min(maxSuggestions, 10),
            severityFilter: ['high', 'critical'],
            skipExisting: true,
          }
        );
        ideasGenerated = ideaResult.created.length;
      }

      // Update scan with token usage
      scanDb.updateTokenUsage(scan.id, 0, result.suggestions.length);

      // Build summary
      const summary = {
        antiPatterns: result.summary.byCategory['anti-pattern'] || 0,
        duplications: result.summary.byCategory['duplication'] || 0,
        couplingIssues: result.summary.byCategory['coupling'] || 0,
        complexityIssues: result.summary.byCategory['complexity'] || 0,
        cleanCodeViolations: result.summary.byCategory['clean-code'] || 0,
      };

      // Get top 5 suggestions for quick view
      const topSuggestions = result.suggestions.slice(0, 5).map(s => ({
        title: s.title,
        severity: s.severity,
        category: s.category,
        files: s.files.slice(0, 3),
      }));

      return successResponse({
        success: true,
        scanId: scan.id,
        suggestionsFound: result.suggestions.length,
        ideasGenerated,
        summary,
        topSuggestions,
      });

    } catch (analysisError) {
      logger.error('[AutoScan] Analysis error:', { analysisError });
      throw analysisError;
    }

  } catch (error) {
    logger.error('[AutoScan API] Error:', { error });
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

/**
 * Hook to trigger auto-scan after feature implementation
 * Called internally by the system
 */
export async function triggerPostImplementationScan(
  projectId: string,
  projectPath: string,
  changedFiles: string[]
): Promise<AutoScanResult | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/refactor-suggestions/auto-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        projectPath,
        triggerSource: 'idea-implement',
        changedFiles,
        autoGenerateIdeas: true,
        maxSuggestions: 10,
      }),
    });

    if (!response.ok) {
      logger.error('[AutoScan] Post-implementation scan failed');
      return null;
    }

    return await response.json();
  } catch (error) {
    logger.error('[AutoScan] Error triggering post-implementation scan:', { error });
    return null;
  }
}

export const maxDuration = 300;
