/**
 * Pattern detection utilities for code analysis
 */

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
}

/**
 * Normalizes code by removing whitespace, comments, and variable names
 * This allows detecting structurally similar code even with different names
 */
function normalizeCodeBlock(code: string): string {
  return code
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove string contents (keep quotes to maintain structure)
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''")
    .replace(/`[^`]*`/g, '``')
    .trim();
}

/**
 * Calculates Jaccard similarity between two strings
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function jaccardSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  // Create character n-grams (size 3) for better similarity detection
  const getNGrams = (str: string, n: number = 3): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      grams.add(str.slice(i, i + n));
    }
    return grams;
  };

  const grams1 = getNGrams(str1);
  const grams2 = getNGrams(str2);

  // Calculate intersection
  const intersection = new Set([...grams1].filter(x => grams2.has(x)));

  // Calculate union
  const union = new Set([...grams1, ...grams2]);

  return intersection.size / union.size;
}

/**
 * Detects duplicated code patterns with improved similarity detection
 * Uses both exact matching and structural similarity
 */
export function detectDuplication(content: string): number[] {
  const lines = splitLines(content);
  const duplicates: number[] = [];
  const minBlockSize = 5; // Increased from 3 for more meaningful duplicates
  const similarityThreshold = 0.85; // 85% similar = duplicate

  interface CodeBlock {
    startLine: number;
    endLine: number;
    code: string;
    normalized: string;
  }

  // Extract all potential code blocks
  const blocks: CodeBlock[] = [];
  for (let i = 0; i < lines.length - minBlockSize; i++) {
    const block = lines.slice(i, i + minBlockSize).join('\n');
    const trimmed = block.trim();

    // Skip blocks that are too small or mostly whitespace/comments
    if (trimmed.length < 100) continue; // Increased from 50 to 100 to reduce noise
    if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) continue;

    blocks.push({
      startLine: i,
      endLine: i + minBlockSize - 1,
      code: block,
      normalized: normalizeCodeBlock(block),
    });
  }

  // Track which blocks we've already marked as duplicates
  const markedDuplicates = new Set<number>();

  // Compare all blocks for similarity
  for (let i = 0; i < blocks.length; i++) {
    if (markedDuplicates.has(i)) continue;

    const block1 = blocks[i];
    let foundDuplicate = false;

    for (let j = i + 1; j < blocks.length; j++) {
      if (markedDuplicates.has(j)) continue;

      const block2 = blocks[j];

      // Check if blocks overlap (skip if they do)
      if (Math.abs(block1.startLine - block2.startLine) < minBlockSize) {
        continue;
      }

      // Check exact match first (fastest)
      if (block1.normalized === block2.normalized) {
        if (!foundDuplicate) {
          duplicates.push(block1.startLine + 1); // +1 for 1-indexed
          markedDuplicates.add(i);
          foundDuplicate = true;
        }
        duplicates.push(block2.startLine + 1);
        markedDuplicates.add(j);
        continue;
      }

      // Check structural similarity
      const similarity = jaccardSimilarity(block1.normalized, block2.normalized);
      if (similarity >= similarityThreshold) {
        if (!foundDuplicate) {
          duplicates.push(block1.startLine + 1);
          markedDuplicates.add(i);
          foundDuplicate = true;
        }
        duplicates.push(block2.startLine + 1);
        markedDuplicates.add(j);
      }
    }
  }

  return duplicates.sort((a, b) => a - b);
}

/**
 * Cross-file duplication detection
 * Finds similar code blocks across multiple files
 */
export interface DuplicationMatch {
  file1: string;
  file2: string;
  line1: number;
  line2: number;
  similarity: number;
  codeBlock: string;
}

export function detectCrossFileDuplication(
  files: Array<{ path: string; content: string }>,
  minBlockSize: number = 5,
  similarityThreshold: number = 0.85
): DuplicationMatch[] {
  const matches: DuplicationMatch[] = [];

  interface FileBlock {
    filePath: string;
    startLine: number;
    code: string;
    normalized: string;
  }

  // Extract blocks from all files
  const allBlocks: FileBlock[] = [];

  for (const file of files) {
    const lines = splitLines(file.content);
    for (let i = 0; i < lines.length - minBlockSize; i++) {
      const block = lines.slice(i, i + minBlockSize).join('\n');
      const trimmed = block.trim();

      if (trimmed.length < 50) continue;
      if (/^\s*(\/\/|\/\*|\*)/.test(trimmed)) continue;

      allBlocks.push({
        filePath: file.path,
        startLine: i + 1,
        code: block,
        normalized: normalizeCodeBlock(block),
      });
    }
  }

  // Compare blocks across files
  const compared = new Set<string>();

  for (let i = 0; i < allBlocks.length; i++) {
    const block1 = allBlocks[i];

    for (let j = i + 1; j < allBlocks.length; j++) {
      const block2 = allBlocks[j];

      // Only compare blocks from different files
      if (block1.filePath === block2.filePath) continue;

      // Create unique key to avoid duplicate comparisons
      const key = `${block1.filePath}:${block1.startLine}-${block2.filePath}:${block2.startLine}`;
      if (compared.has(key)) continue;
      compared.add(key);

      // Check similarity
      let similarity = 0;
      if (block1.normalized === block2.normalized) {
        similarity = 1.0;
      } else {
        similarity = jaccardSimilarity(block1.normalized, block2.normalized);
      }

      if (similarity >= similarityThreshold) {
        matches.push({
          file1: block1.filePath,
          file2: block2.filePath,
          line1: block1.startLine,
          line2: block2.startLine,
          similarity,
          codeBlock: block1.code,
        });
      }
    }
  }

  return matches;
}

/**
 * Detects long functions (>50 lines)
 * Improved version that handles nested structures better
 */
export function detectLongFunctions(content: string): number[] {
  const lines = splitLines(content);
  const longFunctions: number[] = [];

  // Track function contexts with start line, depth, and initial brace depth
  interface FunctionContext {
    startLine: number;
    initialBraceDepth: number;
    name: string;
  }

  const functionStack: FunctionContext[] = [];
  let globalBraceDepth = 0;
  let inString = false;
  let inComment = false;
  let inTemplateString = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('//')) continue;

    // Detect multi-line comment start/end
    if (trimmed.includes('/*')) inComment = true;
    if (inComment) {
      if (trimmed.includes('*/')) inComment = false;
      continue;
    }

    // Detect function declarations (more robust patterns)
    const functionPatterns = [
      /^\s*function\s+(\w+)\s*\(/,                    // function name()
      /^\s*async\s+function\s+(\w+)\s*\(/,            // async function name()
      /^\s*(const|let|var)\s+(\w+)\s*=\s*function\s*\(/, // const name = function()
      /^\s*(const|let|var)\s+(\w+)\s*=\s*async\s*function\s*\(/, // const name = async function()
      /^\s*(const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/, // const name = () => {
      /^\s*(const|let|var)\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*{/, // const name = async () => {
      /^\s*(\w+)\s*\([^)]*\)\s*{/,                     // method() { (class methods)
      /^\s*async\s+(\w+)\s*\([^)]*\)\s*{/,            // async method() {
    ];

    let funcMatch = null;
    for (const pattern of functionPatterns) {
      funcMatch = trimmed.match(pattern);
      if (funcMatch) break;
    }

    if (funcMatch && trimmed.includes('{')) {
      const funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
      functionStack.push({
        startLine: i,
        initialBraceDepth: globalBraceDepth,
        name: funcName,
      });
    }

    // Count braces (excluding braces in strings and comments)
    let strippedLine = trimmed;

    // Remove string literals (simple approach - handles most cases)
    strippedLine = strippedLine.replace(/"([^"\\]|\\.)*"/g, '');
    strippedLine = strippedLine.replace(/'([^'\\]|\\.)*'/g, '');
    strippedLine = strippedLine.replace(/`([^`\\]|\\.)*`/g, '');

    const openBraces = (strippedLine.match(/{/g) || []).length;
    const closeBraces = (strippedLine.match(/}/g) || []).length;

    globalBraceDepth += openBraces;
    globalBraceDepth -= closeBraces;

    // Check if we've closed a function
    if (functionStack.length > 0 && closeBraces > 0) {
      const currentFunc = functionStack[functionStack.length - 1];

      // Function is complete when we return to its initial brace depth
      if (globalBraceDepth === currentFunc.initialBraceDepth) {
        const functionLength = i - currentFunc.startLine;

        if (functionLength > 50) {
          longFunctions.push(currentFunc.startLine + 1); // +1 for 1-indexed line numbers
        }

        functionStack.pop();
      }
    }
  }

  return longFunctions;
}

