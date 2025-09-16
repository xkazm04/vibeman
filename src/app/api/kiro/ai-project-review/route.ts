import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import { join, extname } from 'path';

import { motion } from 'framer-motion';
import { generateAIReview, generateGoals, generateTasks } from '@/app/projects/ProjectAI/promptFunctions';
import { generateContexts } from '@/app/projects/ProjectAI/generateContexts';
import { generateCodeTasks } from '@/app/projects/ProjectAI/generateCodeTasks';

export async function POST(request: NextRequest) {
  try {
    const { projectId, projectPath, projectName, mode = 'docs', provider } = await request.json();
    
    if (!projectId || !projectPath || !projectName) {
      return NextResponse.json(
        { success: false, error: 'Project ID, path, and name are required' },
        { status: 400 }
      );
    }

    // Security check - ensure the project path is valid
    if (projectPath.includes('..') || projectPath.includes('~')) {
      return NextResponse.json(
        { success: false, error: 'Invalid project path' },
        { status: 403 }
      );
    }

    try {
      // Analyze the project structure
      const projectAnalysis = await analyzeProjectStructure(projectPath);
      
      let result: any;
      
      // Generate content based on mode
      switch (mode) {
        case 'docs':
          const aiReview = await generateAIReview(projectName, projectAnalysis, projectId, provider);
          result = {
            success: true,
            analysis: aiReview,
            projectInfo: {
              name: projectName,
              path: projectPath,
              structure: projectAnalysis.structure,
              stats: projectAnalysis.stats
            }
          };
          break;
          
        case 'tasks':
          const tasksResponse = await generateTasks(projectName, projectId, projectAnalysis, provider);
          try {
            // Try to parse JSON response, handling ```json wrapper
            const tasks = parseAIJsonResponse(tasksResponse);
            result = {
              success: true,
              tasks: tasks,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          } catch (parseError) {
            // If JSON parsing fails, return raw response
            result = {
              success: true,
              rawResponse: tasksResponse,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          }
          break;
          
        case 'goals':
          const goalsResponse = await generateGoals(projectName, projectId, projectAnalysis, projectPath, provider);
          try {
            // Try to parse JSON response, handling ```json wrapper
            const goals = parseAIJsonResponse(goalsResponse);
            result = {
              success: true,
              goals: goals,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          } catch (parseError) {
            // If JSON parsing fails, return raw response
            result = {
              success: true,
              rawResponse: goalsResponse,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          }
          break;
          
        case 'context':
          const contextResult = await generateContexts(projectName, projectPath, projectAnalysis, projectId, provider);
          result = {
            success: contextResult.success,
            contexts: contextResult.contexts,
            error: contextResult.error,
            projectInfo: {
              name: projectName,
              path: projectPath
            }
          };
          break;
          
        case 'code':
          const codeTasksResponse = await generateCodeTasks(projectName, projectId, projectAnalysis, provider);
          try {
            // Try to parse JSON response, handling ```json wrapper
            const codeTasks = parseAIJsonResponse(codeTasksResponse);
            result = {
              success: true,
              tasks: codeTasks,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          } catch (parseError) {
            // If JSON parsing fails, return raw response
            result = {
              success: true,
              rawResponse: codeTasksResponse,
              projectInfo: {
                name: projectName,
                path: projectPath
              }
            };
          }
          break;
          
        default:
          throw new Error(`Invalid mode: ${mode}`);
      }
      
      return NextResponse.json(result);
    } catch (analysisError) {
      console.error(`Failed to analyze project ${projectName}:`, analysisError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to analyze project: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('AI project review API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeProjectStructure(projectPath: string) {
  const analysis = {
    structure: {} as Record<string, any>,
    stats: {
      totalFiles: 0,
      totalDirectories: 0,
      fileTypes: {} as Record<string, number>,
      keyFiles: [] as string[],
      technologies: [] as string[]
    },
    codebase: {
      mainFiles: [] as Array<{ path: string; content: string; type: string }>,
      configFiles: [] as Array<{ path: string; content: string; type: string }>,
      documentationFiles: [] as Array<{ path: string; content: string; type: string }>
    }
  };

  // Key files to analyze for project understanding
  const keyFilePatterns = [
    'package.json',
    'tsconfig.json',
    'next.config.js',
    'next.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'README.md',
    'KIRO.md',
    '.env.example',
    'docker-compose.yml',
    'Dockerfile'
  ];

  // Important directories to analyze
  const importantDirs = ['src', 'app', 'components', 'pages', 'lib', 'utils', 'hooks', 'stores'];

  try {
    // Read project structure
    analysis.structure = await readDirectoryStructure(projectPath, 2); // Max depth 2
    
    // Analyze key files
    for (const pattern of keyFilePatterns) {
      try {
        const filePath = join(projectPath, pattern);
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
          const content = await readFile(filePath, 'utf-8');
          const fileType = getFileCategory(pattern);
          
          analysis.codebase[fileType].push({
            path: pattern,
            content: content.slice(0, 5000), // Limit content size
            type: extname(pattern) || 'config'
          });
          
          analysis.stats.keyFiles.push(pattern);
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    }

    // Analyze important directories for main implementation files
    for (const dir of importantDirs) {
      try {
        const dirPath = join(projectPath, dir);
        const dirStats = await stat(dirPath);
        
        if (dirStats.isDirectory()) {
          const files = await findImportantFiles(dirPath, 3); // Max depth 3
          analysis.codebase.mainFiles.push(...files);
        }
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    // Detect technologies based on files
    analysis.stats.technologies = detectTechnologies(analysis);

    return analysis;
  } catch (error) {
    console.error('Error analyzing project structure:', error);
    throw error;
  }
}

async function readDirectoryStructure(dirPath: string, maxDepth: number, currentDepth = 0): Promise<any> {
  if (currentDepth >= maxDepth) return {};

  try {
    const entries = await readdir(dirPath);
    const structure: Record<string, any> = {};

    for (const entry of entries) {
      // Skip common directories that aren't useful for analysis
      if (['.git', 'node_modules', '.next', 'dist', 'build', '.vscode'].includes(entry)) {
        continue;
      }

      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);

      if (stats.isDirectory()) {
        structure[entry] = await readDirectoryStructure(entryPath, maxDepth, currentDepth + 1);
      } else {
        structure[entry] = 'file';
      }
    }

    return structure;
  } catch (error) {
    return {};
  }
}

async function findImportantFiles(dirPath: string, maxDepth: number, currentDepth = 0): Promise<Array<{ path: string; content: string; type: string }>> {
  if (currentDepth >= maxDepth) return [];

  const files: Array<{ path: string; content: string; type: string }> = [];
  const importantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);

      if (stats.isDirectory() && !['node_modules', '.git', '.next', 'dist'].includes(entry)) {
        const subFiles = await findImportantFiles(entryPath, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        const ext = extname(entry);
        if (importantExtensions.includes(ext)) {
          try {
            const content = await readFile(entryPath, 'utf-8');
            const relativePath = entryPath.replace(dirPath, '').replace(/^[\/\\]/, '');
            
            files.push({
              path: relativePath,
              content: content.slice(0, 3000), // Limit content size
              type: ext
            });
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }

  return files.slice(0, 20); // Limit number of files
}

function getFileCategory(filename: string): 'mainFiles' | 'configFiles' | 'documentationFiles' {
  if (filename.includes('README') || filename.includes('.md')) {
    return 'documentationFiles';
  }
  if (filename.includes('config') || filename.includes('package.json') || filename.includes('tsconfig')) {
    return 'configFiles';
  }
  return 'mainFiles';
}

function detectTechnologies(analysis: any): string[] {
  const technologies: string[] = [];
  
  // Check package.json for dependencies
  const packageJson = analysis.codebase.configFiles.find((f: any) => f.path === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.react) technologies.push('React');
      if (deps.next) technologies.push('Next.js');
      if (deps.typescript) technologies.push('TypeScript');
      if (deps.tailwindcss) technologies.push('Tailwind CSS');
      if (deps.framer-motion) technologies.push('Framer Motion');
      if (deps.zustand) technologies.push('Zustand');
      if (deps['@tanstack/react-query']) technologies.push('React Query');
    } catch (error) {
      // Invalid JSON, skip
    }
  }

  // Check for other indicators
  if (analysis.stats.keyFiles.includes('tsconfig.json')) technologies.push('TypeScript');
  if (analysis.stats.keyFiles.includes('tailwind.config.js') || analysis.stats.keyFiles.includes('tailwind.config.ts')) {
    technologies.push('Tailwind CSS');
  }

  return [...new Set(technologies)]; // Remove duplicates
}

// Helper function to parse AI JSON responses that may include ```json wrapper
function parseAIJsonResponse(response: string): any {
  // Normalize special characters that might cause JSON parsing issues
  const normalizeJson = (jsonStr: string): string => {
    return jsonStr
      // Replace various dash types with regular hyphen
      .replace(/[‑–—−]/g, '-')
      // Replace smart quotes with regular quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Replace other problematic Unicode characters
      .replace(/[…]/g, '...')
      // Remove any BOM or invisible characters
      .replace(/^\uFEFF/, '')
      // Remove any other invisible/control characters including narrow no-break space
      .replace(/[\u200B-\u200D\uFEFF\u202F]/g, '')
      .trim();
  };

  const tryParse = (jsonStr: string): any => {
    try {
      const normalized = normalizeJson(jsonStr);
      console.log('Attempting to parse normalized JSON:', normalized.substring(0, 200) + '...');
      return JSON.parse(normalized);
    } catch (error) {
      console.error('JSON parsing failed for:', jsonStr.substring(0, 200) + '...');
      console.error('Parse error:', error);
      throw error;
    }
  };

  console.log('parseAIJsonResponse called with response length:', response.length);
  console.log('Response starts with:', response.substring(0, 50));

  // Check if response has ```json wrapper first
  if (response.includes('```json')) {
    console.log('Found ```json marker, extracting...');
    
    // Find the start of JSON content after ```json
    const startIndex = response.indexOf('```json') + 7; // 7 = length of '```json'
    const endIndex = response.indexOf('```', startIndex);
    
    if (endIndex !== -1) {
      const jsonContent = response.substring(startIndex, endIndex).trim();
      console.log('Extracted JSON content:', jsonContent.substring(0, 100) + '...');
      console.log('JSON content length:', jsonContent.length);
      return tryParse(jsonContent);
    }
  }

  // If no wrapper, try to parse as-is
  try {
    return tryParse(response);
  } catch (error) {
    console.log('Direct parsing failed, trying to find JSON array...');

    // Try to find JSON array in the response
    const arrayMatch = response.match(/\[[\s\S]*?\]/);
    if (arrayMatch) {
      console.log('Found JSON array in response, extracting...');
      return tryParse(arrayMatch[0]);
    }

    // Log the full response for debugging
    console.error('Failed to parse AI response:', response);
    throw new Error(`Failed to parse AI JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

