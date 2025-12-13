#!/usr/bin/env node
/**
 * Codemod script to replace console.log/error/warn/info with structured logger
 *
 * Replaces:
 * - console.log → logger.info
 * - console.error → logger.error
 * - console.warn → logger.warn
 * - console.info → logger.info
 * - console.debug → logger.debug
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// Track statistics
let totalFiles = 0;
let modifiedFiles = 0;
let totalReplacements = 0;
let skippedBackupFiles = 0;

/**
 * Check if file already imports the logger
 */
function hasLoggerImport(content) {
  return /import\s+\{[^}]*\blogger\b[^}]*\}\s+from\s+['"]@\/lib\/logger['"]/.test(content);
}

/**
 * Find the correct position to insert the logger import
 * Returns the index in the string where we should insert, or -1 if not found
 */
function findImportInsertPosition(content) {
  // Strategy: Find the last complete import statement and insert after it
  // We use a state machine approach to properly handle multi-line imports

  let i = 0;
  const len = content.length;
  let lastImportEnd = -1;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(content[i])) i++;

    // Check for comments
    if (content.slice(i, i + 2) === '//') {
      // Single line comment - skip to end of line
      while (i < len && content[i] !== '\n') i++;
      i++; // skip the newline
      continue;
    }

    if (content.slice(i, i + 2) === '/*') {
      // Multi-line comment - skip to */
      i += 2;
      while (i < len - 1 && content.slice(i, i + 2) !== '*/') i++;
      i += 2;
      continue;
    }

    // Check for 'use strict' or similar directives
    if (content[i] === "'" || content[i] === '"') {
      const quote = content[i];
      const directiveStart = i;
      i++;
      while (i < len && content[i] !== quote) i++;
      i++; // skip closing quote
      // Skip semicolon if present
      while (i < len && /\s/.test(content[i])) i++;
      if (content[i] === ';') i++;
      continue;
    }

    // Check for import statement
    if (content.slice(i, i + 7) === 'import ') {
      // Found an import statement - find where it ends
      const importStart = i;
      i += 7;

      // Skip until we find 'from' followed by a string and semicolon/newline
      // Need to handle: import X from 'y';  import { X } from 'y';  import { X,\nY } from 'y';
      let foundFrom = false;
      let inString = false;
      let stringChar = '';
      let braceDepth = 0;

      while (i < len) {
        const char = content[i];

        if (inString) {
          if (char === stringChar && content[i - 1] !== '\\') {
            inString = false;
          }
          i++;
          continue;
        }

        if (char === "'" || char === '"') {
          inString = true;
          stringChar = char;
          i++;
          continue;
        }

        if (char === '{') {
          braceDepth++;
          i++;
          continue;
        }

        if (char === '}') {
          braceDepth--;
          i++;
          continue;
        }

        // Check for 'from' keyword
        if (!foundFrom && braceDepth === 0 && content.slice(i, i + 4) === 'from') {
          foundFrom = true;
          i += 4;
          continue;
        }

        // After 'from', look for the string and then semicolon or newline
        if (foundFrom && (char === ';' || (char === '\n' && !inString))) {
          lastImportEnd = i + 1;
          i++;
          break;
        }

        i++;
      }
      continue;
    }

    // If we get here, we've hit non-import code
    break;
  }

  return lastImportEnd;
}

/**
 * Add logger import to the file content
 */