/**
 * Detects console.log statements
 */
export function detectConsoleStatements(content: string): number[] {
  const lines = splitLines(content);
  const consoleLines: number[] = [];

  lines.forEach((line, index) => {
    if (/console\.(log|warn|error|info|debug)/.test(line)) {
      consoleLines.push(index + 1);
    }
  });

  return consoleLines;
}

/**
 * Detects 'any' type usage
 */
export function detectAnyTypes(content: string): number[] {
  const lines = splitLines(content);
  const anyLines: number[] = [];

  lines.forEach((line, index) => {
    if (/:\s*any\b/.test(line)) {
      anyLines.push(index + 1);
    }
  });

  return anyLines;
}

/**
 * Detects complex conditionals with deep nesting and high cyclomatic complexity
 */
export interface ComplexConditional {
  line: number;
  type: 'deep-nesting' | 'complex-boolean' | 'high-cyclomatic';
  severity: 'medium' | 'high';
  details: string;
  nestingLevel?: number;
  cyclomaticComplexity?: number;
}

export function detectComplexConditionals(content: string): ComplexConditional[] {
  const lines = splitLines(content);
  const issues: ComplexConditional[] = [];
  let currentNestingLevel = 0;
  const nestingStack: number[] = []; // Track line numbers where nesting starts
  const maxNestingThreshold = 3; // Flag if nesting > 3

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    // Detect if/else/for/while statements (conditional blocks)
    const isConditionalStart = /^(if|else if|while|for)\s*\(/.test(trimmed);
    const isElse = /^else\s*{/.test(trimmed);

    if (isConditionalStart || isElse) {
      currentNestingLevel++;
      nestingStack.push(i + 1); // Store 1-indexed line number

      // Check for deep nesting
      if (currentNestingLevel > maxNestingThreshold) {
        issues.push({
          line: i + 1,
          type: 'deep-nesting',
          severity: currentNestingLevel > 4 ? 'high' : 'medium',
          details: `Nesting level ${currentNestingLevel} - consider extracting to functions or using early returns`,
          nestingLevel: currentNestingLevel,
        });
      }

      // Check for complex boolean expressions in if/while conditions
      if (isConditionalStart) {
        const conditionMatch = trimmed.match(/\((.*?)\)/);
        if (conditionMatch) {
          const condition = conditionMatch[1];

          // Count logical operators (&&, ||)
          const andCount = (condition.match(/&&/g) || []).length;
          const orCount = (condition.match(/\|\|/g) || []).length;
          const totalOperators = andCount + orCount;

          // Flag complex boolean expressions (3+ operators)
          if (totalOperators >= 3) {
            issues.push({
              line: i + 1,
              type: 'complex-boolean',
              severity: totalOperators >= 5 ? 'high' : 'medium',
              details: `Complex condition with ${totalOperators} logical operators - consider extracting to named boolean variables`,
            });
          }

          // Check for nested ternary operators in conditions
          const ternaryCount = (condition.match(/\?/g) || []).length;
          if (ternaryCount >= 2) {
            issues.push({
              line: i + 1,
              type: 'complex-boolean',
              severity: 'high',
              details: `Nested ternary operators (${ternaryCount}) - difficult to read and maintain`,
            });
          }
        }
      }
    }

    // Detect closing braces to reduce nesting level
    const closeBraceCount = (trimmed.match(/}/g) || []).length;
    if (closeBraceCount > 0) {
      currentNestingLevel = Math.max(0, currentNestingLevel - closeBraceCount);
      // Remove from stack
      for (let j = 0; j < closeBraceCount; j++) {
        nestingStack.pop();
      }
    }
  }

  return issues;
}

