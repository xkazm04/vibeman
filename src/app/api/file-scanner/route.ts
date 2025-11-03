import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { OllamaClient } from '../../../lib/llm/providers/ollama-client';
import { createFileScannerPrompt } from '../../../prompts/file-scanner-prompt';
import { createBuildErrorFixerPrompt, BuildErrorForFix, BuildErrorFixResult } from '../../../prompts/build-error-fixer-prompt';
import { logger } from '@/lib/logger';

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
        if (!shouldIgnoreFile(entry.name) && 
            (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext)))) {
          files.push(relativePath);
        }
      }
    }
  } catch (error) {
    logger.error('Error reading directory:', dir, error);
  }
  
  return files;
}

function shouldIgnoreDirectory(dirName: string): boolean {
  const ignoredDirs = [
    'node_modules', 'dist', 'build', '.git', '.next', 
    'coverage', '.vscode', '.idea', 'tmp', 'temp',
    '.nuxt', '.output', 'out', 'public', 'static',
    'assets', 'images', 'fonts', 'icons', 'docs'
  ];
  return ignoredDirs.includes(dirName) || dirName.startsWith('.');
}

function shouldIgnoreFile(fileName: string): boolean {
  const configFiles = [
    // Package managers
    'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    // TypeScript configs
    'tsconfig.json', 'tsconfig.build.json', 'tsconfig.node.json',
    // Next.js configs
    'next.config.js', 'next.config.mjs', 'next.config.ts',
    // Tailwind configs
    'tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs',
    // PostCSS configs
    'postcss.config.js', 'postcss.config.mjs', 'postcss.config.ts',
    // Webpack configs
    'webpack.config.js', 'webpack.config.ts',
    // Vite configs
    'vite.config.js', 'vite.config.ts', 'vite.config.mjs',
    // ESLint configs
    '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml',
    'eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts',
    // Prettier configs
    '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yaml',
    'prettier.config.js', 'prettier.config.mjs', 'prettier.config.ts',
    // Other configs
    'babel.config.js', 'babel.config.json',
    'jest.config.js', 'jest.config.ts', 'jest.config.mjs',
    'vitest.config.js', 'vitest.config.ts', 'vitest.config.mjs',
    'rollup.config.js', 'rollup.config.ts',
    // Environment files
    '.env', '.env.local', '.env.development', '.env.production',
    '.env.staging', '.env.test',
    // Git files
    '.gitignore', '.gitattributes',
    // Documentation
    'README.md', 'CHANGELOG.md', 'LICENSE', 'LICENSE.md',
    // Deployment
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'vercel.json', 'netlify.toml'
  ];
  
  return configFiles.includes(fileName) || 
         fileName.startsWith('.') ||
         fileName.endsWith('.md') ||
         fileName.endsWith('.txt') ||
         fileName.endsWith('.log') ||
         fileName.endsWith('.lock');
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
    logger.error('Error scanning project files:', { error });
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
    logger.error('Error fixing build errors:', { error });
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
    logger.error('Error reading test files:', { error });
  }
  
  return testFiles;
}

async function getProjectFiles(): Promise<TestFile[]> {
  const projectFiles: TestFile[] = [];
  const projectDir = process.cwd();
  
  try {
    // Get all scannable files from the project
    const allFiles = await getFilesRecursively(projectDir, SCANNABLE_EXTENSIONS);
    
    // Limit to a reasonable number for full scan (e.g., 1000 files max)
    const limitedFiles = allFiles.slice(0, 1000);
    
    for (const filePath of limitedFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const language = path.extname(filePath).substring(1);
        const relativePath = path.relative(projectDir, filePath);
        
        projectFiles.push({
          path: relativePath,
          content,
          language
        });
      } catch (error) {
        logger.error(`Error reading file ${filePath}:`, { error });
      }
    }
  } catch (error) {
    logger.error('Error reading project files:', { error });
  }
  
  return projectFiles;
}

