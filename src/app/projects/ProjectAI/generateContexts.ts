import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { contextDb } from '../../../lib/database';
import { v4 as uuidv4 } from 'uuid';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

async function callOllamaAPI(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error('Failed to call Ollama API:', error);
    throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to read template files
async function readTemplate(templateName: string): Promise<string> {
  try {
    // Try multiple possible paths
    const possiblePaths = [
      join(process.cwd(), 'src', 'app', 'coder', 'Context', 'templates', templateName),
      join(process.cwd(), 'vibeman', 'src', 'app', 'coder', 'Context', 'templates', templateName),
      join(__dirname, '..', '..', 'coder', 'Context', 'templates', templateName),
      join(__dirname, '..', '..', '..', 'coder', 'Context', 'templates', templateName)
    ];

    for (const templatePath of possiblePaths) {
      try {
        console.log(`Attempting to read template from: ${templatePath}`);
        const content = await readFile(templatePath, 'utf-8');
        console.log(`Successfully read ${templateName} template (${content.length} characters)`);
        return content;
      } catch (pathError) {
        console.log(`Path ${templatePath} failed:`, pathError.message);
        continue;
      }
    }

    throw new Error(`Could not find ${templateName} in any of the expected locations`);
  } catch (error) {
    console.warn(`Could not read ${templateName} template:`, error);
    return '';
  }
}

// Read existing context files from the project
async function readExistingContexts(projectPath: string): Promise<Array<{ filename: string; content: string }>> {
  const existingContexts: Array<{ filename: string; content: string }> = [];
  const contextDir = join(projectPath, 'context');

  try {
    if (!existsSync(contextDir)) {
      console.log('Context directory does not exist, will create it');
      return existingContexts;
    }

    const files = await readdir(contextDir);
    const contextFiles = files.filter(file => file.endsWith('_context.md'));

    console.log(`Found ${contextFiles.length} existing context files:`, contextFiles);

    for (const file of contextFiles) {
      try {
        const filePath = join(contextDir, file);
        const content = await readFile(filePath, 'utf-8');
        existingContexts.push({ filename: file, content });
        console.log(`Read existing context file: ${file} (${content.length} characters)`);
      } catch (error) {
        console.warn(`Failed to read context file ${file}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to read context directory:', error);
  }

  return existingContexts;
}

// Parse AI response to extract multiple context files with metadata
function parseContextResponse(response: string): Array<{
  filename: string;
  content: string;
  metadata: {
    name: string;
    description?: string;
    filePaths: string[]
  }
}> {
  const contexts: Array<{
    filename: string;
    content: string;
    metadata: {
      name: string;
      description?: string;
      filePaths: string[]
    }
  }> = [];

  console.log('Parsing AI response for context files...');
  console.log('Response preview:', response.substring(0, 500));

  // Look for context file markers in the response - improved pattern
  const contextPattern = /```context-file:\s*([^\n`]+)\s*```\s*\n([\s\S]*?)(?=```context-file:|```\s*$|$)/g;
  let match;

  while ((match = contextPattern.exec(response)) !== null) {
    const filename = match[1].trim();
    let content = match[2].trim();

    // Remove trailing ``` if present
    content = content.replace(/```\s*$/, '').trim();

    if (filename && content) {
      // Ensure filename ends with .md
      const cleanFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

      // Extract metadata from content
      const metadata = extractMetadataFromContent(content, cleanFilename);

      contexts.push({
        filename: cleanFilename,
        content,
        metadata
      });
      console.log(`Parsed context file: ${cleanFilename} (${content.length} characters)`);
      console.log(`Extracted metadata:`, metadata);
    }
  }

  // Fallback: if no markers found, try to extract from markdown sections
  if (contexts.length === 0) {
    console.log('No context-file markers found, trying fallback parsing...');
    const sectionPattern = /# Feature Context: ([^\n]+)\n([\s\S]*?)(?=# Feature Context:|$)/g;
    let sectionMatch;

    while ((sectionMatch = sectionPattern.exec(response)) !== null) {
      const featureName = sectionMatch[1].trim();
      const content = sectionMatch[2].trim();

      if (featureName && content) {
        const filename = `${featureName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
        const fullContent = `# Feature Context: ${featureName}\n\n${content}`;
        const metadata = extractMetadataFromContent(fullContent, filename);

        contexts.push({
          filename,
          content: fullContent,
          metadata
        });
        console.log(`Parsed fallback context file: ${filename} (${fullContent.length} characters)`);
      }
    }
  }

  console.log(`Total context files parsed: ${contexts.length}`);
  return contexts;
}

// Extract metadata from context file content
function extractMetadataFromContent(content: string, filename: string): {
  name: string;
  description?: string;
  filePaths: string[]
} {
  // Extract name from title or filename
  const titleMatch = content.match(/^#\s*(?:Feature Context:\s*)?(.+)$/m);
  const name = titleMatch ? titleMatch[1].trim() : filename.replace('_context.md', '').replace(/_/g, ' ');

  // Extract description from Core Functionality section
  const descriptionMatch = content.match(/##\s*Core Functionality\s*\n(.*?)(?=\n##|\n#|$)/s);
  const description = descriptionMatch ? descriptionMatch[1].trim().split('\n')[0] : undefined;

  // Extract file paths from various sections
  const filePaths: string[] = [];

  // Look for file paths in code blocks, Location Map, or file references
  const codeBlockMatches = content.matchAll(/```[\w]*\n([^`]+)```/g);
  for (const match of codeBlockMatches) {
    const codeContent = match[1];
    // Extract file paths that look like relative paths
    const pathMatches = codeContent.matchAll(/(?:^|\s)([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+)/gm);
    for (const pathMatch of pathMatches) {
      const path = pathMatch[1];
      if (path && !filePaths.includes(path)) {
        filePaths.push(path);
      }
    }
  }

  // Look for explicit file references
  const fileRefMatches = content.matchAll(/(?:file|path|component):\s*([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/gi);
  for (const match of fileRefMatches) {
    const path = match[1];
    if (path && !filePaths.includes(path)) {
      filePaths.push(path);
    }
  }

  // Look for Location Map section
  const locationMapMatch = content.match(/##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n(.*?)(?=\n##|\n#|$)/s);
  if (locationMapMatch) {
    const locationContent = locationMapMatch[1];
    const locationPaths = locationContent.matchAll(/([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g);
    for (const match of locationPaths) {
      const path = match[1];
      if (path && !filePaths.includes(path)) {
        filePaths.push(path);
      }
    }
  }

  return {
    name,
    description,
    filePaths: filePaths.slice(0, 10) // Limit to 10 file paths
  };
}

// Generate context files for features
export async function generateContexts(projectName: string, projectPath: string, analysis: any, projectId?: string): Promise<{ success: boolean; contexts: Array<{ filename: string; content: string }>; error?: string }> {
  try {
    console.log(`Starting context generation for project: ${projectName}`);
    console.log(`Project path: ${projectPath}`);

    // Read template files
    const contextTemplate = await readTemplate('context-template.md');
    const contextPrompt = await readTemplate('context-prompt.md');

    if (!contextTemplate || !contextPrompt) {
      throw new Error('Could not read context template files');
    }

    // Read existing context files
    const existingContexts = await readExistingContexts(projectPath);
    console.log(`Found ${existingContexts.length} existing context files`);

    // Build the analysis data section
    const buildAnalysisSection = () => {
      let section = `## Project Analysis Data\n\n**Project Name**: ${projectName}\n\n`;

      // Add project structure if available
      if (analysis?.structure) {
        section += `**Project Structure**:\n\`\`\`\n${JSON.stringify(analysis.structure, null, 2)}\n\`\`\`\n\n`;
      }

      // Add technologies if available
      if (analysis?.stats?.technologies?.length > 0) {
        section += `**Technologies Detected**: ${analysis.stats.technologies.join(', ')}\n\n`;
      }

      // Add main implementation files if available
      if (analysis?.codebase?.mainFiles?.length > 0) {
        section += `**Main Implementation Files** (sample):\n`;
        section += analysis.codebase.mainFiles.slice(0, 15).map((f: any) =>
          `\n### ${f.path}\n\`\`\`${f.type || 'text'}\n${(f.content || 'Content not available').slice(0, 2000)}\n\`\`\``
        ).join('\n');
        section += '\n\n';
      }

      return section;
    };

    // Build existing contexts section
    const buildExistingContextsSection = () => {
      if (existingContexts.length === 0) {
        return `## Existing Context Files\n\nNo existing context files found. You will create new ones.\n\n`;
      }

      let section = `## Existing Context Files\n\nThe following context files already exist. Review them and decide whether to:\n- Keep them as-is (don't include in response)\n- Update them with new information (include updated version in response)\n- Create additional context files for uncovered features\n\n`;

      existingContexts.forEach((context, index) => {
        section += `### ${index + 1}. ${context.filename}\n\`\`\`markdown\n${context.content.slice(0, 1500)}${context.content.length > 1500 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
      });

      return section;
    };

    const prompt = `You are an expert software architect tasked with analyzing a codebase and creating/updating feature context documentation.

${contextPrompt}

## Template to Follow

${contextTemplate}

${buildExistingContextsSection()}

## Instructions for Response Format

For each feature context file you want to CREATE or UPDATE, provide it in this exact format:

\`\`\`context-file:feature_name_context.md\`\`\`
[Complete markdown content for the feature context file]
\`\`\`

**CRITICAL: Focus on Complete High-Level Features**

**What constitutes a "feature" for context documentation:**
- **Complete user-facing capabilities** that span multiple architectural layers
- **End-to-end workflows** from UI interaction to data persistence
- **Business domains** that users understand and interact with

**Examples of GOOD high-level features to document:**
- "User Authentication System" (login UI, auth API, session management, password reset)
- "Project Management" (project CRUD, dashboard, file organization, sharing)
- "Content Generation" (AI integration, template system, result processing)
- "File Management" (upload, processing, storage, organization)
- "Notification System" (email, in-app, preferences, delivery)

**Examples of BAD small components to AVOID:**
- Individual UI components (buttons, modals, forms)
- Single API endpoints or database tables
- Utility functions or helper classes
- Infrastructure components (database connections, config)

**Enhanced Metadata Requirements:**
When creating context files, ensure you include:

1. **Complete Feature Names**: Use business-domain titles like "User Authentication System", "Project Management", "Content Generation Pipeline"
2. **Full-Stack Scope**: Include UI components, API endpoints, database schema, and business logic
3. **User Journey Focus**: Describe how users interact with the complete feature
4. **File Path References**: In the "Location Map" section, list ALL relevant files across all layers
5. **Architecture Details**: Include component relationships and data flow across the full stack

**File Path Guidelines:**
- Use relative paths from project root (e.g., "src/components/auth/LoginForm.tsx")
- Include frontend, backend, database, and configuration files
- Group files by architectural layer (UI, API, Database, Services)
- List files in order of importance within each layer
- Use exact file extensions

**Important Guidelines:**
1. **Focus on 3-5 major features maximum** - quality over quantity
2. Only include files you want to CREATE or UPDATE in your response
3. If existing files are adequate, don't include them in your response
4. Use descriptive filenames like "user_authentication_system_context.md", "project_management_context.md"
5. Fill out the template completely with real information from the codebase
6. Replace all [placeholder] values with actual data
7. Each context file should document a complete feature that spans multiple layers
8. **ENSURE Location Map section contains accurate file paths from the codebase across all layers**

---

${buildAnalysisSection()}

---

Please analyze this project and determine what context files need to be created or updated. Focus on logical groupings of functionality that would help developers understand the codebase structure. Pay special attention to extracting accurate file paths for the Location Map sections.`;

    console.log('Calling Ollama API for context generation...');
    const response = await callOllamaAPI(prompt);
    console.log(`Received response from Ollama (${response.length} characters)`);

    const contexts = parseContextResponse(response);

    if (contexts.length === 0) {
      console.log('No new context files to create/update');
      // Return existing contexts if no new ones were generated
      return {
        success: true,
        contexts: existingContexts
      };
    }

    // Ensure context directory exists
    const contextDir = join(projectPath, 'context');
    if (!existsSync(contextDir)) {
      console.log('Creating context directory...');
      await mkdir(contextDir, { recursive: true });
    }

    // Write context files and create database entries
    const writtenContexts: Array<{ filename: string; content: string }> = [];

    for (const context of contexts) {
      try {
        // Clean the filename to prevent path issues
        const cleanFilename = context.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = join(contextDir, cleanFilename);
        const relativeContextPath = `context/${cleanFilename}`;

        console.log(`Writing context file: ${cleanFilename} (${context.content.length} characters)`);
        await writeFile(filePath, context.content, 'utf-8');

        writtenContexts.push({
          filename: cleanFilename,
          content: context.content
        });

        console.log(`Successfully wrote: ${filePath}`);

        // Create or update database entry
        try {
          // Use the passed projectId parameter, or extract from analysis, or use a default
          const actualProjectId = projectId || analysis?.projectId || 'default-project';

          // Check if context already exists in database
          const existingContext = contextDb.findContextByFilePath(actualProjectId, relativeContextPath);

          if (existingContext) {
            // Update existing context
            console.log(`Updating existing context in database: ${existingContext.id}`);
            contextDb.updateContext(existingContext.id, {
              name: context.metadata.name,
              description: context.metadata.description,
              file_paths: context.metadata.filePaths,
              has_context_file: true,
              context_file_path: relativeContextPath
            });
          } else {
            // Create new context entry
            const contextId = uuidv4();
            console.log(`Creating new context in database: ${contextId}`);
            contextDb.createContextFromFile({
              id: contextId,
              project_id: actualProjectId,
              name: context.metadata.name,
              description: context.metadata.description,
              file_paths: context.metadata.filePaths,
              context_file_path: relativeContextPath
            });
          }

          console.log(`Database entry created/updated for context: ${context.metadata.name}`);
        } catch (dbError) {
          console.error(`Failed to create/update database entry for ${cleanFilename}:`, dbError);
          // Continue with file creation even if database fails
        }

      } catch (writeError) {
        console.error(`Failed to write context file ${context.filename}:`, writeError);
        // Continue with other files instead of failing completely
      }
    }

    // Combine written contexts with existing ones that weren't updated
    const allContexts = [...writtenContexts];

    // Add existing contexts that weren't updated
    for (const existing of existingContexts) {
      const wasUpdated = writtenContexts.some(written => written.filename === existing.filename);
      if (!wasUpdated) {
        allContexts.push(existing);
      }
    }

    console.log(`Context generation completed. Total files: ${allContexts.length}`);

    return {
      success: true,
      contexts: allContexts
    };

  } catch (error) {
    console.error('Failed to generate contexts:', error);
    return {
      success: false,
      contexts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}