/**
 * Calculate cyclomatic complexity for a function
 * Complexity = 1 + number of decision points
 */
export function calculateCyclomaticComplexity(functionCode: string): number {
  let complexity = 1; // Base complexity

  // Count decision points
  const decisionKeywords = [
    /\bif\b/g,
    /\belse if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /&&/g,
    /\|\|/g,
    /\?/g, // Ternary operator
  ];

  for (const pattern of decisionKeywords) {
    const matches = functionCode.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Detects functions with high cyclomatic complexity
 */
export function detectHighComplexityFunctions(content: string): Array<{ line: number; complexity: number; functionName?: string }> {
  const lines = splitLines(content);
  const highComplexityFunctions: Array<{ line: number; complexity: number; functionName?: string }> = [];
  const complexityThreshold = 10; // Flag functions with complexity > 10

  // Track function contexts
  interface FunctionContext {
    startLine: number;
    code: string;
    name?: string;
  }

  const functionStack: FunctionContext[] = [];
  let globalBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('//')) continue;

    // Detect function declarations
    const functionPatterns = [
      /function\s+(\w+)\s*\(/,
      /const\s+(\w+)\s*=\s*(?:async\s+)?function/,
      /const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/,
      /(\w+)\s*\([^)]*\)\s*{/, // Method
    ];

    let funcMatch = null;
    for (const pattern of functionPatterns) {
      funcMatch = trimmed.match(pattern);
      if (funcMatch) break;
    }

    if (funcMatch && trimmed.includes('{')) {
      const funcName = funcMatch[1] || 'anonymous';
      functionStack.push({
        startLine: i,
        code: '',
        name: funcName,
      });
    }

    // Accumulate function code
    if (functionStack.length > 0) {
      functionStack[functionStack.length - 1].code += line + '\n';
    }

    // Track braces
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    globalBraceDepth += openBraces - closeBraces;

    // Function end
    if (functionStack.length > 0 && closeBraces > 0) {
      const currentFunc = functionStack[functionStack.length - 1];

      // Check if function is complete (heuristic: significant decrease in depth)
      if (trimmed === '}' || trimmed.startsWith('}')) {
        const complexity = calculateCyclomaticComplexity(currentFunc.code);

        if (complexity > complexityThreshold) {
          highComplexityFunctions.push({
            line: currentFunc.startLine + 1,
            complexity,
            functionName: currentFunc.name,
          });
        }

        functionStack.pop();
      }
    }
  }

  return highComplexityFunctions;
}

/**
 * Detects magic numbers that should be extracted to named constants
 */
export interface MagicNumber {
  line: number;
  number: string;
  context: string;
  suggestedName?: string;
  severity: 'low' | 'medium' | 'high';
}

export function detectMagicNumbers(content: string): MagicNumber[] {
  const lines = splitLines(content);
  const magicNumbers: MagicNumber[] = [];

  // Common exceptions - numbers that are typically OK to hardcode
  const allowedNumbers = new Set([
    '0', '1', '2', '-1',
    '10', '100', '1000',
    '0.0', '1.0', '0.5',
    '24', '60', // Time-related
    '365', // Days in year
  ]);

  // File types to skip (tests, config files)
  const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(content) ||
                     content.includes('describe(') ||
                     content.includes('it(');

  // Skip test files - they commonly have acceptable magic numbers
  if (isTestFile) {
    return [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments, imports, and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
        trimmed.startsWith('*') || trimmed.startsWith('import ')) {
      continue;
    }

    // Skip lines that are already constant declarations
    if (/^(const|let|var)\s+[A-Z_][A-Z0-9_]*\s*=/.test(trimmed)) {
      continue;
    }

    // Skip array/object indices
    if (/\[\d+\]/.test(trimmed)) {
      continue;
    }

    // Detect numeric literals (integer and decimal)
    const numberPattern = /\b(\d+\.?\d*|\d*\.\d+)\b/g;
    let match;

    while ((match = numberPattern.exec(trimmed)) !== null) {
      const number = match[1];

      // Skip allowed numbers
      if (allowedNumbers.has(number)) {
        continue;
      }

      // Skip very small numbers (likely array indices or simple counters)
      const numValue = parseFloat(number);
      if (numValue >= 0 && numValue <= 2) {
        continue;
      }

      // Skip numbers in property access (e.g., http2, md5)
      const beforeNumber = trimmed.substring(0, match.index);
      if (/[a-zA-Z_]$/.test(beforeNumber)) {
        continue;
      }

      // Get context around the number
      const contextStart = Math.max(0, match.index - 20);
      const contextEnd = Math.min(trimmed.length, match.index + number.length + 20);
      const context = trimmed.substring(contextStart, contextEnd).trim();

      // Determine severity based on number characteristics
      let severity: 'low' | 'medium' | 'high' = 'low';
      let suggestedName: string | undefined;

      // High severity for likely configuration values
      if (numValue > 1000) {
        severity = 'high';
        if (context.includes('timeout') || context.includes('setTimeout')) {
          suggestedName = 'TIMEOUT_MS';
        } else if (context.includes('limit') || context.includes('max')) {
          suggestedName = 'MAX_LIMIT';
        } else if (context.includes('size') || context.includes('buffer')) {
          suggestedName = 'BUFFER_SIZE';
        }
      } else if (numValue >= 100) {
        severity = 'medium';
      }

      // Detect common patterns and suggest names
      if (!suggestedName) {
        if (context.includes('status') && numValue >= 100 && numValue < 600) {
          suggestedName = `HTTP_STATUS_${numValue}`;
          severity = 'medium';
        } else if (context.includes('port')) {
          suggestedName = 'PORT';
          severity = 'high';
        } else if (context.includes('delay') || context.includes('wait')) {
          suggestedName = 'DELAY_MS';
          severity = 'medium';
        } else if (context.includes('retries') || context.includes('attempts')) {
          suggestedName = 'MAX_RETRIES';
          severity = 'medium';
        } else if (context.includes('page') || context.includes('per')) {
          suggestedName = 'PAGE_SIZE';
          severity = 'medium';
        }
      }

      magicNumbers.push({
        line: i + 1,
        number,
        context,
        suggestedName,
        severity,
      });
    }
  }

  return magicNumbers;
}

/**
 * Detects potentially unused imports
 * Improved version that handles JSX components, type-only imports, and property access
 */
export function detectUnusedImports(content: string): number[] {
  const lines = splitLines(content);
  const importLines: number[] = [];

  // Skip type-only imports (they don't affect runtime bundle)
  const typeOnlyImportPattern = /^import\s+type\s+/;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip type-only imports
    if (typeOnlyImportPattern.test(trimmedLine)) {
      return;
    }

    if (/^import\s+.*from/.test(trimmedLine)) {
      // Extract imported names (handle default, named, and namespace imports)
      const namedMatch = trimmedLine.match(/import\s+\{([^}]+)\}/);
      const defaultMatch = trimmedLine.match(/^import\s+(\w+)\s+from/);
      const namespaceMatch = trimmedLine.match(/import\s+\*\s+as\s+(\w+)/);

      const imports: string[] = [];

      if (namedMatch) {
        imports.push(...namedMatch[1].split(',').map(i => {
          // Handle "name as alias" syntax - we care about the alias
          const parts = i.trim().split(/\s+as\s+/);
          return parts.length > 1 ? parts[1].trim() : parts[0].trim();
        }));
      }
      if (defaultMatch && !namespaceMatch) {
        imports.push(defaultMatch[1].trim());
      }
      if (namespaceMatch) {
        imports.push(namespaceMatch[1].trim());
      }

      if (imports.length > 0) {
        // Get the rest of the file content for analysis
        const restOfFile = content.split('\n').slice(index + 1).join('\n');

        // Check if any import is not used in the file
        const hasUnused = imports.some(imp => {
          // Escape special regex characters
          const escaped = escapeRegex(imp);

          // Multiple usage patterns to check:
          const patterns = [
            new RegExp(`\\b${escaped}\\b`),              // Regular usage: functionName()
            new RegExp(`<${escaped}[\\s/>]`),            // JSX usage: <ComponentName>
            new RegExp(`<${escaped}\\.`),                 // JSX namespaced: <Namespace.Component>
            new RegExp(`${escaped}\\.\\w+`),             // Property access: object.property
            new RegExp(`\\.\\.\\.\s*${escaped}\\b`),     // Spread: ...props
            new RegExp(`:\\s*${escaped}\\b`),            // Type annotation: var: TypeName
            new RegExp(`<[^>]*\\b${escaped}\\b[^>]*>`),  // Generic type: Array<TypeName>
            new RegExp(`extends\\s+${escaped}\\b`),      // Inheritance: extends BaseClass
            new RegExp(`implements\\s+${escaped}\\b`),   // Implementation: implements Interface
          ];

          // Check if the import is used in any of these patterns
          const isUsed = patterns.some(pattern => pattern.test(restOfFile));

          return !isUsed;
        });

        if (hasUnused) {
          importLines.push(index + 1);
        }
      }
    }
  });

  return importLines;
}

