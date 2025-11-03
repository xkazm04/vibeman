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
 * Detects duplicated code patterns (3+ consecutive similar lines)
 */
export function detectDuplication(content: string): number[] {
  const lines = splitLines(content);
  const patterns: Map<string, number[]> = new Map();
  const duplicates: number[] = [];

  // Simple pattern detection (3+ consecutive similar lines)
  for (let i = 0; i < lines.length - 2; i++) {
    const block = lines.slice(i, i + 3).join('\n').trim();
    if (block.length > 30) {
      if (patterns.has(block)) {
        duplicates.push(i);
      } else {
        patterns.set(block, [i]);
      }
    }
  }

  return duplicates;
}

/**
 * Detects long functions (>50 lines)
 */
export function detectLongFunctions(content: string): number[] {
  const lines = splitLines(content);
  const longFunctions: number[] = [];
  let functionStart = -1;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function start
    if (/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{/.test(line)) {
      functionStart = i;
      braceCount = 0;
    }

    // Count braces
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;

    // Function end
    if (functionStart >= 0 && braceCount === 0 && /}/.test(line)) {
      const length = i - functionStart;
      if (length > 50) {
        longFunctions.push(functionStart);
      }
      functionStart = -1;
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
 * Detects potentially unused imports
 * Note: This is a simple heuristic and may produce false positives
 */
export function detectUnusedImports(content: string): number[] {
  const lines = splitLines(content);
  const importLines: number[] = [];

  // Simple heuristic: detect import statements
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
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
        // Check if any import is not used in the file
        const hasUnused = imports.some(imp => {
          // Escape special regex characters
          const escaped = escapeRegex(imp);
          const usageRegex = new RegExp(`\\b${escaped}\\b`);
          return content.split('\n').slice(index + 1).every(l => !usageRegex.test(l));
        });
        if (hasUnused) {
          importLines.push(index + 1);
        }
      }
    }
  });

  return importLines;
}
