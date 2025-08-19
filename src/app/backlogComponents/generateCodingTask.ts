import { readFile } from 'fs/promises';
import { join } from 'path';
import { backlogDb } from '../../lib/backlogDatabase';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'gpt-oss:20b';

interface BacklogTask {
  id: string;
  title: string;
  description: string;
  steps: string[];
  impacted_files: Array<{ filepath: string; type: 'create' | 'update' }>;
  project_id: string;
}

interface GeneratedCode {
  filepath: string;
  action: 'create' | 'update';
  content: string;
  originalContent?: string;
}

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

// Read file content safely
async function readFileContent(projectPath: string, filePath: string): Promise<string> {
  try {
    const fullPath = join(projectPath, filePath);
    console.log(`Attempting to read file: ${fullPath}`);
    const content = await readFile(fullPath, 'utf-8');
    console.log(`Successfully read file: ${filePath} (${content.length} characters)`);
    return content;
  } catch (error) {
    console.warn(`Could not read file ${filePath} at ${join(projectPath, filePath)}:`, error.message);
    return `[File not found: ${filePath}]`;
  }
}

// Parse the AI response to extract code files
function parseCodeResponse(response: string): GeneratedCode[] {
  const generatedFiles: GeneratedCode[] = [];

  console.log('Parsing AI response for code files...');
  console.log('=== FULL OLLAMA RESPONSE START ===');
  console.log(response);
  console.log('=== FULL OLLAMA RESPONSE END ===');

  // Look for code file markers in the response - try multiple patterns
  const patterns = [
    // Pattern 1: code-file:filename|action (with newline after backticks)
    /```(?:code-file|file):\s*([^\n`]+?)\s*(?:\|\s*(create|update))?\s*```\s*\n([\s\S]*?)(?=```(?:code-file|file):|```\s*$|$)/g,
    // Pattern 2: code-file:filename|action (without newline after backticks - the actual format!)
    /```(?:code-file|file):\s*([^\n`|]+)\|?(create|update)?\s*([\s\S]*?)```/g,
    // Pattern 3: filename|action (without code-file prefix)
    /```([^\n`]+\.(?:tsx?|jsx?|py|java|cpp|c|h|css|scss|html|md|json|yaml|yml))\s*(?:\|\s*(create|update))?\s*\n([\s\S]*?)(?=```[^\n`]*\.(?:tsx?|jsx?|py|java|cpp|c|h|css|scss|html|md|json|yaml|yml)|```\s*$|$)/g,
    // Pattern 4: Simple filename in code block
    /```(?:typescript|javascript|tsx|jsx)?\s*\n\/\/\s*([^\n]+\.(?:tsx?|jsx?))\s*\n([\s\S]*?)```/g
  ];

  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const codePattern = patterns[patternIndex];
    console.log(`Trying pattern ${patternIndex + 1}...`);
    let match;
    while ((match = codePattern.exec(response)) !== null) {
      console.log(`Found match with pattern ${patternIndex + 1}:`, match[0].substring(0, 100) + '...');
      console.log(`Match groups:`, match.map((group, i) => `[${i}]: "${group?.substring(0, 50) || 'undefined'}"`));
      let filepath = match[1].trim();
      let action: 'create' | 'update' = 'update';
      let content = '';

      // Handle different patterns
      if (patternIndex === 0) {
        // Pattern 1: code-file:filename|action with newline
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 1) {
        // Pattern 2: code-file:filename|action without newline
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 2) {
        // Pattern 3: filename|action (without code-file prefix)
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 3) {
        // Pattern 4: Simple filename in code block
        content = match[2].trim();
        action = 'create'; // Default for pattern 4
      }

      // Check if action is embedded in the filepath (e.g., "file.tsx|create")
      const actionMatch = filepath.match(/^(.+?)\|(create|update)$/);
      if (actionMatch) {
        filepath = actionMatch[1].trim();
        action = actionMatch[2] as 'create' | 'update';
      }

      // Remove trailing ``` if present
      content = content.replace(/```\s*$/, '').trim();

      if (filepath && content && content.length > 10) {
        generatedFiles.push({
          filepath,
          action,
          content
        });
        console.log(`Parsed code file: ${filepath} (${action}, ${content.length} characters)`);
      }
    }

    if (generatedFiles.length > 0) {
      console.log(`Pattern ${patternIndex + 1} found ${generatedFiles.length} files, stopping pattern search`);
      break;
    }
  }

  // Fallback: look for standard code blocks with file paths in comments
  if (generatedFiles.length === 0) {
    console.log('No code-file markers found, trying fallback parsing...');
    console.log('Looking for standard code blocks...');
    const fallbackPattern = /```[\w]*\s*(?:\/\/\s*|#\s*|<!--\s*)?([^\n]+\.(?:tsx?|jsx?|py|java|cpp|c|h|css|scss|html|md|json|yaml|yml))\s*(?:-->)?\s*\n([\s\S]*?)```/g;
    let fallbackMatch;

    while ((fallbackMatch = fallbackPattern.exec(response)) !== null) {
      console.log('Found fallback match:', fallbackMatch[0].substring(0, 100) + '...');
      let filepath = fallbackMatch[1].trim();
      const content = fallbackMatch[2].trim();

      // Clean the filepath - remove any action type suffixes that might be included
      filepath = filepath.replace(/\|(create|update)$/, '').trim();

      if (filepath && content) {
        generatedFiles.push({
          filepath,
          action: 'update', // Default to update for fallback
          content
        });
        console.log(`Parsed fallback code file: ${filepath} (update, ${content.length} characters)`);
      }
    }
  }

  // Additional fallback: try to find any code blocks at all
  if (generatedFiles.length === 0) {
    console.log('No files found with standard patterns, trying broad search...');
    const broadPattern = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let broadMatch;
    let fileIndex = 0;

    while ((broadMatch = broadPattern.exec(response)) !== null) {
      const language = broadMatch[1] || 'text';
      const content = broadMatch[2].trim();

      if (content.length > 50) { // Only consider substantial code blocks
        console.log(`Found code block ${fileIndex + 1}: ${language} (${content.length} characters)`);
        console.log('Content preview:', content.substring(0, 200) + '...');

        // Try to guess the file extension from language and content
        const extensions: { [key: string]: string } = {
          'typescript': 'tsx',
          'javascript': 'jsx',
          'python': 'py',
          'java': 'java',
          'cpp': 'cpp',
          'css': 'css',
          'html': 'html',
          'json': 'json'
        };

        // Try to detect file type from content
        let ext = extensions[language] || 'tsx'; // Default to tsx for React components
        let filename = `generated_file_${fileIndex + 1}`;

        // Look for React component patterns
        if (content.includes('export default') && (content.includes('function') || content.includes('const'))) {
          ext = 'tsx';
          // Try to extract component name
          const componentMatch = content.match(/(?:export default function|const)\s+(\w+)/);
          if (componentMatch) {
            filename = componentMatch[1];
          }
        }

        const filepath = `src/components/${filename}.${ext}`;

        generatedFiles.push({
          filepath,
          action: 'create',
          content
        });

        console.log(`Added broad match file: ${filepath} (create, ${content.length} characters)`);
        fileIndex++;
      }
    }
  }

  console.log(`Total code files parsed: ${generatedFiles.length}`);
  return generatedFiles;
}

