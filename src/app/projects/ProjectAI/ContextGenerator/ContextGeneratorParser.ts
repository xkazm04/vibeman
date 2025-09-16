import { ParsedContext, ContextMetadata } from './types';

export class ContextResponseParser {
  private usedNames = new Set<string>();
  private usedFilePaths = new Set<string>();

  parse(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    
    console.log('Parsing AI response for context files...');
    console.log('Response preview:', response.substring(0, 500));

    // Reset tracking sets for each parse
    this.usedNames.clear();
    this.usedFilePaths.clear();

    // Try different parsing patterns in order of preference
    const patterns = [
      () => this.parseContextFileFormat(response),
      () => this.parseJsonFormat(response),
      () => this.parseMultilineJsonFormat(response),
      () => this.parseNumberedSections(response),
      () => this.parseContextHeaders(response),
      () => this.parseFeatureContextSections(response),
      () => this.createFallbackContext(response)
    ];

    for (const parsePattern of patterns) {
      const results = parsePattern();
      if (results.length > 0) {
        contexts.push(...results);
        break;
      }
    }

    console.log(`Total context files parsed: ${contexts.length}`);
    return contexts;
  }

  private parseContextFileFormat(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    const contextPattern = /```context-file:\s*([^\n`]+)\s*```\s*\n([\s\S]*?)(?=```context-file:|```\s*$|$)/g;
    let match;

    while ((match = contextPattern.exec(response)) !== null) {
      const filename = match[1].trim();
      let content = match[2].trim();

      // Remove trailing ``` if present
      content = content.replace(/```\s*$/, '').trim();

      if (filename && content && content.length > 100) {
        const cleanFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
        const metadata = this.extractMetadataFromContent(content, cleanFilename);

        if (this.isValidContext(metadata)) {
          this.markAsUsed(metadata);
          contexts.push({
            filename: cleanFilename,
            content,
            metadata
          });
          console.log(`Parsed context file: ${cleanFilename} (${content.length} characters, ${metadata.filePaths.length} files)`);
        }
      }
    }

    return contexts;
  }

  private parseJsonFormat(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    const jsonContextPattern = /context file \{[\s\S]*?name:\s*([^\n,}]+)[\s\S]*?description:\s*([^\n,}]+)[\s\S]*?files:\s*\[([\s\S]*?)\][\s\S]*?\}/g;
    let match;

    while ((match = jsonContextPattern.exec(response)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();
      const filesSection = match[3];

      const filePaths = this.extractFilePathsFromSection(filesSection);

      if (name && filePaths.length > 0) {
        const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
        const metadata: ContextMetadata = { name, description, filePaths };

        if (this.isValidContext(metadata)) {
          const content = this.createMarkdownContent(name, description, filePaths);
          this.markAsUsed(metadata);
          contexts.push({ filename, content, metadata });
          console.log(`Parsed JSON context: ${filename} (${content.length} characters, ${filePaths.length} files)`);
        }
      }
    }

    return contexts;
  }

  private parseMultilineJsonFormat(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    console.log('No JSON contexts found, trying multi-line JSON parsing...');
    
    const contextBlocks = response.split(/(?=context file \{)/);
    
    for (const block of contextBlocks) {
      if (block.trim().startsWith('context file {')) {
        const nameMatch = block.match(/name:\s*([^\n,}]+)/);
        const descMatch = block.match(/description:\s*([^\n]+(?:\n(?!\s*files:)[^\n]*)*)/s);
        
        if (nameMatch) {
          const name = nameMatch[1].trim();
          const description = descMatch ? descMatch[1].trim().replace(/\n/g, ' ') : '';
          
          const filesSection = block.match(/files:\s*\[([\s\S]*?)\]/);
          const filePaths = filesSection ? this.extractFilePathsFromSection(filesSection[1]) : [];
          
          if (name && filePaths.length > 0) {
            const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
            const metadata: ContextMetadata = { name, description, filePaths };

            if (this.isValidContext(metadata)) {
              const content = this.createMarkdownContent(name, description, filePaths);
              this.markAsUsed(metadata);
              contexts.push({ filename, content, metadata });
              console.log(`Parsed multi-line JSON context: ${filename} (${content.length} characters, ${filePaths.length} files)`);
            }
          }
        }
      }
    }

    return contexts;
  }

  private parseNumberedSections(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    console.log('No JSON contexts found, trying numbered section parsing...');

    const numberedPattern = /##\s*\d+\.\s*\*\*([^*]+\.md)\*\*[^\n]*\n([\s\S]*?)(?=##\s*\d+\.\s*\*\*[^*]+\.md\*\*|$)/g;
    let match;

    while ((match = numberedPattern.exec(response)) !== null) {
      const filename = match[1].trim();
      const content = match[2].trim();

      if (filename && content && content.length > 100) {
        const title = filename.replace('.md', '').replace(/[-_]/g, ' ');
        const fullContent = `# Feature Context: ${title}\n\n${content}`;
        const metadata = this.extractMetadataFromContent(fullContent, filename);

        if (this.isValidContext(metadata)) {
          this.markAsUsed(metadata);
          contexts.push({ filename, content: fullContent, metadata });
          console.log(`Parsed numbered section: ${filename} (${fullContent.length} characters, ${metadata.filePaths.length} files)`);
        }
      }
    }

    return contexts;
  }

  private parseContextHeaders(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    console.log('No numbered sections found, trying **Context:** format parsing...');
    
    const contextHeaderPattern = /\*\*Context:\s*([^*]+)\*\*\s*\n\s*\*\*Summary\*\*\s*\n([\s\S]*?)(?=\*\*Context:|$)/g;
    let match;

    while ((match = contextHeaderPattern.exec(response)) !== null) {
      const name = match[1].trim();
      const content = match[2].trim();

      if (name && content && content.length > 100) {
        const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
        const filePaths = this.extractFilePathsFromText(content);

        if (filePaths.length > 0) {
          const metadata: ContextMetadata = { name, description: content.split('\n')[0], filePaths };
          
          if (this.isValidContext(metadata)) {
            const fullContent = this.createMarkdownContent(name, content.split('\n')[0], filePaths);
            this.markAsUsed(metadata);
            contexts.push({ filename, content: fullContent, metadata });
            console.log(`Parsed **Context:** format: ${filename} (${fullContent.length} characters, ${filePaths.length} files)`);
          }
        }
      }
    }

    return contexts;
  }

  private parseFeatureContextSections(response: string): ParsedContext[] {
    const contexts: ParsedContext[] = [];
    console.log('No **Context:** format found, trying feature context parsing...');
    
    const sectionPattern = /# Feature Context: ([^\n]+)\n([\s\S]*?)(?=# Feature Context:|$)/g;
    let match;

    while ((match = sectionPattern.exec(response)) !== null) {
      const featureName = match[1].trim();
      const content = match[2].trim();

      if (featureName && content && content.length > 100) {
        const filename = `${featureName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
        const fullContent = `# Feature Context: ${featureName}\n\n${content}`;
        const metadata = this.extractMetadataFromContent(fullContent, filename);

        if (this.isValidContext(metadata)) {
          this.markAsUsed(metadata);
          contexts.push({ filename, content: fullContent, metadata });
          console.log(`Parsed fallback context file: ${filename} (${fullContent.length} characters, ${metadata.filePaths.length} files)`);
        }
      }
    }

    return contexts;
  }

  private createFallbackContext(response: string): ParsedContext[] {
    console.log('No structured patterns found, trying last resort parsing...');
    console.log('Full response for debugging:', response.substring(0, 2000));
    
    if (response.length > 500) {
      const lines = response.split('\n');
      let contextName = 'Generated Context';
      
      // Try to find a title or name
      for (const line of lines.slice(0, 10)) {
        if (line.includes('Context:') || line.includes('**') || line.includes('#')) {
          const nameMatch = line.match(/(?:\*\*|#\s*|Context:\s*)([^*#\n]+)(?:\*\*|#|$)/);
          if (nameMatch) {
            contextName = nameMatch[1].trim();
            break;
          }
        }
      }
      
      const filename = `${contextName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_context.md`;
      const content = `# Feature Context: ${contextName}

## Core Functionality
${response.substring(0, 500).replace(/\*\*/g, '').trim()}

## Architecture

### Location Map

\`\`\`
# File paths could not be automatically extracted
# Please add relevant file paths here
\`\`\`

## Implementation Notes

The following content was generated but could not be parsed into the expected format:

${response.substring(0, 1500)}

## Future Improvements
- [ ] Review and update this context with proper file paths
- [ ] Organize content into proper sections
`;

      const metadata: ContextMetadata = {
        name: contextName,
        description: 'Auto-generated context from unparseable response',
        filePaths: []
      };

      console.log(`Created fallback context: ${filename} (${content.length} characters, 0 files)`);
      return [{ filename, content, metadata }];
    }

    return [];
  }

  private extractFilePathsFromSection(filesSection: string): string[] {
    const filePaths: string[] = [];
    const pathMatches = filesSection.matchAll(/path:\s*([^\n,}]+)/g);
    
    for (const pathMatch of pathMatches) {
      const path = pathMatch[1].trim().replace(/['"]/g, '');
      if (path && !filePaths.includes(path)) {
        filePaths.push(path);
      }
    }
    
    return filePaths;
  }

  private extractFilePathsFromText(content: string): string[] {
    const filePaths: string[] = [];
    const filePathMatches = content.matchAll(/(?:src\/|components\/|pages\/|api\/|lib\/|utils\/|types\/)([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/g);

    for (const match of filePathMatches) {
      const path = match[0];
      if (path && !filePaths.includes(path)) {
        filePaths.push(path);
      }
    }

    // If no file paths found, try to extract from any mention of files
    if (filePaths.length === 0) {
      const genericFileMatches = content.matchAll(/([a-zA-Z0-9_/-]+\.[a-zA-Z]{2,4})/g);
      for (const match of genericFileMatches) {
        const path = match[1];
        if (path.includes('/') && !filePaths.includes(path)) {
          filePaths.push(path);
        }
      }
    }

    return filePaths;
  }

  private extractMetadataFromContent(content: string, filename: string): ContextMetadata {
    // Extract name from title or filename
    const titleMatch = content.match(/^#\s*(?:Feature Context:\s*)?(.+)$/m);
    let name = titleMatch ? titleMatch[1].trim() : filename.replace('_context.md', '').replace(/_/g, ' ');

    // Clean up generic names
    if (name.toLowerCase().includes('location map')) {
      const specificMatch = content.match(/##\s*([^#\n]+?)(?:\s*Location Map|\s*Architecture)/i);
      if (specificMatch) {
        name = specificMatch[1].trim();
      } else {
        name = filename.replace('_context.md', '').replace(/_/g, ' ');
      }
    }

    // Remove generic prefixes/suffixes
    name = name.replace(/^\d+\.\s*/, '').replace(/^docs\/context\//, '').replace(/\.md$/, '');

    if (!name || name.length < 3 || name.toLowerCase() === 'context') {
      name = filename.replace('_context.md', '').replace(/_/g, ' ');
    }

    // Extract description
    const descriptionMatch = content.match(/##\s*(?:Core Functionality|Overview|Description)\s*\n(.*?)(?=\n##|\n#|$)/s);
    const description = descriptionMatch ? descriptionMatch[1].trim().split('\n')[0] : undefined;

    // Extract file paths
    const filePaths = this.extractFilePathsFromContent(content);

    return { name, description, filePaths };
  }

  private extractFilePathsFromContent(content: string): string[] {
    const filePaths: string[] = [];
    const validExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.java', '.cs', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.css', '.scss', '.sass', '.less', '.html', '.md', '.json', '.yaml', '.yml', '.xml', '.sql']);

    // Look for file paths in code blocks
    const codeBlockMatches = content.matchAll(/```[\w]*\n([^`]+)```/g);
    for (const match of codeBlockMatches) {
      const codeContent = match[1];
      const pathMatches = codeContent.matchAll(/(?:^|\s|├──\s*|└──\s*|│\s*└──\s*|│\s*├──\s*)([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+)/gm);
      for (const pathMatch of pathMatches) {
        const path = pathMatch[1];
        const extension = path.substring(path.lastIndexOf('.'));
        if (path && validExtensions.has(extension) && !filePaths.includes(path)) {
          filePaths.push(path);
        }
      }
    }

    // Look for explicit file references in tables and lists
    const fileRefMatches = content.matchAll(/(?:\|\s*`([^`]+\.[a-zA-Z0-9]+)`|\*\*([^*]+\.[a-zA-Z0-9]+)\*\*|`([^`]+\.[a-zA-Z0-9]+)`)/gi);
    for (const match of fileRefMatches) {
      const path = match[1] || match[2] || match[3];
      if (path) {
        const extension = path.substring(path.lastIndexOf('.'));
        if (validExtensions.has(extension) && !filePaths.includes(path)) {
          filePaths.push(path);
        }
      }
    }

    // Look for Location Map section
    const locationMapMatch = content.match(/##\s*(?:Architecture\s*)?(?:###\s*)?Location Map\s*\n(.*?)(?=\n##|\n#|$)/s);
    if (locationMapMatch) {
      const locationContent = locationMapMatch[1];
      const locationPaths = locationContent.matchAll(/(?:├──\s*|└──\s*|│\s*└──\s*|│\s*├──\s*|\|\s*`|`|^|\s)([a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+)/gm);
      for (const match of locationPaths) {
        const path = match[1];
        const extension = path.substring(path.lastIndexOf('.'));
        if (path && validExtensions.has(extension) && !filePaths.includes(path)) {
          filePaths.push(path);
        }
      }
    }

    return [...new Set(filePaths)]
      .filter(path => path.length > 3 && path.includes('/') && !path.includes('..'))
      .slice(0, 15);
  }

  private createMarkdownContent(name: string, description: string, filePaths: string[]): string {
    return `# Feature Context: ${name}

## Core Functionality
${description || 'Feature implementation for ' + name}

## Architecture

### Location Map

\`\`\`
${filePaths.map(path => `${path}`).join('\n')}
\`\`\`

### Key Files by Layer

**Frontend Layer:**
${filePaths.filter(p => p.includes('components') || p.includes('pages') || p.endsWith('.tsx') || p.endsWith('.jsx')).map(p => `| \`${p}\` | Component implementation | When UI changes |`).join('\n') || '| No frontend files | - | - |'}

**Backend Layer:**
${filePaths.filter(p => p.includes('api') || p.includes('lib') || p.includes('services')).map(p => `| \`${p}\` | API/Logic implementation | When business logic changes |`).join('\n') || '| No backend files | - | - |'}

**Utilities/Types:**
${filePaths.filter(p => p.includes('types') || p.includes('utils') || p.includes('constants')).map(p => `| \`${p}\` | Type definitions/utilities | When interfaces change |`).join('\n') || '| No utility files | - | - |'}

## Implementation Notes

### Key Features
1. **Primary Feature**: ${description || name}
2. **File Organization**: Files are organized across ${filePaths.length} components
3. **Architecture**: Component-based architecture

### Dependencies
- React/Next.js framework
- TypeScript for type safety
- Modern web development stack

## Future Improvements
- [ ] Performance optimization
- [ ] Enhanced error handling
- [ ] Additional features based on user feedback
`;
  }

  private isValidContext(metadata: ContextMetadata): boolean {
    // Skip if no files or duplicate name
    if (metadata.filePaths.length === 0 || this.usedNames.has(metadata.name.toLowerCase())) {
      console.log(`Skipping context "${metadata.name}" - no files or duplicate name`);
      return false;
    }

    // Check for file path conflicts
    const hasConflictingFiles = metadata.filePaths.some(path => this.usedFilePaths.has(path));
    if (hasConflictingFiles) {
      console.log(`Skipping context "${metadata.name}" - file path conflicts`);
      return false;
    }

    return true;
  }

  private markAsUsed(metadata: ContextMetadata): void {
    metadata.filePaths.forEach(path => this.usedFilePaths.add(path));
    this.usedNames.add(metadata.name.toLowerCase());
  }
}