function addLoggerImport(content) {
  const importStatement = `import { logger } from '@/lib/logger';`;

  const insertPos = findImportInsertPosition(content);

  if (insertPos > 0) {
    // Ensure we add a newline before the import if needed
    const before = content.slice(0, insertPos);
    const after = content.slice(insertPos);
    return before + '\n' + importStatement + after;
  }

  // Fallback: insert at the very beginning after any 'use' directive
  let insertIndex = 0;
  const useDirectiveMatch = content.match(/^(['"]use\s+\w+['"];?\s*\n?)/);
  if (useDirectiveMatch) {
    insertIndex = useDirectiveMatch[0].length;
  }

  return content.slice(0, insertIndex) + importStatement + '\n' + content.slice(insertIndex);
}

/**
 * Remove any existing custom logger definitions that would conflict
 */
function removeCustomLoggerDefinitions(content) {
  // Remove patterns like:
  // // Logger utility
  // const logger = { ... };
  const patterns = [
    // Pattern 1: Comment followed by const logger = {...}
    /\/\/\s*Logger\s+utility\s*\n\s*const\s+logger\s*=\s*\{[^}]*\};\s*\n?/gi,
    // Pattern 2: Just const logger = {...} definition (multiline)
    /const\s+logger\s*=\s*\{\s*(?:[^{}]|\{[^{}]*\})*\};\s*\n?/g,
  ];

  let result = content;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

/**
 * Find matching closing parenthesis
 */
function findMatchingParen(content, startPos) {
  let depth = 1;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;
  let templateDepth = 0;

  for (let i = startPos; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle template literals
    if (char === '`' && prevChar !== '\\' && !inString) {
      inTemplate = !inTemplate;
      if (inTemplate) templateDepth = 0;
      continue;
    }

    if (inTemplate) {
      if (char === '$' && i + 1 < content.length && content[i + 1] === '{') {
        templateDepth++;
        i++;
        continue;
      }
      if (char === '}' && templateDepth > 0) {
        templateDepth--;
        continue;
      }
      if (templateDepth === 0) continue;
    }

    // Handle strings
    if ((char === '"' || char === "'") && prevChar !== '\\' && !inTemplate) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Split arguments at the top level (respecting nesting)
 */
function splitTopLevelArgs(content) {
  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;
  let templateExprDepth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    if (char === '`' && prevChar !== '\\' && !inString) {
      inTemplate = !inTemplate;
      if (inTemplate) templateExprDepth = 0;
      current += char;
      continue;
    }

    if (inTemplate) {
      if (char === '$' && i + 1 < content.length && content[i + 1] === '{') {
        templateExprDepth++;
      }
      if (char === '}' && templateExprDepth > 0) {
        templateExprDepth--;
      }
      current += char;
      continue;
    }

    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      current += char;
      continue;
    }

    if (inString) {
      current += char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
      continue;
    }

    if (char === ')' || char === ']' || char === '}') {
      depth--;
      current += char;
      continue;
    }

    if (char === ',' && depth === 0) {
      if (current.trim()) args.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) args.push(current);
  return args;
}

/**
 * Check if string is a simple identifier
 */
function isSimpleIdentifier(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str.trim());
}

/**
 * Check if string is a string literal
 */
function isStringLiteral(str) {
  const t = str.trim();
  return (t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'));
}

/**
 * Convert console call to logger call
 */
function convertToLoggerCall(method, argsContent) {
  const methodMap = { log: 'info', error: 'error', warn: 'warn', info: 'info', debug: 'debug' };
  const loggerMethod = methodMap[method] || 'info';
  const trimmedArgs = argsContent.trim();

  if (!trimmedArgs) {
    return `logger.${loggerMethod}('${loggerMethod}')`;
  }

  const args = splitTopLevelArgs(trimmedArgs);

  if (args.length === 0) {
    return `logger.${loggerMethod}('${loggerMethod}')`;
  }

  if (args.length === 1) {
    const arg = args[0].trim();
    if (isStringLiteral(arg) || arg.startsWith('`')) {
      return `logger.${loggerMethod}(${arg})`;
    }
    if (isSimpleIdentifier(arg)) {
      return `logger.${loggerMethod}('${loggerMethod}', { ${arg} })`;
    }
    return `logger.${loggerMethod}('${loggerMethod}', { data: ${arg} })`;
  }

  const firstArg = args[0].trim();

  if (isStringLiteral(firstArg) || firstArg.startsWith('`')) {
    if (args.length === 2) {
      const secondArg = args[1].trim();
      if (secondArg.startsWith('{')) {
        return `logger.${loggerMethod}(${firstArg}, ${secondArg})`;
      }
      if (isSimpleIdentifier(secondArg)) {
        return `logger.${loggerMethod}(${firstArg}, { ${secondArg} })`;
      }
      return `logger.${loggerMethod}(${firstArg}, { data: ${secondArg} })`;
    }
    const restArgs = args.slice(1);
    const contextParts = restArgs.map((arg, i) => {
      const trimmed = arg.trim();
      if (isSimpleIdentifier(trimmed)) return trimmed;
      return `arg${i}: ${trimmed}`;
    });
    return `logger.${loggerMethod}(${firstArg}, { ${contextParts.join(', ')} })`;
  }

  const contextParts = args.map((arg, i) => {
    const trimmed = arg.trim();
    if (isSimpleIdentifier(trimmed)) return trimmed;
    return `arg${i}: ${trimmed}`;
  });
  return `logger.${loggerMethod}('${loggerMethod}', { ${contextParts.join(', ')} })`;
}

/**
 * Replace console calls with logger calls
 */
function replaceConsoleCalls(content) {
  let replacementCount = 0;
  const consoleMethodPattern = /console\.(log|error|warn|info|debug)\s*\(/g;

  let result = content;
  let match;
  let offset = 0;

  consoleMethodPattern.lastIndex = 0;

  while ((match = consoleMethodPattern.exec(content)) !== null) {
    const method = match[1];
    const startPos = match.index + offset;
    const argsStartPos = match.index + match[0].length;

    const closingPos = findMatchingParen(content, argsStartPos);
    if (closingPos === -1) continue;

    const argsContent = content.substring(argsStartPos, closingPos);
    const fullMatch = content.substring(match.index, closingPos + 1);

    const newCall = convertToLoggerCall(method, argsContent);

    result = result.substring(0, startPos) + newCall + result.substring(startPos + fullMatch.length);
    offset += newCall.length - fullMatch.length;

    replacementCount++;
  }

  return { content: result, count: replacementCount };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  if (filePath.endsWith('.bak') || filePath.endsWith('.backup')) {
    skippedBackupFiles++;
    return;
  }

  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return;
  }

  totalFiles++;

  let content = fs.readFileSync(filePath, 'utf-8');

  if (!/console\.(log|error|warn|info|debug)\s*\(/.test(content)) {
    return;
  }

  // First remove any custom logger definitions that might conflict
  content = removeCustomLoggerDefinitions(content);

  const { content: newContent, count } = replaceConsoleCalls(content);

  if (count > 0) {
    let finalContent = newContent;

    if (!hasLoggerImport(finalContent)) {
      finalContent = addLoggerImport(finalContent);
    }

    fs.writeFileSync(filePath, finalContent, 'utf-8');
    modifiedFiles++;
    totalReplacements += count;
    console.log(`✓ ${path.relative(API_DIR, filePath)}: ${count} replacement(s)`);
  }
}

/**
 * Recursively process all files in a directory
 */
function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

// Main execution
console.log('🔄 Starting console → logger replacement codemod...\n');
console.log(`📂 Processing: ${API_DIR}\n`);

processDirectory(API_DIR);

console.log('\n✅ Codemod complete!');
console.log(`   📁 Files scanned: ${totalFiles}`);
console.log(`   ✏️  Files modified: ${modifiedFiles}`);
console.log(`   🔄 Total replacements: ${totalReplacements}`);
if (skippedBackupFiles > 0) {
  console.log(`   ⏭️  Backup files skipped: ${skippedBackupFiles}`);
}