// Generate code for a backlog task
export async function generateCodingTask(taskId: string, projectPath: string): Promise<{
  success: boolean;
  generatedFiles?: GeneratedCode[];
  error?: string;
}> {
  try {
    console.log(`Starting code generation for task: ${taskId}`);
    console.log(`Project path: ${projectPath}`);

    // Get the task from database
    const task = backlogDb.getBacklogItemById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const parsedTask: BacklogTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      steps: task.steps ? JSON.parse(task.steps) : [],
      impacted_files: task.impacted_files ? JSON.parse(task.impacted_files) : [],
      project_id: task.project_id
    };

    console.log(`Task: ${parsedTask.title}`);
    console.log(`Impacted files: ${parsedTask.impacted_files.length}`);

    // Read existing file contents for context (only for update actions)
    let filesContext = '';
    let filesToCreate = [];
    let filesToUpdate = [];

    for (const file of parsedTask.impacted_files) {
      // Clean the filepath - remove any action type suffixes that might be included
      const cleanFilepath = file.filepath.replace(/\|(create|update)$/, '').trim();
      const cleanFile = { ...file, filepath: cleanFilepath };

      if (file.type === 'create') {
        filesToCreate.push(cleanFile);
        filesContext += `\n### New File to Create: ${cleanFilepath}\n[This file will be created from scratch]\n\n`;
      } else {
        filesToUpdate.push(cleanFile);
        const content = await readFileContent(projectPath, cleanFilepath);
        if (content.startsWith('[File not found:')) {
          // File doesn't exist, treat as create
          filesToCreate.push({ ...cleanFile, type: 'create' });
          filesContext += `\n### New File to Create: ${cleanFilepath}\n[This file will be created from scratch]\n\n`;
        } else {
          filesContext += `\n### Current File to Update: ${cleanFilepath}\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\`\n\n`;
        }
      }
    }

    // Build the coding prompt
    const prompt = `You are a senior full-stack developer with expertise in React, TypeScript, Next.js, and modern web development practices. Your task is to implement a backlog item with the same quality and attention to detail as a seasoned professional working on a production codebase.

## Implementation Brief

**Feature**: ${parsedTask.title}
**Objective**: ${parsedTask.description}

**Implementation Roadmap**:
${parsedTask.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Codebase Context

### New Components to Create (${filesToCreate.length})
${filesToCreate.map(f => `- ${f.filepath} (new implementation)`).join('\n') || 'None'}

### Existing Components to Modify (${filesToUpdate.length})
${filesToUpdate.map(f => `- ${f.filepath} (enhancement/modification)`).join('\n') || 'None'}

## Current Implementation State
${filesContext}

## Development Standards

As a senior developer, implement this feature following these professional standards:

**Code Quality & Architecture:**
- Write clean, maintainable, and self-documenting code
- Follow established patterns and conventions from the existing codebase
- Implement proper separation of concerns and single responsibility principle
- Use TypeScript effectively with proper type definitions and interfaces
- Apply React best practices including proper hooks usage and component composition

**Technical Implementation:**
- Ensure all imports are correctly resolved and dependencies are properly managed
- Implement comprehensive error handling and edge case management
- Add meaningful comments for complex business logic and architectural decisions
- Use consistent naming conventions and code formatting
- Optimize for performance while maintaining readability

**Production Readiness:**
- Include proper error boundaries and fallback states
- Implement loading states and user feedback mechanisms
- Ensure accessibility compliance (ARIA labels, keyboard navigation, etc.)
- Add proper validation for user inputs and API responses
- Consider mobile responsiveness and cross-browser compatibility

**Integration & Testing:**
- Ensure seamless integration with existing components and services
- Write code that is easily testable and mockable
- Include proper prop validation and default values
- Handle asynchronous operations correctly with proper cleanup

## Implementation Requirements

Generate production-quality code for ALL ${parsedTask.impacted_files.length} files listed above. Each file should be complete, functional, and ready for immediate deployment.

**Output Format** (use exactly this format for each file):

${filesToCreate.map(f => `\`\`\`code-file:${f.filepath}|create\`\`\`
[Complete, production-ready implementation]
\`\`\``).join('\n\n')}

