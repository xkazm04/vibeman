import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { contextDb } from '@/app/db';

interface CodebaseResource {
  path: string;
  content: string;
  type: string;
}

interface Context {
  name: string;
  description: string;
  file_paths: string[];
}

/**
 * Get file type for syntax highlighting
 */
function getFileType(ext: string): string {
  const typeMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'json': 'json',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
  };

  return typeMap[ext] || 'text';
}

/**
 * Gather codebase resources for documentation generation
 */
async function gatherCodebaseResources(projectPath: string, projectId?: string) {
  const configFiles: CodebaseResource[] = [];
  const mainFiles: CodebaseResource[] = [];
  const documentationFiles: CodebaseResource[] = [];
  let contexts: Context[] = [];

  // Fetch contexts from database if projectId is provided
  if (projectId) {
    try {
      const dbContexts = contextDb.getContextsByProject(projectId);
      contexts = dbContexts.map(ctx => ({
        name: ctx.name,
        description: ctx.description || '',
        file_paths: JSON.parse(ctx.file_paths)
      }));
    } catch {
      // Continue without contexts
    }
  }

  const configFileNames = [
    'package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts', 'next.config.mjs',
    'tailwind.config.js', 'tailwind.config.ts', '.eslintrc.js', '.eslintrc.json',
    'vite.config.ts', 'vite.config.js', 'webpack.config.js'
  ];

  const docFileNames = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE.md', 'CLAUDE.md'];

  const excludedDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv', 'database', 'coverage', '.vscode', '.idea'];
  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs'];

  // Helper to read a file safely
  async function readFileSafe(filePath: string): Promise<CodebaseResource | null> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const ext = extname(filePath).slice(1);
      const relativePath = relative(projectPath, filePath);

      // Skip very large files (>300KB)
      if (content.length > 300000) {
        return null;
      }

      return {
        path: relativePath.replace(/\\/g, '/'),
        content,
        type: getFileType(ext),
      };
    } catch {
      return null;
    }
  }

  // Gather config files
  for (const fileName of configFileNames) {
    const filePath = join(projectPath, fileName);
    const file = await readFileSafe(filePath);
    if (file) {
      configFiles.push(file);
    }
  }

  // Gather documentation files
  for (const fileName of docFileNames) {
    const filePath = join(projectPath, fileName);
    const file = await readFileSafe(filePath);
    if (file) {
      documentationFiles.push(file);
    }
  }

  // Gather main implementation files with prioritization
  const priorityDirs = ['src', 'app', 'lib', 'components', 'pages', 'api', 'routes', 'controllers', 'models', 'services', 'core', 'utils'];
  const allFiles: Array<CodebaseResource & { priority: number }> = [];

  async function walkDirectory(dir: string, depth: number = 0, isPriority: boolean = false): Promise<void> {
    if (depth > 6 || allFiles.length >= 100) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (allFiles.length >= 100) break;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludedDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            const isEntryPriority = priorityDirs.includes(entry.name.toLowerCase());
            await walkDirectory(fullPath, depth + 1, isPriority || isEntryPriority);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (codeExtensions.includes(ext)) {
            const file = await readFileSafe(fullPath);
            if (file) {
              // Assign priority: higher priority for smaller files in priority directories
              const sizePriority = file.content.length < 50000 ? 2 : file.content.length < 100000 ? 1 : 0;
              const dirPriority = isPriority ? 3 : 0;
              allFiles.push({
                ...file,
                priority: dirPriority + sizePriority
              });
            }
          }
        }
      }
    } catch {
      // Silently skip directories we can't read
    }
  }

  await walkDirectory(projectPath);

  // Sort by priority and take top 60 files
  allFiles.sort((a, b) => b.priority - a.priority);
  mainFiles.push(...allFiles.slice(0, 60).map(({ priority, ...file }) => file));

  return { configFiles, mainFiles, documentationFiles, contexts };
}

/**
 * Build Claude Code requirement content with codebase context
 */
