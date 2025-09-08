import { Context } from '../stores/contextStore';
import { ollamaClient, OllamaResponse } from '../lib/ollama';

interface GenerateContextFileOptions {
  context: Context;
  onProgress?: (status: string) => void;
  signal?: AbortSignal;
}

export class ContextFileGenerator {

  /**
   * Generate a context file using LLM based on the provided context and file contents
   */
  static async generateContextFile({
    context,
    onProgress,
    signal
  }: GenerateContextFileOptions): Promise<string> {
    try {
      onProgress?.('Loading template and prompt files...');

      // Load template and prompt files
      const [template, prompt] = await Promise.all([
        this.loadTemplate(),
        this.loadPrompt()
      ]);

      onProgress?.('Reading source files...');

      // Read all files in the context
      const fileContents = await this.readContextFiles(context.filePaths, signal);

      onProgress?.('Composing instruction for LLM...');

      // Compose the final prompt
      const finalPrompt = this.composeFinalPrompt(template, prompt, context, fileContents);

      onProgress?.('Generating context file with LLM...');

      // Call Ollama API using universal client
      const result = await ollamaClient.generate({
        prompt: finalPrompt,
        projectId: 'context-generation', // Default project for context generation
        taskType: 'context_file_generation',
        taskDescription: `Generate context file for: ${context.name}`
      }, {
        onProgress: (progress, message) => {
          onProgress?.(message || `Generating... ${progress}%`);
        }
      });

      if (!result.success || !result.response) {
        throw new Error(result.error || 'Failed to generate context file');
      }

      onProgress?.('Context file generated successfully!');

      return result.response;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Context file generation was cancelled');
      }
      throw new Error(`Failed to generate context file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load the context template file
   */
  private static async loadTemplate(): Promise<string> {
    // Return embedded template directly since we have it available
    return this.getEmbeddedTemplate();
  }

  /**
   * Load the context prompt file
   */
  private static async loadPrompt(): Promise<string> {
    // Return embedded prompt directly since we have it available
    return this.getEmbeddedPrompt();
  }

  /**
   * Read all files in the context
   */
  private static async readContextFiles(filePaths: string[], signal?: AbortSignal): Promise<Record<string, string>> {
    const fileContents: Record<string, string> = {};

    // For now, we'll create a service that can be called from the frontend
    // In a real implementation, this would integrate with the file system
    for (const filePath of filePaths) {
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      try {
        const content = await this.readFileContent(filePath);
        fileContents[filePath] = content;
      } catch (error) {
        console.warn(`Failed to read file: ${filePath}`, error);
        fileContents[filePath] = `// Failed to read file: ${filePath}\n// Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return fileContents;
  }

  /**
   * Read file content using the Kiro file reading API
   */
  private static async readFileContent(filePath: string): Promise<string> {
    try {
      // Use Kiro's file reading API
      const response = await fetch('/api/kiro/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: filePath
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Handle different response formats
      if (result.success && result.content) {
        return result.content;
      } else if (result.data) {
        return result.data;
      } else if (typeof result === 'string') {
        return result;
      } else {
        throw new Error('Invalid response format from file reading API');
      }
    } catch (error) {
      console.warn(`Failed to read file ${filePath}, generating placeholder:`, error);

      // Generate a realistic placeholder that indicates the file couldn't be read
      // but still provides useful information for the LLM
      const fileName = filePath.split('/').pop() || 'unknown';
      const fileExtension = fileName.split('.').pop() || '';

      return `// File: ${filePath}
// Note: Unable to read actual file content - using placeholder
// This file would normally contain the implementation for analysis

${this.generatePlaceholderByExtension(filePath, fileName, fileExtension)}

// Error details: ${error instanceof Error ? error.message : 'Unknown error'}
// The LLM should note that this file content is a placeholder and may not reflect actual implementation`;
    }
  }

  /**
   * Generate placeholder content based on file extension
   */
  private static generatePlaceholderByExtension(filePath: string, fileName: string, fileExtension: string): string {
    switch (fileExtension) {
      case 'tsx':
      case 'ts':
        return this.generateTypeScriptPlaceholder(filePath, fileName);
      case 'js':
      case 'jsx':
        return this.generateJavaScriptPlaceholder(filePath, fileName);
      case 'css':
      case 'scss':
        return this.generateStylePlaceholder(filePath, fileName);
      case 'md':
        return this.generateMarkdownPlaceholder(filePath, fileName);
      default:
        return this.generateGenericPlaceholder(filePath, fileName);
    }
  }

  /**
   * Generate TypeScript/TSX placeholder content
   */
  private static generateTypeScriptPlaceholder(filePath: string, fileName: string): string {
    const componentName = fileName.replace(/\.(tsx?|jsx?)$/, '');
    const isComponent = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');

    if (isComponent) {
      return `// File: ${filePath}
import React from 'react';

interface ${componentName}Props {
  // Component props would be defined here
}

export default function ${componentName}({ }: ${componentName}Props) {
  // Component implementation would be here
  return (
    <div>
      {/* Component JSX would be here */}
    </div>
  );
}

// Additional exports, hooks, or utilities would be here
`;
    } else {
      return `// File: ${filePath}
// TypeScript module implementation

export interface ${componentName}Interface {
  // Interface definitions would be here
}

export class ${componentName} {
  // Class implementation would be here
}

// Additional exports would be here
`;
    }
  }

  /**
   * Generate JavaScript placeholder content
   */
  private static generateJavaScriptPlaceholder(filePath: string, fileName: string): string {
    return `// File: ${filePath}
// JavaScript module implementation

export function ${fileName.replace(/\.(jsx?|tsx?)$/, '')}() {
  // Function implementation would be here
}

// Additional exports would be here
`;
  }

  /**
   * Generate CSS/SCSS placeholder content
   */
  private static generateStylePlaceholder(filePath: string, fileName: string): string {
    return `/* File: ${filePath} */
/* Stylesheet implementation would be here */

.component {
  /* Styles would be defined here */
}
`;
  }

  /**
   * Generate Markdown placeholder content
   */
  private static generateMarkdownPlaceholder(filePath: string, fileName: string): string {
    return `<!-- File: ${filePath} -->
# ${fileName.replace('.md', '')}

Markdown content would be here.
`;
  }

  /**
   * Generate generic placeholder content
   */
  private static generateGenericPlaceholder(filePath: string, fileName: string): string {
    return `# File: ${filePath}
# Generic file content would be here
# File type: ${fileName.split('.').pop() || 'unknown'}
`;
  }

  /**
   * Compose the final prompt for the LLM
   */
  private static composeFinalPrompt(
    template: string,
    prompt: string,
    context: Context,
    fileContents: Record<string, string>
  ): string {
    const fileContentsSection = Object.entries(fileContents)
      .map(([path, content]) => `## File: ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join('\n\n');

    return `${prompt}

## Context Information

**Context Name**: ${context.name}
**Context Description**: ${context.description || 'No description provided'}
**Number of Files**: ${context.filePaths.length}

## Template to Fill

${template}

## Source Files to Analyze

${fileContentsSection}

## Instructions

Please analyze the provided source files and fill out the template above with accurate information about this feature. Replace all placeholder text in [brackets] with actual values from the code analysis. Focus on being concise and accurate.

Return only the filled template as markdown, without any additional commentary or explanation.`;
  }

  // Note: callOllamaAPI method removed - now using universal ollamaClient

  /**
   * Embedded template as fallback
   */
  private static getEmbeddedTemplate(): string {
    return `# Feature Context: [Feature Name]

file: feature_context.md

## Core Functionality

[2-3 sentences describing the main responsibility and how it fits into the system]

## Architecture

### Location Map

\`\`\`
[Project structure showing where feature files are located]
\`\`\`

### Key Files

| File | Purpose | Modify When |
| --- | --- | --- |
| \`[path/to/file]\` | [what it does] | [when to change it] |

## Data Flow

\`\`\`
[Visual representation or description of how data flows through the feature]
\`\`\`

### State Management

- **Local State**: [what's managed locally]
- **Global State**: [what's in global store]
- **Server State**: [what's synchronized with backend]
- **Cache Strategy**: [how data is cached]

## Data Models

### Primary Schema

\`\`\`tsx
// Main data structures used by this feature
interface [ModelName] {
  [field]: [type];
}
\`\`\`

## Business Rules

### Validation Rules

- [Rule description and requirements]

### Access Control

- **Public**: [what's publicly accessible]
- **Authenticated**: [what requires login]
- **Authorized**: [what requires specific permissions]

## API Specifications

### [Operation Name]

**Endpoint**: \`[METHOD] [path]\`

**Purpose**: [what it does]

---

## Update Log

| Date | Author | Changes |
| --- | --- | --- |
| YYYY-MM-DD | [name/LLM] | [what was changed] |

## Notes for LLM/Developer

[Any special instructions for updating or working with this feature]`;
  }

  /**
   * Embedded prompt as fallback
   */
  private static getEmbeddedPrompt(): string {
    return `You are tasked with creating a feature_context.md file that documents a software feature. This file serves as both human documentation and machine-readable context for AI assistants.

## Instructions

1. **Be concise and accurate** - Focus on essential information that helps understand the feature
2. **Use real paths and names** - Replace all placeholders [bracketed items] with actual values
3. **Keep technical accuracy** - Ensure all code examples, types, and endpoints are correct
4. **Always update the log** - Add an entry to the Update Log section

Analyze the provided source files and fill out the template with accurate information about this feature.`;
  }
}