import { generateWithLLM } from '@/lib/llm';
import { documentationDb, contextDb, goalDb, DbDocumentation, DocSourceMetadata } from '@/app/db';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Documentation Generator Service
 * Generates comprehensive project documentation using LLM and project metadata
 */

export interface GenerateDocsOptions {
  projectId: string;
  projectPath: string;
  projectName: string;
  sectionTypes?: DbDocumentation['section_type'][];
  provider?: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  model?: string;
}

export interface GeneratedDocSection {
  id: string;
  title: string;
  content: string;
  sectionType: DbDocumentation['section_type'];
  sourceMetadata: DocSourceMetadata;
}

/**
 * Extract database schema information from schema.ts file
 */
async function extractDatabaseSchema(projectPath: string): Promise<string> {
  try {
    const schemaPath = path.join(projectPath, 'src', 'app', 'db', 'schema.ts');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');

    // Extract table creation statements
    const tableMatches = schemaContent.match(/CREATE TABLE IF NOT EXISTS [\s\S]*?\);/g);
    if (!tableMatches) {
      return 'No database schema found.';
    }

    return tableMatches.join('\n\n');
  } catch (error) {
    console.error('Error reading database schema:', error);
    return 'Database schema not accessible.';
  }
}

/**
 * Extract API endpoints from route files
 */
async function extractAPIEndpoints(projectPath: string): Promise<string[]> {
  try {
    const apiPath = path.join(projectPath, 'src', 'app', 'api');
    const endpoints: string[] = [];

    async function scanDirectory(dir: string, prefix: string = '/api') {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const routePath = `${prefix}/${entry.name}`;

          if (entry.isDirectory()) {
            await scanDirectory(fullPath, routePath);
          } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
            // Extract HTTP methods from route file
            const content = await fs.readFile(fullPath, 'utf-8');
            const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
            const foundMethods = methods.filter(method =>
              content.includes(`export async function ${method}`)
            );

            if (foundMethods.length > 0) {
              endpoints.push(`${foundMethods.join(', ')} ${prefix}`);
            }
          }
        }
      } catch (error) {
        // Directory not accessible, skip
      }
    }

    await scanDirectory(apiPath);
    return endpoints;
  } catch (error) {
    console.error('Error extracting API endpoints:', error);
    return [];
  }
}

/**
 * Load context descriptions for the project
 */
function loadContextDescriptions(projectId: string): string {
  const contexts = contextDb.getByProject(projectId);

  if (contexts.length === 0) {
    return 'No contexts defined.';
  }

  return contexts.map(ctx => {
    const filePaths = JSON.parse(ctx.file_paths || '[]');
    return `### ${ctx.name}\n${ctx.description || 'No description'}\n**Files**: ${filePaths.length} files`;
  }).join('\n\n');
}

/**
 * Load project goals
 */
function loadProjectGoals(projectId: string): string {
  const goals = goalDb.getByProject(projectId);

  if (goals.length === 0) {
    return 'No goals defined.';
  }

  const groupedByStatus = goals.reduce((acc, goal) => {
    if (!acc[goal.status]) acc[goal.status] = [];
    acc[goal.status].push(goal);
    return acc;
  }, {} as Record<string, typeof goals>);

  let output = '';
  for (const [status, goalList] of Object.entries(groupedByStatus)) {
    output += `\n#### ${status.toUpperCase()}\n`;
    goalList.forEach(goal => {
      output += `- **${goal.title}**: ${goal.description || 'No description'}\n`;
    });
  }

  return output;
}

/**
 * Read main documentation files from docs/ directory
 */
async function loadExistingDocs(projectPath: string): Promise<string> {
  try {
    const docsPath = path.join(projectPath, 'docs');
    const files = await fs.readdir(docsPath);

    const mdFiles = files.filter(f => f.endsWith('.md'));
    if (mdFiles.length === 0) {
      return 'No existing documentation files.';
    }

    let output = '';
    for (const file of mdFiles.slice(0, 5)) { // Limit to first 5 docs
      try {
        const content = await fs.readFile(path.join(docsPath, file), 'utf-8');
        output += `\n### ${file}\n${content.slice(0, 500)}...\n`;
      } catch (error) {
        // Skip unreadable files
      }
    }

    return output || 'Documentation files not readable.';
  } catch (error) {
    return 'No docs directory found.';
  }
}

