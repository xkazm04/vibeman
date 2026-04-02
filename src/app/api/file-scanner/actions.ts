import { NextResponse } from 'next/server';
import {
  scanProjectFiles,
  fixBuildErrors,
  getTestFiles,
  getProjectFiles,
  generateTestScanLog,
  scanFileWithLLM,
  scanAndWriteFileWithLLM,
  fixBuildErrorsInFile,
} from '@/lib/scan/fileScannerService';

interface ActionParams {
  action: string;
  projectPath?: string;
  projectType?: string;
  filePath?: string;
  fileContent?: string;
  fileIndex?: number;
  totalFiles?: number;
  buildErrors?: any[];
  writeFiles?: boolean;
}

export async function handleFullScan({ projectPath, projectType }: ActionParams) {
  if (!projectPath) {
    return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
  }
  const result = await scanProjectFiles(projectPath, projectType);
  return NextResponse.json(result);
}

export async function handleFixErrors({ projectPath, projectType }: ActionParams) {
  if (!projectPath) {
    return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
  }
  const result = await fixBuildErrors(projectPath, projectType);
  return NextResponse.json(result);
}

export async function handleCountFiles({ projectPath, projectType }: ActionParams) {
  if (!projectPath) {
    return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
  }
  const result = await scanProjectFiles(projectPath, projectType, true);
  return NextResponse.json({ fileCount: result });
}

export async function handleTestScan() {
  const result = await getTestFiles();
  return NextResponse.json(result);
}

export async function handleFullScanFiles() {
  const result = await getProjectFiles();
  return NextResponse.json(result);
}

export async function handleTestScanWithLLM() {
  const result = await generateTestScanLog();
  return NextResponse.json(result);
}

export async function handleFullScanWithLLM() {
  const result = await generateTestScanLog();
  return NextResponse.json(result);
}

export async function handleScanFile({ filePath, fileContent, fileIndex, totalFiles }: ActionParams) {
  if (!filePath || !fileContent) {
    return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
  }
  const result = await scanFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
  return NextResponse.json(result);
}

export async function handleFixBuildErrors({ filePath, buildErrors, writeFiles }: ActionParams) {
  if (!filePath || !buildErrors) {
    return NextResponse.json({ error: 'File path and build errors are required' }, { status: 400 });
  }
  const result = await fixBuildErrorsInFile(filePath, buildErrors, writeFiles);
  return NextResponse.json(result);
}

export async function handleScanAndWriteFile({ filePath, fileContent, fileIndex, totalFiles }: ActionParams) {
  if (!filePath || !fileContent) {
    return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
  }
  const result = await scanAndWriteFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
  return NextResponse.json(result);
}

type ActionHandler = (params: ActionParams) => Promise<NextResponse>;

export const actionHandlers: Record<string, ActionHandler> = {
  'full-scan': handleFullScan,
  'fix-errors': handleFixErrors,
  'count-files': handleCountFiles,
  'test-scan': handleTestScan,
  'full-scan-files': handleFullScanFiles,
  'test-scan-with-llm': handleTestScanWithLLM,
  'full-scan-with-llm': handleFullScanWithLLM,
  'scan-file': handleScanFile,
  'fix-build-errors': handleFixBuildErrors,
  'scan-and-write-file': handleScanAndWriteFile,
};
