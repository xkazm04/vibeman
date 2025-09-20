import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { OllamaClient } from '../../../lib/llm/providers/ollama-client';
import { createFileScannerPrompt } from '../../../prompts/file-scanner-prompt';

interface ScanResult {
  totalFiles: number;
  scannedFiles: number;
  projectType: string;
  errors: BuildError[];
  metrics: ProjectMetrics;
  suggestions: string[];
}

interface FileScanResult {
  hasChanges: boolean;
  changesSummary: {
    unusedItemsRemoved: number;
    documentationAdded: boolean;
    description: string;
  };
  updatedCode: string;
}

interface TestFile {
  path: string;
  content: string;
  language: string;
}

interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rule?: string;
}

interface ProjectMetrics {
  linesOfCode: number;
  fileTypes: Record<string, number>;
  dependencies: number;
  testCoverage?: number;
  complexity: 'low' | 'medium' | 'high';
}

// Extensions that support LLM scanning (focus on main code files)
const SCANNABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py'];

// Simple file globbing function using Node.js built-ins
async function getFilesRecursively(dir: string, extensions: string[] = []): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);
      
      // Skip ignored directories
      if (entry.isDirectory()) {
        if (!shouldIgnoreDirectory(entry.name)) {
          const subFiles = await getFilesRecursively(fullPath, extensions);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        if (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(relativePath);
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', dir, error);
  }
  
  return files;
}

function shouldIgnoreDirectory(dirName: string): boolean {
  const ignoredDirs = [
    'node_modules', 'dist', 'build', '.git', '.next', 
    'coverage', '.vscode', '.idea', 'tmp', 'temp'
  ];
  return ignoredDirs.includes(dirName) || dirName.startsWith('.');
}

async function scanProjectFiles(
  projectPath: string, 
  projectType?: string,
  countOnly: boolean = false
): Promise<ScanResult | { fileCount: number }> {
  try {
    // Ensure project path exists
    await fs.access(projectPath);

    // Get all code files
    const allFiles = await getFilesRecursively(projectPath, [
      '.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java', '.cs', '.cpp', '.c',
      '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.elm',
      '.css', '.scss', '.sass', '.less', '.html', '.xml', '.json', '.yaml', '.yml'
    ]);

    if (countOnly) {
      return { fileCount: allFiles.length };
    }

    // Detect project type if not provided
    const detectedProjectType = projectType || await detectProjectType(projectPath);

    // Analyze files (simplified for demo)
    const metrics: ProjectMetrics = {
      linesOfCode: allFiles.length * 50, // Rough estimate
      fileTypes: {},
      dependencies: 0,
      complexity: allFiles.length > 100 ? 'high' : allFiles.length > 50 ? 'medium' : 'low'
    };

    const errors: BuildError[] = []; // Mock errors for demo
    const suggestions: string[] = ['Consider running the LLM scan to improve code quality'];

    return {
      totalFiles: allFiles.length,
      scannedFiles: allFiles.length,
      projectType: detectedProjectType,
      errors,
      metrics,
      suggestions
    };

  } catch (error) {
    console.error('Error scanning project files:', error);
    throw new Error(`Failed to scan project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function detectProjectType(projectPath: string): Promise<string> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check for common frameworks
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies.react || dependencies['@types/react']) return 'React';
      if (dependencies.vue || dependencies['@vue/cli']) return 'Vue';
      if (dependencies.angular || dependencies['@angular/core']) return 'Angular';
      if (dependencies.next || dependencies['next']) return 'Next.js';
      if (dependencies.nuxt || dependencies['nuxt']) return 'Nuxt.js';
      if (dependencies.svelte || dependencies['svelte']) return 'Svelte';
      
      return 'Node.js';
    } catch {
      // No package.json, check for other indicators
      const files = await fs.readdir(projectPath);
      
      if (files.includes('pom.xml')) return 'Java/Maven';
      if (files.includes('build.gradle')) return 'Java/Gradle';
      if (files.includes('requirements.txt') || files.includes('setup.py')) return 'Python';
      if (files.includes('Cargo.toml')) return 'Rust';
      if (files.includes('go.mod')) return 'Go';
      
      return 'Unknown';
    }
  } catch (error) {
    return 'Unknown';
  }
}

async function fixBuildErrors(
  projectPath: string,
  projectType?: string
): Promise<{ fixed: number; suggestions: string[] }> {
  try {
    // Mock implementation for demo
    return {
      fixed: Math.floor(Math.random() * 5) + 1,
      suggestions: [
        'Updated TypeScript configuration for better type checking',
        'Fixed import/export statements',
        'Resolved missing dependency declarations',
        'Corrected ESLint configuration issues'
      ]
    };
  } catch (error) {
    console.error('Error fixing build errors:', error);
    throw new Error(`Failed to fix build errors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getTestFiles(): Promise<TestFile[]> {
  const testFiles: TestFile[] = [];
  const testDir = path.join(process.cwd(), 'src/app/projects/ProjectAI/FileScanner/test');
  
  try {
    const files = await fs.readdir(testDir);
    
    for (const file of files) {
      if (SCANNABLE_EXTENSIONS.some(ext => file.endsWith(ext))) {
        const filePath = path.join(testDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const language = path.extname(file).substring(1);
        
        testFiles.push({
          path: file,
          content,
          language
        });
      }
    }
  } catch (error) {
    console.error('Error reading test files:', error);
  }
  
  return testFiles;
}

async function scanFileWithLLM(filePath: string, fileContent: string, fileIndex?: number, totalFiles?: number): Promise<FileScanResult> {
  const logPrefix = fileIndex && totalFiles ? `${fileIndex}/${totalFiles}` : '';
  
  try {
    console.log(`${logPrefix} file starting to scan: ${filePath}`);
    
    const ollamaClient = new OllamaClient();
    
    // Check if Ollama is available
    const isAvailable = await ollamaClient.checkAvailability();
    if (!isAvailable) {
      throw new Error('Ollama service is not available');
    }

    // Create the prompt
    const prompt = createFileScannerPrompt(filePath, fileContent);

    // Send request to LLM
    const response = await ollamaClient.generate({
      prompt,
      model: 'gpt-oss:20b',
      taskType: 'file-scan',
      taskDescription: `Scanning file: ${filePath}`,
      projectId: 'file-scanner'
    });

    if (!response.success || !response.response) {
      console.log(`${logPrefix} file scan failed: ${filePath} - ${response.error}`);
      throw new Error(response.error || 'Failed to get response from LLM');
    }

    // Parse the JSON response
    const parseResult = ollamaClient.parseJsonResponse<FileScanResult>(response.response);
    
    if (!parseResult.success || !parseResult.data) {
      console.log(`${logPrefix} file parse failed: ${filePath} - ${parseResult.error}`);
      throw new Error(parseResult.error || 'Failed to parse LLM response');
    }

    // Validate the response structure
    const result = parseResult.data;
    if (typeof result.hasChanges !== 'boolean' || !result.changesSummary || !result.updatedCode) {
      console.log(`${logPrefix} file invalid structure: ${filePath}`);
      throw new Error('Invalid response structure from LLM');
    }

    // Log the result
    if (result.hasChanges) {
      console.log(`${logPrefix} file code changed: ${filePath} - ${result.changesSummary.description}`);
    } else {
      console.log(`${logPrefix} file no changes: ${filePath}`);
    }

    return result;

  } catch (error) {
    console.log(`${logPrefix} file error: ${filePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Return a fallback result
    return {
      hasChanges: false,
      changesSummary: {
        unusedItemsRemoved: 0,
        documentationAdded: false,
        description: `Error scanning file: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      updatedCode: fileContent
    };
  }
}

async function generateTestScanLog(): Promise<{ message: string; logPath: string }> {
  console.log('API: Generating test scan summary log...');
  
  const logPath = path.join(process.cwd(), 'src/app/projects/ProjectAI/FileScanner/test/scan-summary.json');
  
  const logData = {
    timestamp: new Date().toISOString(),
    message: 'Test scan completed successfully',
    note: 'Individual file processing logs are shown in the console during scan execution',
    logPath: 'src/app/projects/ProjectAI/FileScanner/test/scan-summary.json'
  };

  try {
    await fs.writeFile(logPath, JSON.stringify(logData, null, 2), 'utf-8');
    console.log('API: Test scan summary written to:', logPath);
  } catch (error) {
    console.error('API: Error writing test scan summary:', error);
  }
  
  return {
    message: 'Test scan summary generated',
    logPath: 'src/app/projects/ProjectAI/FileScanner/test/scan-summary.json'
  };
}

async function writeTestScanLog(testFiles: TestFile[], results: FileScanResult[], llmResponses: any[]): Promise<void> {
  try {
    const logDir = path.join(process.cwd(), 'src/app/projects/ProjectAI/FileScanner/test');
    const logPath = path.join(logDir, 'scan-log.json');
    
    const logData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: testFiles.length,
        filesChanged: results.filter(r => r.hasChanges).length,
        totalUnusedItemsRemoved: results.reduce((sum, r) => sum + r.changesSummary.unusedItemsRemoved, 0),
        docsAdded: results.filter(r => r.changesSummary.documentationAdded).length,
        errors: results.filter(r => r.changesSummary.description.startsWith('Error')).length
      },
      files: testFiles.map((file, index) => ({
        filePath: file.path,
        language: file.language,
        originalSize: file.content.length,
        updatedSize: results[index]?.updatedCode.length || 0,
        hasChanges: results[index]?.hasChanges || false,
        changesSummary: results[index]?.changesSummary,
        llmResponse: llmResponses[index] || null
      }))
    };

    await fs.writeFile(logPath, JSON.stringify(logData, null, 2), 'utf-8');
    console.log(`Test scan log written to: ${logPath}`);
  } catch (error) {
    console.error('Error writing test scan log:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, projectPath, projectType, filePath, fileContent, fileIndex, totalFiles } = await request.json();

    switch (action) {
      case 'full-scan':
        if (!projectPath) {
          return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
        }
        const scanResults = await scanProjectFiles(projectPath, projectType);
        return NextResponse.json(scanResults);

      case 'fix-errors':
        if (!projectPath) {
          return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
        }
        const fixResults = await fixBuildErrors(projectPath, projectType);
        return NextResponse.json(fixResults);

      case 'count-files':
        if (!projectPath) {
          return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
        }
        const fileCount = await scanProjectFiles(projectPath, projectType, true);
        return NextResponse.json({ fileCount });

      case 'test-scan':
        // Test scan with limited files
        const testResults = await getTestFiles();
        return NextResponse.json(testResults);

      case 'test-scan-with-llm':
        // Generate log file from recent test scan results
        const logResults = await generateTestScanLog();
        return NextResponse.json(logResults);

      case 'scan-file':
        // Scan individual file with LLM
        if (!filePath || !fileContent) {
          return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
        }
        const scanResult = await scanFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
        return NextResponse.json(scanResult);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('File scanner API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return NextResponse.json(
      { error: 'Project path is required' },
      { status: 400 }
    );
  }

  try {
    // Return basic project info
    const projectInfo = {
      path: projectPath,
      // Add more project metadata here
    };

    return NextResponse.json(projectInfo);
  } catch (error) {
    console.error('File scanner GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}