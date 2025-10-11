import { GeneratedCode } from './backlogTypes';

/**
 * Parse AI response to extract code files using multiple pattern matching strategies
 */
export function parseCodeResponse(response: string): GeneratedCode[] {
  const generatedFiles: GeneratedCode[] = [];

  console.log('Parsing AI response for code files...');
  console.log('=== FULL OLLAMA RESPONSE START ===');
  console.log(response);
  console.log('=== FULL OLLAMA RESPONSE END ===');

  // Pattern matching strategies
  const patterns = [
    // Pattern 1: code-file:filename|action (with newline after backticks)
    /```(?:code-file|file):\s*([^\n`]+?)\s*(?:\|\s*(create|update))?\s*```\s*\n([\s\S]*?)(?=```(?:code-file|file):|```\s*$|$)/g,
    // Pattern 2: code-file:filename|action (without newline after backticks)
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
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 1) {
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 2) {
        action = (match[2] || 'update').trim() as 'create' | 'update';
        content = (match[3] || '').trim();
      } else if (patternIndex === 3) {
        content = match[2].trim();
        action = 'create';
      }

      // Check if action is embedded in the filepath
      const actionMatch = filepath.match(/^(.+?)\|(create|update)$/);
      if (actionMatch) {
        filepath = actionMatch[1].trim();
        action = actionMatch[2] as 'create' | 'update';
      }

      // Clean up content
      content = content.replace(/```\s*$/, '').trim();

      if (filepath && content && content.length > 10) {
        generatedFiles.push({ filepath, action, content });
        console.log(`Parsed code file: ${filepath} (${action}, ${content.length} characters)`);
      }
    }

    if (generatedFiles.length > 0) {
      console.log(`Pattern ${patternIndex + 1} found ${generatedFiles.length} files, stopping pattern search`);
      break;
    }
  }

  // Fallback: standard code blocks with file paths
  if (generatedFiles.length === 0) {
    generatedFiles.push(...parseFallbackCodeBlocks(response));
  }

  // Additional fallback: broad search
  if (generatedFiles.length === 0) {
    generatedFiles.push(...parseBroadCodeBlocks(response));
  }

  console.log(`Total code files parsed: ${generatedFiles.length}`);
  return generatedFiles;
}

/**
 * Fallback parser for standard code blocks with file paths in comments
 */
function parseFallbackCodeBlocks(response: string): GeneratedCode[] {
  const generatedFiles: GeneratedCode[] = [];
  console.log('No code-file markers found, trying fallback parsing...');
  
  const fallbackPattern = /```[\w]*\s*(?:\/\/\s*|#\s*|<!--\s*)?([^\n]+\.(?:tsx?|jsx?|py|java|cpp|c|h|css|scss|html|md|json|yaml|yml))\s*(?:-->)?\s*\n([\s\S]*?)```/g;
  let fallbackMatch;

  while ((fallbackMatch = fallbackPattern.exec(response)) !== null) {
    console.log('Found fallback match:', fallbackMatch[0].substring(0, 100) + '...');
    let filepath = fallbackMatch[1].trim();
    const content = fallbackMatch[2].trim();

    filepath = filepath.replace(/\|(create|update)$/, '').trim();

    if (filepath && content) {
      generatedFiles.push({
        filepath,
        action: 'update',
        content
      });
      console.log(`Parsed fallback code file: ${filepath} (update, ${content.length} characters)`);
    }
  }

  return generatedFiles;
}

/**
 * Broad search for any code blocks
 */
function parseBroadCodeBlocks(response: string): GeneratedCode[] {
  const generatedFiles: GeneratedCode[] = [];
  console.log('No files found with standard patterns, trying broad search...');
  
  const broadPattern = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let broadMatch;
  let fileIndex = 0;

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

  while ((broadMatch = broadPattern.exec(response)) !== null) {
    const language = broadMatch[1] || 'text';
    const content = broadMatch[2].trim();

    if (content.length > 50) {
      console.log(`Found code block ${fileIndex + 1}: ${language} (${content.length} characters)`);
      
      let ext = extensions[language] || 'tsx';
      let filename = `generated_file_${fileIndex + 1}`;

      // Detect React components
      if (content.includes('export default') && (content.includes('function') || content.includes('const'))) {
        ext = 'tsx';
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

  return generatedFiles;
}
