// Client-side types and interfaces for file scanner
// Server-side functionality is in fileScanner.server.ts

export interface ScanResult {
  totalFiles: number;
  scannedFiles: number;
  projectType: string;
  errors: BuildError[];
  metrics: ProjectMetrics;
  suggestions: string[];
}

export interface FileScanResult {
  hasChanges: boolean;
  changesSummary: {
    unusedItemsRemoved: number;
    documentationAdded: boolean;
    description: string;
  };
  updatedCode: string;
}

export interface TestFile {
  path: string;
  content: string;
  language: string;
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule?: string;
}

export interface ProjectMetrics {
  linesOfCode: number;
  fileTypes: Record<string, number>;
  dependencies: number;
  testCoverage?: number;
  complexity: 'low' | 'medium' | 'high';
}

// Client-side API functions that call the server endpoints
export async function scanProjectFilesAPI(
  projectPath: string, 
  projectType?: string,
  countOnly: boolean = false
): Promise<ScanResult | { fileCount: number }> {
  const response = await fetch('/api/file-scanner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: countOnly ? 'count-files' : 'full-scan',
      projectPath,
      projectType
    })
  });

  if (!response.ok) {
    throw new Error('Failed to scan project files');
  }

  return response.json();
}

export async function fixBuildErrorsAPI(
  projectPath: string,
  projectType?: string
): Promise<{ fixed: number; suggestions: string[] }> {
  const response = await fetch('/api/file-scanner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'fix-errors',
      projectPath,
      projectType
    })
  });

  if (!response.ok) {
    throw new Error('Failed to fix build errors');
  }

  return response.json();
}

export async function getTestFilesAPI(): Promise<TestFile[]> {
  const response = await fetch('/api/file-scanner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test-scan' })
  });

  if (!response.ok) {
    throw new Error('Failed to get test files');
  }

  return response.json();
}

export async function scanFileWithLLMAPI(filePath: string, fileContent: string): Promise<FileScanResult> {
  const response = await fetch('/api/file-scanner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'scan-file',
      filePath,
      fileContent
    })
  });

  if (!response.ok) {
    throw new Error('Failed to scan file with LLM');
  }

  return response.json();
}