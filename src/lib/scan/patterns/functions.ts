/**
 * Function-related pattern detection
 */

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
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