/**
 * Detects issues with React Hook dependencies (useEffect, useCallback, useMemo)
 */
export interface HookDependencyIssue {
  line: number;
  hookType: 'useEffect' | 'useCallback' | 'useMemo';
  issueType: 'missing-dependency' | 'unnecessary-dependency' | 'missing-array';
  details: string;
  missingDeps?: string[];
  unnecessaryDeps?: string[];
  severity: 'low' | 'medium' | 'high';
}

export function detectReactHookDeps(content: string): HookDependencyIssue[] {
  const lines = splitLines(content);
  const issues: HookDependencyIssue[] = [];

  // Pattern to detect hook calls
  const hookPattern = /(useEffect|useCallback|useMemo)\s*\(/g;

  let match;
  while ((match = hookPattern.exec(content)) !== null) {
    const hookType = match[1] as 'useEffect' | 'useCallback' | 'useMemo';
    const startPos = match.index;

    // Find the line number
    const beforeMatch = content.substring(0, startPos);
    const lineNumber = beforeMatch.split('\n').length;

    // Extract the hook call (find matching parentheses)
    let depth = 0;
    let endPos = startPos;
    let hookCallContent = '';

    for (let i = startPos; i < content.length; i++) {
      const char = content[i];
      hookCallContent += char;

      if (char === '(') depth++;
      if (char === ')') depth--;

      if (depth === 0 && char === ')') {
        endPos = i;
        break;
      }
    }

    // Parse the hook call to extract callback and dependency array
    const callContent = hookCallContent;

    // Extract callback function body
    const callbackMatch = callContent.match(/\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\}(?=\s*,|\s*\))/);
    const callbackBody = callbackMatch ? callbackMatch[2] : '';

    // Extract dependency array
    const depsArrayMatch = callContent.match(/\[\s*([^\]]*?)\s*\]\s*\)/);
    const hasDepsArray = !!depsArrayMatch;
    const declaredDeps = depsArrayMatch
      ? depsArrayMatch[1]
          .split(',')
          .map(d => d.trim())
          .filter(d => d.length > 0)
      : [];

    // If no dependency array, check if one should exist
    if (!hasDepsArray && callbackBody) {
      // Check if callback uses any external variables
      const externalVarPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      const usedVars = new Set<string>();

      let varMatch;
      while ((varMatch = externalVarPattern.exec(callbackBody)) !== null) {
        const varName = varMatch[1];

        // Skip JS keywords and common React/DOM APIs
        const skipKeywords = [
          'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
          'true', 'false', 'null', 'undefined', 'console', 'window', 'document',
          'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
        ];

        if (!skipKeywords.includes(varName)) {
          usedVars.add(varName);
        }
      }

      if (usedVars.size > 0) {
        issues.push({
          line: lineNumber,
          hookType,
          issueType: 'missing-array',
          details: `${hookType} is missing a dependency array. Consider adding dependencies: [${Array.from(usedVars).join(', ')}]`,
          severity: 'high',
        });
      }
      continue;
    }

    // Extract variables used in callback
    const usedInCallback = new Set<string>();
    if (callbackBody) {
      // Find all variable references
      const varPattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
      let varMatch;

      while ((varMatch = varPattern.exec(callbackBody)) !== null) {
        const varName = varMatch[1];

        // Skip keywords, built-ins, and function parameters
        const skipList = [
          'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
          'true', 'false', 'null', 'undefined', 'this',
          'console', 'window', 'document', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
          'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'Promise',
          'async', 'await', 'try', 'catch', 'finally', 'throw',
        ];

        // Also skip state setters (e.g., setCount)
        if (skipList.includes(varName) || /^set[A-Z]/.test(varName)) {
          continue;
        }

        usedInCallback.add(varName);
      }
    }

    // Compare declared deps with used variables
    const missingDeps: string[] = [];
    const unnecessaryDeps: string[] = [];

    // Check for missing dependencies
    for (const usedVar of usedInCallback) {
      // Check if it's in the dependency array (handle object destructuring like "dep.property")
      const isDeclared = declaredDeps.some(dep => {
        const depName = dep.split('.')[0].trim();
        return depName === usedVar || dep.includes(usedVar);
      });

      if (!isDeclared) {
        missingDeps.push(usedVar);
      }
    }

    // Check for unnecessary dependencies
    for (const declaredDep of declaredDeps) {
      if (!declaredDep) continue;

      const depName = declaredDep.split('.')[0].trim();
      if (!usedInCallback.has(depName)) {
        unnecessaryDeps.push(declaredDep);
      }
    }

    // Report issues
    if (missingDeps.length > 0) {
      issues.push({
        line: lineNumber,
        hookType,
        issueType: 'missing-dependency',
        details: `${hookType} is missing dependencies: ${missingDeps.join(', ')}`,
        missingDeps,
        severity: missingDeps.length > 2 ? 'high' : 'medium',
      });
    }

    if (unnecessaryDeps.length > 0) {
      issues.push({
        line: lineNumber,
        hookType,
        issueType: 'unnecessary-dependency',
        details: `${hookType} has unnecessary dependencies: ${unnecessaryDeps.join(', ')}`,
        unnecessaryDeps,
        severity: 'low',
      });
    }
  }

  return issues;
}