${filesToUpdate.map(f => `\`\`\`code-file:${f.filepath}|update\`\`\`
[Complete, updated implementation with all existing functionality preserved]
\`\`\``).join('\n\n')}

## Critical Success Criteria

- **Completeness**: Every file must be fully implemented with no placeholders or TODOs
- **Integration**: Code must work seamlessly with the existing codebase
- **Quality**: Code must meet senior-level standards for maintainability and performance
- **Functionality**: Implementation must fully satisfy the requirements outlined in the task description

Implement this feature with the same rigor and expertise you would apply to any critical production system. Focus on creating robust, scalable, and maintainable code that other senior developers would approve in a code review.`;

    console.log('Calling Ollama API for code generation...');
    const response = await callOllamaAPI(prompt);
    console.log(`Received response from Ollama (${response.length} characters)`);

    if (!response || response.trim().length === 0) {
      throw new Error('Received empty response from Ollama API');
    }

    // Parse the generated code
    const generatedFiles = parseCodeResponse(response);

    if (generatedFiles.length === 0) {
      throw new Error('No code files were generated from the AI response');
    }

    // Read original content for files being updated
    for (const file of generatedFiles) {
      if (file.action === 'update') {
        file.originalContent = await readFileContent(projectPath, file.filepath);
      }
    }

    console.log(`Code generation completed. Generated ${generatedFiles.length} files`);

    return {
      success: true,
      generatedFiles
    };

  } catch (error) {
    console.error('Failed to generate code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}