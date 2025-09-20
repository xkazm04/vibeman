export interface FileResult {
  fileName: string;
  hasChanges: boolean;
  description: string;
  docsAdded: boolean;
  codesCleaned: boolean;
  error?: string;
}

export interface ScanStats {
  filesProcessed: number;
  docsUpdated: number;
  codesCleaned: number;
  errors: number;
}

export interface TestFile {
  path: string;
  content: string;
  language: string;
}

export interface ScanProgressCallbacks {
  onProgress: (progress: number) => void;
  onCurrentFile: (fileName: string) => void;
  onFileResult: (result: FileResult) => void;
  onStatsUpdate: (stats: ScanStats) => void;
  onFileCount?: (count: number) => void;
  onPhaseChange?: (phase: 'calculating' | 'scanning' | 'complete') => void;
}

export interface ScanOptions {
  writeFiles: boolean;
  scanType: 'test-scan' | 'full-scan';
}