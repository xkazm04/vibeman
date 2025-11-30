/**
 * API Route: /api/refactor-suggestions
 *
 * AI-Powered Refactor Suggestion Engine API
 * Analyzes codebase for anti-patterns, duplications, and architectural issues.
 * Optionally generates ideas for the Vibeman automation system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scanProjectFiles } from '@/app/features/RefactorWizard/lib/refactorAnalyzer';
import {
  analyzeForRefactorSuggestions,
  convertToOpportunities,
} from '@/app/features/RefactorSuggestion/lib/refactorSuggestionEngine';
import {
  generateIdeasFromSuggestions,
} from '@/app/features/RefactorSuggestion/lib/ideaGenerator';
import { scanDb } from '@/app/db';
import type { ProjectType } from '@/lib/scan';

// Generate unique scan ID
function generateScanId(): string {
  return `scan_refactor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface AnalyzeRequest {
  projectId: string;
  projectPath: string;
  projectType?: ProjectType;
  selectedFolders?: string[];
  config?: {
    enableAntiPatternDetection?: boolean;
    enableDuplicationDetection?: boolean;
    enableCouplingAnalysis?: boolean;
    enableComplexityAnalysis?: boolean;
    enableCleanCodeChecks?: boolean;
    severityThreshold?: 'low' | 'medium' | 'high';
    maxSuggestions?: number;
  };
  generateIdeas?: boolean;
  ideaOptions?: {
    maxIdeas?: number;
    severityFilter?: ('low' | 'medium' | 'high' | 'critical')[];
    categoryFilter?: ('anti-pattern' | 'duplication' | 'coupling' | 'complexity' | 'clean-code')[];
    skipExisting?: boolean;
  };
}

function validateRequest(body: Partial<AnalyzeRequest>): string | null {
  if (!body.projectId) return 'projectId is required';
  if (!body.projectPath) return 'projectPath is required';
  return null;
}

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message, success: false }, { status });
}

function successResponse(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}

/**
 * POST /api/refactor-suggestions
 * Analyze codebase and generate refactor suggestions
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeRequest = await request.json();

    const validationError = validateRequest(body);
    if (validationError) {
      return errorResponse(validationError);
    }

    const {
      projectId,
      projectPath,
      projectType,
      selectedFolders,
      config = {},
      generateIdeas = false,
      ideaOptions = {},
    } = body;

    // Create scan record
    const scanId = generateScanId();
    const scan = scanDb.createScan({
      id: scanId,
      project_id: projectId,
      scan_type: 'refactor_suggestion_engine',
      input_tokens: 0,
      output_tokens: 0,
    });

    try {
      // Step 1: Scan project files
      const files = await scanProjectFiles(projectPath, projectType, selectedFolders);

      if (files.length === 0) {
        return successResponse({
          suggestions: [],
          summary: {
            totalIssues: 0,
            byCategory: {},
            bySeverity: {},
            topPriorityCount: 0,
          },
          analysisMetadata: {
            filesAnalyzed: 0,
            totalLines: 0,
            scanDurationMs: Date.now() - startTime,
            scanId: scan.id,
          },
        });
      }

      // Step 2: Run refactor suggestion engine
      const analysisResult = await analyzeForRefactorSuggestions(files, config);

      // Step 3: Optionally generate ideas
      let ideaGenerationResult = null;
      if (generateIdeas && analysisResult.suggestions.length > 0) {
        ideaGenerationResult = generateIdeasFromSuggestions(
          analysisResult.suggestions,
          projectId,
          ideaOptions
        );
      }

      // Step 4: Convert to opportunities format for compatibility
      const opportunities = convertToOpportunities(analysisResult.suggestions);

      // Update scan with token usage
      scanDb.updateTokenUsage(scan.id, 0, analysisResult.suggestions.length);

      return successResponse({
        suggestions: analysisResult.suggestions,
        opportunities,
        summary: analysisResult.summary,
        analysisMetadata: {
          ...analysisResult.analysisMetadata,
          scanId: scan.id,
        },
        ideaGeneration: ideaGenerationResult,
      });

    } catch (analysisError) {
      console.error('[RefactorSuggestions] Analysis error:', analysisError);
      throw analysisError;
    }

  } catch (error) {
    console.error('[RefactorSuggestions API] Error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
}

/**
 * GET /api/refactor-suggestions
 * Get info about the refactor suggestion engine
 */
export async function GET() {
  return successResponse({
    name: 'AI-Powered Refactor Suggestion Engine',
    version: '1.0.0',
    capabilities: [
      'anti-pattern-detection',
      'duplication-analysis',
      'coupling-analysis',
      'complexity-analysis',
      'clean-code-checks',
    ],
    supportedCategories: [
      'anti-pattern',
      'duplication',
      'coupling',
      'complexity',
      'clean-code',
    ],
    severityLevels: ['low', 'medium', 'high', 'critical'],
  });
}

// Maximum duration for long-running analysis
export const maxDuration = 300;