/**
 * Read CLAUDE.md or README.md
 */
async function loadMainReadme(projectPath: string): Promise<string> {
  const candidates = ['CLAUDE.md', 'README.md'];

  for (const filename of candidates) {
    try {
      const content = await fs.readFile(path.join(projectPath, filename), 'utf-8');
      return content;
    } catch (error) {
      // Try next file
    }
  }

  return 'No README or CLAUDE.md found.';
}

/**
 * Generate overview section
 */
async function generateOverview(options: GenerateDocsOptions): Promise<GeneratedDocSection> {
  const readme = await loadMainReadme(options.projectPath);
  const goals = loadProjectGoals(options.projectId);

  const prompt = `You are a technical documentation expert. Generate a comprehensive project overview section in markdown format.

# Project Information

**Project Name**: ${options.projectName}

## Existing README Content
${readme}

## Current Project Goals
${goals}

# Task

Create a well-structured project overview that includes:
1. High-level description of what the project does
2. Key features and capabilities
3. Technology stack overview
4. Current development status and goals

Format the output as clean, professional markdown. Focus on clarity and completeness.`;

  const response = await generateWithLLM({
    prompt,
    provider: options.provider,
    model: options.model,
    temperature: 0.3,
    maxTokens: 2000
  });

  return {
    id: uuidv4(),
    title: 'Project Overview',
    content: response.text,
    sectionType: 'overview',
    sourceMetadata: {
      files: ['README.md', 'CLAUDE.md']
    }
  };
}

/**
 * Generate architecture section
 */
async function generateArchitecture(options: GenerateDocsOptions): Promise<GeneratedDocSection> {
  const readme = await loadMainReadme(options.projectPath);
  const contexts = loadContextDescriptions(options.projectId);

  const prompt = `You are a software architecture expert. Generate a comprehensive architecture documentation section in markdown format.

# Project Information

**Project Name**: ${options.projectName}

## Existing Documentation
${readme}

## Code Contexts
${contexts}

# Task

Create detailed architecture documentation that includes:
1. Overall architectural pattern (e.g., MVC, microservices, etc.)
2. Key system components and their responsibilities
3. Data flow and communication patterns
4. Technology choices and rationale
5. File/folder structure explanation

Format the output as clean, professional markdown with clear sections and subsections.`;

  const response = await generateWithLLM({
    prompt,
    provider: options.provider,
    model: options.model,
    temperature: 0.3,
    maxTokens: 3000
  });

  return {
    id: uuidv4(),
    title: 'Architecture',
    content: response.text,
    sectionType: 'architecture',
    sourceMetadata: {
      contexts: contextDb.getByProject(options.projectId).map(c => c.id)
    }
  };
}

/**
 * Generate API documentation section
 */
async function generateAPIDoc(options: GenerateDocsOptions): Promise<GeneratedDocSection> {
  const endpoints = await extractAPIEndpoints(options.projectPath);
  const existingDocs = await loadExistingDocs(options.projectPath);

  const prompt = `You are an API documentation expert. Generate comprehensive API documentation in markdown format.

# Project Information

**Project Name**: ${options.projectName}

## Detected API Endpoints
${endpoints.length > 0 ? endpoints.join('\n') : 'No API endpoints detected'}

## Existing Documentation
${existingDocs}

# Task

Create detailed API documentation that includes:
1. List of all API endpoints with HTTP methods
2. Request/response formats where identifiable
3. Common patterns and conventions
4. Authentication/authorization notes (if mentioned in docs)
5. Error handling approaches

Format the output as clean, professional markdown. Organize endpoints by functional area if possible.`;

  const response = await generateWithLLM({
    prompt,
    provider: options.provider,
    model: options.model,
    temperature: 0.3,
    maxTokens: 3000
  });

  return {
    id: uuidv4(),
    title: 'API Reference',
    content: response.text,
    sectionType: 'api',
    sourceMetadata: {
      apiEndpoints: endpoints
    }
  };
}

/**
 * Generate database schema documentation
 */
