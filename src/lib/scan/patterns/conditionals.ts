/**
 * Conditional complexity pattern detection
 */

/**
 * Split content into lines
 */
function splitLines(content: string): string[] {
  return content.split('\n');
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
