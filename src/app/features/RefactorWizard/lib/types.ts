/**
 * Shared types for RefactorWizard
 */

import type { RefactorOpportunity } from '@/stores/refactorStore';

export interface FileAnalysis {
  path: string;
  content: string;
  size: number;
  lines: number;
}

export interface AnalysisResult {
  opportunities: RefactorOpportunity[];
  summary: {
    totalFiles: number;
    totalLines: number;
    issuesFound: number;
    categoryCounts: Record<string, number>;
  };
}

export interface DetectionResult {
  lineNumbers: number[];
  count: number;
}
