/**
 * Shared types for RefactorWizard
 */

export interface FileAnalysis {
  path: string;
  content: string;
  size: number;
  lines: number;
}

export interface AnalysisResult {
  opportunities: any[]; // Using any to avoid circular dependency with refactorStore
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