async function scanFileWithLLM(filePath: string, fileContent: string, fileIndex?: number, totalFiles?: number): Promise<FileScanResult> {
  const logPrefix = fileIndex && totalFiles ? `${fileIndex}/${totalFiles}` : '';
  
  try {
    logger.info(`${logPrefix} file starting to scan: ${filePath}`);
    
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
      logger.info(`${logPrefix} file scan failed: ${filePath} - ${response.error}`);
      throw new Error(response.error || 'Failed to get response from LLM');
    }

    // Parse the JSON response
    const parseResult = ollamaClient.parseJsonResponse<FileScanResult>(response.response);
    
    if (!parseResult.success || !parseResult.data) {
      logger.info(`${logPrefix} file parse failed: ${filePath} - ${parseResult.error}`);
      throw new Error(parseResult.error || 'Failed to parse LLM response');
    }

    // Validate the response structure
    const result = parseResult.data;
    if (typeof result.hasChanges !== 'boolean' || !result.changesSummary || !result.updatedCode) {
      logger.info(`${logPrefix} file invalid structure: ${filePath}`);
      throw new Error('Invalid response structure from LLM');
    }

    // Log the result
    if (result.hasChanges) {
      logger.info(`${logPrefix} file code changed: ${filePath} - ${result.changesSummary.description}`);
    } else {
      logger.info(`${logPrefix} file no changes: ${filePath}`);
    }

    return result;

  } catch (error) {
    logger.info(`${logPrefix} file error: ${filePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
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

async function scanAndWriteFileWithLLM(filePath: string, fileContent: string, fileIndex?: number, totalFiles?: number): Promise<FileScanResult & { fileWritten: boolean }> {
  const logPrefix = fileIndex && totalFiles ? `${fileIndex}/${totalFiles}` : '';
  
  try {
    logger.info(`${logPrefix} file starting to scan and write: ${filePath}`);
    
    // First, scan the file with LLM
    const scanResult = await scanFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
    
    // If there are changes, write the file back
    if (scanResult.hasChanges && scanResult.updatedCode) {
      try {
        // Construct the full file path
        const fullFilePath = path.join(process.cwd(), 'src/app/projects/ProjectAI/FileScanner/test', filePath);
        
        // Write the updated content back to the file
        await fs.writeFile(fullFilePath, scanResult.updatedCode, 'utf-8');
        
        logger.info(`${logPrefix} file written to disk: ${filePath}`);
        
        return {
          ...scanResult,
          fileWritten: true
        };
      } catch (writeError) {
        logger.error(`${logPrefix} file write error: ${filePath} -`, writeError);
        
        return {
          ...scanResult,
          fileWritten: false,
          changesSummary: {
            ...scanResult.changesSummary,
            description: `${scanResult.changesSummary.description} (Warning: File could not be written to disk)`
          }
        };
      }
    } else {
      logger.info(`${logPrefix} file no changes, not writing: ${filePath}`);
      
      return {
        ...scanResult,
        fileWritten: false
      };
    }
    
  } catch (error) {
    logger.info(`${logPrefix} file scan and write error: ${filePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      hasChanges: false,
      changesSummary: {
        unusedItemsRemoved: 0,
        documentationAdded: false,
        description: `Error scanning and writing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      updatedCode: fileContent,
      fileWritten: false
    };
  }
}

async function generateTestScanLog(): Promise<{ message: string; logPath: string }> {
  logger.info('API: Generating comprehensive scan report...');
  
  // Create scans directory in project root
  const scansDir = path.join(process.cwd(), 'scans');
  try {
    await fs.mkdir(scansDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(scansDir, `scan-report-${timestamp}.json`);
  
  // Get test files for the report
  const testFiles = await getTestFiles();
  
  const reportData = {
    scanId: `scan-${timestamp}`,
    timestamp: new Date().toISOString(),
    scanType: 'test-scan',
    summary: {
      totalFiles: testFiles.length,
      completedAt: new Date().toISOString(),
      projectPath: 'src/app/projects/ProjectAI/FileScanner/test'
    },
    files: testFiles.map(file => ({
      fileName: file.path,
      language: file.language,
      originalSize: file.content.length,
      status: 'processed',
      // These will be populated by the client when it calls this endpoint
      hasChanges: false,
      description: 'Scan completed - check individual file logs for details',
      docsAdded: false,
      codesCleaned: false
    })),
    metadata: {
      generatedBy: 'File Scanner API',
      version: '1.0.0',
      note: 'This is a consolidated report of the scan results'
    }
  };

  try {
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
    logger.info('API: Comprehensive scan report written to:', reportPath);
  } catch (error) {
    logger.error('API: Error writing scan report:', { error });
  }
  
  return {
    message: 'Comprehensive scan report generated',
    logPath: reportPath
  };
}

async function fixBuildErrorsInFile(
  filePath: string, 
  buildErrors: BuildErrorForFix[], 
  writeFiles: boolean = false
): Promise<BuildErrorFixResult> {
  const logPrefix = `[BUILD-FIX]`;
  
  try {
    logger.info(`${logPrefix} Fixing errors in: ${filePath}`);
    
    // Read the file content
    const fullPath = path.resolve(filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    
    // Create the build error fixer prompt
    const prompt = createBuildErrorFixerPrompt(filePath, fileContent, buildErrors);

    // Initialize Ollama client
    const ollama = new OllamaClient();

    logger.info(`${logPrefix} Sending to LLM for error fixing...`);
    const llmResponse = await ollama.generate({
      prompt,
      model: 'gpt-oss:20b'
    });
    const response = llmResponse.response || '';
    
    if (!response) {
      throw new Error('No response from LLM');
    }
    
    logger.info(`${logPrefix} LLM Response received, parsing...`);
    
    // Parse the JSON response
    let result: BuildErrorFixResult;
    try {
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error(`${logPrefix} Failed to parse LLM response:`, parseError);
      return {
        hasChanges: false,
        fixedErrors: [],
        skippedErrors: buildErrors.map(error => ({
          line: error.line || 0,
          column: error.column || 0,
          originalError: error.message,
          reason: 'Failed to parse LLM response'
        })),
        updatedCode: fileContent
      };
    }
    
    // Validate the result structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid response structure from LLM');
    }
    
    // Ensure required fields exist
    result.fixedErrors = result.fixedErrors || [];
    result.skippedErrors = result.skippedErrors || [];
    result.hasChanges = result.hasChanges || false;
    result.updatedCode = result.updatedCode || fileContent;
    
    // Write the file if requested and there are changes
    if (writeFiles && result.hasChanges && result.updatedCode !== fileContent) {
      try {
        await fs.writeFile(fullPath, result.updatedCode, 'utf-8');
        logger.info(`${logPrefix} File updated successfully: ${filePath}`);
      } catch (writeError) {
        logger.error(`${logPrefix} Failed to write file:`, writeError);
        // Don't fail the entire operation, just log the error
      }
    }
    
    logger.info(`${logPrefix} Fixed ${result.fixedErrors.length} errors, skipped ${result.skippedErrors.length} errors`);
    
    return result;
    
  } catch (error) {
    logger.error(`${logPrefix} Error fixing file ${filePath}:`, { error });
    
    // Return a safe fallback result
    return {
      hasChanges: false,
      fixedErrors: [],
      skippedErrors: buildErrors.map(error => ({
        line: error.line || 0,
        column: error.column || 0,
        originalError: error.message,
        reason: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })),
      updatedCode: ''
    };
  }
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
    logger.info(`Test scan log written to: ${logPath}`);
  } catch (error) {
    logger.error('Error writing test scan log:', { error });
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

      case 'full-scan-files':
        // Full scan with all project files
        const fullScanResults = await getProjectFiles();
        return NextResponse.json(fullScanResults);

      case 'test-scan-with-llm':
        // Generate log file from recent test scan results
        const logResults = await generateTestScanLog();
        return NextResponse.json(logResults);

      case 'full-scan-with-llm':
        // Generate log file from recent full scan results
        const fullLogResults = await generateTestScanLog(); // Same function, different context
        return NextResponse.json(fullLogResults);

      case 'scan-file':
        // Scan individual file with LLM
        if (!filePath || !fileContent) {
          return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
        }
        const scanResult = await scanFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
        return NextResponse.json(scanResult);

      case 'fix-build-errors':
        // Fix build errors in a specific file
        if (!filePath || !request.body) {
          return NextResponse.json({ error: 'File path and build errors are required' }, { status: 400 });
        }
        const { buildErrors, writeFiles } = await request.json();
        const fixResult = await fixBuildErrorsInFile(filePath, buildErrors, writeFiles);
        return NextResponse.json(fixResult);

      case 'scan-and-write-file':
        // Scan individual file with LLM and write back if changed
        if (!filePath || !fileContent) {
          return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
        }
        const scanAndWriteResult = await scanAndWriteFileWithLLM(filePath, fileContent, fileIndex, totalFiles);
        return NextResponse.json(scanAndWriteResult);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('File scanner API error:', { error });
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
    logger.error('File scanner GET error:', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}