async function generateDatabaseDoc(options: GenerateDocsOptions): Promise<GeneratedDocSection> {
  const schema = await extractDatabaseSchema(options.projectPath);

  const prompt = `You are a database documentation expert. Generate comprehensive database documentation in markdown format.

# Project Information

**Project Name**: ${options.projectName}

## Database Schema
${schema}

# Task

Create detailed database documentation that includes:
1. List of all tables with their purpose
2. Key relationships and foreign keys
3. Important constraints and validations
4. Indexing strategy
5. Data types and their usage

Format the output as clean, professional markdown. Create clear sections for each table.`;

  const response = await generateWithLLM({
    prompt,
    provider: options.provider,
    model: options.model,
    temperature: 0.3,
    maxTokens: 3000
  });

  return {
    id: uuidv4(),
    title: 'Database Schema',
    content: response.text,
    sectionType: 'database',
    sourceMetadata: {
      schemas: ['goals.db']
    }
  };
}

/**
 * Generate components documentation
 */
async function generateComponentsDoc(options: GenerateDocsOptions): Promise<GeneratedDocSection> {
  const contexts = loadContextDescriptions(options.projectId);
  const readme = await loadMainReadme(options.projectPath);

  const prompt = `You are a component documentation expert. Generate comprehensive component documentation in markdown format.

# Project Information

**Project Name**: ${options.projectName}

## Code Contexts
${contexts}

## Project Documentation
${readme}

# Task

Create detailed component documentation that includes:
1. Overview of component organization
2. Key UI components and their purposes
3. Reusable utilities and hooks
4. State management approach
5. Component composition patterns

Format the output as clean, professional markdown with clear sections.`;

  const response = await generateWithLLM({
    prompt,
    provider: options.provider,
    model: options.model,
    temperature: 0.3,
    maxTokens: 2500
  });

  return {
    id: uuidv4(),
    title: 'Components',
    content: response.text,
    sectionType: 'components',
    sourceMetadata: {
      contexts: contextDb.getByProject(options.projectId).map(c => c.id)
    }
  };
}

/**
 * Main documentation generation function
 */
export async function generateProjectDocs(options: GenerateDocsOptions): Promise<GeneratedDocSection[]> {
  const sections: GeneratedDocSection[] = [];
  const sectionTypes = options.sectionTypes || ['overview', 'architecture', 'api', 'database', 'components'];

  for (const sectionType of sectionTypes) {
    try {
      let section: GeneratedDocSection;

      switch (sectionType) {
        case 'overview':
          section = await generateOverview(options);
          break;
        case 'architecture':
          section = await generateArchitecture(options);
          break;
        case 'api':
          section = await generateAPIDoc(options);
          break;
        case 'database':
          section = await generateDatabaseDoc(options);
          break;
        case 'components':
          section = await generateComponentsDoc(options);
          break;
        default:
          continue;
      }

      sections.push(section);
    } catch (error) {
      console.error(`Error generating ${sectionType} section:`, error);
      // Continue with other sections
    }
  }

  return sections;
}

/**
 * Save generated documentation to database
 */
export async function saveGeneratedDocs(
  projectId: string,
  sections: GeneratedDocSection[]
): Promise<DbDocumentation[]> {
  const savedDocs: DbDocumentation[] = [];

  for (const section of sections) {
    const doc = documentationDb.create({
      id: section.id,
      project_id: projectId,
      title: section.title,
      content: section.content,
      section_type: section.sectionType,
      auto_generated: 1,
      source_metadata: JSON.stringify(section.sourceMetadata),
      last_sync_at: new Date().toISOString()
    });

    savedDocs.push(doc);
  }

  return savedDocs;
}

/**
 * Regenerate stale documentation
 */
export async function syncStaleDocs(
  projectId: string,
  projectPath: string,
  projectName: string,
  minutesOld: number = 60
): Promise<number> {
  const staleDocs = documentationDb.getStale(projectId, minutesOld);

  if (staleDocs.length === 0) {
    return 0;
  }

  const sectionTypes = staleDocs.map(d => d.section_type);
  const newSections = await generateProjectDocs({
    projectId,
    projectPath,
    projectName,
    sectionTypes
  });

  // Update existing docs
  for (const section of newSections) {
    const existingDoc = staleDocs.find(d => d.section_type === section.sectionType);
    if (existingDoc) {
      documentationDb.update(existingDoc.id, {
        content: section.content,
        source_metadata: JSON.stringify(section.sourceMetadata),
        last_sync_at: new Date().toISOString()
      });
    }
  }

  return newSections.length;
}