async function buildVisionRequirementContent(
  projectName: string,
  projectPath: string,
  projectId?: string
): Promise<string> {
  // Gather codebase resources
  const { configFiles, mainFiles, documentationFiles, contexts } =
    await gatherCodebaseResources(projectPath, projectId);

  // Build sections
  let requirementContent = `# Generate High-Level Project Documentation

## Objective
Create comprehensive high-level documentation for the **${projectName}** project that provides a clear understanding of its purpose, architecture, and key features.

## Project Information
- **Project Name**: ${projectName}
- **Project Path**: ${projectPath}
- **Output Location**: \`${projectPath}/context/high.md\`

`;

  // Add configuration files section
  if (configFiles.length > 0) {
    requirementContent += `## Configuration Files\n\n`;
    requirementContent += `The project has ${configFiles.length} configuration file(s):\n\n`;

    for (const file of configFiles) {
      requirementContent += `### ${file.path}\n\n`;
      requirementContent += `\`\`\`${file.type}\n${file.content.slice(0, 2000)}\n\`\`\`\n\n`;
    }
  }

  // Add existing documentation section
  if (documentationFiles.length > 0) {
    requirementContent += `## Existing Documentation\n\n`;

    for (const file of documentationFiles) {
      requirementContent += `### ${file.path}\n\n`;
      requirementContent += `\`\`\`${file.type}\n${file.content.slice(0, 3000)}\n\`\`\`\n\n`;
    }
  }

  // Add contexts section
  if (contexts.length > 0) {
    requirementContent += `## Code Contexts\n\n`;
    requirementContent += `The project has ${contexts.length} documented code context(s):\n\n`;

    for (const ctx of contexts) {
      requirementContent += `### ${ctx.name}\n`;
      if (ctx.description) {
        requirementContent += `${ctx.description}\n`;
      }
      requirementContent += `**Files**: ${ctx.file_paths.length} file(s)\n\n`;
    }
  }

  // Add main files section
  if (mainFiles.length > 0) {
    requirementContent += `## Key Implementation Files\n\n`;
    requirementContent += `Analyzed ${mainFiles.length} key implementation file(s):\n\n`;

    for (const file of mainFiles.slice(0, 20)) {  // Show first 20 files inline
      requirementContent += `### ${file.path}\n\n`;
      requirementContent += `\`\`\`${file.type}\n${file.content.slice(0, 1500)}\n\`\`\`\n\n`;
    }

    if (mainFiles.length > 20) {
      requirementContent += `\n*...and ${mainFiles.length - 20} more implementation files available in the project.*\n\n`;
    }
  }

  // Add task instructions
  requirementContent += `## Task Instructions

1. **Analyze the Codebase**
   - Review all configuration files above to understand the tech stack
   - Examine the existing documentation for context
   - Study the key implementation files to understand the architecture
   - Consider the code contexts to understand module organization

2. **Generate Comprehensive Documentation**
   Create a documentation file with the following sections:

   ### Overview
   - Project name and purpose (1-2 sentences)
   - Key value proposition
   - Target users/use cases
   - Primary goals

   ### Architecture & Tech Stack
   - Core technologies (framework, language, database, etc.)
   - Architecture pattern (e.g., MVC, microservices, serverless)
   - Key dependencies and their purpose
   - Infrastructure and deployment approach

   ### Features & Capabilities
   - Main features (5-10 bullet points)
   - Unique selling points
   - Integration capabilities
   - API endpoints (if applicable)

   ### Project Structure
   - Directory organization
   - Key files and their purpose
   - Module/component breakdown
   - Data flow and architecture

   ### Development Workflow
   - How to run the project
   - Build process
   - Testing approach
   - Development best practices

   ### Design Patterns & Best Practices
   - Notable patterns used in the codebase
   - Code quality measures
   - Performance considerations
   - Security practices

3. **Save the Documentation**
   - Save to \`context/high.md\` in the project root
   - Use clear, concise Markdown formatting
   - Include relevant code examples where helpful
   - Ensure all information is derived from the actual codebase

## Quality Guidelines

- **Be Accurate**: Only include information from the provided codebase files
- **Be Concise**: Avoid unnecessary verbosity while maintaining clarity
- **Be Structured**: Use clear headings, bullet points, and formatting
- **Be Helpful**: Focus on information useful for developers joining the project
- **Be Comprehensive**: Cover all major aspects of the project

## Output Format

The documentation should be saved as a Markdown file at:
\`\`\`
${projectPath}/context/high.md
\`\`\`

🤖 Generated by Blueprint Vision Scan
`;

  return requirementContent;
}

/**
 * POST /api/blueprint/vision-requirement
 * Builds vision scan requirement content with codebase context
 */
export async function POST(request: NextRequest) {
  try {
    const { projectName, projectPath, projectId } = await request.json();

    if (!projectName || !projectPath) {
      return NextResponse.json(
        { error: 'projectName and projectPath are required' },
        { status: 400 }
      );
    }

    // Build requirement content
    const requirementContent = await buildVisionRequirementContent(
      projectName,
      projectPath,
      projectId
    );

    return NextResponse.json({
      success: true,
      requirementContent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build requirement content',
      },
      { status: 500 }
    );
  }
}
